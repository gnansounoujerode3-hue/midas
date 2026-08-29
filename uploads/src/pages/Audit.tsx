import { useState } from 'react';
import { Shield, Search, Download, CheckCircle2, AlertTriangle, Activity, FileCheck, Cpu, Database, ExternalLink, ChevronDown, Lock, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AuditLogEntry } from '../types';

export default function Audit() {
  const { auditLog } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const actions = [
    { id: 'all', label: 'Toutes' },
    { id: 'consent', label: 'Consentements' },
    { id: 'data', label: 'Données' },
    { id: 'device', label: 'Appareils' },
  ];

  const filteredLog = auditLog.filter(entry => {
    const matchesSearch = entry.details.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterAction === 'all' || entry.action.includes(filterAction);
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getActionIcon = (action: string) => {
    if (action.includes('consent_granted')) return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
    if (action.includes('consent_revoked') || action.includes('consent_denied')) return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (action.includes('data')) return <Database className="w-5 h-5 text-blue-500" />;
    if (action.includes('device')) return <Cpu className="w-5 h-5 text-purple-500" />;
    if (action.includes('credential')) return <FileCheck className="w-5 h-5 text-orange-500" />;
    return <Activity className="w-5 h-5 text-slate-400" />;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = { 'consent_granted': 'Consentement accordé', 'consent_revoked': 'Consentement révoqué', 'consent_denied': 'Consentement refusé', 'data_accessed': 'Données consultées', 'data_exported': 'Données exportées', 'data_deleted': 'Données supprimées', 'data_collected': 'Données collectées', 'device_paired': 'Appareil appairé', 'device_unpaired': 'Appareil dissocié', 'credential_verified': 'Credential vérifié' };
    return labels[action] || action;
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(auditLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="audit-page space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">Journal d'Audit</h1>
          <p className="text-slate-500 mt-1">Traçabilité infalsifiable (ancrage Hyperledger Iroha)</p>
        </div>
        <button onClick={handleExport} className="audit-export inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"><Download className="w-5 h-5" />Exporter</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><Shield className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold text-slate-800">{auditLog.length}</p><p className="text-sm text-slate-500">Total</p></div></div></div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><Lock className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold text-slate-800">{auditLog.filter(e => e.blockchainAnchor).length}</p><p className="text-sm text-slate-500">Ancrées</p></div></div></div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><FileCheck className="w-5 h-5 text-purple-600" /></div><div><p className="text-2xl font-bold text-slate-800">{auditLog.filter(e => e.action.includes('consent')).length}</p><p className="text-sm text-slate-500">Consent.</p></div></div></div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center"><Activity className="w-5 h-5 text-orange-600" /></div><div><p className="text-2xl font-bold text-slate-800">{auditLog.filter(e => e.action.includes('data')).length}</p><p className="text-sm text-slate-500">Données</p></div></div></div>
      </div>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center"><Shield className="w-8 h-8 text-emerald-400" /></div>
          <div><h3 className="font-semibold text-lg">Hyperledger Iroha 2</h3><p className="text-slate-400 text-sm">Registre permissionné</p></div>
        </div>
        <div className="audit-ledger-grid grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl p-4"><p className="text-slate-400 text-xs">Consensus</p><p className="font-semibold">BFT Sumeragi</p></div>
          <div className="bg-white/5 rounded-xl p-4"><p className="text-slate-400 text-xs">Orgs</p><p className="font-semibold">5 validateurs</p></div>
          <div className="bg-white/5 rounded-xl p-4"><p className="text-slate-400 text-xs">Ancrage</p><p className="font-semibold">Il y a 2 min</p></div>
          <div className="bg-white/5 rounded-xl p-4"><p className="text-slate-400 text-xs">Intégrité</p><p className="font-semibold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> OK</p></div>
        </div>
      </div>

      <div className="audit-filters flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-3 pl-12 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="relative">
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {actions.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="audit-table w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">Détails</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">Blockchain</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLog.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 cursor-pointer border-b border-slate-100" onClick={() => setSelectedEntry(entry)}>
                  <td data-label="Action" className="px-6 py-4"><div className="flex items-center gap-3">{getActionIcon(entry.action)}<span className="font-medium text-slate-800">{getActionLabel(entry.action)}</span></div></td>
                  <td data-label="Détails" className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{entry.details}</td>
                  <td data-label="Date" className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap"><Clock className="w-4 h-4 inline mr-1" />{formatDate(entry.timestamp)}</td>
                  <td data-label="Blockchain" className="px-6 py-4">{entry.blockchainAnchor ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><Lock className="w-3 h-3 mr-1" />Ancré</span> : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">En attente</span>}</td>
                  <td data-label="" className="px-6 py-4"><button onClick={(event) => { event.stopPropagation(); setSelectedEntry(entry); }} className="p-2 hover:bg-slate-100 rounded-lg" aria-label="Voir le détail de l'événement"><ExternalLink className="w-4 h-4 text-slate-400" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredLog.length === 0 && <div className="p-12 text-center"><Shield className="w-12 h-12 mx-auto mb-4 text-slate-300" /><p className="text-slate-500">Aucune entrée</p></div>}
      </div>

      {selectedEntry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedEntry(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">{getActionIcon(selectedEntry.action)}<h2 className="text-xl font-bold text-slate-800">{getActionLabel(selectedEntry.action)}</h2></div>
              {selectedEntry.blockchainAnchor && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><Lock className="w-3 h-3 mr-1" />Ancré</span>}
            </div>
            <div className="p-6 space-y-4">
              <div><label className="text-sm text-slate-500">Détails</label><p className="font-medium text-slate-800 mt-1">{selectedEntry.details}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-slate-500">Acteur</label><p className="font-medium text-slate-800 mt-1">{selectedEntry.actor}</p></div>
                <div><label className="text-sm text-slate-500">Type</label><p className="font-medium text-slate-800 mt-1 capitalize">{selectedEntry.actorType}</p></div>
              </div>
              <div><label className="text-sm text-slate-500">Date</label><p className="font-medium text-slate-800 mt-1">{formatDate(selectedEntry.timestamp)}</p></div>
              <div><label className="text-sm text-slate-500">Hash SHA-256</label><p className="font-mono text-xs bg-slate-50 rounded-lg p-3 mt-1 break-all">{selectedEntry.hash}</p></div>
              {selectedEntry.blockchainAnchor && <div><label className="text-sm text-slate-500">Ancrage Hyperledger</label><p className="font-mono text-xs bg-emerald-50 text-emerald-700 rounded-lg p-3 mt-1">{selectedEntry.blockchainAnchor}</p></div>}
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50"><button onClick={() => setSelectedEntry(null)} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all">Fermer</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
