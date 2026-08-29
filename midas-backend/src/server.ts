import Fastify from 'fastify';
import cors from '@fastify/cors';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import mqtt from 'mqtt';

const dbPath = resolve(process.cwd(), 'data', 'midas.db');
mkdirSync(dirname(dbPath), { recursive: true });
// SQLite intégré à Node.js 24 : aucune dépendance native, node-gyp ou Visual Studio n'est requis.
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

const now = () => new Date().toISOString();
const appLogger = { warn: (data: unknown, message: string) => console.warn(message, data) };
const mqttUrl = process.env.MQTT_TLS_URL ?? 'mqtts://localhost:8883';
const mqttClient = process.env.MQTT_TLS_ENABLED === 'true' ? mqtt.connect(mqttUrl, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  rejectUnauthorized: process.env.MQTT_TLS_REJECT_UNAUTHORIZED !== 'false',
}) : null;
if (mqttClient) mqttClient.on('error', error => appLogger.warn({ error }, 'MQTT/TLS indisponible'));
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const json = (value: unknown) => JSON.stringify(value);
const parseJson = <T>(value: string): T => JSON.parse(value) as T;

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS citizens (
      id TEXT PRIMARY KEY, npi TEXT NOT NULL, npi_hash TEXT NOT NULL UNIQUE,
      did TEXT NOT NULL UNIQUE, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
      created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY, citizen_id TEXT NOT NULL REFERENCES citizens(id),
      type TEXT NOT NULL, issuer TEXT NOT NULL, claims_json TEXT NOT NULL,
      issued_at TEXT NOT NULL, expires_at TEXT NOT NULL, status TEXT NOT NULL,
      signature TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS consents (
      id TEXT PRIMARY KEY, citizen_id TEXT NOT NULL REFERENCES citizens(id),
      service_id TEXT NOT NULL, service_name TEXT NOT NULL, provider TEXT NOT NULL,
      purpose TEXT NOT NULL, data_json TEXT NOT NULL, conditions_json TEXT NOT NULL,
      legal_basis TEXT NOT NULL, status TEXT NOT NULL, expires_at TEXT NOT NULL,
      granted_at TEXT, revoked_at TEXT, signature TEXT
    );
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY, citizen_id TEXT NOT NULL REFERENCES citizens(id),
      did TEXT NOT NULL UNIQUE, name TEXT NOT NULL, manufacturer TEXT NOT NULL,
      model TEXT NOT NULL, transport TEXT NOT NULL, ble_address TEXT,
      status TEXT NOT NULL, services_json TEXT NOT NULL, paired_at TEXT NOT NULL,
      last_seen TEXT, metadata_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS measurements (
      id TEXT PRIMARY KEY, citizen_id TEXT NOT NULL REFERENCES citizens(id),
      device_id TEXT NOT NULL REFERENCES devices(id), consent_id TEXT,
      metric TEXT NOT NULL, value TEXT NOT NULL, unit TEXT NOT NULL,
      source TEXT NOT NULL, received_at TEXT NOT NULL, raw_packet TEXT,
      signature TEXT, encrypted_payload TEXT
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY, citizen_id TEXT, timestamp TEXT NOT NULL, action TEXT NOT NULL,
      actor TEXT NOT NULL, target TEXT NOT NULL, target_type TEXT NOT NULL,
      details TEXT NOT NULL, previous_hash TEXT NOT NULL, hash TEXT NOT NULL,
      blockchain_anchor TEXT, metadata_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS service_connections (
      id TEXT PRIMARY KEY, citizen_id TEXT NOT NULL REFERENCES citizens(id),
      service_id TEXT NOT NULL, status TEXT NOT NULL, requested_at TEXT NOT NULL,
      updated_at TEXT NOT NULL, UNIQUE(citizen_id, service_id)
    );
    CREATE TABLE IF NOT EXISTS webauthn_credentials (
      id TEXT PRIMARY KEY, citizen_id TEXT NOT NULL REFERENCES citizens(id),
      public_key BLOB NOT NULL, counter INTEGER NOT NULL DEFAULT 0,
      transports_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS webauthn_challenges (
      id TEXT PRIMARY KEY, citizen_id TEXT NOT NULL REFERENCES citizens(id),
      challenge TEXT NOT NULL, ceremony TEXT NOT NULL, expires_at TEXT NOT NULL
    );
  `);
}
migrate();

function transaction<T>(operation: () => T): T {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = operation();
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

function appendAudit(input: { citizenId?: string; action: string; actor: string; target: string; targetType: string; details: string; metadata?: unknown }) {
  const previous = db.prepare('SELECT hash FROM audit_events ORDER BY timestamp DESC LIMIT 1').get() as { hash?: string } | undefined;
  const timestamp = now();
  const previousHash = previous?.hash ?? '0'.repeat(64);
  const canonical = json({ timestamp, action: input.action, actor: input.actor, target: input.target, targetType: input.targetType, details: input.details, previousHash });
  const hash = sha256(canonical);
  const event = {
    id: randomUUID(), timestamp, previousHash, hash,
    blockchainAnchor: `midas:demo:anchor:${Date.now()}`
  };
  db.prepare(`INSERT INTO audit_events (id,citizen_id,timestamp,action,actor,target,target_type,details,previous_hash,hash,blockchain_anchor,metadata_json)
    VALUES (@id,@citizenId,@timestamp,@action,@actor,@target,@targetType,@details,@previousHash,@hash,@blockchainAnchor,@metadataJson)`)
    .run({
      id: event.id, citizenId: input.citizenId ?? null, timestamp: event.timestamp,
      action: input.action, actor: input.actor, target: input.target, targetType: input.targetType,
      details: input.details, previousHash: event.previousHash, hash: event.hash,
      blockchainAnchor: event.blockchainAnchor, metadataJson: json(input.metadata ?? {})
    });
  return event;
}

function resolveDemoNpi(npi: string) {
  const profiles = [
    { firstName: 'Koffi Marcel', lastName: 'AHOUANSOU' },
    { firstName: 'Aïcha', lastName: 'KOSSOU' },
    { firstName: 'Mariam', lastName: 'ADJOVI' },
  ];
  return profiles[Number(npi.at(-1) ?? '0') % profiles.length];
}

const services = [
  { id: 'service-public', name: 'Service-public.bj — Démonstration', provider: 'ASIN — Simulation académique', category: 'government', requiredData: ['Identité (NPI)', 'Nom complet'], purpose: 'Démarches administratives simulées' },
  { id: 'dmp', name: 'Dossier Médical Partagé — Démonstration', provider: 'Ministère de la Santé — Simulation académique', category: 'health', requiredData: ['Identité (NPI)', 'Données de santé'], purpose: 'Suivi médical simulé' },
  { id: 'smart-city', name: 'Smart City Cotonou — Démonstration', provider: 'Mairie de Cotonou — Simulation académique', category: 'transport', requiredData: ['Géolocalisation'], purpose: 'Mobilité urbaine simulée' },
  { id: 'agridigital', name: 'AgriDigital Bénin — Démonstration', provider: 'Ministère de l’Agriculture — Simulation académique', category: 'agriculture', requiredData: ['Identité (NPI)', 'Adresse'], purpose: 'Services agricoles simulés' },
];

const simulationProfiles = [
  { key: 'omron', name: 'Tensiomètre Omron — Simulation', manufacturer: 'Omron Healthcare', model: 'M7 Intelli IT', metric: 'systolic_pressure', unit: 'mmHg', min: 105, max: 135, initial: 120, location: 'Domicile', category: 'Santé' },
  { key: 'freestyle', name: 'Glucomètre FreeStyle — Simulation', manufacturer: 'Abbott', model: 'FreeStyle Libre 2', metric: 'blood_glucose', unit: 'mg/dL', min: 75, max: 130, initial: 95, location: 'Domicile', category: 'Santé' },
  { key: 'soil-temp', name: 'Capteur Température Sol — Simulation', manufacturer: 'AgriSensor', model: 'SoilTemp Pro', metric: 'soil_temperature', unit: '°C', min: 20, max: 38, initial: 28.5, location: 'Ferme - Parcelle A3', category: 'Agriculture' },
  { key: 'soil-humidity', name: 'Capteur Humidité Sol — Simulation', manufacturer: 'AgriSensor', model: 'SoilMoist LoRa', metric: 'soil_humidity', unit: '%', min: 15, max: 85, initial: 42, location: 'Ferme - Parcelle B1', category: 'Agriculture', offline: true },
];

function seedSimulationDevices(citizenId: string) {
  const exists = db.prepare('SELECT COUNT(*) AS count FROM devices WHERE citizen_id=? AND transport=?').get(citizenId, 'SIMULATION') as { count: number };
  if (exists.count > 0) return;
  const createdAt = now();
  for (const profile of simulationProfiles) {
    const id = `sim-device:${citizenId}:${profile.key}`;
    const metadata = { simulation: true, profile: profile.key, category: profile.category, battery: profile.offline ? 12 : profile.key === 'freestyle' ? 62 : profile.key === 'soil-temp' ? 78 : 85, lastReading: profile.offline ? null : { value: profile.initial, unit: profile.unit, metric: profile.metric, timestamp: createdAt } };
    db.prepare('INSERT INTO devices (id,citizen_id,did,name,manufacturer,model,transport,ble_address,status,services_json,paired_at,last_seen,metadata_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
      id, citizenId, `did:midas:benin:sim:${profile.key}:${sha256(citizenId).slice(0, 12)}`, profile.name, profile.manufacturer, profile.model,
      'SIMULATION', null, profile.offline ? 'offline' : 'online', json([]), createdAt, profile.offline ? null : createdAt, json(metadata)
    );
  }
  appendAudit({ citizenId, action: 'simulation_devices_seeded', actor: 'system', target: citizenId, targetType: 'device', details: 'Initialisation des capteurs IoT de démonstration' });
}

function runSensorSimulation() {
  const devices = db.prepare("SELECT * FROM devices WHERE transport='SIMULATION' AND status='online'").all() as any[];
  const timestamp = now();
  for (const device of devices) {
    const metadata = parseJson<any>(device.metadata_json);
    const profile = simulationProfiles.find(p => p.key === metadata.profile);
    if (!profile) continue;
    const oldValue = Number(metadata.lastReading?.value ?? profile.initial);
    const step = profile.metric === 'soil_temperature' ? (Math.random() * 1.6 - 0.8) : (Math.random() * 12 - 6);
    const value = profile.metric === 'soil_temperature'
      ? Number(Math.min(profile.max, Math.max(profile.min, oldValue + step)).toFixed(1))
      : Math.round(Math.min(profile.max, Math.max(profile.min, oldValue + step)));
    const battery = Math.max(5, Number(metadata.battery ?? 100) - (Math.random() < 0.08 ? 1 : 0));
    metadata.battery = battery;
    metadata.lastReading = { value, unit: profile.unit, metric: profile.metric, timestamp };
    db.prepare('UPDATE devices SET last_seen=?, metadata_json=? WHERE id=?').run(timestamp, json(metadata), device.id);
    db.prepare('INSERT INTO measurements (id,citizen_id,device_id,consent_id,metric,value,unit,source,received_at,raw_packet,signature,encrypted_payload) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
      `measurement:${randomUUID()}`, device.citizen_id, device.id, null, profile.metric, String(value), profile.unit, 'MIDAS IoT Simulator', timestamp, null, 'simulation-signature', sha256(json({ device: device.id, value, timestamp }))
    );
    appendAudit({ citizenId: device.citizen_id, action: 'data_collected', actor: device.id, target: profile.metric, targetType: 'data', details: `Simulation ${profile.metric} : ${value} ${profile.unit}`, metadata: { simulation: true } });
    mqttClient?.publish(`midas/demo/citizen/${device.citizen_id}/device/${device.id}/measurements`, JSON.stringify({ metric: profile.metric, value, unit: profile.unit, source: 'MIDAS IoT Simulator', receivedAt: timestamp, academicDemo: true }), { qos: 1 });
  }
}

const tlsKey = process.env.TLS_KEY_FILE;
const tlsCert = process.env.TLS_CERT_FILE;
if (!tlsKey || !tlsCert) throw new Error('TLS obligatoire : définissez TLS_KEY_FILE et TLS_CERT_FILE avant de démarrer le backend.');
const app = Fastify({ logger: true, https: { key: readFileSync(tlsKey), cert: readFileSync(tlsCert) } });
await app.register(cors, { origin: true });

app.get('/health', async () => ({ status: 'ok', product: 'MIDAS-Bénin backend', mode: 'academic-demo', time: now(), transport: 'HTTPS/TLS' }));

// Console graphique locale d'administration — démonstration académique uniquement.
app.get('/admin', async (_request, reply) => {
  reply.type('text/html; charset=utf-8').send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MIDAS · Administration</title><style>
  :root{font-family:Inter,system-ui,sans-serif;color:#17352c;background:#f0fdf4}body{margin:0}.top{background:#047857;color:#fff;padding:24px 6%;box-shadow:0 2px 8px #064e3b33}h1{margin:0 0 5px;font-size:1.6rem}.sub{opacity:.85}.wrap{max-width:1200px;margin:28px auto;padding:0 20px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px}.card{background:#fff;border:1px solid #bbf7d0;border-radius:12px;padding:18px;box-shadow:0 2px 8px #064e3b12}.num{font-size:2rem;font-weight:700;color:#059669}.label{color:#527267;font-size:.9rem;margin-top:5px}section{margin-top:24px}h2{font-size:1.15rem}table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden}th,td{text-align:left;padding:11px;border-bottom:1px solid #dcfce7;font-size:.9rem}th{background:#d1fae5;color:#065f46}.pill{display:inline-block;border-radius:999px;background:#d1fae5;color:#065f46;padding:4px 9px;font-size:.8rem}#error{color:#b91c1c}button{background:#059669;border:0;color:white;padding:9px 14px;border-radius:8px;cursor:pointer}@media(max-width:600px){table{font-size:.78rem}th,td{padding:8px}}
</style></head><body><header class="top"><h1>MIDAS-Bénin · Console d'administration</h1><div class="sub">Démonstration académique · HTTPS/TLS · SQLite local</div></header><main class="wrap"><button onclick="load()">Actualiser</button><p id="error"></p><div id="cards" class="grid"></div><section><h2>Dernières mesures IoT</h2><table><thead><tr><th>Métrique</th><th>Valeur</th><th>Source</th><th>Date</th></tr></thead><tbody id="measurements"></tbody></table></section><section><h2>Derniers événements d'audit</h2><table><thead><tr><th>Action</th><th>Détails</th><th>Date</th></tr></thead><tbody id="audit"></tbody></table></section></main><script>
const labels={citizens:'Citoyens',credentials:'Credentials',consents:'Consentements',devices:'Appareils IoT',measurements:'Mesures',auditEvents:'Événements audit'};const esc=x=>String(x??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));async function load(){try{const r=await fetch('/api/v1/demo/summary');if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();document.querySelector('#cards').innerHTML=Object.entries(labels).map(([k,v])=>\`<div class="card"><div class="num">\${esc(d[k])}</div><div class="label">\${v}</div></div>\`).join('');document.querySelector('#measurements').innerHTML=(d.lastMeasurements||[]).map(x=>\`<tr><td><span class="pill">\${esc(x.metric)}</span></td><td>\${esc(x.value)} \${esc(x.unit)}</td><td>\${esc(x.source)}</td><td>\${esc(x.receivedAt)}</td></tr>\`).join('')||'<tr><td colspan="4">Aucune mesure</td></tr>';document.querySelector('#audit').innerHTML=(d.lastAuditEvents||[]).map(x=>\`<tr><td>\${esc(x.action)}</td><td>\${esc(x.details)}</td><td>\${esc(x.timestamp)}</td></tr>\`).join('')||'<tr><td colspan="3">Aucun événement</td></tr>';document.querySelector('#error').textContent=''}catch(e){document.querySelector('#error').textContent='Impossible de charger les données : '+e.message}}load();setInterval(load,15000);
</script></body></html>`);
});

