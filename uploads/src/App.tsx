import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Identity from './pages/Identity';
import Consents from './pages/Consents';
import Devices from './pages/Devices';
import Services from './pages/Services';
import Audit from './pages/Audit';
import Settings from './pages/Settings';
import Enrollment, { type EnrollmentRecord } from './pages/Enrollment';

const ENROLLMENT_KEY = 'midas-benin:enrollment:v1';

function readEnrollment(): EnrollmentRecord | null {
  try {
    const raw = localStorage.getItem(ENROLLMENT_KEY);
    return raw ? JSON.parse(raw) as EnrollmentRecord : null;
  } catch {
    return null;
  }
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'identity': return <Identity />;
      case 'consents': return <Consents />;
      case 'devices': return <Devices />;
      case 'services': return <Services />;
      case 'audit': return <Audit />;
      case 'settings': return <Settings />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };
  return <Layout currentPage={currentPage} onNavigate={setCurrentPage}>{renderPage()}</Layout>;
}

export default function App() {
  const [enrollment, setEnrollment] = useState<EnrollmentRecord | null>(readEnrollment);
  const completeEnrollment = (record: EnrollmentRecord) => {
    // Une fois écrit, le dossier d’enrôlement n’est jamais remplacé par l’interface.
    // Cela matérialise l’usage unique dans le périmètre local du prototype.
    if (localStorage.getItem(ENROLLMENT_KEY)) return;
    localStorage.setItem(ENROLLMENT_KEY, JSON.stringify(record));
    setEnrollment(record);
  };

  if (!enrollment) return <Enrollment onComplete={completeEnrollment} />;
  return (
    <AppProvider enrolledCitizen={enrollment.citizen} enrolledCredentials={enrollment.credentials}>
      <AppContent />
    </AppProvider>
  );
}
