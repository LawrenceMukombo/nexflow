import React from 'react';
import { Dropdown, Button, MenuProps, message } from 'antd';
import { 
  AppstoreOutlined,
  BranchesOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CheckSquareOutlined,
  BorderOutlined,
  DisconnectOutlined,
  ClearOutlined,
  AimOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  ColumnWidthOutlined,
  ColumnHeightOutlined,
  ApartmentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  SyncOutlined,
  CopyOutlined,
  DeleteOutlined,
  NodeIndexOutlined,
  ClusterOutlined,
  TableOutlined,
  DownOutlined,
  BuildOutlined,
  UndoOutlined,
  RedoOutlined,
  FilePdfOutlined,
  DollarOutlined,
  HistoryOutlined,
  ExportOutlined,
  BookOutlined,
  CodeOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useGraphStore, isComponentInDomain } from '../store/graphStore';
import { EngineeringDomain } from '@omniflow/shared-types';

const domainLabels: Record<EngineeringDomain, string> = {
  NETWORK: '🌐 Network',
  ELECTRICAL: '⚡ Electrical Power',
  PLUMBING: '💧 Plumbing & HVAC',
  SOLAR: '☀️ Solar Energy',
  CCTV: '🛡️ CCTV & Security',
  MULTI_DOMAIN: '🏢 All Domains'
};

/**
 * Professional Enterprise Menu Bar (Edit, View, Arrange, Tools, Blueprints)
 */
