import React, { useCallback, useEffect, useState } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { ConfigProvider, theme } from 'antd';
import { TopNav } from './components/TopNav';
import { Palette } from './components/Palette';
import { Canvas } from './components/Canvas';
import { Inspector } from './components/Inspector';
import { StatusBar } from './components/StatusBar';
import { ValidationDrawer } from './components/ValidationDrawer';
import { BOQModal } from './components/BOQModal';
import { CableScheduleModal } from './components/CableScheduleModal';
import { NetworkWizardModal } from './components/NetworkWizardModal';
import { LibraryManagerModal } from './components/LibraryManagerModal';
import { CreateComponentModal } from './components/CreateComponentModal';
import { SaveAssemblyModal } from './components/SaveAssemblyModal';
import { ProjectsManagerModal } from './components/ProjectsManagerModal';
import { QuickEditModal } from './components/QuickEditModal';
import { DesignReportModal } from './components/DesignReportModal';
import { VersionDiffModal } from './components/VersionDiffModal';
import { ExportCenterModal } from './components/ExportCenterModal';
import { DeviceCliModal } from './components/DeviceCliModal';
import { useGraphStore } from './store/graphStore';

export const App: React.FC = () => {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  const { 
    isSimulating, 
    simulationSpeed, 
    tickSimulation, 
    loadDemoTopology 
  } = useGraphStore();

  // Load baseline demonstration topology on first mount
  useEffect(() => {
    loadDemoTopology();
  }, [loadDemoTopology]);

  // Simulation tick loop
  useEffect(() => {
    if (!isSimulating) return;

    // Smooth, calm simulation interval (comfortable human visual cadence)
    const interval = Math.max(50, Math.round(220 / simulationSpeed));
    const timer = setInterval(() => {
      tickSimulation();
    }, interval);

    return () => clearInterval(timer);
  }, [isSimulating, simulationSpeed, tickSimulation]);

  return (
    <>
      {!splashDone && <SplashScreen onDone={handleSplashDone} duration={4200} />}
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#0284c7',
          colorBgBase: '#0b111e',
          colorBgContainer: '#0f172a',
          colorBorder: '#334155',
          colorTextBase: '#f8fafc',
          borderRadius: 6,
          fontFamily: "'Inter', -apple-system, sans-serif"
        }
      }}
    >
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0b111e',
          overflow: 'hidden'
        }}
      >
        {/* Top Navigation */}
        <TopNav />

        {/* Center Workspace (Palette | Canvas | Inspector) */}
        <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
          <Palette />
          <div style={{ flex: 1, position: 'relative', height: '100%' }}>
            <Canvas />
          </div>
          <Inspector />
        </div>

        {/* Bottom Status Bar */}
        <StatusBar />

        {/* Modals & Drawers */}
        <ValidationDrawer />
        <BOQModal />
        <CableScheduleModal />
        <NetworkWizardModal />
        <LibraryManagerModal />
        <CreateComponentModal />
        <SaveAssemblyModal />
        <ProjectsManagerModal />
        <QuickEditModal />
        <DesignReportModal />
        <VersionDiffModal />
        <ExportCenterModal />
        <DeviceCliModal />
      </div>
    </ConfigProvider>
    </>
  );
};

export default App;