// Endpoint réservé au contrôle du prototype local ; à ne jamais exposer en production.
app.get('/api/v1/demo/summary', async () => ({
  mode: 'academic-demo',
  citizens: (db.prepare('SELECT COUNT(*) AS count FROM citizens').get() as { count: number }).count,
  credentials: (db.prepare('SELECT COUNT(*) AS count FROM credentials').get() as { count: number }).count,
  consents: (db.prepare('SELECT COUNT(*) AS count FROM consents').get() as { count: number }).count,
  devices: (db.prepare('SELECT COUNT(*) AS count FROM devices').get() as { count: number }).count,
  measurements: (db.prepare('SELECT COUNT(*) AS count FROM measurements').get() as { count: number }).count,
  auditEvents: (db.prepare('SELECT COUNT(*) AS count FROM audit_events').get() as { count: number }).count,
  lastMeasurements: db.prepare('SELECT metric,value,unit,source,received_at AS receivedAt FROM measurements ORDER BY received_at DESC LIMIT 5').all(),
  lastAuditEvents: db.prepare('SELECT timestamp,action,details FROM audit_events ORDER BY timestamp DESC LIMIT 5').all(),
}));

app.post('/api/v1/enrollment', async (request, reply) => {
  const body = z.object({ npi: z.string().transform(v => v.replace(/\D/g, '')).refine(v => v.length === 16, 'Le NPI doit contenir 16 chiffres.'), did: z.string().min(12).optional() }).parse(request.body);
  const existing = db.prepare('SELECT id,npi,did,first_name AS firstName,last_name AS lastName,created_at AS createdAt FROM citizens WHERE npi_hash=?').get(sha256(body.npi)) as { id: string; npi: string; did: string; firstName: string; lastName: string; createdAt: string } | undefined;
  // Usage unique : aucun nouveau DID n'est créé. Pour permettre au même téléphone
  // de restaurer son portefeuille après réinstallation, le dossier existant est renvoyé.
  if (existing) {
    transaction(() => seedSimulationDevices(existing.id));
    const credential = db.prepare('SELECT id,type,issuer,claims_json AS claims,issued_at AS issuedAt,expires_at AS expiresAt,status,signature FROM credentials WHERE citizen_id=? ORDER BY issued_at DESC LIMIT 1').get(existing.id) as any;
    return { existing: true, citizen: existing, credential: { ...credential, claims: parseJson(credential.claims) } };
  }
  const profile = resolveDemoNpi(body.npi);
  const citizenId = `citizen:${randomUUID()}`;
  const did = body.did ?? `did:midas:benin:${randomUUID().replaceAll('-', '')}`;
  const createdAt = now();
  const credentialId = `vc:midas:identity:${randomUUID()}`;
  const credential = { id: credentialId, type: 'identity', issuer: 'ANIP — Simulation académique', claims: { npi: body.npi, fullName: `${profile.firstName} ${profile.lastName}`, nationality: 'Béninoise — démonstration' }, issuedAt: createdAt, expiresAt: new Date(Date.now() + 3650 * 86400000).toISOString(), status: 'valid' };
  transaction(() => {
    db.prepare('INSERT INTO citizens (id,npi,npi_hash,did,first_name,last_name,created_at) VALUES (?,?,?,?,?,?,?)').run(citizenId, body.npi, sha256(body.npi), did, profile.firstName, profile.lastName, createdAt);
    db.prepare('INSERT INTO credentials (id,citizen_id,type,issuer,claims_json,issued_at,expires_at,status,signature) VALUES (?,?,?,?,?,?,?,?,?)').run(credentialId,citizenId,credential.type,credential.issuer,json(credential.claims),credential.issuedAt,credential.expiresAt,credential.status,sha256(json(credential)));
    appendAudit({ citizenId, action: 'enrollment_completed', actor: citizenId, target: did, targetType: 'identity', details: 'Enrôlement local par NPI de démonstration et génération du DID' });
    seedSimulationDevices(citizenId);
  });
  return { citizen: { id: citizenId, npi: body.npi, did, firstName: profile.firstName, lastName: profile.lastName, createdAt }, credential };
});

