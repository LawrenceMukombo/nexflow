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
  BuildOutlined
} from '@ant-design/icons';
import { useGraphStore, isComponentInDomain } from '../store/graphStore';
import { EngineeringDomain } from '@omniflow/shared-types';

interface CanvasManipulatorMenuProps {
  buttonType?: 'default' | 'primary' | 'text' | 'dashed';
  size?: 'small' | 'middle' | 'large';
  showBadge?: boolean;
}

export const CanvasManipulatorMenu: React.FC<CanvasManipulatorMenuProps> = ({
  buttonType = 'default',
  size = 'middle',
  showBadge = true
}) => {
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
    injectFaultOrSurge
  } = useGraphStore();

  const allNodes = Object.values(graph.nodes);
  const domainNodes = allNodes.filter(n => isComponentInDomain(n, activeDomain));
  const visibleNodes = domainFilterMode === 'ALL_DOMAINS' 
    ? allNodes 
    : domainNodes;

  const domainLabels: Record<EngineeringDomain, string> = {
    NETWORK: '🌐 Network',
    ELECTRICAL: '⚡ Electrical Power',
    PLUMBING: '💧 Plumbing & Cooling',
    SOLAR: '☀️ Solar Energy',
    CCTV: '🛡️ CCTV & Security',
    MULTI_DOMAIN: '🏢 All Domains'
  };

  const menuItems: MenuProps['items'] = [
    // --- 1. DOMAIN ISOLATION & VISIBILITY ---
    {
      key: 'grp-domain-isolation',
      label: (
        <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em' }}>
          DOMAIN WORKSPACE & ISOLATION
        </span>
      ),
      type: 'group',
      children: [
        {
          key: 'isolate-domain',
          icon: domainFilterMode === 'ACTIVE_ONLY' 
            ? <EyeInvisibleOutlined style={{ color: '#38bdf8' }} /> 
            : <EyeOutlined style={{ color: '#94a3b8' }} />,
          label: (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span>Isolate {domainLabels[activeDomain]} Only</span>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: domainFilterMode === 'ACTIVE_ONLY' ? '#0369a1' : '#334155', color: '#fff' }}>
                {domainFilterMode === 'ACTIVE_ONLY' ? 'Active' : 'Show All'}
              </span>
            </div>
          ),
          onClick: () => {
            toggleDomainFilterMode();
            message.info(domainFilterMode === 'ACTIVE_ONLY' ? 'Showing all engineering domains on canvas' : `Isolated ${domainLabels[activeDomain]} canvas`);
          }
        },
        {
          key: 'show-all-domains',
          icon: <ClusterOutlined style={{ color: '#10b981' }} />,
          label: `Show All Domains (${allNodes.length} Total Components)`,
          onClick: () => {
            setDomainFilterMode('ALL_DOMAINS');
            message.success('Overlay mode enabled: all domains visible simultaneously');
          }
        },
        {
          key: 'switch-domain-sub',
          icon: <BranchesOutlined style={{ color: '#f59e0b' }} />,
          label: 'Switch Active Domain Layer',
          children: [
            {
              key: 'dom-net',
              label: '🌐 Network Domain',
              onClick: () => { setActiveDomain('NETWORK'); message.info('Switched to Network Domain canvas'); }
            },
            {
              key: 'dom-elec',
              label: '⚡ Electrical Power Domain',
              onClick: () => { setActiveDomain('ELECTRICAL'); message.info('Switched to Electrical Power Domain canvas'); }
            },
            {
              key: 'dom-plumb',
              label: '💧 Plumbing & Cooling Domain',
              onClick: () => { setActiveDomain('PLUMBING'); message.info('Switched to Plumbing & Cooling Domain canvas'); }
            },
            {
              key: 'dom-cctv',
              label: '🛡️ CCTV & Surveillance Domain',
              onClick: () => { setActiveDomain('CCTV'); message.info('Switched to CCTV & Security Domain canvas'); }
            },
            {
              key: 'dom-all',
              label: '🏢 All Domains (Multi-Facility)',
              onClick: () => { setActiveDomain('MULTI_DOMAIN'); setDomainFilterMode('ALL_DOMAINS'); message.info('Switched to All Domains'); }
            }
          ]
        },
        {
          key: 'zoom-fit',
          icon: <AimOutlined style={{ color: '#38bdf8' }} />,
          label: 'Zoom & Center to Fit Visible Components',
          onClick: () => {
            zoomToFitVisible();
            message.success('Viewport centered on active components');
          }
        }
      ]
    },

    { type: 'divider' },

    // --- 2. SELECTION & FILTERING ---
    {
      key: 'grp-selection',
      label: (
        <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em' }}>
          SELECT & HIGHLIGHT
        </span>
      ),
      type: 'group',
      children: [
        {
          key: 'sel-all-vis',
          icon: <CheckSquareOutlined style={{ color: '#38bdf8' }} />,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>Select All Visible ({visibleNodes.length})</span>
              <span style={{ color: '#64748b', fontSize: 11 }}>Ctrl+A</span>
            </div>
          ),
          onClick: selectAllNodes
        },
        {
          key: 'sel-domain',
          icon: <ThunderboltOutlined style={{ color: '#facc15' }} />,
          label: `Select All ${domainLabels[activeDomain]} (${domainNodes.length})`,
          onClick: () => {
            selectNodesByCondition('DOMAIN');
            message.info(`Selected all ${domainNodes.length} components in active domain`);
          }
        },
        {
          key: 'sel-offline',
          icon: <WarningOutlined style={{ color: '#ef4444' }} />,
          label: 'Select Offline & Faulty Devices',
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
          label: 'Select Switches & Distribution PDUs',
          onClick: () => selectNodesByCondition('SWITCHES')
        },
        {
          key: 'sel-invert',
          icon: <BorderOutlined style={{ color: '#94a3b8' }} />,
          label: 'Invert Selection',
          onClick: invertSelection
        },
        {
          key: 'sel-clear',
          icon: <DisconnectOutlined style={{ color: '#64748b' }} />,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>Deselect All</span>
              <span style={{ color: '#64748b', fontSize: 11 }}>Esc</span>
            </div>
          ),
          onClick: clearSelection
        }
      ]
    },

    { type: 'divider' },

    // --- 3. POSITIONING, ALIGNMENT & CAD LAYOUT ---
    {
      key: 'grp-alignment',
      label: (
        <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em' }}>
          LAYOUT, ALIGN & ARRANGE
        </span>
      ),
      type: 'group',
      children: [
        {
          key: 'align-h-center',
          icon: <ColumnHeightOutlined style={{ color: '#38bdf8' }} />,
          label: 'Align Center Horizontally (Match Y)',
          onClick: () => {
            alignSelectedNodes('horizontal');
            message.success('Aligned components horizontally');
          }
        },
        {
          key: 'align-v-center',
          icon: <ColumnWidthOutlined style={{ color: '#38bdf8' }} />,
          label: 'Align Center Vertically (Match X)',
          onClick: () => {
            alignSelectedNodes('vertical');
            message.success('Aligned components vertically');
          }
        },
        {
          key: 'align-left',
          icon: <AlignLeftOutlined style={{ color: '#94a3b8' }} />,
          label: 'Align Leftmost Edge',
          onClick: () => {
            alignSelectedNodes('alignLeft');
            message.success('Aligned to leftmost component');
          }
        },
        {
          key: 'align-right',
          icon: <AlignRightOutlined style={{ color: '#94a3b8' }} />,
          label: 'Align Rightmost Edge',
          onClick: () => {
            alignSelectedNodes('alignRight');
            message.success('Aligned to rightmost component');
          }
        },
        {
          key: 'distribute-h',
          icon: <ColumnWidthOutlined style={{ color: '#10b981' }} />,
          label: 'Distribute Evenly (Horizontal Spacing)',
          onClick: () => {
            alignSelectedNodes('distributeH');
            message.success('Distributed evenly along horizontal axis');
          }
        },
        {
          key: 'distribute-v',
          icon: <ColumnHeightOutlined style={{ color: '#10b981' }} />,
          label: 'Distribute Evenly (Vertical Spacing)',
          onClick: () => {
            alignSelectedNodes('distributeV');
            message.success('Distributed evenly along vertical axis');
          }
        },
        {
          key: 'arrange-pipeline',
          icon: <BranchesOutlined style={{ color: '#06b6d4' }} />,
          label: 'Arrange as Flow Pipeline (Left-to-Right)',
          onClick: () => {
            alignSelectedNodes('pipeline');
            message.success('Arranged in left-to-right flow pipeline');
          }
        },
        {
          key: 'arrange-grid',
          icon: <AppstoreOutlined style={{ color: '#f59e0b' }} />,
          label: 'Arrange in Matrix Grid',
          onClick: () => {
            alignSelectedNodes('grid');
            message.success('Arranged in matrix grid');
          }
        },
        {
          key: 'auto-tiers',
          icon: <ApartmentOutlined style={{ color: '#38bdf8' }} />,
          label: 'Auto-Layout Hierarchical Engineering Tiers',
          onClick: () => {
            autoLayout();
            message.success('Auto-organized into hierarchical engineering tiers');
          }
        }
      ]
    },

    { type: 'divider' },

    // --- 4. SIMULATION & HARDWARE STATES ---
    {
      key: 'grp-simulation-states',
      label: (
        <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em' }}>
          SIMULATION & HARDWARE STATE
        </span>
      ),
      type: 'group',
      children: [
        {
          key: 'pwr-all-online',
          icon: <CheckCircleOutlined style={{ color: '#10b981' }} />,
          label: 'Bulk Power ON (Set All to Online 🟢)',
          onClick: () => {
            bulkSetComponentStatus('ONLINE');
            message.success('Powered on components to nominal operational status');
          }
        },
        {
          key: 'pwr-sel-offline',
          icon: <CloseCircleOutlined style={{ color: '#ef4444' }} />,
          label: 'Bulk Power OFF (Shutdown Selected 🔴)',
          onClick: () => {
            bulkSetComponentStatus('OFFLINE');
            message.warning('Powered down selected components');
          }
        },
        {
          key: 'inj-fault',
          icon: <WarningOutlined style={{ color: '#f59e0b' }} />,
          label: 'Inject Hardware Failure (Simulate Fault ❌)',
          onClick: () => {
            bulkSetComponentStatus('FAILED');
            message.error('Simulated hardware failure on components');
          }
        },
        {
          key: 'reset-nominal',
          icon: <SyncOutlined style={{ color: '#06b6d4' }} />,
          label: 'Restore Healthy Nominal State',
          onClick: () => {
            bulkSetComponentStatus('ONLINE');
            message.success('All hardware reset to nominal healthy telemetry');
          }
        },
        {
          key: 'trig-burst',
          icon: <ThunderboltOutlined style={{ color: '#facc15' }} />,
          label: 'Trigger Packet Burst / Signal Surge',
          onClick: () => {
            injectFaultOrSurge('PACKET_BURST');
            message.success('Dispatched high-density simulation packets');
          }
        }
      ]
    },

    { type: 'divider' },

    // --- 5. BATCH WIRING & CLEANUP ---
    {
      key: 'grp-wiring-ops',
      label: (
        <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', letterSpacing: '0.05em' }}>
          BATCH WIRING & CLEANUP
        </span>
      ),
      type: 'group',
      children: [
        {
          key: 'wire-star',
          icon: <ClusterOutlined style={{ color: '#38bdf8' }} />,
          label: 'Auto-Wire Selected (Star Topology)',
          disabled: selectedNodeIds.length < 2,
          onClick: () => {
            connectSelectedNodes('star');
            message.success('Wired selected nodes in Star topology');
          }
        },
        {
          key: 'wire-daisy',
          icon: <BranchesOutlined style={{ color: '#10b981' }} />,
          label: 'Auto-Wire Selected (Daisy-Chain)',
          disabled: selectedNodeIds.length < 2,
          onClick: () => {
            connectSelectedNodes('daisy');
            message.success('Wired selected nodes in linear Daisy-Chain');
          }
        },
        {
          key: 'wire-mesh',
          icon: <BuildOutlined style={{ color: '#ec4899' }} />,
          label: 'Auto-Wire Selected (Redundant Mesh)',
          disabled: selectedNodeIds.length < 2,
          onClick: () => {
            connectSelectedNodes('mesh');
            message.success('Wired selected nodes in Redundant Mesh');
          }
        },
        {
          key: 'dup-sel',
          icon: <CopyOutlined style={{ color: '#38bdf8' }} />,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>Duplicate Selected</span>
              <span style={{ color: '#64748b', fontSize: 11 }}>Ctrl+D</span>
            </div>
          ),
          disabled: selectedNodeIds.length === 0,
          onClick: () => {
            duplicateSelectedComponents();
            message.success(`Duplicated ${selectedNodeIds.length} components`);
          }
        },
        {
          key: 'del-sel',
          icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>Delete Selected</span>
              <span style={{ color: '#64748b', fontSize: 11 }}>Del</span>
            </div>
          ),
          disabled: selectedNodeIds.length === 0,
          onClick: () => {
            deleteSelectedComponents();
            message.info('Deleted selected components');
          }
        },
        {
          key: 'clear-domain-only',
          icon: <ClearOutlined style={{ color: '#f59e0b' }} />,
          label: `Clear ${domainLabels[activeDomain]} Components Only (Keep Other Domains)`,
          onClick: () => {
            clearDomainComponents(activeDomain);
            message.warning(`Cleared all components in ${domainLabels[activeDomain]}`);
          }
        },
        {
          key: 'clear-all',
          icon: <ClearOutlined style={{ color: '#ef4444' }} />,
          label: 'Clear Entire Canvas (Reset Project)',
          onClick: () => {
            clearCanvas();
            message.info('Cleared entire canvas');
          }
        }
      ]
    }
  ];

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomLeft">
      <Button
        type={buttonType}
        size={size}
        icon={<AppstoreOutlined style={{ color: '#38bdf8' }} />}
        style={{
          backgroundColor: '#1e293b',
          borderColor: '#38bdf8',
          color: '#f8fafc',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}
      >
        <span>Manipulate Canvas</span>
        {showBadge && (
          <span
            style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 10,
              backgroundColor: '#0284c7',
              color: '#fff',
              lineHeight: 1.2
            }}
          >
            {visibleNodes.length}
          </span>
        )}
        <DownOutlined style={{ fontSize: 10, color: '#94a3b8' }} />
      </Button>
    </Dropdown>
  );
};
