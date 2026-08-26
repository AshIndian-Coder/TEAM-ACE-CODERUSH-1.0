import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { EngineProvider } from './context/EngineContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { OperationsBar } from './components/layout/OperationsBar';
import { DashboardPage } from './pages/DashboardPage';
import { MapPage } from './pages/MapPage';
import { HospitalsPage } from './pages/HospitalsPage';
import { FleetPage } from './pages/FleetPage';
import { PatientsPage } from './pages/PatientsPage';
import { LiveTrackerPage } from './pages/LiveTrackerPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DoctorsPage } from './pages/DoctorsPage';
import { DataManagerPage } from './pages/DataManagerPage';
import { ComparisonPanel } from './components/ComparisonPanel';
import { RequestIntakeForm } from './components/RequestIntakeForm';
import { CommandPalette } from './components/CommandPalette';
import { BootSequence } from './components/BootSequence';
import { AnimatePresence } from 'framer-motion';

function AppContent() {
  const [bootDone, setBootDone] = useState(false);
  const [showIntake, setShowIntake] = useState(false);
  const [showCommand, setShowCommand] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F7FA]">
      <AnimatePresence>
        {!bootDone && <BootSequence onDone={() => setBootDone(true)} />}
      </AnimatePresence>

      <Sidebar />
      <OperationsBar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onCommandOpen={() => setShowCommand(true)} />

        <div className="flex flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/data" element={<DataManagerPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/hospitals" element={<HospitalsPage />} />
            <Route path="/doctors" element={<DoctorsPage />} />
            <Route path="/fleet" element={<FleetPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/live" element={<LiveTrackerPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="*" element={<DashboardPage />} />
          </Routes>
        </div>
      </div>

      <ComparisonPanel />
      <RequestIntakeForm open={showIntake} onClose={() => setShowIntake(false)} />
      <CommandPalette open={showCommand} onOpenChange={setShowCommand} />

      <button
        onClick={() => setShowIntake(true)}
        className="fixed bottom-6 right-6 z-[500] flex h-12 w-12 items-center justify-center rounded-full bg-[#012D61] text-white shadow-[0_8px_24px_rgba(1,45,97,0.25)] hover:bg-[#0A3A7A] hover:scale-105 active:scale-95 transition-all md:hidden"
      >
        +
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <EngineProvider>
        <AppContent />
      </EngineProvider>
    </BrowserRouter>
  );
}
