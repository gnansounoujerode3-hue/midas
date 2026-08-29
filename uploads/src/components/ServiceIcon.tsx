import { 
  Landmark, HeartPulse, Bus, Sprout, CreditCard, 
  GraduationCap, Globe, Stethoscope, Thermometer,
  Radio, MonitorSmartphone, Fingerprint
} from 'lucide-react';

const serviceIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  government: Landmark,
  health: HeartPulse,
  transport: Bus,
  agriculture: Sprout,
  finance: CreditCard,
  education: GraduationCap,
  default: Globe,
};

const deviceIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  medical: Stethoscope,
  environmental: Thermometer,
  sensor: Radio,
  actuator: MonitorSmartphone,
  biometric: Fingerprint,
  default: Radio,
};

export function ServiceIcon({ category, className = 'w-6 h-6' }: { category: string; className?: string }) {
  const Icon = serviceIconMap[category] || serviceIconMap.default;
  return <Icon className={className} />;
}

export function DeviceIcon({ type, className = 'w-6 h-6' }: { type: string; className?: string }) {
  const Icon = deviceIconMap[type] || deviceIconMap.default;
  return <Icon className={className} />;
}

export function getServiceColor(category: string): string {
  const colors: Record<string, string> = {
    government: 'from-blue-500 to-indigo-600',
    health: 'from-rose-500 to-pink-600',
    transport: 'from-amber-500 to-orange-600',
    agriculture: 'from-emerald-500 to-green-600',
    finance: 'from-violet-500 to-purple-600',
    education: 'from-cyan-500 to-teal-600',
  };
  return colors[category] || 'from-slate-500 to-slate-600';
}

export function getServiceBgColor(category: string): string {
  const colors: Record<string, string> = {
    government: 'bg-blue-100',
    health: 'bg-rose-100',
    transport: 'bg-amber-100',
    agriculture: 'bg-emerald-100',
    finance: 'bg-violet-100',
    education: 'bg-cyan-100',
  };
  return colors[category] || 'bg-slate-100';
}

export function getServiceTextColor(category: string): string {
  const colors: Record<string, string> = {
    government: 'text-blue-600',
    health: 'text-rose-600',
    transport: 'text-amber-600',
    agriculture: 'text-emerald-600',
    finance: 'text-violet-600',
    education: 'text-cyan-600',
  };
  return colors[category] || 'text-slate-600';
}
