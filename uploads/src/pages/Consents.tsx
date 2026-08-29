import { useState } from 'react';
import { 
  FileCheck, CheckCircle2, XCircle, Clock, 
  AlertTriangle, Shield, ChevronRight, X,
  Calendar, Building2, FileText, Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Consent } from '../types';
import { ServiceIcon } from '../components/ServiceIcon';

export default function Consents() {
  const { consents, grantConsent, revokeConsent, denyConsent } = useApp();
  const [selectedConsent, setSelectedConsent] = useState<Consent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [conditions, setConditions] = useState<Consent['conditions']>([]);

  const activeConsents = consents.filter(c => c.status === 'granted');
  const pendingConsents = consents.filter(c => c.status === 'pending');
  const otherConsents = consents.filter(c => !['granted', 'pending'].includes(c.status));

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleViewConsent = (consent: Consent) => {
    setSelectedConsent(consent);
    setConditions(consent.conditions.map(c => ({ ...c })));
    setShowModal(true);
  };

  const handleGrant = () => {
    if (selectedConsent) {
      grantConsent(selectedConsent.id, conditions);
      setShowModal(false);
    }
  };

  const handleDeny = () => {
    if (selectedConsent) {
      denyConsent(selectedConsent.id);
      setShowModal(false);
    }
  };

  const handleRevoke = (consentId: string) => {
    if (confirm('Êtes-vous sûr de vouloir révoquer ce consentement ? Cette action est immédiate.')) {
      revokeConsent(consentId);
    }
  };

  const getStatusBadge = (status: Consent['status']) => {
    const baseClass = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'granted':
        return <span className={`${baseClass} bg-emerald-100 text-emerald-700`}><CheckCircle2 className="w-3 h-3 mr-1" />Actif</span>;
      case 'pending':
        return <span className={`${baseClass} bg-amber-100 text-amber-700`}><Clock className="w-3 h-3 mr-1" />En attente</span>;
      case 'revoked':
        return <span className={`${baseClass} bg-red-100 text-red-700`}><XCircle className="w-3 h-3 mr-1" />Révoqué</span>;
      case 'denied':
        return <span className={`${baseClass} bg-red-100 text-red-700`}><XCircle className="w-3 h-3 mr-1" />Refusé</span>;
      case 'expired':
        return <span className={`${baseClass} bg-slate-100 text-slate-600`}><Clock className="w-3 h-3 mr-1" />Expiré</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Gestion des Consentements</h1>
        <p className="text-slate-500 mt-1">
          Contrôlez l'accès à vos données personnelles conformément à l'article 388 du Code du Numérique
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { count: activeConsents.length, label: 'Actifs', icon: CheckCircle2, color: 'emerald' },
          { count: pendingConsents.length, label: 'En attente', icon: Clock, color: 'amber' },
          { count: otherConsents.length, label: 'Révoqués/Refusés', icon: XCircle, color: 'red' },
          { count: consents.length, label: 'Total', icon: Shield, color: 'blue' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stat.count}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Consents */}
      {pendingConsents.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-200">
            <h2 className="font-semibold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Demandes en attente ({pendingConsents.length})
            </h2>
          </div>
          <div className="divide-y divide-amber-100">
            {pendingConsents.map((consent) => (
              <div key={consent.id} className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-100 shadow-sm flex items-center justify-center">
                      <ServiceIcon category="government" className="w-7 h-7 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{consent.serviceName}</h3>
                      <p className="text-sm text-slate-500">{consent.serviceProvider}</p>
                      <p className="text-xs text-amber-600 mt-1">{consent.purpose}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleViewConsent(consent)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg transition-all"
                  >
                    Examiner
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Consents */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Consentements actifs ({activeConsents.length})
          </h2>
        </div>
        {activeConsents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileCheck className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>Aucun consentement actif</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeConsents.map((consent) => (
              <div key={consent.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      consent.serviceName.includes('Santé') ? 'bg-rose-100' :
                      consent.serviceName.includes('public') ? 'bg-blue-100' : 'bg-amber-100'
                    }`}>
                      <ServiceIcon category={
                        consent.serviceName.includes('Santé') ? 'health' :
                        consent.serviceName.includes('public') ? 'government' : 'transport'
                      } className={`w-6 h-6 ${
                        consent.serviceName.includes('Santé') ? 'text-rose-600' :
                        consent.serviceName.includes('public') ? 'text-blue-600' : 'text-amber-600'
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-800">{consent.serviceName}</h3>
                        {getStatusBadge(consent.status)}
                      </div>
                      <p className="text-sm text-slate-500">{consent.serviceProvider}</p>
                      <p className="text-sm text-slate-600 mt-1">{consent.purpose}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {consent.dataTypes.map((dt) => (
                          <span 
                            key={dt.id} 
                            className={`text-xs px-2 py-0.5 rounded ${
                              dt.sensitive ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {dt.sensitive && <Lock className="w-3 h-3 inline mr-1" />}{dt.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 lg:shrink-0">
                    <div className="text-right text-sm">
                      <p className="text-slate-500">Expire le</p>
                      <p className="font-medium text-slate-700">{formatDate(consent.expiresAt)}</p>
                    </div>
                    <button 
                      onClick={() => handleRevoke(consent.id)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-red-500 text-white hover:bg-red-600 shadow-lg transition-all text-sm"
                    >
                      Révoquer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Other Consents */}
      {otherConsents.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden opacity-75">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Historique ({otherConsents.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {otherConsents.map((consent) => (
              <div key={consent.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <ServiceIcon category="government" className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-600">{consent.serviceName}</h3>
                        {getStatusBadge(consent.status)}
                      </div>
                      <p className="text-sm text-slate-400">{consent.serviceProvider}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400">
                    {consent.revokedAt ? `Révoqué le ${formatDate(consent.revokedAt)}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consent Modal */}
      {showModal && selectedConsent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                    <ServiceIcon category="government" className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selectedConsent.serviceName}</h2>
                    <p className="text-slate-500">{selectedConsent.serviceProvider}</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Finalité du traitement
                </h3>
                <p className="text-slate-600 bg-slate-50 rounded-xl p-4">{selectedConsent.purpose}</p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Base légale
                </h3>
                <p className="text-slate-600 bg-slate-50 rounded-xl p-4">{selectedConsent.legalBasis}</p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Durée de conservation
                </h3>
                <p className="text-slate-600">Jusqu'au {formatDate(selectedConsent.expiresAt)}</p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  Données demandées (contrôle granulaire)
                </h3>
                <div className="space-y-3">
                  {conditions.map((condition, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-4 rounded-xl border ${
                        condition.allowed ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-slate-800">{condition.dataType}</p>
                        <p className="text-sm text-slate-500">{condition.purpose}</p>
                      </div>
                      <button
                        onClick={() => {
                          const newConditions = [...conditions];
                          newConditions[index] = { ...newConditions[index], allowed: !condition.allowed };
                          setConditions(newConditions);
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          condition.allowed ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      >
                        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          condition.allowed ? 'translate-x-6' : ''
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-sm text-slate-500 bg-slate-50 rounded-xl p-4">
                <p className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Pour exercer vos droits, contactez le DPO
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3">
              {selectedConsent.status === 'pending' ? (
                <>
                  <button onClick={handleDeny} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all">
                    <XCircle className="w-4 h-4" />
                    Refuser
                  </button>
                  <button onClick={handleGrant} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg transition-all">
                    <CheckCircle2 className="w-4 h-4" />
                    Accorder le consentement
                  </button>
                </>
              ) : (
                <button onClick={() => setShowModal(false)} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all">
                  Fermer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