export const EnterpriseMenuBar: React.FC = () => {
  const {
    graph,
    activeDomain,
    setActiveDomain,
    domainFilterMode,
    setDomainFilterMode,
    toggleDomainFilterMode,
    selectedNodeIds,
    selectAllNodes,
    clearSelection,
    invertSelection,
    selectNodesByCondition,
    alignSelectedNodes,
    bulkSetComponentStatus,
    clearDomainComponents,
    zoomToFitVisible,
    connectSelectedNodes,
    duplicateSelectedComponents,
    deleteSelectedComponents,
    autoLayout,
    clearCanvas,
    injectFaultOrSurge,
    undo,
    redo,
    historyIndex,
    history,
    loadSystemDesign,
    toggleWizardModal,
    toggleLibraryModal,
    toggleSaveAssemblyModal,
    toggleBOQModal,
    toggleCableScheduleModal,
    openDesignReportModal,
    openVersionDiffModal,
    openExportCenterModal,
    openAnalyticsModal,
    toggleValidationDrawer,
    validationIssues,
    openCliModal
  } = useGraphStore();

  const allNodes = Object.values(graph.nodes);
  const domainNodes = allNodes.filter(n => isComponentInDomain(n, activeDomain));
  const visibleNodes = domainFilterMode === 'ALL_DOMAINS' ? allNodes : domainNodes;

  // ─────────────────────────────────────────────────────────────
  // 1. EDIT MENU
  // ─────────────────────────────────────────────────────────────
  const editMenuItems: MenuProps['items'] = [
    {
      key: 'edit-undo',
      icon: <UndoOutlined style={{ color: historyIndex > 0 ? '#38bdf8' : '#475569' }} />,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <span>Undo</span>
          <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>Ctrl+Z</span>
        </div>
      ),
      disabled: historyIndex <= 0,
      onClick: undo
    },
    {
      key: 'edit-redo',
      icon: <RedoOutlined style={{ color: historyIndex < history.length - 1 ? '#38bdf8' : '#475569' }} />,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <span>Redo</span>
          <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>Ctrl+Y</span>
        </div>
      ),
      disabled: historyIndex >= history.length - 1,
      onClick: redo
    },
    { type: 'divider' },
    {
      key: 'edit-select-all',
      icon: <CheckSquareOutlined style={{ color: '#38bdf8' }} />,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <span>Select All ({visibleNodes.length})</span>
          <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>Ctrl+A</span>
        </div>
      ),
      onClick: selectAllNodes
    },
    {
      key: 'edit-select-sub',
      icon: <BorderOutlined style={{ color: '#a855f7' }} />,
      label: 'Select by Category',
      children: [
        {
          key: 'sel-current-domain',
          icon: <ThunderboltOutlined style={{ color: '#facc15' }} />,
          label: `Select Current Domain (${domainNodes.length})`,
          onClick: () => {
            selectNodesByCondition('DOMAIN');
            message.info(`Selected all ${domainNodes.length} components in active domain`);
          }
        },
        {
          key: 'sel-faulted',
          icon: <WarningOutlined style={{ color: '#ef4444' }} />,
          label: 'Select Faulted / Offline Devices',
          onClick: () => {
            selectNodesByCondition('OFFLINE');
            message.info('Selected offline and degraded hardware nodes');
          }
        },
        {
          key: 'sel-routers',
          icon: <NodeIndexOutlined style={{ color: '#06b6d4' }} />,
          label: 'Select Routers & Gateways',
          onClick: () => selectNodesByCondition('ROUTERS')
        },
        {
          key: 'sel-switches',
          icon: <TableOutlined style={{ color: '#818cf8' }} />,
          label: 'Select Switches & Distribution',
          onClick: () => selectNodesByCondition('SWITCHES')
        },
        {
          key: 'sel-invert',
          icon: <BorderOutlined style={{ color: '#94a3b8' }} />,
          label: 'Invert Selection',
          onClick: invertSelection
        }
      ]
    },
    {
      key: 'edit-deselect-all',
      icon: <DisconnectOutlined style={{ color: '#64748b' }} />,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <span>Deselect All</span>
          <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>Esc</span>
        </div>
      ),
      onClick: clearSelection
    },
    { type: 'divider' },
    {
      key: 'edit-duplicate',
      icon: <CopyOutlined style={{ color: '#10b981' }} />,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <span>Duplicate Selected</span>
          <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>Ctrl+D</span>
        </div>
      ),
      disabled: selectedNodeIds.length === 0,
      onClick: () => {
        duplicateSelectedComponents();
        message.success(`Duplicated ${selectedNodeIds.length} components`);
      }
    },
    {
      key: 'edit-delete',
      icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <span>Delete Selected</span>
          <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>Del</span>
        </div>
      ),
      disabled: selectedNodeIds.length === 0,
      onClick: () => {
        deleteSelectedComponents();
        message.info('Deleted selected components');
      }
    },
    { type: 'divider' },
    {
      key: 'edit-clear-domain',
      icon: <ClearOutlined style={{ color: '#f59e0b' }} />,
      label: `Clear ${domainLabels[activeDomain]} Layer`,
      onClick: () => {
        clearDomainComponents(activeDomain);
        message.warning(`Cleared all components in ${domainLabels[activeDomain]}`);
      }
    },
    {
      key: 'edit-clear-canvas',
      icon: <ClearOutlined style={{ color: '#ef4444' }} />,
      label: 'Clear Entire Canvas',
      onClick: () => {
        clearCanvas();
        message.info('Cleared entire canvas');
      }
    }
  ];

  // ─────────────────────────────────────────────────────────────
  // 2. VIEW MENU
  // ─────────────────────────────────────────────────────────────
  const viewMenuItems: MenuProps['items'] = [
    {
      key: 'view-zoom-fit',
      icon: <AimOutlined style={{ color: '#38bdf8' }} />,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
          <span>Zoom to Fit</span>
          <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>Shift+1</span>
        </div>
      ),
      onClick: () => {
        zoomToFitVisible();
        message.success('Viewport centered on active components');
      }
    },
    { type: 'divider' },
    {
      key: 'view-isolate-domain',
      icon: domainFilterMode === 'ACTIVE_ONLY' 
        ? <EyeInvisibleOutlined style={{ color: '#38bdf8' }} /> 
        : <EyeOutlined style={{ color: '#94a3b8' }} />,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span>Isolate Active Domain Only</span>
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: domainFilterMode === 'ACTIVE_ONLY' ? '#0369a1' : '#334155', color: '#fff' }}>
            {domainFilterMode === 'ACTIVE_ONLY' ? 'Active' : 'Off'}
          </span>
        </div>
      ),
      onClick: () => {
        toggleDomainFilterMode();
        message.info(domainFilterMode === 'ACTIVE_ONLY' ? 'Showing all engineering domains on canvas' : `Isolated ${domainLabels[activeDomain]} canvas`);
      }
    },
    {
      key: 'view-all-domains',
      icon: <ClusterOutlined style={{ color: '#10b981' }} />,
      label: `Show All Domain Layers (${allNodes.length} Components)`,
      onClick: () => {
        setDomainFilterMode('ALL_DOMAINS');
        message.success('Overlay mode enabled: all domains visible simultaneously');
      }
    },
    {
      key: 'view-domain-layers',
      icon: <BranchesOutlined style={{ color: '#f59e0b' }} />,
      label: 'Switch Active Domain Layer',
      children: [
        {
          key: 'vdom-net',
          label: '🌐 Network Domain',
          onClick: () => { setActiveDomain('NETWORK'); setDomainFilterMode('ACTIVE_ONLY'); message.info('Switched to Network Domain'); }
        },
        {
          key: 'vdom-elec',
          label: '⚡ Electrical Power Domain',
          onClick: () => { setActiveDomain('ELECTRICAL'); setDomainFilterMode('ACTIVE_ONLY'); message.info('Switched to Electrical Power Domain'); }
        },
        {
          key: 'vdom-plumb',
          label: '💧 Plumbing & HVAC Domain',
          onClick: () => { setActiveDomain('PLUMBING'); setDomainFilterMode('ACTIVE_ONLY'); message.info('Switched to Plumbing & Cooling Domain'); }
        },
        {
          key: 'vdom-cctv',
          label: '🛡️ CCTV & Security Domain',
          onClick: () => { setActiveDomain('CCTV'); setDomainFilterMode('ACTIVE_ONLY'); message.info('Switched to CCTV & Security Domain'); }
        },
        {
          key: 'vdom-solar',
          label: '☀️ Solar & Renewable Domain',
          onClick: () => { setActiveDomain('SOLAR'); setDomainFilterMode('ACTIVE_ONLY'); message.info('Switched to Solar Power Domain'); }
        },
        {
          key: 'vdom-all',
          label: '🏢 All Domains (Multi-Facility)',
          onClick: () => { setActiveDomain('MULTI_DOMAIN'); setDomainFilterMode('ALL_DOMAINS'); message.info('Switched to All Domains'); }
        }
      ]
    },
    { type: 'divider' },
    {
      key: 'view-diagnostics-drawer',
      icon: <WarningOutlined style={{ color: validationIssues.length > 0 ? '#ef4444' : '#10b981' }} />,
      label: `Engineering Diagnostics (${validationIssues.length} issues)`,
      onClick: () => toggleValidationDrawer(true)
    }
  ];

  // ─────────────────────────────────────────────────────────────
  // 3. ARRANGE MENU
  // ─────────────────────────────────────────────────────────────
  const arrangeMenuItems: MenuProps['items'] = [
    {
      key: 'arr-align-sub',
      icon: <AlignLeftOutlined style={{ color: '#38bdf8' }} />,
      label: 'Align Components',
      disabled: selectedNodeIds.length < 2,
      children: [
        {
          key: 'align-left',
          icon: <AlignLeftOutlined />,
          label: 'Align Left',
          onClick: () => { alignSelectedNodes('alignLeft'); message.success('Aligned to left'); }
        },
        {
          key: 'align-h-center',
          icon: <ColumnHeightOutlined />,
          label: 'Align Center Horizontally',
          onClick: () => { alignSelectedNodes('horizontal'); message.success('Aligned horizontal center'); }
        },
        {
          key: 'align-right',
          icon: <AlignRightOutlined />,
          label: 'Align Right',
          onClick: () => { alignSelectedNodes('alignRight'); message.success('Aligned to right'); }
        },
        {
          key: 'align-v-center',
          icon: <ColumnWidthOutlined />,
          label: 'Align Center Vertically',
          onClick: () => { alignSelectedNodes('vertical'); message.success('Aligned vertical center'); }
        }
      ]
    },
    {
      key: 'arr-dist-sub',
      icon: <ColumnWidthOutlined style={{ color: '#10b981' }} />,
      label: 'Distribute Evenly',
      disabled: selectedNodeIds.length < 3,
      children: [
        {
          key: 'dist-h',
          icon: <ColumnWidthOutlined />,
          label: 'Distribute Horizontally',
          onClick: () => { alignSelectedNodes('distributeH'); message.success('Distributed horizontally'); }
        },
        {
          key: 'dist-v',
          icon: <ColumnHeightOutlined />,
          label: 'Distribute Vertically',
          onClick: () => { alignSelectedNodes('distributeV'); message.success('Distributed vertically'); }
        }
      ]
    },
    { type: 'divider' },
    {
      key: 'arr-auto-tiers',
      icon: <ApartmentOutlined style={{ color: '#38bdf8' }} />,
      label: 'Auto-Layout: Hierarchical Architecture',
      onClick: () => {
        autoLayout();
        message.success('Auto-organized into hierarchical architecture tiers');
      }
    },
    {
      key: 'arr-pipeline',
      icon: <BranchesOutlined style={{ color: '#06b6d4' }} />,
      label: 'Auto-Arrange: Flow Pipeline (Left-to-Right)',
      disabled: selectedNodeIds.length < 2,
      onClick: () => {
        alignSelectedNodes('pipeline');
        message.success('Arranged in left-to-right flow pipeline');
      }
    },
    {
      key: 'arr-grid',
      icon: <AppstoreOutlined style={{ color: '#f59e0b' }} />,
      label: 'Auto-Arrange: Matrix Grid',
      disabled: selectedNodeIds.length < 2,
      onClick: () => {
        alignSelectedNodes('grid');
        message.success('Arranged in matrix grid');
      }
    }
  ];

  // ─────────────────────────────────────────────────────────────
  // 4. TOOLS / OPERATIONS MENU
  // ─────────────────────────────────────────────────────────────
  const toolsMenuItems: MenuProps['items'] = [
    {
      key: 'tool-auto-connect-sub',
      icon: <ClusterOutlined style={{ color: '#38bdf8' }} />,
      label: 'Auto-Connect Selected',
      disabled: selectedNodeIds.length < 2,
      children: [
        {
          key: 'wire-star',
          icon: <ClusterOutlined style={{ color: '#38bdf8' }} />,
          label: 'Star Topology (Hub to Spokes)',
          onClick: () => {
            connectSelectedNodes('star');
            message.success('Connected selected nodes in Star topology');
          }
        },
        {
          key: 'wire-daisy',
          icon: <BranchesOutlined style={{ color: '#10b981' }} />,
          label: 'Daisy-Chain (Linear Sequence)',
          onClick: () => {
            connectSelectedNodes('daisy');
            message.success('Connected selected nodes in linear Daisy-Chain');
          }
        },
        {
          key: 'wire-mesh',
          icon: <BuildOutlined style={{ color: '#ec4899' }} />,
          label: 'Redundant Full Mesh',
          onClick: () => {
            connectSelectedNodes('mesh');
            message.success('Connected selected nodes in Redundant Mesh');
          }
        }
      ]
    },
    {
      key: 'tool-power-sub',
      icon: <ThunderboltOutlined style={{ color: '#facc15' }} />,
      label: 'Component Power & Diagnostics',
      children: [
        {
          key: 'pwr-all-online',
          icon: <CheckCircleOutlined style={{ color: '#10b981' }} />,
          label: 'Power State: Bring All Online',
          onClick: () => {
            bulkSetComponentStatus('ONLINE');
            message.success('All hardware components powered on to nominal status');
          }
        },
        {
          key: 'pwr-sel-offline',
          icon: <CloseCircleOutlined style={{ color: '#ef4444' }} />,
          label: 'Power State: Power Off Selected',
          disabled: selectedNodeIds.length === 0,
          onClick: () => {
            bulkSetComponentStatus('OFFLINE');
            message.warning('Powered down selected components');
          }
        },
        {
          key: 'inj-fault',
          icon: <WarningOutlined style={{ color: '#f59e0b' }} />,
          label: 'Diagnostics: Simulate Component Fault',
          disabled: selectedNodeIds.length === 0,
          onClick: () => {
            bulkSetComponentStatus('FAILED');
            message.error('Simulated hardware failure on selected components');
          }
        },
        {
          key: 'reset-nominal',
          icon: <SyncOutlined style={{ color: '#06b6d4' }} />,
          label: 'Diagnostics: Restore Nominal Healthy State',
          onClick: () => {
            bulkSetComponentStatus('ONLINE');
            message.success('All hardware reset to nominal healthy telemetry');
          }
        },
        {
          key: 'trig-burst',
          icon: <ThunderboltOutlined style={{ color: '#facc15' }} />,
          label: 'Simulation: Inject Traffic / Power Surge',
          onClick: () => {
            injectFaultOrSurge('PACKET_BURST');
            message.success('Dispatched high-density simulation packets');
          }
        }
      ]
    },
    { type: 'divider' },
    {
      key: 'tool-cli-cmd',
      icon: <CodeOutlined style={{ color: '#34d399' }} />,
      label: 'Command Prompt (CMD Diagnostics Console)...',
      onClick: () => openCliModal()
    },
    {
      key: 'tool-wizard',
      icon: <BuildOutlined style={{ color: '#0284c7' }} />,
      label: 'System Topology Wizard...',
      onClick: () => toggleWizardModal(true)
    },
    {
      key: 'tool-libraries',
      icon: <BookOutlined style={{ color: '#38bdf8' }} />,
      label: 'Component & Vendor Libraries...',
      onClick: () => toggleLibraryModal(true)
    },
    {
      key: 'tool-save-assembly',
      icon: <CopyOutlined style={{ color: '#10b981' }} />,
      label: 'Save Selection as Reusable Template...',
      disabled: selectedNodeIds.length === 0,
      onClick: () => toggleSaveAssemblyModal(true)
    },
    { type: 'divider' },
    {
      key: 'tool-analytics',
      icon: <BarChartOutlined style={{ color: '#38bdf8' }} />,
      label: 'Analytics & Telemetry Dashboard (KPI)...',
      onClick: openAnalyticsModal
    },
    { type: 'divider' },
    {
      key: 'tool-boq',
      icon: <DollarOutlined style={{ color: '#10b981' }} />,
      label: 'Bill of Materials (BOM / BOQ)...',
      onClick: () => toggleBOQModal(true)
    },
    {
      key: 'tool-cables',
      icon: <TableOutlined style={{ color: '#38bdf8' }} />,
      label: 'Cable Schedule & Run List...',
      onClick: () => toggleCableScheduleModal(true)
    },
    {
      key: 'tool-report',
      icon: <FilePdfOutlined style={{ color: '#0284c7' }} />,
      label: 'Engineering Design Specification (PDF)...',
      onClick: openDesignReportModal
    },
    {
      key: 'tool-diff',
      icon: <HistoryOutlined style={{ color: '#f59e0b' }} />,
      label: 'Revision History & Variance Diff...',
      onClick: openVersionDiffModal
    },
    {
      key: 'tool-export',
      icon: <ExportOutlined style={{ color: '#10b981' }} />,
      label: 'Project Export Center...',
      onClick: openExportCenterModal
    }
  ];

  // ─────────────────────────────────────────────────────────────
  // 5. BLUEPRINTS / TEMPLATES MENU
  // ─────────────────────────────────────────────────────────────
  const blueprintsMenuItems: MenuProps['items'] = [
    {
      key: 'bp-multi',
      icon: <BuildOutlined style={{ color: '#06b6d4' }} />,
      label: (
        <div>
          <div style={{ fontWeight: 600, color: '#f8fafc' }}>Integrated Smart Facility</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Network Fiber + 400V Power + 7°C Chilled Water</div>
        </div>
      ),
      onClick: () => {
        loadSystemDesign('MULTI_DOMAIN');
        message.success('Loaded Multi-Domain Smart Facility Blueprint');
      }
    },
    {
      key: 'bp-net',
      icon: <BranchesOutlined style={{ color: '#38bdf8' }} />,
      label: (
        <div>
          <div style={{ fontWeight: 600, color: '#f8fafc' }}>Corporate Enterprise Network</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Edge Router, UTM Firewall, Core & PoE Switches, Workstations</div>
        </div>
      ),
      onClick: () => {
        loadSystemDesign('NETWORK');
        message.success('Loaded Corporate Enterprise Network Blueprint');
      }
    },
    {
      key: 'bp-elec',
      icon: <ThunderboltOutlined style={{ color: '#facc15' }} />,
      label: (
        <div>
          <div style={{ fontWeight: 600, color: '#f8fafc' }}>Critical Electrical Distribution</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>500kVA Substation, Diesel Generator, ATS & 40kVA UPS</div>
        </div>
      ),
      onClick: () => {
        loadSystemDesign('ELECTRICAL');
        message.success('Loaded Critical Electrical Power System Blueprint');
      }
    },
    {
      key: 'bp-plumb',
      icon: <TableOutlined style={{ color: '#0284c7' }} />,
      label: (
        <div>
          <div style={{ fontWeight: 600, color: '#f8fafc' }}>Data Center Chilled Water System</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>100-Ton Chiller, VFD Pumps, CRAH Coolers & Cooling Tower</div>
        </div>
      ),
      onClick: () => {
        loadSystemDesign('PLUMBING');
        message.success('Loaded Chilled Water Hydronic Cooling Blueprint');
      }
    },
    {
      key: 'bp-cctv',
      icon: <BuildOutlined style={{ color: '#d946ef' }} />,
      label: (
        <div>
          <div style={{ fontWeight: 600, color: '#f8fafc' }}>CCTV & Perimeter Surveillance</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>4K PTZ Cameras, PoE Switch & 32-Channel NVR</div>
        </div>
      ),
      onClick: () => {
        loadSystemDesign('CCTV');
        message.success('Loaded CCTV Video Surveillance Blueprint');
      }
    }
  ];

  const menuItemBtnStyle: React.CSSProperties = {
    color: '#cbd5e1',
    fontWeight: 500,
    fontSize: 12.5,
    padding: '4px 8px',
    height: 28,
    borderRadius: 4
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {/* Edit Menu */}
      <Dropdown menu={{ items: editMenuItems }} trigger={['click']} placement="bottomLeft">
        <Button type="text" size="small" style={menuItemBtnStyle}>
          Edit <DownOutlined style={{ fontSize: 9, color: '#64748b' }} />
        </Button>
      </Dropdown>

      {/* View Menu */}
      <Dropdown menu={{ items: viewMenuItems }} trigger={['click']} placement="bottomLeft">
        <Button type="text" size="small" style={menuItemBtnStyle}>
          View <DownOutlined style={{ fontSize: 9, color: '#64748b' }} />
        </Button>
      </Dropdown>

      {/* Arrange Menu */}
      <Dropdown menu={{ items: arrangeMenuItems }} trigger={['click']} placement="bottomLeft">
        <Button type="text" size="small" style={menuItemBtnStyle}>
          Arrange <DownOutlined style={{ fontSize: 9, color: '#64748b' }} />
        </Button>
      </Dropdown>

      {/* Tools Menu */}
      <Dropdown menu={{ items: toolsMenuItems }} trigger={['click']} placement="bottomLeft">
        <Button type="text" size="small" style={menuItemBtnStyle}>
          Tools <DownOutlined style={{ fontSize: 9, color: '#64748b' }} />
        </Button>
      </Dropdown>

      {/* Blueprints Menu */}
      <Dropdown menu={{ items: blueprintsMenuItems }} trigger={['click']} placement="bottomLeft">
        <Button type="text" size="small" style={{ ...menuItemBtnStyle, color: '#38bdf8' }}>
          Blueprints <DownOutlined style={{ fontSize: 9, color: '#38bdf8' }} />
        </Button>
      </Dropdown>
    </div>
  );
};

/**
 * Backward compatible CanvasManipulatorMenu export:
 * Rendered as standard 'Canvas Actions ▾' dropdown with clean hierarchical sub-menus.
 */
export const CanvasManipulatorMenu: React.FC<{
  buttonType?: 'default' | 'primary' | 'text' | 'dashed';
  size?: 'small' | 'middle' | 'large';
  showBadge?: boolean;
}> = () => {
  return <EnterpriseMenuBar />;
};
