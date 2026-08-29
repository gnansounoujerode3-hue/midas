import { useState } from 'react';
import { 
  Globe, Search, CheckCircle2, Clock, XCircle,
  ArrowRight, Shield, Lock, ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EService } from '../types';
import { ServiceIcon, getServiceColor } from '../components/ServiceIcon';

export default function Services() {
  const { eServices } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<EService | null>(null);
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, EService['status']>>({});

  const resolvedService = (service: EService): EService => ({ ...service, status: serviceStatuses[service.id] ?? service.status });
  const handleServiceAction = (service: EService) => {
    const current = resolvedService(service);
    if (current.status === 'connected') {
      alert(`Accès simulé ouvert pour ${current.name}. Aucun e-service réel n’est contacté.`);
      return;
    }
    if (current.status === 'pending') {
      alert(`Votre demande d’accès à ${current.name} est déjà en attente de validation.`);
      return;
    }
    setServiceStatuses(prev => ({ ...prev, [current.id]: 'pending' }));
    setSelectedService({ ...current, status: 'pending' });
    alert(`Demande d’accès simulée envoyée à ${current.name}. Elle apparaît maintenant comme « En attente ».`);
  };
  const handleServiceRevoke = (service: EService) => {
    setServiceStatuses(prev => ({ ...prev, [service.id]: 'disconnected' }));
    setSelectedService({ ...service, status: 'disconnected' });
    alert(`Accès simulé révoqué pour ${service.name}.`);
  };

  const categories = [
    { id: 'all', label: 'Tous' },
    { id: 'government', label: 'Admin' },
    { id: 'health', label: 'Santé' },
    { id: 'finance', label: 'Finance' },
    { id: 'agriculture', label: 'Agri' },
  ];

  const filteredServices = eServices.map(resolvedService).filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (status: EService['status']) => {
    const base = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'connected': return <span className={`${base} bg-emerald-100 text-emerald-700`}><CheckCircle2 className="w-3 h-3 mr-1" />Connecté</span>;
      case 'pending': return <span className={`${base} bg-amber-100 text-amber-700`}><Clock className="w-3 h-3 mr-1" />En attente</span>;
      default: return <span className={`${base} bg-slate-100 text-slate-600`}><XCircle className="w-3 h-3 mr-1" />Non connecté</span>;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">E-Services</h1>
        <p className="text-slate-500 mt-1">Découvrez et connectez-vous aux services numériques du Bénin</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input type="text" placeholder="Rechercher un service..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-3 pl-12 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setCategoryFilter(cat.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${categoryFilter === cat.id ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
              <ServiceIcon category={cat.id} className={`w-4 h-4 ${categoryFilter === cat.id ? 'text-white' : ''}`} /><span className="hidden sm:inline">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{eServices.filter(s => s.status === 'connected').length}</p><p className="text-sm text-slate-500">Connectés</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{eServices.filter(s => s.status === 'pending').length}</p><p className="text-sm text-slate-500">En attente</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><Globe className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{eServices.length}</p><p className="text-sm text-slate-500">Disponibles</p></div>
          </div>
        </div>
      </div>

      {filteredServices.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Globe className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-xl font-semibold text-slate-600 mb-2">Aucun service trouvé</h3>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div key={service.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg transition-all cursor-pointer group" onClick={() => setSelectedService(service)}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getServiceColor(service.category)} flex items-center justify-center`}>
                      <ServiceIcon category={service.category} className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">{service.name}</h3>
                      <p className="text-sm text-slate-500">{service.provider}</p>
                    </div>
                  </div>
                  {getStatusBadge(service.status)}
                </div>
                <p className="text-slate-600 text-sm mb-4 line-clamp-2">{service.description}</p>
                <div className="mb-4">
                  <p className="text-xs text-slate-500 mb-2">Données requises:</p>
                  <div className="flex flex-wrap gap-1">
                    {service.requiredData.slice(0, 3).map((dt) => (
                      <span key={dt.id} className={`text-xs px-2 py-0.5 rounded ${dt.sensitive ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                        {dt.sensitive && <Lock className="w-3 h-3 inline mr-1" />}{dt.name}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={(event) => { event.stopPropagation(); handleServiceAction(service); }} className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${service.status === 'connected' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : service.status === 'pending' ? 'border-2 border-emerald-500 text-emerald-600' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'}`}>
                  {service.status === 'connected' ? 'Accéder' : service.status === 'pending' ? 'En attente' : 'Se connecter'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedService && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedService(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <ServiceIcon category={selectedService.category} className="w-10 h-10 text-white" />
                    </div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedService.name}</h2>
                  <p className="text-emerald-100">{selectedService.provider}</p>
                  <div className="mt-2">{getStatusBadge(selectedService.status)}</div>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div><h3 className="font-semibold text-slate-800 mb-2">Description</h3><p className="text-slate-600">{selectedService.description}</p></div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Finalités du traitement</h3>
                <div className="flex flex-wrap gap-2">{selectedService.purposes.map((p, i) => <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm">{p}</span>)}</div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Données requises</h3>
                <div className="space-y-2">
                  {selectedService.requiredData.map((dt) => (
                    <div key={dt.id} className={`flex items-center justify-between p-3 rounded-xl ${dt.sensitive ? 'bg-red-50' : 'bg-slate-50'}`}>
                      <div className="flex items-center gap-3">
                        {dt.sensitive ? <Lock className="w-5 h-5 text-red-500" /> : <Shield className="w-5 h-5 text-slate-400" />}
                        <div><p className="font-medium text-slate-800">{dt.name}</p><p className="text-xs text-slate-500">{dt.description}</p></div>
                      </div>
                      {dt.sensitive && <span className="text-xs font-medium text-red-600">Sensible</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                <div><p className="text-sm text-slate-500">Contact DPO</p><p className="font-medium text-slate-800">{selectedService.dpoContact}</p></div>
                <a href={selectedService.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium">Politique de confidentialité<ExternalLink className="w-4 h-4" /></a>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50">
              {selectedService.status === 'connected' ? (
                <div className="flex gap-3">
                  <button onClick={() => handleServiceAction(selectedService)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"><Globe className="w-5 h-5" />Accéder au service</button>
                  <button onClick={() => handleServiceRevoke(selectedService)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-red-500 text-white">Révoquer</button>
                </div>
              ) : (
                <button onClick={() => handleServiceAction(selectedService)} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"><CheckCircle2 className="w-5 h-5" />Demander l'accès</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
