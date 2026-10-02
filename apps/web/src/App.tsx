import React, { useEffect } from 'react';
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
import { useGraphStore } from './store/graphStore';

export const App: React.FC = () => {
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

    const interval = Math.max(20, Math.round(120 / simulationSpeed));
    const timer = setInterval(() => {
      tickSimulation();
    }, interval);

    return () => clearInterval(timer);
  }, [isSimulating, simulationSpeed, tickSimulation]);

  return (
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
      </div>
    </ConfigProvider>
  );
};

export default App;
