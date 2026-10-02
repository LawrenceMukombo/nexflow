import React from 'react';
import { Button, Space, Select, Badge, Tooltip, message, Tag, Dropdown } from 'antd';
import { 
  PlayCircleFilled, 
  PauseCircleFilled, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 
  DollarOutlined, 
  TableOutlined, 
  ThunderboltFilled,
  BuildOutlined,
  BookOutlined,
  SaveOutlined,
  FilePdfOutlined,
  HistoryOutlined,
  ExportOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { EngineeringDomain } from '@omniflow/shared-types';
import { NexFlowBrandIcon } from './ComponentIcon';
import { EnterpriseMenuBar } from './CanvasManipulatorMenu';

export const TopNav: React.FC = () => {
  const {
    activeDomain,
    setActiveDomain,
    domainFilterMode,
    setDomainFilterMode,
    toggleDomainFilterMode,
    openAnalyticsModal,
    validationIssues,
    toggleValidationDrawer,
    toggleBOQModal,
    toggleCableScheduleModal,
    toggleWizardModal,
    toggleLibraryModal,
    toggleProjectsModal,
    openDesignReportModal,
    openVersionDiffModal,
    openExportCenterModal,
    engineeringStatus,
    setEngineeringStatus,
    currentProjectName,
    isProjectDirty,
    saveCurrentProject,
    libraries,
    isSimulating,
    toggleSimulation,
    simulationSpeed,
    setSimulationSpeed,
    triggerPacketBurst
  } = useGraphStore();

  const errorCount = validationIssues.filter((i) => i.severity === 'CRITICAL' || i.severity === 'ERROR').length;

  return (
    <div
      style={{
        height: 48,
        backgroundColor: '#090d16',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        zIndex: 30
      }}
    >
      {/* 1. Left: Brand & Domain & Project Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Brand Logo & Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NexFlowBrandIcon size={28} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc', lineHeight: 1.1 }}>
              Nex<span style={{ color: '#38bdf8' }}>Flow</span>
            </div>
            <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 700, letterSpacing: '0.06em' }}>
              ENTERPRISE CAD
            </div>
          </div>
        </div>

        <div style={{ width: 1, height: 18, backgroundColor: '#334155' }} />

        {/* Domain Selector & Isolation Mode */}
        <Space size={6}>
          <Select<EngineeringDomain>
            value={activeDomain}
            onChange={(val) => {
              setActiveDomain(val);
              if (val === 'MULTI_DOMAIN') {
                setDomainFilterMode('ALL_DOMAINS');
                message.info('Switched to All Domains (Multi-Facility Overlay)');
              } else {
                setDomainFilterMode('ACTIVE_ONLY');
                message.info(`Switched to ${val} domain. Workspace isolated & Palette updated.`);
              }
            }}
            style={{ width: 140 }}
            size="small"
            options={[
              { label: '🌐 Network', value: 'NETWORK' },
              { label: '⚡ Electrical', value: 'ELECTRICAL' },
              { label: '💧 Plumbing', value: 'PLUMBING' },
              { label: '☀️ Solar Power', value: 'SOLAR' },
              { label: '🛡️ CCTV & Sec', value: 'CCTV' },
              { label: '🏢 All Domains', value: 'MULTI_DOMAIN' }
            ]}
          />

          <Tooltip title={domainFilterMode === 'ACTIVE_ONLY' ? 'Active Domain Isolated: components from other domains are hidden to allow room. Click to show all.' : 'All Domains Visible: click to isolate active domain.'}>
            <Tag
              color={domainFilterMode === 'ACTIVE_ONLY' ? '#0284c7' : '#7c3aed'}
              style={{ cursor: 'pointer', margin: 0, padding: '1px 6px', fontSize: 10.5, borderRadius: 4, fontWeight: 600 }}
              onClick={toggleDomainFilterMode}
            >
              {domainFilterMode === 'ACTIVE_ONLY' ? '🔒 Isolated' : '🌐 Overlay'}
            </Tag>
          </Tooltip>
        </Space>

        <div style={{ width: 1, height: 18, backgroundColor: '#334155' }} />

        {/* Project Name Tag & Quick Save */}
        <Space size={4}>
          <Tag 
            color="blue" 
            style={{ 
              cursor: 'pointer', 
              padding: '2px 8px', 
              fontSize: 11.5, 
              borderRadius: 4,
              backgroundColor: 'rgba(2, 132, 199, 0.12)',
              borderColor: '#0284c7',
              color: '#38bdf8',
              margin: 0
            }}
            onClick={() => toggleProjectsModal(true)}
            title="Click to manage saved projects"
          >
            📁 {currentProjectName} {isProjectDirty ? '•' : ''}
          </Tag>
          <Tooltip title="Quick Save (Ctrl+S)">
            <Button
              type="text"
              size="small"
              icon={<SaveOutlined style={{ color: isProjectDirty ? '#f59e0b' : '#38bdf8', fontSize: 13 }} />}
              onClick={() => {
                saveCurrentProject();
                message.success(`Saved "${currentProjectName}" successfully!`);
              }}
            />
          </Tooltip>
        </Space>
      </div>

      {/* 2. Center: Standard Enterprise Menu Bar (Edit, View, Arrange, Tools, Blueprints) */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          backgroundColor: '#0f172a', 
          border: '1px solid #1e293b', 
          borderRadius: 6, 
          padding: '2px 6px' 
        }}
      >
        <EnterpriseMenuBar />
      </div>

      {/* 3. Right: Command Actions, Documentation, Validation, Simulation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Topology Wizard Primary Action */}
        <Button
          type="primary"
          icon={<BuildOutlined />}
          size="small"
          onClick={() => toggleWizardModal(true)}
          style={{ backgroundColor: '#0284c7', borderColor: '#0284c7', fontWeight: 600, fontSize: 12 }}
        >
          Wizard
        </Button>

        {/* Component Libraries */}
        <Badge count={libraries.length} size="small" offset={[-2, 2]} color="#38bdf8">
          <Button
            icon={<BookOutlined style={{ color: '#38bdf8' }} />}
            size="small"
            onClick={() => toggleLibraryModal(true)}
            style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: 12 }}
          >
            Libraries
          </Button>
        </Badge>

        {/* Analytics & KPI Dashboard (Rule 24 & 25) */}
        <Button
          icon={<BarChartOutlined style={{ color: '#38bdf8' }} />}
          size="small"
          onClick={openAnalyticsModal}
          style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: 12, fontWeight: 600 }}
        >
          Analytics &amp; KPI
        </Button>

        {/* Documentation & Reports Dropdown */}
        <Dropdown
          menu={{
            items: [
              {
                key: 'doc-analytics',
                icon: <BarChartOutlined style={{ color: '#38bdf8' }} />,
                label: 'Analytics & KPI Dashboard',
                onClick: openAnalyticsModal
              },
              { type: 'divider' },
              {
                key: 'doc-boq',
                icon: <DollarOutlined style={{ color: '#10b981' }} />,
                label: 'Bill of Materials (BOM / BOQ)',
                onClick: () => toggleBOQModal(true)
              },
              {
                key: 'doc-cables',
                icon: <TableOutlined style={{ color: '#38bdf8' }} />,
                label: 'Cable Schedule & Run List',
                onClick: () => toggleCableScheduleModal(true)
              },
              {
                key: 'doc-report',
                icon: <FilePdfOutlined style={{ color: '#0284c7' }} />,
                label: 'Specification Report (PDF)',
                onClick: openDesignReportModal
              },
              {
                key: 'doc-diff',
                icon: <HistoryOutlined style={{ color: '#f59e0b' }} />,
                label: 'Revision History & Variance Diff',
                onClick: openVersionDiffModal
              },
              { type: 'divider' },
              {
                key: 'doc-export',
                icon: <ExportOutlined style={{ color: '#10b981' }} />,
                label: 'Project Export Center',
                onClick: openExportCenterModal
              }
            ]
          }}
          placement="bottomRight"
        >
          <Button
            size="small"
            icon={<FilePdfOutlined style={{ color: '#38bdf8' }} />}
            style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: 12 }}
          >
            Documentation ▾
          </Button>
        </Dropdown>

        {/* Engineering Validation Badge & Button */}
        <Badge count={errorCount} offset={[-2, 2]}>
          <Button
            size="small"
            icon={errorCount > 0 ? <ExclamationCircleOutlined style={{ color: '#ef4444' }} /> : <CheckCircleOutlined style={{ color: '#10b981' }} />}
            onClick={() => toggleValidationDrawer(true)}
            style={{
              backgroundColor: '#1e293b',
              borderColor: errorCount > 0 ? '#ef4444' : '#334155',
              color: '#f8fafc',
              fontSize: 12
            }}
          >
            Validate
          </Button>
        </Badge>

        {/* Engineering Governance Status */}
        <Select
          value={engineeringStatus}
          size="small"
          onChange={(s) => {
            setEngineeringStatus(s);
            message.success(`Design status set to ${s}`);
          }}
          style={{ width: 95 }}
          options={[
            { label: '⚪ Draft', value: 'DRAFT' },
            { label: '🟡 Review', value: 'IN_REVIEW' },
            { label: '🟢 Approved', value: 'APPROVED' },
            { label: '🔒 Locked', value: 'LOCKED' }
          ]}
        />

        <div style={{ width: 1, height: 18, backgroundColor: '#334155' }} />

        {/* Simulation Controls */}
        <Space.Compact size="small">
          <Button
            type={isSimulating ? 'primary' : 'default'}
            icon={isSimulating ? <PauseCircleFilled /> : <PlayCircleFilled style={{ color: '#10b981' }} />}
            onClick={() => toggleSimulation()}
            style={{
              backgroundColor: isSimulating ? '#0284c7' : '#1e293b',
              borderColor: '#334155',
              color: '#f8fafc',
              fontSize: 12
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
            style={{ width: 68 }}
            size="small"
            options={[
              { label: '0.25x', value: 0.25 },
              { label: '0.5x', value: 0.5 },
              { label: '1x', value: 1 },
              { label: '2x', value: 2 }
            ]}
          />
        </Space.Compact>
      </div>
    </div>
  );
};