app.get('/api/v1/citizens/:citizenId', async (request, reply) => {
  const { citizenId } = z.object({ citizenId: z.string() }).parse(request.params);
  const citizen = db.prepare('SELECT id,npi,did,first_name AS firstName,last_name AS lastName,created_at AS createdAt,status FROM citizens WHERE id=?').get(citizenId);
  if (!citizen) return reply.code(404).send({ error: 'CITIZEN_NOT_FOUND' });
  const credentials = db.prepare('SELECT id,type,issuer,claims_json AS claimsJson,issued_at AS issuedAt,expires_at AS expiresAt,status FROM credentials WHERE citizen_id=?').all(citizenId).map((x: any) => ({ ...x, claims: parseJson(x.claimsJson) }));
  return { citizen, credentials };
});

const rpName = 'MIDAS-Bénin — démonstration académique';
const rpID = process.env.WEBAUTHN_RP_ID ?? 'localhost';
const expectedOrigin = process.env.WEBAUTHN_ORIGIN ?? `https://${rpID}:3443`;
const challengeId = () => `challenge:${randomUUID()}`;

// FIDO2/WebAuthn : seules les clés publiques et les compteurs sont persistés.
// Les données biométriques et les clés privées restent dans l'authentificateur Android.
app.post('/api/v1/auth/webauthn/register/options', async (request, reply) => {
  const body = z.object({ citizenId: z.string() }).parse(request.body);
  const citizen = db.prepare('SELECT id,npi,did FROM citizens WHERE id=? AND status=\'active\'').get(body.citizenId) as any;
  if (!citizen) return reply.code(404).send({ error: 'CITIZEN_NOT_FOUND' });
  const existing = db.prepare('SELECT id FROM webauthn_credentials WHERE citizen_id=?').all(body.citizenId) as any[];
  const options = await generateRegistrationOptions({
    rpName, rpID, userName: citizen.did, userDisplayName: 'Citoyen MIDAS (démonstration)',
    userID: new TextEncoder().encode(citizen.id),
    attestationType: 'none',
    excludeCredentials: existing.map(item => ({ id: item.id })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });
  db.prepare('INSERT INTO webauthn_challenges (id,citizen_id,challenge,ceremony,expires_at) VALUES (?,?,?,?,?)').run(challengeId(), citizen.id, options.challenge, 'registration', new Date(Date.now()+120000).toISOString());
  return options;
});

app.post('/api/v1/auth/webauthn/register/verify', async (request, reply) => {
  const body = z.object({ citizenId: z.string(), response: z.any() }).parse(request.body);
  const pending = db.prepare("SELECT * FROM webauthn_challenges WHERE citizen_id=? AND ceremony='registration' ORDER BY expires_at DESC LIMIT 1").get(body.citizenId) as any;
  if (!pending || new Date(pending.expires_at) < new Date()) return reply.code(400).send({ error: 'WEBAUTHN_CHALLENGE_EXPIRED' });
  try {
    const verification = await verifyRegistrationResponse({ response: body.response, expectedChallenge: pending.challenge, expectedOrigin, expectedRPID: rpID, requireUserVerification: true });
    if (!verification.verified || !verification.registrationInfo) return reply.code(400).send({ error: 'WEBAUTHN_REGISTRATION_FAILED' });
    const info: any = verification.registrationInfo;
    const credential = info.credential ?? info;
    db.prepare('INSERT OR REPLACE INTO webauthn_credentials (id,citizen_id,public_key,counter,transports_json,created_at) VALUES (?,?,?,?,?,?)').run(credential.id, body.citizenId, Buffer.from(credential.publicKey), credential.counter, json(body.response.response?.transports ?? []), now());
    db.prepare('DELETE FROM webauthn_challenges WHERE id=?').run(pending.id);
    appendAudit({ citizenId: body.citizenId, action: 'webauthn_registered', actor: body.citizenId, target: credential.id, targetType: 'credential', details: 'Credential FIDO2/WebAuthn enregistré — démonstration académique' });
    return { verified: true, credentialId: credential.id, mode: 'academic-demo' };
  } catch (error) { return reply.code(400).send({ error: 'WEBAUTHN_REGISTRATION_FAILED', details: String(error) }); }
});

app.post('/api/v1/auth/webauthn/login/options', async (request, reply) => {
  const body = z.object({ citizenId: z.string() }).parse(request.body);
  const credentials = db.prepare('SELECT id,transports_json FROM webauthn_credentials WHERE citizen_id=?').all(body.citizenId) as any[];
  if (!credentials.length) return reply.code(404).send({ error: 'WEBAUTHN_CREDENTIAL_NOT_FOUND' });
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'required', allowCredentials: credentials.map(item => ({ id: item.id, transports: parseJson(item.transports_json) })) });
  db.prepare('INSERT INTO webauthn_challenges (id,citizen_id,challenge,ceremony,expires_at) VALUES (?,?,?,?,?)').run(challengeId(), body.citizenId, options.challenge, 'authentication', new Date(Date.now()+120000).toISOString());
  return options;
});

