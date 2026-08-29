import { 
  Shield, FileCheck, Cpu, Activity, 
  ArrowUpRight, TrendingUp,
  CheckCircle2, AlertTriangle, Clock, Hand
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { citizen, consents, devices, auditLog } = useApp();
  
  const activeConsents = consents.filter(c => c.status === 'granted').length;
  const pendingConsents = consents.filter(c => c.status === 'pending').length;
  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const recentActivity = auditLog.slice(0, 5);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'consent_granted':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'consent_revoked':
      case 'consent_denied':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'data_collected':
      case 'data_transmitted':
        return <Activity className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">
          Bienvenue, {citizen.firstName} <Hand className="w-7 h-7 inline text-amber-400" />
        </h1>
        <p className="text-slate-500 mt-1">
          Voici un aperçu de votre portefeuille numérique MIDAS-Bénin
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              Sécurisé
            </span>
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{activeConsents}</h3>
          <p className="text-slate-500 text-sm mt-1">Consentements actifs</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-amber-600" />
            </div>
            {pendingConsents > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                {pendingConsents} en attente
              </span>
            )}
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{consents.length}</h3>
          <p className="text-slate-500 text-sm mt-1">Total consentements</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-blue-600" />
            </div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              onlineDevices > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {onlineDevices} en ligne
            </span>
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{devices.length}</h3>
          <p className="text-slate-500 text-sm mt-1">Objets IoT connectés</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              <TrendingUp className="w-3 h-3 mr-1" />
              Temps réel
            </span>
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{auditLog.length}</h3>
          <p className="text-slate-500 text-sm mt-1">Entrées d'audit</p>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Activité récente</h2>
            <button 
              onClick={() => onNavigate('audit')}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Voir tout →
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {recentActivity.map((entry) => (
              <div key={entry.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  {getActionIcon(entry.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{entry.details}</p>
                  <p className="text-sm text-slate-500">{formatDate(entry.timestamp)}</p>
                </div>
                {entry.blockchainAnchor && (
                  <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    Ancré
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions & Alerts */}
        <div className="space-y-6">
          {/* Pending Consents Alert */}
          {pendingConsents > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-amber-800">Action requise</h3>
                </div>
                <p className="text-amber-700 text-sm mb-4">
                  Vous avez {pendingConsents} demande{pendingConsents > 1 ? 's' : ''} de consentement en attente.
                </p>
                <button 
                  onClick={() => onNavigate('consents')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25 transition-all"
                >
                  Gérer les consentements
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Actions rapides</h2>
            </div>
            <div className="p-4 space-y-2">
              <button 
                onClick={() => onNavigate('devices')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">Appairer un appareil</p>
                  <p className="text-xs text-slate-500">Ajouter un nouvel objet IoT</p>
                </div>
              </button>
              
              <button 
                onClick={() => onNavigate('identity')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">Voir mon identité</p>
                  <p className="text-xs text-slate-500">DID et credentials</p>
                </div>
              </button>
              
              <button 
                onClick={() => onNavigate('services')}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">Explorer les e-services</p>
                  <p className="text-xs text-slate-500">Services disponibles</p>
                </div>
              </button>
            </div>
          </div>

          {/* Security Status */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-8 h-8" />
                <div>
                  <h3 className="font-semibold">Statut de sécurité</h3>
                  <p className="text-emerald-100 text-sm">Protection maximale</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-100">Chiffrement E2E</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-100">TEE/StrongBox actif</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-100">Audit blockchain</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
