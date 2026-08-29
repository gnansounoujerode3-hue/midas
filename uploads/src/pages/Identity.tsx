import { useState } from 'react';
import { 
  Shield, Copy, CheckCircle2, ExternalLink,
  User, Calendar, MapPin, Phone, Mail,
  Fingerprint, Key, Clock, Award
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Identity() {
  const { citizen, credentials } = useApp();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getCredentialIcon = (type: string) => {
    switch (type) {
      case 'identity': return User;
      case 'health': return Shield;
      case 'residence': return MapPin;
      case 'education': return Award;
      default: return Award;
    }
  };

  const getCredentialColor = (type: string) => {
    switch (type) {
      case 'identity': return 'from-blue-500 to-indigo-600';
      case 'health': return 'from-red-500 to-pink-600';
      case 'residence': return 'from-emerald-500 to-teal-600';
      case 'education': return 'from-purple-500 to-violet-600';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  return (
    <div className="identity-page space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Mon Identité Numérique</h1>
        <p className="text-slate-500 mt-1">
          Gérez votre identité décentralisée (DID) et vos attestations vérifiables (VC)
        </p>
      </div>

      {/* DID Card */}
      <div className="card did-card bg-gradient-to-br from-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="did-hero relative p-8">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-32 h-32 border border-white rounded-full" />
            <div className="absolute bottom-4 left-4 w-24 h-24 border border-white rounded-full" />
          </div>

          <div className="relative">
            <div className="identity-summary flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl font-bold">
                {citizen.firstName.charAt(0)}{citizen.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{citizen.firstName} {citizen.name}</h2>
                <p className="text-slate-400">Citoyen béninois vérifié</p>
              </div>
            </div>

            <div className="identity-identifiers grid sm:grid-cols-2 gap-6">
              {/* NPI */}
              <div>
                <p className="text-slate-400 text-sm mb-1">Numéro Personnel d'Identification (NPI)</p>
                <div className="identity-value flex items-center gap-2 min-w-0">
                  <span className="font-mono text-lg truncate">{citizen.npi}</span>
                  <button 
                    onClick={() => copyToClipboard(citizen.npi, 'npi')}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {copiedField === 'npi' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* DID */}
              <div>
                <p className="text-slate-400 text-sm mb-1">Identifiant Décentralisé (DID)</p>
                <div className="identity-value flex items-center gap-2 min-w-0">
                  <span className="font-mono text-sm truncate min-w-0">{citizen.did}</span>
                  <button 
                    onClick={() => copyToClipboard(citizen.did, 'did')}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                  >
                    {copiedField === 'did' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Security badges */}
            <div className="identity-security-badges flex flex-wrap gap-2 mt-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-full text-sm">
                <Shield className="w-4 h-4" />
                TEE Protégé
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                <Key className="w-4 h-4" />
                Ed25519
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                <Fingerprint className="w-4 h-4" />
                Biométrie liée
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" />
            Informations personnelles
          </h2>
        </div>
        <div className="card-body">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="text-sm text-slate-500 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date de naissance
              </label>
              <p className="font-medium text-slate-800 mt-1">{formatDate(citizen.dateOfBirth)}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Lieu de naissance
              </label>
              <p className="font-medium text-slate-800 mt-1">{citizen.placeOfBirth}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Adresse
              </label>
              <p className="font-medium text-slate-800 mt-1">{citizen.address}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Téléphone
              </label>
              <p className="font-medium text-slate-800 mt-1">{citizen.phone}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <p className="font-medium text-slate-800 mt-1">{citizen.email}</p>
            </div>
            <div>
              <label className="text-sm text-slate-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Enrôlement
              </label>
              <p className="font-medium text-slate-800 mt-1">{formatDate(citizen.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Verifiable Credentials */}
      <div>
        <h2 className="credential-heading text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Award className="w-6 h-6 text-emerald-600" />
          Attestations Vérifiables (Verifiable Credentials)
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {credentials.map((credential) => {
            const Icon = getCredentialIcon(credential.type);
            const colorClass = getCredentialColor(credential.type);
            
            return (
              <div key={credential.id} className="card overflow-hidden group hover:shadow-lg transition-shadow">
                <div className={`h-2 bg-gradient-to-r ${colorClass}`} />
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 capitalize">
                        {credential.type === 'identity' ? 'Identité nationale' : 
                         credential.type === 'health' ? 'Carnet de santé' :
                         credential.type === 'residence' ? 'Certificat de résidence' :
                         credential.type}
                      </h3>
                      <span className={`text-xs font-medium ${
                        credential.status === 'valid' ? 'text-emerald-600' :
                        credential.status === 'expired' ? 'text-red-600' :
                        'text-slate-500'
                      }`}>
                        {credential.status === 'valid' ? (
                          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Valide</span>
                        ) : credential.status === 'expired' ? (
                          <span className="flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Expiré</span>
                        ) : (
                          <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Révoqué</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="credential-meta space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Émetteur</span>
                      <span className="text-slate-700 font-medium text-right truncate ml-2 max-w-[60%]">
                        {credential.issuer.split(' - ')[0]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Délivré le</span>
                      <span className="text-slate-700">{formatDate(credential.issuedAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expire le</span>
                      <span className="text-slate-700">{formatDate(credential.expiresAt)}</span>
                    </div>
                  </div>

                  {/* Claims */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">Attributs certifiés</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(credential.claims).map((key) => (
                        <span key={key} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => alert(`Présentation simulée : le credential « ${credential.type} » est présenté de façon sélective à un e-service de démonstration.`)} className="w-full mt-4 btn-outline text-sm">
                    <ExternalLink className="w-4 h-4" />
                    Présenter
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
