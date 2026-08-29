import { useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Fingerprint, KeyRound, LockKeyhole, Shield } from 'lucide-react';
import type { Citizen, VerifiableCredential } from '../types';
import { enrollOnBackend, MidasApiError } from '../api/client';

export interface EnrollmentRecord {
  citizen: Citizen;
  credentials: VerifiableCredential[];
  enrolledAt: string;
  installationId: string;
}

interface EnrollmentProps {
  onComplete: (record: EnrollmentRecord) => void;
}

const normalizeNpi = (value: string) => value.replace(/[^0-9]/g, '');
const formatNpi = (value: string) => {
  const digits = normalizeNpi(value).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1-');
};

function createDid(): string {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 15)}`;
  return `did:midas:benin:${id}`;
}

export default function Enrollment({ onComplete }: EnrollmentProps) {
  const [npi, setNpi] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const generatedDid = useMemo(() => createDid(), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeNpi(npi);
    if (normalized.length !== 16) {
      setError('Le NPI de démonstration doit contenir exactement 16 chiffres.');
      return;
    }
    if (!accepted) {
      setError('Vous devez accepter les conditions de cette démonstration académique.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      const result = await enrollOnBackend(normalized, generatedDid);
      onComplete({ citizen: result.citizen, credentials: result.credentials, enrolledAt: result.citizen.createdAt, installationId: generatedDid.split(':').pop() || '' });
    } catch (reason) {
      const message = reason instanceof MidasApiError ? reason.message : 'Impossible de joindre le backend MIDAS-Bénin.';
      setError(`${message} Vérifiez que le backend est démarré et accessible depuis le téléphone.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <section className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-7 text-white">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4"><Shield className="w-8 h-8" /></div>
          <h1 className="text-2xl font-bold">Enrôlement MIDAS-Bénin</h1>
          <p className="text-emerald-100 mt-1">Créez votre portefeuille citoyen de démonstration.</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
            <p className="font-semibold flex items-center gap-2"><LockKeyhole className="w-4 h-4" />Usage unique sur cet appareil</p>
            <p className="mt-1">Après validation, le NPI et le DID sont verrouillés localement. Cette application ne contacte pas l’ANIP : utilisez uniquement des données de démonstration.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">NPI de démonstration</label>
            <input value={npi} onChange={(e) => setNpi(formatNpi(e.target.value))} inputMode="numeric" placeholder="2301-0458-7892-3456" className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
            Après validation du NPI, l’identité, les informations personnelles et le credential sont résolus automatiquement par le registre NPI simulé. Aucun nom ou prénom n’est saisi manuellement.
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 flex items-center gap-2"><KeyRound className="w-4 h-4 text-emerald-600" />DID qui sera généré une seule fois</p>
            <p className="font-mono text-xs text-slate-700 break-all mt-2">{generatedDid}</p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer text-sm text-slate-600"><input checked={accepted} onChange={(e) => setAccepted(e.target.checked)} type="checkbox" className="mt-1 accent-emerald-600" /><span>Je confirme que ces informations sont fictives et que je souhaite créer ce portefeuille de démonstration sur cet appareil.</span></label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg disabled:opacity-60"><Fingerprint className="w-5 h-5" />{isSubmitting ? 'Enrôlement auprès du backend…' : 'Créer mon DID et m’enrôler'}</button>
          <p className="text-xs text-center text-slate-400 flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" />La biométrie est vérifiée localement par Android ; aucune empreinte n’est enregistrée ici.</p>
        </form>
      </section>
    </main>
  );
}
