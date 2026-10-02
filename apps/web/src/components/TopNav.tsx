import React from 'react';
import { Button, Space, Select, Badge, Tooltip, message } from 'antd';
import { 
  PlayCircleFilled, 
  PauseCircleFilled, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 
  DollarOutlined, 
  TableOutlined, 
  UndoOutlined, 
  RedoOutlined, 
  ClearOutlined, 
  DownloadOutlined, 
  ThunderboltFilled,
  BranchesOutlined,
  BuildOutlined,
  PartitionOutlined,
  BookOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { EngineeringDomain } from '@omniflow/shared-types';

export const TopNav: React.FC = () => {
  const {
    graph,
    activeDomain,
    setActiveDomain,
    validationIssues,
    toggleValidationDrawer,
    toggleBOQModal,
    toggleCableScheduleModal,
    toggleWizardModal,
    toggleLibraryModal,
    toggleSaveAssemblyModal,
    libraries,
    autoLayout,
    isSimulating,
    toggleSimulation,
    simulationSpeed,
    setSimulationSpeed,
    triggerPacketBurst,
    loadDemoTopology,
    clearCanvas,
    undo,
    redo,
    historyIndex,
    history
  } = useGraphStore();

  const errorCount = validationIssues.filter((i) => i.severity === 'CRITICAL' || i.severity === 'ERROR').length;

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(graph, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${graph.name.toLowerCase().replace(/\s+/g, '_')}_v1.0.json`);
    dlAnchor.click();
    message.success('Exported engineering graph schema (JSON)');
  };

  return (
    <div
      style={{
        height: 52,
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 30
      }}
    >
      {/* Brand & Project Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 14
            }}
          >
            Ω
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }}>
            Omni<span style={{ color: '#38bdf8' }}>Flow</span>
          </span>
        </div>

        <div style={{ width: 1, height: 20, backgroundColor: '#334155' }} />

        {/* Domain Selector */}
        <Select<EngineeringDomain>
          value={activeDomain}
          onChange={(val) => setActiveDomain(val)}
          style={{ width: 130 }}
          size="small"
          options={[
            { label: '🌐 Network', value: 'NETWORK' },
            { label: '⚡ Electrical', value: 'ELECTRICAL' },
            { label: '💧 Plumbing', value: 'PLUMBING' }
          ]}
        />

        <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
          {graph.name}
        </span>
      </div>

      {/* Primary Actions: Simulation, Validation, Reports */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Undo / Redo */}
        <Space size={2}>
          <Tooltip title="Undo (Ctrl+Z)">
            <Button
              type="text"
              icon={<UndoOutlined style={{ color: historyIndex > 0 ? '#cbd5e1' : '#475569' }} />}
              disabled={historyIndex <= 0}
              onClick={undo}
            />
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)">
            <Button
              type="text"
              icon={<RedoOutlined style={{ color: historyIndex < history.length - 1 ? '#cbd5e1' : '#475569' }} />}
              disabled={historyIndex >= history.length - 1}
              onClick={redo}
            />
          </Tooltip>
        </Space>

        <div style={{ width: 1, height: 20, backgroundColor: '#334155' }} />

        {/* System Topology Wizard */}
        <Button
          type="primary"
          icon={<BuildOutlined />}
          onClick={() => toggleWizardModal(true)}
          style={{ backgroundColor: '#0284c7', borderColor: '#0284c7', fontWeight: 600 }}
        >
          Topology Wizard
        </Button>

        {/* Libraries Manager */}
        <Badge count={libraries.length} size="small" offset={[-2, 4]} color="#38bdf8">
          <Button
            icon={<BookOutlined style={{ color: '#38bdf8' }} />}
            onClick={() => toggleLibraryModal(true)}
            style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
          >
            Libraries
          </Button>
        </Badge>

        {/* Save Template Button */}
        <Tooltip title="Save selected devices or entire design as reusable template">
          <Button
            icon={<SaveOutlined style={{ color: '#10b981' }} />}
            onClick={() => toggleSaveAssemblyModal(true)}
            style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
          >
            Save Template
          </Button>
        </Tooltip>

        {/* Auto Layout */}
        <Tooltip title="Organize layout into clean hierarchical tiers">
          <Button
            icon={<PartitionOutlined />}
            onClick={autoLayout}
            style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
          >
            Auto Layout
          </Button>
        </Tooltip>

        {/* Demo Small Office Benchmark Load */}
        <Button
          icon={<BranchesOutlined />}
          onClick={loadDemoTopology}
          style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
        >
          Small Office Demo
        </Button>

        {/* Simulation Controls */}
        <Space.Compact>
          <Button
            type={isSimulating ? 'primary' : 'default'}
            icon={isSimulating ? <PauseCircleFilled /> : <PlayCircleFilled style={{ color: '#10b981' }} />}
            onClick={() => toggleSimulation()}
            style={{
              backgroundColor: isSimulating ? '#0284c7' : '#1e293b',
              borderColor: '#334155',
              color: '#f8fafc',
              fontWeight: 500
            }}
          >
            {isSimulating ? 'Simulating' : 'Simulate'}
          </Button>

          <Button
            icon={<ThunderboltFilled style={{ color: '#f59e0b' }} />}
            onClick={triggerPacketBurst}
            title="Inject simulated traffic packet burst"
            style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
          />

          <Select
            value={simulationSpeed}
            onChange={(s) => setSimulationSpeed(s)}
            style={{ width: 70 }}
            options={[
              { label: '1x', value: 1 },
              { label: '2x', value: 2 },
              { label: '5x', value: 5 }
            ]}
          />
        </Space.Compact>

        {/* Engineering Validation Badge & Button */}
        <Badge count={errorCount} offset={[-4, 4]}>
          <Button
            icon={errorCount > 0 ? <ExclamationCircleOutlined style={{ color: '#ef4444' }} /> : <CheckCircleOutlined style={{ color: '#10b981' }} />}
            onClick={() => toggleValidationDrawer(true)}
            style={{
              backgroundColor: '#1e293b',
              borderColor: errorCount > 0 ? '#ef4444' : '#334155',
              color: '#f8fafc'
            }}
          >
            Validate ({validationIssues.length})
          </Button>
        </Badge>

        {/* Bill of Quantities Modal */}
        <Button
          icon={<DollarOutlined style={{ color: '#10b981' }} />}
          onClick={() => toggleBOQModal(true)}
          style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
        >
          BOQ
        </Button>

        {/* Cable Schedule Modal */}
        <Button
          icon={<TableOutlined style={{ color: '#38bdf8' }} />}
          onClick={() => toggleCableScheduleModal(true)}
          style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
        >
          Cable Schedule
        </Button>

        {/* Export Dropdown */}
        <Button
          icon={<DownloadOutlined />}
          onClick={handleExportJSON}
          style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
        >
          Export JSON
        </Button>

        {/* Clear Canvas */}
        <Tooltip title="Clear Canvas">
          <Button
            type="text"
            icon={<ClearOutlined style={{ color: '#ef4444' }} />}
            onClick={clearCanvas}
          />
        </Tooltip>
      </div>
    </div>
  );
};