app.post('/api/v1/auth/webauthn/login/verify', async (request, reply) => {
  const body = z.object({ citizenId: z.string(), response: z.any() }).parse(request.body);
  const pending = db.prepare("SELECT * FROM webauthn_challenges WHERE citizen_id=? AND ceremony='authentication' ORDER BY expires_at DESC LIMIT 1").get(body.citizenId) as any;
  const credentialId = body.response?.id;
  const stored = db.prepare('SELECT * FROM webauthn_credentials WHERE id=? AND citizen_id=?').get(credentialId, body.citizenId) as any;
  if (!pending || !stored || new Date(pending.expires_at) < new Date()) return reply.code(400).send({ error: 'WEBAUTHN_AUTHENTICATION_FAILED' });
  try {
    const verification = await verifyAuthenticationResponse({ response: body.response, expectedChallenge: pending.challenge, expectedOrigin, expectedRPID: rpID, credential: { id: stored.id, publicKey: new Uint8Array(stored.public_key), counter: stored.counter, transports: parseJson(stored.transports_json) }, requireUserVerification: true });
    if (!verification.verified) return reply.code(401).send({ error: 'WEBAUTHN_AUTHENTICATION_FAILED' });
    db.prepare('UPDATE webauthn_credentials SET counter=? WHERE id=?').run(verification.authenticationInfo.newCounter, stored.id);
    db.prepare('DELETE FROM webauthn_challenges WHERE id=?').run(pending.id);
    appendAudit({ citizenId: body.citizenId, action: 'webauthn_authenticated', actor: body.citizenId, target: stored.id, targetType: 'credential', details: 'Authentification FIDO2/WebAuthn réussie — démonstration académique' });
    return { verified: true, citizenId: body.citizenId, mode: 'academic-demo' };
  } catch (error) { return reply.code(401).send({ error: 'WEBAUTHN_AUTHENTICATION_FAILED', details: String(error) }); }
});

