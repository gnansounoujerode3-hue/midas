import { useEffect, useState } from 'react';
import { Shield, Bell, Download, Trash2, Key, Smartphone, Lock, AlertTriangle, CheckCircle2, Loader2, Globe, Moon, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Settings() {
  const { citizen, exportData, deleteAllData } = useApp();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportedData, setExportedData] = useState<string | null>(null);
  const [notifications, setNotifications] = useState({ consentRequests: true, dataAccess: true, securityAlerts: true, deviceEvents: true });
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportData();
      setExportedData(data);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `midas-benin-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } finally { setIsExporting(false); }
  };

  const handleDeleteAll = async () => {
    if (!confirm('ATTENTION: Cette action est IRRÉVERSIBLE.\n\nToutes vos données seront supprimées conformément à l\'article 415 du Code du Numérique.\n\nContinuer?')) return;
    setIsDeleting(true);
    try { await deleteAllData(); alert('Demande de suppression enregistrée.'); } finally { setIsDeleting(false); }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Paramètres</h1>
        <p className="text-slate-500 mt-1">Gérez vos préférences et exercez vos droits</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800 flex items-center gap-2"><Shield className="w-5 h-5 text-emerald-600" />Sécurité</h2></div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><Lock className="w-5 h-5 text-emerald-600" /></div>
              <div><p className="font-medium text-slate-800">TEE/StrongBox</p><p className="text-sm text-slate-500">Environnement sécurisé</p></div>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" />Actif</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><Smartphone className="w-5 h-5 text-slate-600" /></div><div><p className="font-medium text-slate-800">Biométrie</p><p className="text-sm text-slate-500">Empreinte / Face ID</p></div></div>
            <button onClick={() => setBiometricEnabled(value => !value)} aria-label="Activer ou désactiver la biométrie simulée" className={`relative w-11 h-6 rounded-full transition-colors ${biometricEnabled ? 'bg-emerald-500' : 'bg-slate-200'}`}><span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${biometricEnabled ? 'translate-x-5' : ''}`} /></button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><Key className="w-5 h-5 text-slate-600" /></div><div><p className="font-medium text-slate-800">Clé Ed25519</p><p className="text-sm text-slate-500">Générée le {new Date(citizen.createdAt).toLocaleDateString('fr-FR')}</p></div></div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Non-extractible</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800 flex items-center gap-2"><Bell className="w-5 h-5 text-emerald-600" />Notifications</h2></div>
        <div className="p-6 space-y-4">
          {[
            { key: 'consentRequests', label: 'Demandes de consentement', desc: 'Nouvelles demandes d\'accès' },
            { key: 'dataAccess', label: 'Accès aux données', desc: 'Quand un service consulte vos données' },
            { key: 'securityAlerts', label: 'Alertes de sécurité', desc: 'Connexions suspectes' },
            { key: 'deviceEvents', label: 'Événements appareils', desc: 'Batterie faible, déconnexions' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div><p className="font-medium text-slate-800">{item.label}</p><p className="text-sm text-slate-500">{item.desc}</p></div>
              <button onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))} className={`relative w-11 h-6 rounded-full transition-colors ${notifications[item.key as keyof typeof notifications] ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifications[item.key as keyof typeof notifications] ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800 flex items-center gap-2"><Globe className="w-5 h-5 text-emerald-600" />Apparence</h2></div>
        <div className="p-6">
          <p className="font-medium text-slate-800 mb-3">Thème</p>
          <div className="flex gap-3">
            {[{ id: 'light', label: 'Clair', icon: Sun }, { id: 'dark', label: 'Sombre', icon: Moon }, { id: 'system', label: 'Système', icon: Smartphone }].map((t) => (
              <button key={t.id} onClick={() => setTheme(t.id as typeof theme)} className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === t.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <t.icon className={`w-6 h-6 ${theme === t.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${theme === t.id ? 'text-emerald-700' : 'text-slate-600'}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-amber-200"><h2 className="font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Droits sur vos données</h2></div>
        <div className="p-6 space-y-6">
          <div className="bg-white rounded-xl p-6 border border-amber-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0"><Download className="w-6 h-6 text-blue-600" /></div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">Portabilité (Art. 417)</h3>
                <p className="text-sm text-slate-600 mt-1 mb-4">Exportez toutes vos données en format JSON.</p>
                <button onClick={handleExport} disabled={isExporting} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg transition-all disabled:opacity-50">
                  {isExporting ? <><Loader2 className="w-4 h-4 animate-spin" />Export en cours...</> : <><Download className="w-4 h-4" />Exporter mes données</>}
                </button>
                {exportedData && <p className="text-sm text-emerald-600 mt-2 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Export réussi!</p>}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 border border-red-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0"><Trash2 className="w-6 h-6 text-red-600" /></div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">Effacement (Art. 415)</h3>
                <p className="text-sm text-slate-600 mt-1 mb-4">Suppression irréversible de toutes vos données.</p>
                <button onClick={handleDeleteAll} disabled={isDeleting} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-red-500 text-white shadow-lg transition-all disabled:opacity-50">
                  {isDeleting ? <><Loader2 className="w-4 h-4 animate-spin" />Suppression...</> : <><Trash2 className="w-4 h-4" />Supprimer mes données</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-800">Informations légales</h2></div>
        <div className="p-6 space-y-4 text-sm text-slate-600">
          <p><strong>MIDAS-Bénin</strong> — Mobile IoT Data protection Architecture for e-Services in Benin</p>
          <p>Conforme au <strong>Livre V du Code du Numérique</strong> (Loi n° 2017-20).</p>
          <p><strong>Autorité:</strong> APDP - Autorité de Protection des Données Personnelles du Bénin</p>
          <div className="pt-4 border-t border-slate-100"><p className="text-xs text-slate-400">Version 1.0.0 • Prototype</p></div>
        </div>
      </div>
    </div>
  );
}
