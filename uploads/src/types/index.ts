// Types for MIDAS-Bénin Application

export interface Citizen {
  id: string;
  npi: string;
  did: string;
  name: string;
  firstName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  address: string;
  phone: string;
  email: string;
  biometricHash: string;
  createdAt: string;
  credentials: VerifiableCredential[];
}

export interface VerifiableCredential {
  id: string;
  type: 'identity' | 'health' | 'education' | 'professional' | 'residence';
  issuer: string;
  issuedAt: string;
  expiresAt: string;
  status: 'valid' | 'expired' | 'revoked';
  claims: Record<string, string>;
  signature: string;
}

export interface Consent {
  id: string;
  citizenId: string;
  serviceId: string;
  serviceName: string;
  serviceProvider: string;
  purpose: string;
  dataTypes: DataType[];
  status: 'pending' | 'granted' | 'denied' | 'revoked' | 'expired';
  grantedAt?: string;
  revokedAt?: string;
  expiresAt: string;
  legalBasis: string;
  signature?: string;
  conditions: ConsentCondition[];
}

export interface ConsentCondition {
  dataType: string;
  allowed: boolean;
  purpose: string;
}

export interface DataType {
  id: string;
  name: string;
  category: 'identity' | 'health' | 'location' | 'financial' | 'biometric' | 'behavioral';
  sensitive: boolean;
  description: string;
}

export interface IoTDevice {
  id: string;
  did: string;
  name: string;
  type: 'sensor' | 'actuator' | 'medical' | 'environmental' | 'biometric';
  category: string;
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  firmwareSignature: string;
  status: 'online' | 'offline' | 'pairing' | 'error';
  lastSeen: string;
  batteryLevel?: number;
  location?: string;
  publicKey: string;
  attestationStatus: 'verified' | 'pending' | 'failed';
  pairedAt: string;
  lastReading?: SensorReading;
}

export interface SensorReading {
  timestamp: string;
  value: number;
  unit: string;
  type: string;
  encrypted: boolean;
  signature: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  actor: string;
  actorType: 'citizen' | 'service' | 'device' | 'system' | 'apdp';
  target: string;
  targetType: 'consent' | 'data' | 'device' | 'credential' | 'account';
  details: string;
  hash: string;
  previousHash: string;
  blockchainAnchor?: string;
  ipAddress?: string;
}

export type AuditAction = 
  | 'consent_granted'
  | 'consent_revoked'
  | 'consent_denied'
  | 'data_accessed'
  | 'data_exported'
  | 'data_deleted'
  | 'device_paired'
  | 'device_unpaired'
  | 'credential_issued'
  | 'credential_verified'
  | 'login'
  | 'logout'
  | 'data_collected'
  | 'data_transmitted';

export interface EService {
  id: string;
  name: string;
  provider: string;
  category: 'health' | 'finance' | 'government' | 'education' | 'transport' | 'agriculture';
  description: string;
  logo: string;
  requiredData: DataType[];
  purposes: string[];
  privacyPolicyUrl: string;
  dpoContact: string;
  status: 'connected' | 'pending' | 'disconnected';
}

export interface Notification {
  id: string;
  type: 'consent_request' | 'data_access' | 'security_alert' | 'device_event' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DataExport {
  id: string;
  requestedAt: string;
  completedAt?: string;
  status: 'processing' | 'ready' | 'expired' | 'failed';
  format: 'json' | 'pdf' | 'csv';
  downloadUrl?: string;
  expiresAt?: string;
}