app.get('/api/v1/services', async () => services);

app.get('/api/v1/consents/:citizenId', async (request) => {
  const { citizenId } = z.object({ citizenId: z.string() }).parse(request.params);
  return db.prepare('SELECT * FROM consents WHERE citizen_id=? ORDER BY expires_at DESC').all(citizenId).map((x: any) => ({ ...x, data: parseJson(x.data_json), conditions: parseJson(x.conditions_json) }));
});

app.post('/api/v1/consents', async (request) => {
  const body = z.object({ citizenId: z.string(), serviceId: z.string(), serviceName: z.string(), provider: z.string(), purpose: z.string(), data: z.array(z.string()), conditions: z.array(z.object({ dataType: z.string(), allowed: z.boolean(), purpose: z.string() })), expiresAt: z.string() }).parse(request.body);
  const id = `consent:${randomUUID()}`;
  db.prepare('INSERT INTO consents (id,citizen_id,service_id,service_name,provider,purpose,data_json,conditions_json,legal_basis,status,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id,body.citizenId,body.serviceId,body.serviceName,body.provider,body.purpose,json(body.data),json(body.conditions),'Consentement explicite — démonstration','pending',body.expiresAt);
  appendAudit({ citizenId: body.citizenId, action: 'consent_requested', actor: body.serviceId, target: id, targetType: 'consent', details: `Demande de consentement : ${body.serviceName}` });
  return { id, status: 'pending' };
});

app.post('/api/v1/consents/:id/:decision', async (request, reply) => {
  const { id, decision } = z.object({ id: z.string(), decision: z.enum(['grant','deny','revoke']) }).parse(request.params);
  const consent = db.prepare('SELECT * FROM consents WHERE id=?').get(id) as any;
  if (!consent) return reply.code(404).send({ error: 'CONSENT_NOT_FOUND' });
  const state = decision === 'grant' ? 'granted' : decision === 'deny' ? 'denied' : 'revoked';
  db.prepare('UPDATE consents SET status=?, granted_at=?, revoked_at=?, signature=? WHERE id=?').run(state, decision === 'grant' ? now() : null, decision === 'revoke' ? now() : null, sha256(`${id}|${state}|${now()}`), id);
  appendAudit({ citizenId: consent.citizen_id, action: `consent_${state}`, actor: consent.citizen_id, target: id, targetType: 'consent', details: `Consentement ${state} pour ${consent.service_name}` });
  return { id, status: state };
});

app.post('/api/v1/iot/devices', async (request) => {
  const body = z.object({ citizenId: z.string(), did: z.string(), name: z.string(), manufacturer: z.string(), model: z.string(), transport: z.string(), bleAddress: z.string().optional(), services: z.array(z.string()).default([]), metadata: z.record(z.unknown()).default({}) }).parse(request.body);
  const id = `device:${randomUUID()}`;
  db.prepare('INSERT INTO devices (id,citizen_id,did,name,manufacturer,model,transport,ble_address,status,services_json,paired_at,last_seen,metadata_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,body.citizenId,body.did,body.name,body.manufacturer,body.model,body.transport,body.bleAddress ?? null,'online',json(body.services),now(),now(),json(body.metadata));
  appendAudit({ citizenId: body.citizenId, action: 'device_paired', actor: body.citizenId, target: id, targetType: 'device', details: `Appairage de l’objet ${body.name}` });
  return { id, status: 'online' };
});

app.get('/api/v1/iot/devices/:citizenId', async (request) => {
  const { citizenId } = z.object({ citizenId: z.string() }).parse(request.params);
  return db.prepare('SELECT * FROM devices WHERE citizen_id=? ORDER BY paired_at DESC').all(citizenId).map((x: any) => ({ ...x, services: parseJson(x.services_json), metadata: parseJson(x.metadata_json) }));
});

app.get('/api/v1/iot/measurements/:citizenId', async (request) => {
  const { citizenId } = z.object({ citizenId: z.string() }).parse(request.params);
  return db.prepare('SELECT * FROM measurements WHERE citizen_id=? ORDER BY received_at DESC LIMIT 100').all(citizenId);
});

app.post('/api/v1/iot/measurements', async (request, reply) => {
  const body = z.object({ citizenId: z.string(), deviceId: z.string(), consentId: z.string().optional(), metric: z.string(), value: z.union([z.string(),z.number()]), unit: z.string(), source: z.string(), rawPacket: z.string().optional(), signature: z.string().optional() }).parse(request.body);
  if (body.consentId) {
    const consent = db.prepare("SELECT status,conditions_json,expires_at FROM consents WHERE id=? AND citizen_id=?").get(body.consentId,body.citizenId) as any;
    if (!consent || consent.status !== 'granted' || new Date(consent.expires_at) < new Date()) return reply.code(403).send({ error: 'CONSENT_NOT_ACTIVE' });
  }
  const id = `measurement:${randomUUID()}`;
  const receivedAt = now();
  db.prepare('INSERT INTO measurements (id,citizen_id,device_id,consent_id,metric,value,unit,source,received_at,raw_packet,signature,encrypted_payload) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(id,body.citizenId,body.deviceId,body.consentId ?? null,body.metric,String(body.value),body.unit,body.source,receivedAt,body.rawPacket ?? null,body.signature ?? null,sha256(json(body)));
  appendAudit({ citizenId: body.citizenId, action: 'data_collected', actor: body.deviceId, target: id, targetType: 'data', details: `${body.metric} reçue : ${body.value} ${body.unit}` });
  return { id, receivedAt };
});

app.get('/api/v1/audit/:citizenId', async (request) => {
  const { citizenId } = z.object({ citizenId: z.string() }).parse(request.params);
  return db.prepare('SELECT * FROM audit_events WHERE citizen_id=? ORDER BY timestamp DESC').all(citizenId).map((x: any) => ({ ...x, metadata: parseJson(x.metadata_json) }));
});

app.get('/api/v1/audit/:citizenId/verify', async (request) => {
  const { citizenId } = z.object({ citizenId: z.string() }).parse(request.params);
  const events = db.prepare('SELECT * FROM audit_events WHERE citizen_id=? ORDER BY timestamp ASC').all(citizenId) as any[];
  let previous = '0'.repeat(64); let valid = true;
  for (const event of events) {
    const canonical = json({ timestamp: event.timestamp, action: event.action, actor: event.actor, target: event.target, targetType: event.target_type, details: event.details, previousHash: previous });
    if (event.previous_hash !== previous || event.hash !== sha256(canonical)) { valid = false; break; }
    previous = event.hash;
  }
  return { valid, checkedEvents: events.length, lastHash: previous };
});

app.post('/api/v1/data/:citizenId/export', async (request, reply) => {
  const { citizenId } = z.object({ citizenId: z.string() }).parse(request.params);
  const citizen = db.prepare('SELECT id,npi,did,first_name,last_name,created_at FROM citizens WHERE id=?').get(citizenId);
  if (!citizen) return reply.code(404).send({ error: 'CITIZEN_NOT_FOUND' });
  const payload = { citizen, credentials: db.prepare('SELECT * FROM credentials WHERE citizen_id=?').all(citizenId), consents: db.prepare('SELECT * FROM consents WHERE citizen_id=?').all(citizenId), devices: db.prepare('SELECT * FROM devices WHERE citizen_id=?').all(citizenId), measurements: db.prepare('SELECT * FROM measurements WHERE citizen_id=?').all(citizenId), exportedAt: now(), format: 'JSON' };
  appendAudit({ citizenId, action: 'data_exported', actor: citizenId, target: 'all-data', targetType: 'data', details: 'Export complet des données personnelles' });
  reply.header('Content-Disposition', `attachment; filename="midas-export-${Date.now()}.json"`).type('application/json');
  return payload;
});

app.post('/api/v1/data/:citizenId/erase', async (request, reply) => {
  const { citizenId } = z.object({ citizenId: z.string() }).parse(request.params);
  const citizen = db.prepare('SELECT id FROM citizens WHERE id=?').get(citizenId);
  if (!citizen) return reply.code(404).send({ error: 'CITIZEN_NOT_FOUND' });
  transaction(() => {
    db.prepare('DELETE FROM measurements WHERE citizen_id=?').run(citizenId);
    db.prepare('DELETE FROM devices WHERE citizen_id=?').run(citizenId);
    db.prepare('DELETE FROM consents WHERE citizen_id=?').run(citizenId);
    db.prepare('UPDATE citizens SET status=? WHERE id=?').run('erased', citizenId);
    appendAudit({ citizenId, action: 'data_erased', actor: citizenId, target: 'all-data', targetType: 'data', details: 'Effacement local des données du citoyen' });
  });
  return { status: 'erased', completedAt: now() };
});

// Au redémarrage, les citoyens déjà enrôlés récupèrent leurs capteurs de démonstration.
for (const citizen of db.prepare("SELECT id FROM citizens WHERE status='active'").all() as Array<{ id: string }>) {
  transaction(() => seedSimulationDevices(citizen.id));
}

// Les capteurs de démonstration produisent des mesures nouvelles toutes les 15 secondes.
// La montre AMIS réelle n'est jamais simulée par cette tâche : ses données viennent du BLE.
setInterval(runSensorSimulation, 15_000);

const port = Number(process.env.PORT ?? 3443);
await app.listen({ port, host: '0.0.0.0' });
