import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Citizen, Consent, IoTDevice, AuditLogEntry, EService, Notification, VerifiableCredential } from '../types';
import { 
  mockCitizen, 
  mockCredentials, 
  mockConsents, 
  mockDevices, 
  mockEServices, 
  mockAuditLog, 
  mockNotifications,
  createAuditEntry
} from '../data/mockData';

interface AppContextType {
  // State
  citizen: Citizen;
  credentials: VerifiableCredential[];
  consents: Consent[];
  devices: IoTDevice[];
  eServices: EService[];
  auditLog: AuditLogEntry[];
  notifications: Notification[];
  
  // Actions
  grantConsent: (consentId: string, conditions: Consent['conditions']) => void;
  revokeConsent: (consentId: string) => void;
  denyConsent: (consentId: string) => void;
  pairDevice: (device: IoTDevice) => void;
  unpairDevice: (deviceId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  addAuditEntry: (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'hash' | 'previousHash'>) => void;
  exportData: () => Promise<string>;
  deleteAllData: () => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

function nextSimulatedReading(device: IoTDevice, timestamp: string) {
  const previous = device.lastReading?.value;
  if (device.id === 'device-001') {
    const value = Math.round(clamp((previous ?? 120) + randomBetween(-4, 4), 105, 135));
    return { timestamp, value, unit: 'mmHg', type: 'systolic_pressure', encrypted: true, signature: `sim-${Date.now().toString(16)}` };
  }
  if (device.id === 'device-002') {
    const value = Math.round(clamp((previous ?? 95) + randomBetween(-6, 6), 75, 130));
    return { timestamp, value, unit: 'mg/dL', type: 'blood_glucose', encrypted: true, signature: `sim-${Date.now().toString(16)}` };
  }
  if (device.id === 'device-003') {
    const value = Number(clamp((previous ?? 28.5) + randomBetween(-0.8, 0.8), 20, 38).toFixed(1));
    return { timestamp, value, unit: '°C', type: 'soil_temperature', encrypted: true, signature: `sim-${Date.now().toString(16)}` };
  }
  return device.lastReading;
}

export function AppProvider({ children, enrolledCitizen, enrolledCredentials }: { children: ReactNode; enrolledCitizen?: Citizen; enrolledCredentials?: VerifiableCredential[] }) {
  const [citizen] = useState<Citizen>(enrolledCitizen ?? { ...mockCitizen, credentials: mockCredentials });
  const [credentials] = useState<VerifiableCredential[]>(enrolledCredentials ?? mockCredentials);
  const [consents, setConsents] = useState<Consent[]>(mockConsents);
  const [devices, setDevices] = useState<IoTDevice[]>(mockDevices);
  const [eServices] = useState<EService[]>(mockEServices);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(mockAuditLog);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  // Simulation en temps réel : les capteurs en ligne produisent une mesure toutes
  // les 15 secondes. L'objet hors ligne reste volontairement figé.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const timestamp = new Date().toISOString();
      setDevices(previous => previous.map(device => {
        if (device.status !== 'online' || device.id.startsWith('amis-watch-')) return device;
        return {
          ...device,
          lastSeen: timestamp,
          lastReading: nextSimulatedReading(device, timestamp),
          batteryLevel: device.batteryLevel === undefined ? undefined : Math.max(5, device.batteryLevel - (Math.random() < 0.08 ? 1 : 0)),
        };
      }));
    }, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const addAuditEntry = useCallback((entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'hash' | 'previousHash'>) => {
    const previousHash = auditLog.length > 0 ? auditLog[0].hash : '0'.repeat(64);
    const newEntry = createAuditEntry(
      entry.action,
      entry.actor,
      entry.actorType,
      entry.target,
      entry.targetType,
      entry.details,
      previousHash
    );
    setAuditLog(prev => [newEntry, ...prev]);
  }, [auditLog]);

  const grantConsent = useCallback((consentId: string, conditions: Consent['conditions']) => {
    setConsents(prev => prev.map(c => {
      if (c.id === consentId) {
        const updated: Consent = {
          ...c,
          status: 'granted',
          grantedAt: new Date().toISOString(),
          conditions,
          signature: Array.from({length: 128}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        };
        
        addAuditEntry({
          action: 'consent_granted',
          actor: citizen.id,
          actorType: 'citizen',
          target: consentId,
          targetType: 'consent',
          details: `Consentement accordé à ${c.serviceName}`,
          blockchainAnchor: `iroha:block:${Date.now()}`,
        });
        
        return updated;
      }
      return c;
    }));
  }, [citizen.id, addAuditEntry]);

  const revokeConsent = useCallback((consentId: string) => {
    setConsents(prev => prev.map(c => {
      if (c.id === consentId) {
        addAuditEntry({
          action: 'consent_revoked',
          actor: citizen.id,
          actorType: 'citizen',
          target: consentId,
          targetType: 'consent',
          details: `Consentement révoqué pour ${c.serviceName}`,
          blockchainAnchor: `iroha:block:${Date.now()}`,
        });
        
        return {
          ...c,
          status: 'revoked' as const,
          revokedAt: new Date().toISOString(),
        };
      }
      return c;
    }));
  }, [citizen.id, addAuditEntry]);

  const denyConsent = useCallback((consentId: string) => {
    setConsents(prev => prev.map(c => {
      if (c.id === consentId) {
        addAuditEntry({
          action: 'consent_denied',
          actor: citizen.id,
          actorType: 'citizen',
          target: consentId,
          targetType: 'consent',
          details: `Consentement refusé pour ${c.serviceName}`,
          blockchainAnchor: `iroha:block:${Date.now()}`,
        });
        
        return {
          ...c,
          status: 'denied' as const,
        };
      }
      return c;
    }));
  }, [citizen.id, addAuditEntry]);

  const pairDevice = useCallback((device: IoTDevice) => {
    setDevices(prev => [...prev, device]);
    
    addAuditEntry({
      action: 'device_paired',
      actor: citizen.id,
      actorType: 'citizen',
      target: device.id,
      targetType: 'device',
      details: `Appairage de l'appareil ${device.name}`,
      blockchainAnchor: `iroha:block:${Date.now()}`,
    });
  }, [citizen.id, addAuditEntry]);

  const unpairDevice = useCallback((deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    
    if (device) {
      addAuditEntry({
        action: 'device_unpaired',
        actor: citizen.id,
        actorType: 'citizen',
        target: deviceId,
        targetType: 'device',
        details: `Suppression de l'appareil ${device.name}`,
        blockchainAnchor: `iroha:block:${Date.now()}`,
      });
    }
  }, [citizen.id, devices, addAuditEntry]);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const exportData = useCallback(async (): Promise<string> => {
    // Simulate export delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const exportData = {
      citizen,
      credentials,
      consents,
      devices,
      auditLog,
      exportedAt: new Date().toISOString(),
      format: 'JSON',
      version: '1.0',
    };
    
    addAuditEntry({
      action: 'data_exported',
      actor: citizen.id,
      actorType: 'citizen',
      target: 'all-data',
      targetType: 'data',
      details: 'Export complet des données personnelles',
      blockchainAnchor: `iroha:block:${Date.now()}`,
    });
    
    return JSON.stringify(exportData, null, 2);
  }, [citizen, credentials, consents, devices, auditLog, addAuditEntry]);

  const deleteAllData = useCallback(async (): Promise<boolean> => {
    // Simulate deletion delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    addAuditEntry({
      action: 'data_deleted',
      actor: citizen.id,
      actorType: 'citizen',
      target: 'all-data',
      targetType: 'data',
      details: 'Demande de suppression de toutes les données',
      blockchainAnchor: `iroha:block:${Date.now()}`,
    });
    
    return true;
  }, [citizen.id, addAuditEntry]);

  return (
    <AppContext.Provider value={{
      citizen,
      credentials,
      consents,
      devices,
      eServices,
      auditLog,
      notifications,
      grantConsent,
      revokeConsent,
      denyConsent,
      pairDevice,
      unpairDevice,
      markNotificationRead,
      markAllNotificationsRead,
      addAuditEntry,
      exportData,
      deleteAllData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
