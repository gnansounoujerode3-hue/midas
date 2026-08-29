import { useEffect, useState } from 'react';
import { 
  Cpu, Plus, Wifi, WifiOff, Battery, 
  MapPin, Clock, Shield, CheckCircle2,
  AlertTriangle, Trash2, RefreshCw, Activity,
  X, QrCode, Bluetooth
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { IoTDevice } from '../types';
import { DeviceIcon } from '../components/ServiceIcon';

declare global {
  interface Window {
    AndroidMIDAS?: {
      scanAmisWatch: () => void;
      connectAmisWatch: () => void;
      disconnectAmisWatch: () => void;
      requestHeartRate: () => void;
      requestSpo2: () => void;
      requestBloodPressure: () => void;
      findAmisWatch: () => void;
      getBackendBaseUrl?: () => string;
    };
  }
}

type BlePayload = { type: string; payload: { name?: string; address?: string; rssi?: number; message?: string; hex?: string; uuid?: string; label?: string; value?: string; unit?: string; type?: string } };

export default function Devices() {
  const { devices, pairDevice, unpairDevice, addAuditEntry } = useApp();
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [pairingStep, setPairingStep] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [syncingDeviceId, setSyncingDeviceId] = useState<string | null>(null);
  const [watchAddress, setWatchAddress] = useState<string | null>(null);
  const [watchStatus, setWatchStatus] = useState('Prêt à rechercher la montre AMIS');
  const [watchConnected, setWatchConnected] = useState(false);
  const [watchMeasurements, setWatchMeasurements] = useState<Record<string, { label: string; value: string; unit: string; timestamp: number }>>({});

  useEffect(() => {
    if (!window.AndroidMIDAS) {
      setWatchStatus('Module Bluetooth Android absent : reconstruisez et réinstallez l’APK.');
    }
    const onBleEvent = (event: Event) => {
      const detail = (event as CustomEvent<BlePayload>).detail;
      if (!detail) return;
      const { type, payload } = detail;
      if (type === 'ble_scanning' || type === 'ble_connecting') setWatchStatus(payload.message || 'Connexion en cours…');
      if (type === 'ble_watch_found') { setWatchAddress(payload.address || null); setWatchStatus(`Montre détectée (${payload.rssi ?? '?'} dBm)`); }
      if (type === 'ble_not_found') { setWatchAddress(null); setWatchStatus(payload.message || 'Montre AMIS non détectée.'); }
      if (type === 'ble_connected') {
        const address = payload.address || watchAddress || 'inconnue';
        setWatchConnected(true);
        setWatchStatus('Connectée — découverte des services GATT…');
        const id = `amis-watch-${address.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
        if (!devices.some(d => d.id === id)) {
          pairDevice({ id, did: `did:midas:benin:iot:amis-${address.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`, name: 'AMIS Watch5GTR', type: 'medical', category: 'Santé / Wearable', manufacturer: 'AMIS', model: 'Watch5GTR', firmwareVersion: 'RDFit propriétaire', firmwareSignature: 'gatt-services-discovered', status: 'online', lastSeen: new Date().toISOString(), batteryLevel: undefined, location: 'Portée Bluetooth', publicKey: 'ble-gatt-local-identity', attestationStatus: 'pending', pairedAt: new Date().toISOString() });
          addAuditEntry({ action: 'device_paired', actor: 'citizen-mobile', actorType: 'citizen', target: id, targetType: 'device', details: `Connexion BLE réelle de la montre AMIS (${address})`, blockchainAnchor: `midas:ble:${Date.now()}` });
        }
      }
      if (type === 'ble_services') setWatchStatus('Connectée — services propriétaires et notifications activés.');
      if (type === 'ble_command_sent') setWatchStatus(payload.message || 'Commande envoyée à la montre.');
      if (type === 'ble_measurement' && payload.type && payload.label && payload.value && payload.unit) {
        setWatchMeasurements(prev => ({ ...prev, [payload.type!]: { label: payload.label!, value: payload.value!, unit: payload.unit!, timestamp: Date.now() } }));
        addAuditEntry({ action: 'data_collected', actor: 'amis-watch', actorType: 'device', target: payload.type, targetType: 'data', details: `${payload.label} reçue : ${payload.value} ${payload.unit}`, blockchainAnchor: `midas:ble:${Date.now()}` });
      }
      if (type === 'ble_packet') { setWatchStatus(`Paquet BLE reçu (${payload.uuid?.slice(0, 8) || 'UUID'})`); addAuditEntry({ action: 'data_collected', actor: 'amis-watch', actorType: 'device', target: 'watch-measurement', targetType: 'data', details: `Paquet BLE AMIS reçu : ${payload.hex?.slice(0, 32) || ''}`, blockchainAnchor: `midas:ble:${Date.now()}` }); }
      if (type === 'ble_disconnected') { setWatchConnected(false); setWatchStatus(payload.message || 'Montre déconnectée'); }
      if (type === 'ble_error') setWatchStatus(payload.message || 'Erreur Bluetooth');
    };
    window.addEventListener('midas:ble', onBleEvent);
    return () => window.removeEventListener('midas:ble', onBleEvent);
  }, [addAuditEntry, devices, pairDevice, watchAddress]);

  const onlineDevices = devices.filter(d => d.status === 'online');
  const offlineDevices = devices.filter(d => d.status === 'offline');

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatLastSeen = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`;
    return formatDate(dateStr);
  };

  const renderDeviceIcon = (type: string, className: string = 'w-7 h-7') => {
    return <DeviceIcon type={type} className={className} />;
  };

  const handleStartPairing = () => {
    setShowPairingModal(true);
    setPairingStep(0);
    setTimeout(() => setPairingStep(1), 1500);
    setTimeout(() => setPairingStep(2), 3000);
    setTimeout(() => setPairingStep(3), 4500);
  };

  const handleCompletePairing = () => {
    const newDevice: IoTDevice = {
      id: `device-${Date.now()}`,
      did: `did:midas:benin:iot${Math.random().toString(36).substring(2, 10)}`,
      name: 'Nouveau Capteur',
      type: 'sensor',
      category: 'Environnement',
      manufacturer: 'MIDAS Sensors',
      model: 'MS-100',
      firmwareVersion: '1.0.0',
      firmwareSignature: Array.from({length: 128}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      status: 'online',
      lastSeen: new Date().toISOString(),
      batteryLevel: 100,
      location: 'Non défini',
      publicKey: Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      attestationStatus: 'verified',
      pairedAt: new Date().toISOString(),
    };
    pairDevice(newDevice);
    setShowPairingModal(false);
    setPairingStep(0);
  };

  const handleUnpair = (deviceId: string) => {
    if (confirm('Êtes-vous sûr de vouloir dissocier cet appareil ?')) {
      unpairDevice(deviceId);
    }
  };

  const startRealWatchScan = () => {
    if (!window.AndroidMIDAS) { alert('La connexion BLE réelle est disponible uniquement dans l’application Android MIDAS-Bénin.'); return; }
    window.AndroidMIDAS.scanAmisWatch();
  };

  const connectRealWatch = () => {
    if (!window.AndroidMIDAS) return;
    window.AndroidMIDAS.connectAmisWatch();
  };

  const disconnectRealWatch = () => window.AndroidMIDAS?.disconnectAmisWatch();

  const controlWatch = (action: 'heart' | 'spo2' | 'pressure' | 'find') => {
    if (!window.AndroidMIDAS || !watchConnected) { setWatchStatus('Connectez d’abord la montre AMIS.'); return; }
    if (action === 'heart') window.AndroidMIDAS.requestHeartRate();
    if (action === 'spo2') window.AndroidMIDAS.requestSpo2();
    if (action === 'pressure') window.AndroidMIDAS.requestBloodPressure();
    if (action === 'find') window.AndroidMIDAS.findAmisWatch();
  };

  const handleSync = (device: IoTDevice) => {
    setSyncingDeviceId(device.id);
    setTimeout(() => {
      setSyncingDeviceId(null);
      setSelectedDevice((current) => current?.id === device.id ? { ...current, lastSeen: new Date().toISOString() } : current);
      alert(`Synchronisation simulée réussie avec ${device.name}. Les données ont été vérifiées et chiffrées.`);
    }, 1200);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Objets IoT Connectés</h1>
          <p className="text-slate-500 mt-1">Gérez vos appareils IoT appairés de manière sécurisée</p>
          <p className="text-xs text-emerald-700 mt-2">Simulation active : les capteurs en ligne actualisent leurs mesures toutes les 15 secondes.</p>
        </div>
        <button onClick={handleStartPairing} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg transition-all">
          <Plus className="w-5 h-5" />
          Appairer un appareil
        </button>
      </div>

      <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3"><div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center"><Bluetooth className="w-6 h-6 text-emerald-600" /></div><div><h2 className="font-semibold text-slate-800">AMIS Watch5GTR — connexion BLE réelle</h2><p className="text-sm text-slate-600 mt-1">{watchStatus}{watchAddress ? ` • ${watchAddress}` : ''}</p></div></div>
          <div className="flex gap-2">
            {!watchAddress && <button onClick={startRealWatchScan} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg"><Bluetooth className="w-4 h-4" />Rechercher</button>}
            {watchAddress && !watchConnected && <button onClick={connectRealWatch} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg"><Bluetooth className="w-4 h-4" />Connecter</button>}
            {watchConnected && <button onClick={disconnectRealWatch} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-slate-800 text-white"><WifiOff className="w-4 h-4" />Déconnecter</button>}
          </div>
        </div>
        <p className="mt-3 text-xs text-emerald-700">Canaux GATT surveillés : 6e40ab03, A202, FEA1, 4A02 et c551c36a. Les valeurs affichées sont des indicateurs de bien-être issus d’une montre grand public.</p>
        {watchConnected && <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            <button onClick={() => controlWatch('heart')} className="px-3 py-2 rounded-xl bg-white text-emerald-700 font-medium text-sm border border-emerald-200">Rythme cardiaque</button>
            <button onClick={() => controlWatch('spo2')} className="px-3 py-2 rounded-xl bg-white text-emerald-700 font-medium text-sm border border-emerald-200">SpO2</button>
            <button onClick={() => controlWatch('pressure')} className="px-3 py-2 rounded-xl bg-white text-emerald-700 font-medium text-sm border border-emerald-200">Tension estimée</button>
            <button onClick={() => controlWatch('find')} className="px-3 py-2 rounded-xl bg-white text-emerald-700 font-medium text-sm border border-emerald-200">Faire vibrer</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {Object.values(watchMeasurements).length === 0 ? <p className="sm:col-span-3 text-sm text-emerald-700">Aucune mesure reçue. Choisissez une mesure ci-dessus.</p> : Object.entries(watchMeasurements).map(([key, value]) => <div key={key} className="bg-white rounded-xl border border-emerald-200 p-3"><p className="text-xs text-slate-500">{value.label}</p><p className="text-xl font-bold text-emerald-700">{value.value} <span className="text-sm">{value.unit}</span></p><p className="text-xs text-slate-400">{new Date(value.timestamp).toLocaleTimeString('fr-FR')}</p></div>)}
          </div>
        </>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{onlineDevices.length}</p>
              <p className="text-sm text-slate-500">En ligne</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <WifiOff className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{offlineDevices.length}</p>
              <p className="text-sm text-slate-500">Hors ligne</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{devices.filter(d => d.attestationStatus === 'verified').length}</p>
              <p className="text-sm text-slate-500">Vérifiés</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{devices.filter(d => d.lastReading).length}</p>
              <p className="text-sm text-slate-500">Actifs</p>
            </div>
          </div>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Cpu className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold text-slate-600 mb-2">Aucun appareil connecté</h3>
          <p className="text-slate-500 mb-6">Commencez par appairer votre premier objet IoT</p>
          <button onClick={handleStartPairing} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg transition-all">
            <Plus className="w-5 h-5" />
            Appairer un appareil
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {devices.map((device) => (
            <div key={device.id} className={`bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all cursor-pointer ${device.status === 'offline' ? 'opacity-75' : ''}`} onClick={() => setSelectedDevice(device)}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center ${device.status === 'online' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                      {renderDeviceIcon(device.type, `w-7 h-7 ${device.status === 'online' ? 'text-emerald-600' : 'text-slate-500'}`)}
                      {device.status === 'online' && <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{device.name}</h3>
                      <p className="text-sm text-slate-500">{device.manufacturer}</p>
                    </div>
                  </div>
                  {device.attestationStatus === 'verified' && <Shield className="w-5 h-5 text-emerald-500" />}
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{device.location}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{formatLastSeen(device.lastSeen)}</span>
                    {device.batteryLevel !== undefined && (
                      <span className={`flex items-center gap-1 ${device.batteryLevel < 20 ? 'text-red-500' : device.batteryLevel < 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        <Battery className="w-4 h-4" />{device.batteryLevel}%
                      </span>
                    )}
                  </div>
                </div>

                {device.lastReading && (
                  <div className="bg-slate-50 rounded-xl p-3 mb-4">
                    <p className="text-xs text-slate-500 mb-1">Dernière mesure</p>
                    <p className="text-lg font-bold text-slate-800">{device.lastReading.value} {device.lastReading.unit}</p>
                    <p className="text-xs text-slate-400">{formatLastSeen(device.lastReading.timestamp)}</p>
                  </div>
                )}

                {device.batteryLevel !== undefined && device.batteryLevel < 20 && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-2 mb-4">
                    <AlertTriangle className="w-4 h-4" />Batterie faible
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); handleSync(device); }} disabled={syncingDeviceId === device.id} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all text-sm disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${syncingDeviceId === device.id ? 'animate-spin' : ''}`} />{syncingDeviceId === device.id ? 'Sync...' : 'Sync'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleUnpair(device.id); }} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-red-600 hover:bg-red-50 transition-all text-sm">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPairingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPairingModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Appairer un appareil</h2>
              <button onClick={() => setShowPairingModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8">
              {pairingStep < 3 ? (
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                    {pairingStep === 0 && <QrCode className="w-16 h-16 text-emerald-600" />}
                    {pairingStep === 1 && <Bluetooth className="w-16 h-16 text-blue-600 animate-pulse" />}
                    {pairingStep === 2 && <Shield className="w-16 h-16 text-emerald-600 animate-pulse" />}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    {pairingStep === 0 && 'Scannez le QR code de l\'appareil'}
                    {pairingStep === 1 && 'Connexion BLE en cours...'}
                    {pairingStep === 2 && 'Vérification de l\'attestation...'}
                  </h3>
                  <p className="text-slate-500 mb-6">
                    {pairingStep === 0 && 'Approchez votre téléphone du QR code'}
                    {pairingStep === 1 && 'Échange de clés Curve25519 sécurisé'}
                    {pairingStep === 2 && 'Validation du certificat firmware'}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {[0, 1, 2].map((step) => (<div key={step} className={`w-3 h-3 rounded-full transition-colors ${step <= pairingStep ? 'bg-emerald-500' : 'bg-slate-200'}`} />))}
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">Appairage réussi!</h3>
                  <p className="text-slate-500 mb-6">L'appareil a été vérifié et ajouté.</p>
                  <div className="bg-slate-50 rounded-xl p-4 text-left mb-6 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Protocole</span><span className="text-slate-700 font-medium">BLE + ECDH</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Chiffrement</span><span className="text-slate-700 font-medium">ChaCha20-Poly1305</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Attestation</span><span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Vérifié</span></div>
                  </div>
                  <button onClick={handleCompletePairing} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg transition-all">Terminer</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedDevice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedDevice(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedDevice.status === 'online' ? 'bg-emerald-100' : 'bg-slate-100'}`}>{renderDeviceIcon(selectedDevice.type, `w-7 h-7 ${selectedDevice.status === 'online' ? 'text-emerald-600' : 'text-slate-500'}`)}</div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedDevice.name}</h2>
                  <p className="text-slate-500">{selectedDevice.manufacturer} - {selectedDevice.model}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDevice(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <span className={`px-4 py-2 rounded-full font-medium ${selectedDevice.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                  {selectedDevice.status === 'online' ? <><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />En ligne</> : <><span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400 mr-2" />Hors ligne</>}
                </span>
                {selectedDevice.attestationStatus === 'verified' && <span className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Attestation vérifiée</span>}
              </div>
              <div>
                <label className="text-sm text-slate-500">Identifiant DID</label>
                <p className="font-mono text-sm bg-slate-50 rounded-lg p-3 mt-1 break-all">{selectedDevice.did}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-slate-500">Firmware</label><p className="font-medium text-slate-800 mt-1">v{selectedDevice.firmwareVersion}</p></div>
                <div><label className="text-sm text-slate-500">Catégorie</label><p className="font-medium text-slate-800 mt-1">{selectedDevice.category}</p></div>
                <div><label className="text-sm text-slate-500">Appairé le</label><p className="font-medium text-slate-800 mt-1">{formatDate(selectedDevice.pairedAt)}</p></div>
                <div><label className="text-sm text-slate-500">Dernière activité</label><p className="font-medium text-slate-800 mt-1">{formatLastSeen(selectedDevice.lastSeen)}</p></div>
              </div>
              {selectedDevice.lastReading && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6">
                  <h4 className="font-semibold text-slate-800 mb-3">Dernière mesure</h4>
                  <div className="flex items-end gap-4">
                    <span className="text-4xl font-bold text-emerald-600">{selectedDevice.lastReading.value}</span>
                    <span className="text-xl text-slate-600 mb-1">{selectedDevice.lastReading.unit}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-2">{formatLastSeen(selectedDevice.lastReading.timestamp)}</p>
                  <div className="flex items-center gap-2 mt-3 text-sm text-emerald-700"><Shield className="w-4 h-4" />Donnée chiffrée et signée</div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => handleSync(selectedDevice)} disabled={syncingDeviceId === selectedDevice.id} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${syncingDeviceId === selectedDevice.id ? 'animate-spin' : ''}`} />{syncingDeviceId === selectedDevice.id ? 'Synchronisation...' : 'Synchroniser'}</button>
              <button onClick={() => { handleUnpair(selectedDevice.id); setSelectedDevice(null); }} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 shadow-lg transition-all"><Trash2 className="w-4 h-4" />Dissocier</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
