import type { Citizen, VerifiableCredential } from '../types';

export class MidasApiError extends Error {}

const normalizeUrl = (url: string) => url.replace(/\/$/, '');

/**
 * Le PC peut recevoir l'adresse .199 ou .200 via DHCP. L'application tente
 * automatiquement les deux adresses connues et mémorise celle qui répond.
 * Une URL saisie manuellement dans localStorage reste prioritaire.
 */
export function backendCandidates() {
  const nativeUrl = window.AndroidMIDAS?.getBackendBaseUrl?.();
  const savedUrl = localStorage.getItem('midas:backend-url');
  return [...new Set([
    savedUrl,
    nativeUrl,
    'https://192.168.1.199:3443',
    'https://192.168.1.200:3443',
    'https://10.0.2.2:3443',
  ].filter((url): url is string => Boolean(url)).map(normalizeUrl))];
}

export function backendUrl() {
  return backendCandidates()[0];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let lastNetworkError: unknown;
  for (const baseUrl of backendCandidates()) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
        ...init,
      });
      const body = await response.json().catch(() => ({}));
      // Une réponse HTTP prouve que le bon serveur a été atteint : ne pas basculer
      // vers un autre PC en cas d'erreur métier (NPI déjà enrôlé, consentement, etc.).
      if (!response.ok) throw new MidasApiError(body.error || body.message || `Erreur backend HTTP ${response.status}`);
      localStorage.setItem('midas:backend-url', baseUrl);
      return body as T;
    } catch (error) {
      if (error instanceof MidasApiError) throw error;
      lastNetworkError = error;
    }
  }
  throw new MidasApiError(`Backend inaccessible. Adresses testées : ${backendCandidates().join(', ')}. ${String(lastNetworkError ?? '')}`);
}

type EnrollmentResponse = {
  citizen: { id: string; npi: string; did: string; firstName: string; lastName: string; createdAt: string };
  credential: { id: string; type: VerifiableCredential['type']; issuer: string; claims: Record<string, string>; issuedAt: string; expiresAt: string; status: VerifiableCredential['status']; signature?: string };
};

export async function enrollOnBackend(npi: string, did: string): Promise<{ citizen: Citizen; credentials: VerifiableCredential[] }> {
  const result = await request<EnrollmentResponse>('/api/v1/enrollment', { method: 'POST', body: JSON.stringify({ npi, did }) });
  const credential: VerifiableCredential = {
    ...result.credential,
    signature: result.credential.signature || `backend-demo-signature-${result.credential.id}`,
  };
  return {
    citizen: {
      id: result.citizen.id,
      npi: result.citizen.npi.replace(/(\d{4})(?=\d)/g, '$1-'),
      did: result.citizen.did,
      name: result.citizen.lastName,
      firstName: result.citizen.firstName,
      dateOfBirth: '1990-01-01',
      placeOfBirth: 'Porto-Novo',
      address: 'Adresse non renseignée — démonstration',
      phone: '+229 00 00 00 00',
      email: 'citoyen.demo@midas.local',
      biometricHash: 'android-biometric-local-only',
      createdAt: result.citizen.createdAt,
      credentials: [credential],
    },
    credentials: [credential],
  };
}

export async function registerBleDevice(input: { citizenId: string; did: string; address: string; services: string[] }) {
  return request<{ id: string; status: string }>('/api/v1/iot/devices', {
    method: 'POST',
    body: JSON.stringify({
      citizenId: input.citizenId, did: input.did, name: 'AMIS Watch5GTR', manufacturer: 'AMIS', model: 'Watch5GTR',
      transport: 'BLE/GATT', bleAddress: input.address, services: input.services,
      metadata: { protocol: 'RDFit', mode: 'academic-demo' },
    }),
  });
}

export async function postWatchMeasurement(input: { citizenId: string; deviceId: string; metric: string; value: string; unit: string; rawPacket?: string }) {
  return request<{ id: string; receivedAt: string }>('/api/v1/iot/measurements', {
    method: 'POST',
    body: JSON.stringify({ citizenId: input.citizenId, deviceId: input.deviceId, metric: input.metric, value: input.value, unit: input.unit, source: 'AMIS Watch5GTR', rawPacket: input.rawPacket }),
  });
}

export async function checkBackend() {
  return request<{ status: string; time: string }>('/health');
}
