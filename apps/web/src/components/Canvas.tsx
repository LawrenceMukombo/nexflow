import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useGraphStore } from '../store/graphStore';
import { Tag, Badge, message, Dropdown, MenuProps, Button } from 'antd';
import { 
  PlusOutlined,
  MinusOutlined,
  FullscreenOutlined,
  CaretRightOutlined,
  PauseOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  CloudServerOutlined,
  VideoCameraOutlined,
  UpOutlined,
  DownOutlined,
  RocketOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  BranchesOutlined,
  ApartmentOutlined,
  BuildOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DisconnectOutlined,
  AlignLeftOutlined,
  TableOutlined,
  SnippetsOutlined,
  AppstoreOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { ComponentPort, EngineeringComponent, EngineeringConnection } from '@omniflow/shared-types';

export const Canvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    graph,
    selectedNodeId,
    selectedNodeIds,
    selectedConnectionId,
    pendingPort,
    viewport,
    activePackets,
    isSimulating,
    simulationSpeed,
    simulationTick,
    telemetry,
    showDataFlow,
    showElectricFlow,
    showFluidFlow,
    showVideoFlow,
    showPacketLabels,
    setShowPacketLabels,
    flowDensity,
    setFlowDensity,
    selectNode,
    selectNodes,
    selectAllNodes,
    clearSelection,
    addComponentsBatch,
    deleteSelectedComponents,
    removeComponent,
    duplicateComponent,
    duplicateSelectedComponents,
    connectSelectedNodes,
    alignSelectedNodes,
    copySelectedNodes,
    pasteCopiedNodes,
    copiedNodeIds,
    openQuickEditModal,
    updateConnectionCableType,
    updateConnectionLength,
    removeConnection,
    toggleConnectionFault,
    toggleComponentFault,
    toggleSaveAssemblyModal,
    selectConnection,
    moveComponent,
    addComponent,
    insertAssembly,
    startConnection,
    completeConnection,
    cancelConnection,
    setViewport,
    toggleSimulation,
    setSimulationSpeed,
    toggleDomainFlow,
    loadSystemDesign,
    injectFaultOrSurge,
    autoLayout,
    triggerPacketBurst
  } = useGraphStore();

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragInitialPositions, setDragInitialPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    type: 'CANVAS' | 'NODE' | 'CONNECTION';
    targetId?: string;
    canvasPos?: { x: number; y: number };
  } | null>(null);

  // Keyboard Shortcuts for Engineering CAD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 0) {
          deleteSelectedComponents();
          message.info(`Deleted ${selectedNodeIds.length} component(s)`);
        } else if (selectedConnectionId) {
          removeConnection(selectedConnectionId);
          message.info('Removed connection');
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedNodeIds.length > 0) {
          copySelectedNodes();
          message.success(`Copied ${selectedNodeIds.length} component(s) to clipboard`);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (copiedNodeIds.length > 0) {
          pasteCopiedNodes();
          message.success(`Pasted ${copiedNodeIds.length} component(s)`);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedNodeIds.length > 0) {
          duplicateSelectedComponents();
          message.success(`Duplicated ${selectedNodeIds.length} component(s)`);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAllNodes();
      } else if (e.key === 'Escape') {
        clearSelection();
        setContextMenu(null);
        if (pendingPort) cancelConnection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeIds, 
    selectedConnectionId, 
    copiedNodeIds, 
    pendingPort, 
    deleteSelectedComponents, 
    removeConnection, 
    copySelectedNodes, 
    pasteCopiedNodes, 
    duplicateSelectedComponents, 
    selectAllNodes, 
    clearSelection, 
    cancelConnection
  ]);

  // Pan Canvas & Rubber-Band Marquee Selection
  const handleMouseDown = (e: React.MouseEvent) => {
    if (contextMenu) setContextMenu(null);
    if (e.button === 2) return; // Right-click handled by onContextMenu

    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      if (e.shiftKey) {
        // Rubber-band box selection
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setSelectionBox({
            startX: e.clientX - rect.left,
            startY: e.clientY - rect.top,
            currentX: e.clientX - rect.left,
            currentY: e.clientY - rect.top
          });
        }
      } else {
        setIsPanning(true);
        setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
        clearSelection();
        if (pendingPort) cancelConnection();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (selectionBox && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setSelectionBox({
        ...selectionBox,
        currentX: e.clientX - rect.left,
        currentY: e.clientY - rect.top
      });
    } else if (isPanning) {
      setViewport({
        ...viewport,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else if (draggingNodeId) {
      const zoom = viewport.zoom;
      const currentCanvasX = (e.clientX - viewport.x) / zoom;
      const currentCanvasY = (e.clientY - viewport.y) / zoom;
      const mainNodeNewX = Math.round(currentCanvasX - dragOffset.x);
      const mainNodeNewY = Math.round(currentCanvasY - dragOffset.y);

      const mainNodeOrig = dragInitialPositions[draggingNodeId] || graph.nodes[draggingNodeId]?.position;
      if (mainNodeOrig) {
        const deltaX = mainNodeNewX - mainNodeOrig.x;
        const deltaY = mainNodeNewY - mainNodeOrig.y;

        if (selectedNodeIds.length > 1 && Object.keys(dragInitialPositions).length > 1) {
          // Drag all selected nodes together in lockstep
          for (const id of selectedNodeIds) {
            const init = dragInitialPositions[id];
            if (init) {
              moveComponent(id, {
                x: Math.max(20, init.x + deltaX),
                y: Math.max(20, init.y + deltaY)
              });
            }
          }
        } else {
          moveComponent(draggingNodeId, { x: Math.max(20, mainNodeNewX), y: Math.max(20, mainNodeNewY) });
        }
      }
    }
  };

  const handleMouseUp = () => {
    if (selectionBox && containerRef.current) {
      const minX = Math.min(selectionBox.startX, selectionBox.currentX);
      const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
      const minY = Math.min(selectionBox.startY, selectionBox.currentY);
      const maxY = Math.max(selectionBox.startY, selectionBox.currentY);

      const canvasMinX = (minX - viewport.x) / viewport.zoom;
      const canvasMaxX = (maxX - viewport.x) / viewport.zoom;
      const canvasMinY = (minY - viewport.y) / viewport.zoom;
      const canvasMaxY = (maxY - viewport.y) / viewport.zoom;

      const intersectedIds = Object.values(graph.nodes).filter(node => {
        const nodeRight = node.position.x + 210;
        const nodeBottom = node.position.y + 140;
        return (
          node.position.x < canvasMaxX &&
          nodeRight > canvasMinX &&
          node.position.y < canvasMaxY &&
          nodeBottom > canvasMinY
        );
      }).map(n => n.id);

      if (intersectedIds.length > 0) {
        selectNodes(intersectedIds, false);
      }
      setSelectionBox(null);
    }

    setIsPanning(false);
    setDraggingNodeId(null);
    setDragInitialPositions({});
  };

  // Zoom Canvas via Wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(2.5, Math.max(0.3, viewport.zoom * zoomFactor));
    setViewport({ ...viewport, zoom: newZoom });
  };

  // Drag and Drop from Palette (Single, Batch & Assemblies)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const canvasX = Math.round((clientX - viewport.x) / viewport.zoom);
    const canvasY = Math.round((clientY - viewport.y) / viewport.zoom);

    // 1. Batch Components Drop
    const batchData = e.dataTransfer.getData('application/omniflow-components-batch');
    if (batchData) {
      try {
        const types = JSON.parse(batchData);
        if (Array.isArray(types) && types.length > 0) {
          addComponentsBatch(types, { x: canvasX, y: canvasY }, 'star');
          message.success(`Deployed batch of ${types.length} components to canvas`);
          return;
        }
      } catch (err) {
        console.error('Failed to parse batch components', err);
      }
    }

    // 2. Pre-Built Assembly Drop
    const assemblyData = e.dataTransfer.getData('application/omniflow-assembly');
    if (assemblyData) {
      try {
        const parsedAsm = JSON.parse(assemblyData);
        insertAssembly(parsedAsm, { x: canvasX, y: canvasY });
        message.success(`Deployed assembly "${parsedAsm.name}" to canvas`);
        return;
      } catch (err) {
        console.error('Failed to parse dropped assembly', err);
      }
    }

    // 3. Single Component Drop
    const componentType = e.dataTransfer.getData('application/omniflow-component');
    if (componentType) {
      addComponent(componentType, { x: canvasX, y: canvasY });
      message.success(`Added ${componentType} to topology`);
    }
  };

  // Helper to compute port screen coordinates for connection lines
  const getPortCoordinates = useCallback((
    node: EngineeringComponent, 
    port: ComponentPort,
    targetNode?: EngineeringComponent
  ) => {
    const nodeWidth = 210;
    const nodeHeaderHeight = 36;
    const propBoxHeight = 44;
    const portItemHeight = 22;
    const portIndex = Math.max(0, node.ports.findIndex(p => p.id === port.id));

    const portOffsetY = nodeHeaderHeight + propBoxHeight + 8 + (portIndex * portItemHeight);

    // Intelligently pick left or right anchor facing target node
    let x: number;
    if (targetNode) {
      if (targetNode.position.x > node.position.x + 60) {
        x = node.position.x + nodeWidth; // right edge
      } else if (targetNode.position.x < node.position.x - 60) {
        x = node.position.x; // left edge
      } else {
        x = node.position.x + (nodeWidth / 2);
      }
    } else {
      x = (portIndex % 2 === 0) ? node.position.x + nodeWidth : node.position.x;
    }

    const y = node.position.y + Math.min(portOffsetY, 380);
    return { x, y };
  }, []);

  // System Design Dropdown Menu
  const systemDesignMenuItems: MenuProps['items'] = [
    {
      key: 'MULTI_DOMAIN',
      icon: <RocketOutlined style={{ color: '#06b6d4' }} />,
      label: (
        <div>
          <div style={{ fontWeight: 600, color: '#f8fafc' }}>Integrated Smart Facility</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Network Fiber + 400V Power + 7°C Chilled Water</div>
        </div>
      ),
      onClick: () => {
        loadSystemDesign('MULTI_DOMAIN');
        message.success('Loaded Multi-Domain Facility (Simultaneous Data, Electricity & Water Flow)');
      }
    },
    {
      key: 'NETWORK',
      icon: <CloudServerOutlined style={{ color: '#38bdf8' }} />,
      label: (
        <div>
          <div style={{ fontWeight: 600, color: '#f8fafc' }}>Corporate Enterprise Network</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Router, UTM Firewall, Switches & IP Endpoints</div>
        </div>
      ),
      onClick: () => {
        loadSystemDesign('NETWORK');
        message.success('Loaded Corporate Enterprise Network (Data Packets Flow)');
      }
    },
    {
      key: 'ELECTRICAL',
      icon: <ThunderboltOutlined style={{ color: '#facc15' }} />,
      label: (
        <div>
          <div style={{ fontWeight: 600, color: '#f8fafc' }}>Critical Electrical Distribution</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Grid Substation, Standby Generator, ATS & 40kVA UPS</div>
        </div>
      ),
      onClick: () => {
        loadSystemDesign('ELECTRICAL');
        message.success('Loaded Critical Electrical Power System (AC Current Flow)');
      }
    },
    {
      key: 'PLUMBING',
      icon: <DashboardOutlined style={{ color: '#0284c7' }} />,
      label: (
        <div>
          <div style={{ fontWeight: 600, color: '#f8fafc' }}>Data Center Chilled Water System</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>100-Ton Chiller, VFD Pumps, CRAH Coolers & Cooling Tower</div>
        </div>
      ),
      onClick: () => {
        loadSystemDesign('PLUMBING');
        message.success('Loaded Chilled Water Cooling System (Fluid/Water Flow)');
      }
    },
    {
      key: 'CCTV',
      icon: <VideoCameraOutlined style={{ color: '#d946ef' }} />,
      label: (
        <div>
          <div style={{ fontWeight: 600, color: '#f8fafc' }}>CCTV & Perimeter Surveillance</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>4K PTZ IP Cameras, PoE Switch & 64-Ch NVR</div>
        </div>
      ),
      onClick: () => {
        loadSystemDesign('CCTV');
        message.success('Loaded CCTV Video Surveillance System (RTSP Video Streams)');
      }
    }
  ];

  // Particle Counts for HUD
  const dataPacketCount = activePackets.filter(p => p.medium === 'DATA').length;
  const electricPacketCount = activePackets.filter(p => p.medium === 'ELECTRICITY' || p.medium === 'SOLAR').length;
  const fluidPacketCount = activePackets.filter(p => p.medium === 'FLUID').length;
  const videoPacketCount = activePackets.filter(p => p.medium === 'VIDEO').length;

  // 1. Canvas Background Context Menu Items
  const getCanvasContextMenuItems = (canvasPos: { x: number; y: number }): MenuProps['items'] => [
    {
      key: 'add-network',
      icon: <BranchesOutlined style={{ color: '#38bdf8' }} />,
      label: 'Add Network Equipment',
      children: [
        { key: 'ROUTER_ENTERPRISE', label: 'Enterprise Gateway Router', onClick: () => addComponent('ROUTER_ENTERPRISE', canvasPos) },
        { key: 'ROUTER_CORE_BGP', label: 'Core BGP Edge Router', onClick: () => addComponent('ROUTER_CORE_BGP', canvasPos) },
        { key: 'FIREWALL_UTM', label: 'UTM Security Firewall', onClick: () => addComponent('FIREWALL_UTM', canvasPos) },
        { key: 'SWITCH_CORE_L3', label: 'Layer-3 Core Switch', onClick: () => addComponent('SWITCH_CORE_L3', canvasPos) },
        { key: 'SWITCH_POE_24', label: '24-Port Gigabit PoE Switch', onClick: () => addComponent('SWITCH_POE_24', canvasPos) },
        { key: 'SWITCH_POE_48', label: '48-Port Enterprise PoE Switch', onClick: () => addComponent('SWITCH_POE_48', canvasPos) },
        { key: 'SERVER_APP', label: 'High-Performance Application Server', onClick: () => addComponent('SERVER_APP', canvasPos) },
        { key: 'STORAGE_NAS_SAN', label: 'Enterprise Storage NAS/SAN', onClick: () => addComponent('STORAGE_NAS_SAN', canvasPos) },
        { key: 'ACCESS_POINT_WIFI6', label: 'Wi-Fi 6 Enterprise AP', onClick: () => addComponent('ACCESS_POINT_WIFI6', canvasPos) },
        { key: 'CCTV_CAMERA_PTZ', label: '4K PTZ IP Security Camera', onClick: () => addComponent('CCTV_CAMERA_PTZ', canvasPos) },
        { key: 'WORKSTATION_PC', label: 'Workstation Desktop PC', onClick: () => addComponent('WORKSTATION_PC', canvasPos) }
      ]
    },
    {
      key: 'add-electrical',
      icon: <ThunderboltOutlined style={{ color: '#facc15' }} />,
      label: 'Add Electrical & Power',
      children: [
        { key: 'GRID_TRANSFORMER', label: 'Substation Transformer (400V 3-Phase)', onClick: () => addComponent('GRID_TRANSFORMER', canvasPos) },
        { key: 'DIESEL_GENERATOR', label: 'Diesel Backup Generator (500kVA)', onClick: () => addComponent('DIESEL_GENERATOR', canvasPos) },
        { key: 'ATS_SWITCH', label: 'Automatic Transfer Switch (ATS)', onClick: () => addComponent('ATS_SWITCH', canvasPos) },
        { key: 'UPS_ENTERPRISE', label: 'Enterprise Online UPS (40kVA)', onClick: () => addComponent('UPS_ENTERPRISE', canvasPos) },
        { key: 'PDU_RACK_32A', label: '32A Metered Rack PDU', onClick: () => addComponent('PDU_RACK_32A', canvasPos) },
        { key: 'SOLAR_PV_ARRAY', label: 'Bifacial Solar PV Array (50kW)', onClick: () => addComponent('SOLAR_PV_ARRAY', canvasPos) },
        { key: 'SOLAR_INVERTER', label: 'Hybrid Solar Inverter (50kW)', onClick: () => addComponent('SOLAR_INVERTER', canvasPos) }
      ]
    },
    {
      key: 'add-plumbing',
      icon: <TableOutlined style={{ color: '#06b6d4' }} />,
      label: 'Add Plumbing & Hydronics',
      children: [
        { key: 'WATER_CHILLER_CENTRAL', label: '100-Ton Central Water Chiller', onClick: () => addComponent('WATER_CHILLER_CENTRAL', canvasPos) },
        { key: 'DUAL_CIRCULATION_PUMP', label: 'Dual VFD Circulation Pumps (45 L/s)', onClick: () => addComponent('DUAL_CIRCULATION_PUMP', canvasPos) },
        { key: 'CRAC_PRECISION_COOLER', label: 'In-Row CRAH Precision Cooler', onClick: () => addComponent('CRAC_PRECISION_COOLER', canvasPos) },
        { key: 'BUFFER_STORAGE_TANK', label: 'Chilled Water Buffer Tank (5000L)', onClick: () => addComponent('BUFFER_STORAGE_TANK', canvasPos) },
        { key: 'COOLING_TOWER_ROOF', label: 'Roof Evaporative Cooling Tower', onClick: () => addComponent('COOLING_TOWER_ROOF', canvasPos) },
        { key: 'WATER_MAIN_METER', label: 'Municipal Water Main & Meter', onClick: () => addComponent('WATER_MAIN_METER', canvasPos) }
      ]
    },
    {
      key: 'add-facility',
      icon: <BuildOutlined style={{ color: '#a855f7' }} />,
      label: 'Add Racks & Enclosures',
      children: [
        { key: 'RACK_HYPERSCALE_42U', label: 'Hyperscale 42U Server Rack (Multi-Domain)', onClick: () => addComponent('RACK_HYPERSCALE_42U', canvasPos) },
        { key: 'RACK_CABINET_42U', label: '42U Standard Equipment Rack', onClick: () => addComponent('RACK_CABINET_42U', canvasPos) },
        { key: 'RACK_WALLMOUNT_12U', label: '12U Wallmount Cabinet', onClick: () => addComponent('RACK_WALLMOUNT_12U', canvasPos) }
      ]
    },
    { type: 'divider' },
    {
      key: 'insert-subsystem',
      icon: <AppstoreOutlined style={{ color: '#10b981' }} />,
      label: 'Insert Multi-Device Subsystem',
      children: [
        { key: 'asm-cisco', label: 'Cisco Branch Office (6 devices)', onClick: () => loadSystemDesign('NETWORK') },
        { key: 'asm-power', label: 'Critical Facility Dual-Fed Power Loop', onClick: () => loadSystemDesign('ELECTRICAL') },
        { key: 'asm-cooling', label: 'Data Center Chilled Water Hydronic Loop', onClick: () => loadSystemDesign('PLUMBING') },
        { key: 'asm-smart', label: 'Integrated Smart Facility (Data + Power + Water)', onClick: () => loadSystemDesign('MULTI_DOMAIN') },
        { key: 'asm-cctv', label: 'CCTV Security Surveillance Loop', onClick: () => loadSystemDesign('CCTV') }
      ]
    },
    { type: 'divider' },
    {
      key: 'paste',
      icon: <SnippetsOutlined />,
      label: `Paste Components ${copiedNodeIds.length > 0 ? `(${copiedNodeIds.length})` : ''}`,
      disabled: copiedNodeIds.length === 0,
      onClick: () => pasteCopiedNodes(canvasPos)
    },
    {
      key: 'select-all',
      icon: <AlignLeftOutlined />,
      label: 'Select All (Ctrl+A)',
      onClick: selectAllNodes
    },
    {
      key: 'autolayout',
      icon: <ApartmentOutlined style={{ color: '#38bdf8' }} />,
      label: 'Auto-Layout Topology',
      onClick: autoLayout
    },
    {
      key: 'surge',
      icon: <ThunderboltOutlined style={{ color: '#eab308' }} />,
      label: 'Trigger Multi-Domain Surge Burst',
      onClick: triggerPacketBurst
    }
  ];

  // 2. Node Context Menu Items
  const getNodeContextMenuItems = (node: EngineeringComponent): MenuProps['items'] => {
    const isMulti = selectedNodeIds.length > 1;

    return [
      {
        key: 'edit',
        icon: <EditOutlined style={{ color: '#38bdf8' }} />,
        label: <span style={{ fontWeight: 600 }}>Edit Properties...</span>,
        onClick: () => openQuickEditModal(node.id)
      },
      {
        key: 'toggle-status',
        icon: node.simulationState.isFailed ? <CheckCircleOutlined style={{ color: '#10b981' }} /> : <CloseCircleOutlined style={{ color: '#ef4444' }} />,
        label: node.simulationState.isFailed ? 'Bring Device Online' : 'Set Device Offline (Fault)',
        onClick: () => toggleComponentFault(node.id)
      },
      {
        key: 'connect-port',
        icon: <BranchesOutlined style={{ color: '#06b6d4' }} />,
        label: 'Connect from Port...',
        children: node.ports.map(port => {
          const isOccupied = Boolean(
            port.occupiedByConnectionId || 
            Object.values(graph.connections).some(c => c.sourcePortId === port.id || c.targetPortId === port.id)
          );
          return {
            key: port.id,
            label: `${port.name} (${port.type}) ${isOccupied ? '• [Occupied]' : '• [Available]'}`,
            disabled: isOccupied,
            onClick: () => {
              startConnection(node.id, port.id);
              message.info(`Connecting from ${node.tag}:${port.name}. Select destination port...`);
            }
          };
        })
      },
      { type: 'divider' },
      {
        key: 'duplicate',
        icon: <CopyOutlined style={{ color: '#10b981' }} />,
        label: isMulti ? `Duplicate Selected (${selectedNodeIds.length} items)` : 'Duplicate Component (Ctrl+D)',
        onClick: () => {
          if (isMulti) {
            duplicateSelectedComponents();
          } else {
            duplicateComponent(node.id);
          }
          message.success('Component(s) duplicated');
        }
      },
      {
        key: 'copy',
        icon: <SnippetsOutlined />,
        label: isMulti ? `Copy Selected (${selectedNodeIds.length} items)` : 'Copy Component (Ctrl+C)',
        onClick: () => {
          copySelectedNodes();
          message.success(`Copied ${selectedNodeIds.length} item(s) to clipboard`);
        }
      },
      ...(isMulti ? [
        { type: 'divider' as const },
        {
          key: 'multi-wire',
          icon: <BranchesOutlined style={{ color: '#38bdf8' }} />,
          label: `Auto-Wire Selected (${selectedNodeIds.length})`,
          children: [
            { key: 'star', label: 'Star Topology (Hub to Spoke)', onClick: () => { connectSelectedNodes('star'); message.success('Auto-wired in Star topology'); } },
            { key: 'daisy', label: 'Daisy Chain (Linear Sequence)', onClick: () => { connectSelectedNodes('daisy'); message.success('Auto-wired in Daisy Chain'); } },
            { key: 'mesh', label: 'Redundant Full Mesh', onClick: () => { connectSelectedNodes('mesh'); message.success('Auto-wired in Redundant Mesh'); } }
          ]
        },
        {
          key: 'multi-align',
          icon: <ApartmentOutlined style={{ color: '#a855f7' }} />,
          label: `Align Selected (${selectedNodeIds.length})`,
          children: [
            { key: 'horiz', label: 'Align Horizontally', onClick: () => alignSelectedNodes('horizontal') },
            { key: 'vert', label: 'Align Vertically', onClick: () => alignSelectedNodes('vertical') },
            { key: 'grid', label: 'Align to Grid', onClick: () => alignSelectedNodes('grid') }
          ]
        },
        {
          key: 'save-assembly',
          icon: <SaveOutlined style={{ color: '#f59e0b' }} />,
          label: `Save Selection as Assembly...`,
          onClick: () => toggleSaveAssemblyModal(true)
        }
      ] : []),
      { type: 'divider' },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        danger: true,
        label: isMulti ? `Delete Selected (${selectedNodeIds.length} items)` : 'Delete Component (Del)',
        onClick: () => {
          if (isMulti) {
            deleteSelectedComponents();
            message.info(`Deleted ${selectedNodeIds.length} components`);
          } else {
            removeComponent(node.id);
            message.info(`Deleted ${node.tag}`);
          }
        }
      }
    ];
  };

  // 3. Connection Context Menu Items
  const getConnectionContextMenuItems = (conn: EngineeringConnection): MenuProps['items'] => [
    {
      key: 'cable-type',
      icon: <BranchesOutlined style={{ color: '#38bdf8' }} />,
      label: `Cable / Medium: ${conn.connectionType}`,
      children: [
        { key: 'CAT6', label: 'CAT6 Copper Ethernet (1 Gbps)', onClick: () => updateConnectionCableType(conn.id, 'CAT6') },
        { key: 'CAT6A', label: 'CAT6A 10G Shielded Ethernet', onClick: () => updateConnectionCableType(conn.id, 'CAT6A') },
        { key: 'FIBER_SM', label: 'Single-Mode Optical Fiber OS2', onClick: () => updateConnectionCableType(conn.id, 'FIBER_SM') },
        { key: 'FIBER_MM', label: 'Multi-Mode Optical Fiber OM4', onClick: () => updateConnectionCableType(conn.id, 'FIBER_MM') },
        { key: 'POWER_3PHASE_400V', label: '3-Phase 400V AC Busbar / Conductor', onClick: () => updateConnectionCableType(conn.id, 'POWER_3PHASE_400V') },
        { key: 'POWER_1PHASE_230V', label: 'Single Phase 230V AC Power Cable', onClick: () => updateConnectionCableType(conn.id, 'POWER_1PHASE_230V') },
        { key: 'POWER_DC_48V', label: '48V DC Telecom Power Feeder', onClick: () => updateConnectionCableType(conn.id, 'POWER_DC_48V') },
        { key: 'PIPE_CHILLED_SUPPLY', label: '7°C Chilled Water Supply Pipe', onClick: () => updateConnectionCableType(conn.id, 'PIPE_CHILLED_SUPPLY') },
        { key: 'PIPE_CHILLED_RETURN', label: '14°C Chilled Water Return Pipe', onClick: () => updateConnectionCableType(conn.id, 'PIPE_CHILLED_RETURN') },
        { key: 'PIPE_WATER_SUPPLY', label: 'Potable Municipal Water Pipe', onClick: () => updateConnectionCableType(conn.id, 'PIPE_WATER_SUPPLY') },
        { key: 'COAX_RG6', label: 'RG6 Coaxial Video CCTV Cable', onClick: () => updateConnectionCableType(conn.id, 'COAX_RG6') }
      ]
    },
    {
      key: 'length',
      icon: <TableOutlined style={{ color: '#06b6d4' }} />,
      label: `Length: ${conn.lengthMeters}m (Click to change)`,
      children: [
        { key: 'len-5', label: '5 meters (Rack patch)', onClick: () => updateConnectionLength(conn.id, 5) },
        { key: 'len-15', label: '15 meters (Floor run)', onClick: () => updateConnectionLength(conn.id, 15) },
        { key: 'len-35', label: '35 meters (Riser backbone)', onClick: () => updateConnectionLength(conn.id, 35) },
        { key: 'len-75', label: '75 meters (Perimeter run)', onClick: () => updateConnectionLength(conn.id, 75) },
        { key: 'len-100', label: '100 meters (Max Cat6 span)', onClick: () => updateConnectionLength(conn.id, 100) }
      ]
    },
    {
      key: 'fault',
      icon: <DisconnectOutlined style={{ color: conn.simulationState.isFailed ? '#10b981' : '#ef4444' }} />,
      label: conn.simulationState.isFailed ? 'Restore Severed Cable' : 'Sever Cable (Inject Link Cut)',
      onClick: () => toggleConnectionFault(conn.id)
    },
    { type: 'divider' },
    {
      key: 'delete-conn',
      icon: <DeleteOutlined />,
      danger: true,
      label: 'Delete Connection (Del)',
      onClick: () => {
        removeConnection(conn.id);
        message.info('Removed connection');
      }
    }
  ];

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onContextMenu={(e) => {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        const clientX = rect ? e.clientX - rect.left : e.clientX;
        const clientY = rect ? e.clientY - rect.top : e.clientY;
        const canvasX = Math.round((clientX - viewport.x) / viewport.zoom);
        const canvasY = Math.round((clientY - viewport.y) / viewport.zoom);
        setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          type: 'CANVAS',
          canvasPos: { x: canvasX, y: canvasY }
        });
      }}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#090d16',
        cursor: isPanning ? 'grabbing' : 'default',
        backgroundImage: `
          radial-gradient(circle, #1e293b 1px, transparent 1px)
        `,
        backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`
      }}
    >
      {/* Embedded CSS Keyframe Animations for Realistic SVG Streams */}
      <style>{`
        @keyframes dashStreamData {
          from { stroke-dashoffset: 40; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes dashStreamElectric {
          from { stroke-dashoffset: 48; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes dashStreamFluid {
          from { stroke-dashoffset: 48; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes dashStreamVideo {
          from { stroke-dashoffset: 40; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.85; }
        }
        @keyframes beaconPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .flow-stream-data {
          animation: dashStreamData 0.85s linear infinite;
        }
        .flow-stream-electric {
          animation: dashStreamElectric 0.45s linear infinite;
        }
        .flow-stream-fluid {
          animation: dashStreamFluid 1.25s linear infinite;
        }
        .flow-stream-video {
          animation: dashStreamVideo 0.95s linear infinite;
        }
      `}</style>

      {/* Floating Flow Simulation HUD & Engineering Control Center */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 40,
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(12px)',
          borderRadius: 10,
          border: '1px solid #334155',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          padding: isHudCollapsed ? '8px 12px' : '12px 16px',
          width: isHudCollapsed ? 'auto' : 320,
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* HUD Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isHudCollapsed ? 0 : 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                backgroundColor: isSimulating ? '#10b981' : '#f59e0b',
                animation: isSimulating ? 'beaconPulse 2s infinite' : 'none'
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', letterSpacing: '0.4px' }}>
              {isSimulating ? 'LIVE FLOW SIMULATION' : 'SIMULATION PAUSED'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Dropdown menu={{ items: systemDesignMenuItems }} placement="bottomRight" trigger={['click']}>
              <button
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
                title="Switch Engineering System Design"
              >
                <span>Designs</span>
                <DownOutlined style={{ fontSize: 9 }} />
              </button>
            </Dropdown>

            <button
              onClick={() => setIsHudCollapsed(!isHudCollapsed)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
              title={isHudCollapsed ? 'Expand Telemetry HUD' : 'Collapse HUD'}
            >
              {isHudCollapsed ? <DownOutlined /> : <UpOutlined />}
            </button>
          </div>
        </div>

        {/* Expanded HUD Body */}
        {!isHudCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Simulation Controls: Play/Pause, Speeds & Reset */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#090d16', padding: '6px 10px', borderRadius: 6, border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => toggleSimulation()}
                  style={{
                    backgroundColor: isSimulating ? '#ef4444' : '#10b981',
                    border: 'none',
                    color: '#fff',
                    borderRadius: 4,
                    width: 26,
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title={isSimulating ? 'Pause Flow' : 'Start Flow Simulation'}
                >
                  {isSimulating ? <PauseOutlined /> : <CaretRightOutlined />}
                </button>
                <span style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 500 }}>
                  Tick: <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{simulationTick}</span>
                </span>
              </div>

              {/* Speed Multiplier Pills */}
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#64748b', marginRight: 2 }}>Speed:</span>
                {[0.25, 0.5, 1, 2].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setSimulationSpeed(speed)}
                    style={{
                      backgroundColor: simulationSpeed === speed ? '#0284c7' : '#1e293b',
                      color: simulationSpeed === speed ? '#fff' : '#94a3b8',
                      border: 'none',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title={speed === 0.25 ? '0.25x (Zen Calm)' : speed === 0.5 ? '0.5x (Smooth Flow - Recommended)' : `${speed}x`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Pacing & Visual Clutter Controls (Calm Flow Tuning) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', backgroundColor: '#090d16', borderRadius: 6, border: '1px solid #1e293b' }}>
              <button
                onClick={() => setShowPacketLabels(!showPacketLabels)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: showPacketLabels ? '#0369a1' : 'transparent',
                  color: showPacketLabels ? '#ffffff' : '#94a3b8',
                  border: showPacketLabels ? '1px solid #38bdf8' : '1px solid #334155',
                  borderRadius: 4,
                  padding: '2px 8px',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                title="Toggle packet text tags on cables (keep off for clean diagram)"
              >
                <span>🏷️ Tags:</span>
                <span style={{ color: showPacketLabels ? '#38bdf8' : '#64748b' }}>{showPacketLabels ? 'ON' : 'OFF'}</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ fontSize: 10, color: '#64748b' }}>Density:</span>
                {(['CALM', 'BALANCED', 'HIGH'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setFlowDensity(d)}
                    style={{
                      backgroundColor: flowDensity === d ? '#0284c7' : '#1e293b',
                      color: flowDensity === d ? '#ffffff' : '#64748b',
                      border: 'none',
                      borderRadius: 3,
                      padding: '2px 5px',
                      fontSize: 9.5,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title={d === 'CALM' ? 'Calm (Subtle photon pulses)' : d === 'BALANCED' ? 'Balanced (Standard flow)' : 'High density'}
                  >
                    {d === 'CALM' ? 'Calm' : d === 'BALANCED' ? 'Std' : 'Max'}
                  </button>
                ))}
              </div>
            </div>

            {/* Domain Flow Filter Toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {/* Data Flow Toggle */}
              <button
                onClick={() => toggleDomainFlow('DATA')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: showDataFlow ? '1px solid #0284c7' : '1px solid #1e293b',
                  backgroundColor: showDataFlow ? 'rgba(2, 132, 199, 0.15)' : '#090d16',
                  color: showDataFlow ? '#38bdf8' : '#64748b',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600
                }}
              >
                <span>🌐 Data Packets</span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', backgroundColor: '#1e293b', padding: '1px 5px', borderRadius: 4, color: '#f8fafc' }}>
                  {dataPacketCount}
                </span>
              </button>

              {/* Electrical Flow Toggle */}
              <button
                onClick={() => toggleDomainFlow('ELECTRICITY')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: showElectricFlow ? '1px solid #eab308' : '1px solid #1e293b',
                  backgroundColor: showElectricFlow ? 'rgba(234, 179, 8, 0.15)' : '#090d16',
                  color: showElectricFlow ? '#facc15' : '#64748b',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600
                }}
              >
                <span>⚡ Electric Power</span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', backgroundColor: '#1e293b', padding: '1px 5px', borderRadius: 4, color: '#f8fafc' }}>
                  {electricPacketCount}
                </span>
              </button>

              {/* Fluid & Water Flow Toggle */}
              <button
                onClick={() => toggleDomainFlow('FLUID')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: showFluidFlow ? '1px solid #06b6d4' : '1px solid #1e293b',
                  backgroundColor: showFluidFlow ? 'rgba(6, 182, 212, 0.15)' : '#090d16',
                  color: showFluidFlow ? '#22d3ee' : '#64748b',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600
                }}
              >
                <span>💧 Fluid / Water</span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', backgroundColor: '#1e293b', padding: '1px 5px', borderRadius: 4, color: '#f8fafc' }}>
                  {fluidPacketCount}
                </span>
              </button>

              {/* Video Stream Toggle */}
              <button
                onClick={() => toggleDomainFlow('VIDEO')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: showVideoFlow ? '1px solid #d946ef' : '1px solid #1e293b',
                  backgroundColor: showVideoFlow ? 'rgba(217, 70, 239, 0.15)' : '#090d16',
                  color: showVideoFlow ? '#e879f9' : '#64748b',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600
                }}
              >
                <span>📹 Video Streams</span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', backgroundColor: '#1e293b', padding: '1px 5px', borderRadius: 4, color: '#f8fafc' }}>
                  {videoPacketCount}
                </span>
              </button>
            </div>

            {/* Live Engineering Telemetry Metrics Readout */}
            <div style={{ backgroundColor: '#090d16', padding: '8px 10px', borderRadius: 6, border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#94a3b8' }}>🌐 Data Throughput:</span>
                <span style={{ color: '#38bdf8', fontWeight: 600, fontFamily: 'monospace' }}>
                  {telemetry.throughputMbps || 350} Mbps
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#94a3b8' }}>⚡ Facility Power Load:</span>
                <span style={{ color: '#facc15', fontWeight: 600, fontFamily: 'monospace' }}>
                  {(telemetry.totalPowerWatts ? telemetry.totalPowerWatts / 1000 : 42.5).toFixed(1)} kW ({telemetry.totalCurrentAmps || 184.8} A)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#94a3b8' }}>💧 Hydronic Circulation:</span>
                <span style={{ color: '#22d3ee', fontWeight: 600, fontFamily: 'monospace' }}>
                  {telemetry.totalFluidFlowRate || 48.5} L/s ({Math.round((telemetry.totalFluidFlowRate || 48.5) * 15.85)} GPM)
                </span>
              </div>
            </div>

            {/* Quick Flow Surge / Injection Buttons */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => {
                  injectFaultOrSurge('POWER_SURGE');
                  message.warning('Injected 400V 55kW Electrical Power Surge');
                }}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(234, 179, 8, 0.1)',
                  border: '1px solid #ca8a04',
                  color: '#facc15',
                  borderRadius: 4,
                  padding: '4px 6px',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ⚡ Power Surge
              </button>

              <button
                onClick={() => {
                  injectFaultOrSurge('PUMP_BOOST');
                  message.info('Injected +75 L/s Hydronic Flow Boost');
                }}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid #0891b2',
                  color: '#22d3ee',
                  borderRadius: 4,
                  padding: '4px 6px',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                💧 Pump Boost
              </button>

              <button
                onClick={() => {
                  injectFaultOrSurge('PACKET_BURST');
                  message.success('Generated 1500B IP Packet Burst');
                }}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(2, 132, 199, 0.1)',
                  border: '1px solid #0284c7',
                  color: '#38bdf8',
                  borderRadius: 4,
                  padding: '4px 6px',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🌐 Ping Burst
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zoom / Viewport Controls Floating Pill */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 40,
          display: 'flex',
          gap: 6,
          backgroundColor: '#0f172a',
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid #334155',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          alignItems: 'center'
        }}
      >
        <button
          onClick={() => setViewport({ ...viewport, zoom: Math.min(2.5, viewport.zoom * 1.15) })}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
          title="Zoom In"
        >
          <PlusOutlined />
        </button>
        <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#f8fafc', minWidth: 42, textAlign: 'center' }}>
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button
          onClick={() => setViewport({ ...viewport, zoom: Math.max(0.3, viewport.zoom * 0.85) })}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
          title="Zoom Out"
        >
          <MinusOutlined />
        </button>
        <div style={{ width: 1, height: 16, backgroundColor: '#334155' }} />
        <button
          onClick={() => setViewport({ x: 50, y: 50, zoom: 1.0 })}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
          title="Reset View"
        >
          <FullscreenOutlined />
        </button>
      </div>

      {/* Connection Indicator Banner */}
      {pendingPort && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 45,
            backgroundColor: '#0284c7',
            color: '#ffffff',
            padding: '8px 18px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 4px 16px rgba(2, 132, 199, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <span>Select destination port to complete connection...</span>
          <button
            onClick={cancelConnection}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              borderRadius: 4,
              padding: '2px 8px',
              cursor: 'pointer',
              fontSize: 11
            }}
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* Main Zoomed & Panned Canvas Layer */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {/* SVG Connections & Dynamic Animated Flows Layer */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 10000,
            height: 10000,
            pointerEvents: 'none',
            overflow: 'visible'
          }}
        >
          <defs>
            {/* Gradients for Electrical, Fluid, Video & Network Flows */}
            <linearGradient id="gradElectric" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id="gradFluid" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="gradVideo" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c026d3" />
              <stop offset="100%" stopColor="#e879f9" />
            </linearGradient>
          </defs>

          {/* Render Connections */}
          {Object.values(graph.connections).map((conn) => {
            const srcNode = graph.nodes[conn.sourceComponentId];
            const tgtNode = graph.nodes[conn.targetComponentId];
            if (!srcNode || !tgtNode) return null;

            const srcPort = srcNode.ports.find((p) => p.id === conn.sourcePortId);
            const tgtPort = tgtNode.ports.find((p) => p.id === conn.targetPortId);
            if (!srcPort || !tgtPort) return null;

            const start = getPortCoordinates(srcNode, srcPort, tgtNode);
            const end = getPortCoordinates(tgtNode, tgtPort, srcNode);

            // Compute smooth cubic bezier path with directional curvature
            const dx = Math.max(35, Math.abs(end.x - start.x) * 0.45);
            const cx1 = start.x < end.x ? start.x + dx : start.x - dx;
            const cx2 = end.x > start.x ? end.x - dx : end.x + dx;
            const pathData = `M ${start.x} ${start.y} C ${cx1} ${start.y}, ${cx2} ${end.y}, ${end.x} ${end.y}`;

            const isSelected = selectedConnectionId === conn.id;
            const isFailed = conn.simulationState.isFailed || srcNode.simulationState.isFailed || tgtNode.simulationState.isFailed;

            // Classify domain
            const type = conn.connectionType.toUpperCase();
            const isElectrical = conn.domain === 'ELECTRICAL' || conn.domain === 'SOLAR' || type.includes('POWER') || type.includes('SOLAR') || type.includes('DC');
            const isFluid = conn.domain === 'PLUMBING' || type.includes('PIPE') || type.includes('WATER') || type.includes('CHILLED');
            const isVideo = conn.domain === 'CCTV' || type.includes('COAX');

            // Compute vibrant, high-contrast cable/pipe color
            const getCableColor = () => {
              if (isFailed) return '#ef4444';
              if (isSelected) return '#38bdf8';
              if (type.includes('400V') || type.includes('3PHASE')) return '#eab308'; // Bright Gold
              if (type.includes('230V') || type.includes('1PHASE')) return '#f59e0b'; // Warm Amber
              if (type.includes('DC_48V')) return '#f97316';   // Electric Orange
              if (type.includes('SOLAR')) return '#10b981';   // Emerald Green
              if (type.includes('CHILLED_SUPPLY')) return '#0284c7'; // Deep Chilled Blue
              if (type.includes('CHILLED_RETURN')) return '#06b6d4'; // Aqua Return
              if (type.includes('WATER')) return '#38bdf8';   // Sky Blue Potable
              if (type.includes('CONDENSATE')) return '#14b8a6'; // Teal Drain
              if (type.includes('FIBER')) return '#f59e0b';   // Amber Gold Fiber
              if (type.includes('DAC')) return '#10b981';     // Emerald DAC
              if (type.includes('CAT8') || type.includes('CAT7')) return '#a855f7'; // Purple
              if (type.includes('CAT6A')) return '#06b6d4';   // Cyan
              if (type.includes('CAT6')) return '#3b82f6';    // Electric Blue
              if (type.includes('CAT5')) return '#94a3b8';    // Silver Slate
              if (type.includes('COAX')) return '#d946ef';    // Violet CCTV
              return '#3b82f6';
            };

            const cableColor = getCableColor();
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;

            // Determine if flow is active on this connection
            const isFlowAllowed = isSimulating && !isFailed && (
              (isElectrical && showElectricFlow) ||
              (isFluid && showFluidFlow) ||
              (isVideo && showVideoFlow) ||
              (!isElectrical && !isFluid && !isVideo && showDataFlow)
            );

            // Flow stream animation class
            const flowClass = isElectrical 
              ? 'flow-stream-electric' 
              : isFluid 
              ? 'flow-stream-fluid' 
              : isVideo 
              ? 'flow-stream-video' 
              : 'flow-stream-data';

            const flowColor = isElectrical 
              ? '#fde047' 
              : isFluid 
              ? '#38bdf8' 
              : isVideo 
              ? '#f5d0fe' 
              : '#7dd3fc';

            return (
              <g 
                key={conn.id} 
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }} 
                onClick={() => selectConnection(conn.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectConnection(conn.id);
                  setContextMenu({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    type: 'CONNECTION',
                    targetId: conn.id
                  });
                }}
              >
                {/* Hit test wider stroke */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={24}
                />

                {/* Ambient Glow / Halo Path */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={cableColor}
                  strokeWidth={isSelected ? 10 : isFluid ? 9 : 7}
                  strokeOpacity={0.25}
                  strokeLinecap="round"
                />

                {/* Primary Physical Cable/Pipe Path */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={cableColor}
                  strokeWidth={isSelected ? 4 : isFluid ? 4 : 2.8}
                  strokeDasharray={isFailed ? '6,4' : undefined}
                  strokeLinecap="round"
                  style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                />

                {/* Dynamic Flowing Stream Animation Line (Active Flow Simulation) */}
                {isFlowAllowed && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke={flowColor}
                    strokeWidth={isFluid ? 2.5 : isElectrical ? 2.2 : 1.8}
                    strokeDasharray={isElectrical ? '6, 14' : isFluid ? '14, 8' : '8, 12'}
                    strokeLinecap="round"
                    className={flowClass}
                    opacity={0.9}
                  />
                )}

                {/* Directional Flow Chevron Markers along path */}
                {isFlowAllowed && (
                  <>
                    <circle cx={(start.x * 0.75 + end.x * 0.25)} cy={(start.y * 0.75 + end.y * 0.25)} r={2} fill={flowColor} opacity={0.7} />
                    <circle cx={(start.x * 0.25 + end.x * 0.75)} cy={(start.y * 0.25 + end.y * 0.75)} r={2} fill={flowColor} opacity={0.7} />
                  </>
                )}

                {/* Terminal Connector Plugs */}
                <circle cx={start.x} cy={start.y} r={isFluid ? 5.5 : 4.5} fill={cableColor} stroke="#090d16" strokeWidth={1.5} />
                <circle cx={end.x} cy={end.y} r={isFluid ? 5.5 : 4.5} fill={cableColor} stroke="#090d16" strokeWidth={1.5} />

                {/* High-Contrast Cable Type & Length Badge Pill */}
                <g transform={`translate(${midX}, ${midY - 10})`}>
                  <rect
                    x={-52}
                    y={-10}
                    width={104}
                    height={20}
                    rx={10}
                    fill="#0b111e"
                    stroke={cableColor}
                    strokeWidth={1.2}
                  />
                  <text
                    x={0}
                    y={4}
                    fill="#f8fafc"
                    fontSize="9.5"
                    fontWeight="600"
                    fontFamily="monospace"
                    textAnchor="middle"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {isElectrical ? '⚡ ' : isFluid ? '💧 ' : isVideo ? '📹 ' : ''}
                    {conn.connectionType.replace('POWER_', '').replace('PIPE_', '')} • {conn.lengthMeters}m
                  </text>
                </g>
              </g>
            );
          })}

          {/* Render Active Multi-Domain Flow Particles */}
          {activePackets.map((pkt) => {
            // Apply domain visibility filters
            if (pkt.medium === 'DATA' && !showDataFlow) return null;
            if ((pkt.medium === 'ELECTRICITY' || pkt.medium === 'SOLAR') && !showElectricFlow) return null;
            if (pkt.medium === 'FLUID' && !showFluidFlow) return null;
            if (pkt.medium === 'VIDEO' && !showVideoFlow) return null;

            const conn = graph.connections[pkt.currentEdgeId];
            if (!conn) return null;

            const srcNode = graph.nodes[conn.sourceComponentId];
            const tgtNode = graph.nodes[conn.targetComponentId];
            if (!srcNode || !tgtNode) return null;

            const srcPort = srcNode.ports.find((p) => p.id === conn.sourcePortId);
            const tgtPort = tgtNode.ports.find((p) => p.id === conn.targetPortId);
            if (!srcPort || !tgtPort) return null;

            const start = getPortCoordinates(srcNode, srcPort, tgtNode);
            const end = getPortCoordinates(tgtNode, tgtPort, srcNode);

            // Interpolate position along bezier curve
            const t = Math.min(1, Math.max(0, pkt.progressPercent / 100));
            const dx = Math.max(35, Math.abs(end.x - start.x) * 0.45);
            const cx1 = start.x < end.x ? start.x + dx : start.x - dx;
            const cx2 = end.x > start.x ? end.x - dx : end.x + dx;

            const px = Math.pow(1 - t, 3) * start.x + 3 * Math.pow(1 - t, 2) * t * cx1 + 3 * (1 - t) * Math.pow(t, 2) * cx2 + Math.pow(t, 3) * end.x;
            const py = Math.pow(1 - t, 3) * start.y + 3 * Math.pow(1 - t, 2) * t * start.y + 3 * (1 - t) * Math.pow(t, 2) * end.y + Math.pow(t, 3) * end.y;

            // 1. ELECTRICAL FLOW PARTICLE (Lightning Spark & Current Pulse)
            if (pkt.medium === 'ELECTRICITY' || pkt.medium === 'SOLAR') {
              const sparkColor = pkt.medium === 'SOLAR' ? '#10b981' : '#eab308';
              return (
                <g key={pkt.id} transform={`translate(${px}, ${py})`}>
                  {/* Outer Plasma Arc Aura */}
                  <circle r={8} fill={sparkColor} opacity={0.3} filter="blur(2px)" />
                  {/* Core Lightning Orb */}
                  <circle r={4.5} fill={sparkColor} stroke="#ffffff" strokeWidth={1.2} filter={`drop-shadow(0 0 6px ${sparkColor})`} />
                  
                  {/* Current / Wattage Pill Badge (Visible only when showPacketLabels is active) */}
                  {showPacketLabels && pkt.label && (
                    <g transform="translate(0, -14)">
                      <rect x={-48} y={-9} width={96} height={17} rx={8.5} fill="#181504" stroke={sparkColor} strokeWidth={1.2} />
                      <text x={0} y={3} fill="#fef08a" fontSize="8.5" fontWeight="700" fontFamily="monospace" textAnchor="middle">
                        {pkt.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            }

            // 2. FLUID / WATER FLOW PARTICLE (Animated Water Droplet & Bubble)
            if (pkt.medium === 'FLUID') {
              return (
                <g key={pkt.id} transform={`translate(${px}, ${py})`}>
                  {/* Outer Liquid Droplet Halo */}
                  <circle r={8} fill="#0284c7" opacity={0.3} filter="blur(1px)" />
                  {/* Liquid Water Sphere */}
                  <circle r={4.5} fill="#06b6d4" stroke="#e0f2fe" strokeWidth={1.2} filter="drop-shadow(0 0 6px #06b6d4)" />
                  
                  {/* Hydronic Flow Rate / Temp Pill Badge (Visible only when showPacketLabels is active) */}
                  {showPacketLabels && pkt.label && (
                    <g transform="translate(0, -14)">
                      <rect x={-52} y={-9} width={104} height={17} rx={8.5} fill="#041824" stroke="#06b6d4" strokeWidth={1.2} />
                      <text x={0} y={3} fill="#7dd3fc" fontSize="8.5" fontWeight="700" fontFamily="monospace" textAnchor="middle">
                        {pkt.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            }

            // 3. VIDEO STREAM PARTICLE (Surveillance RTSP Frames)
            if (pkt.medium === 'VIDEO') {
              return (
                <g key={pkt.id} transform={`translate(${px}, ${py})`}>
                  <circle r={7} fill="#c026d3" opacity={0.3} />
                  <circle r={4} fill="#d946ef" stroke="#ffffff" strokeWidth={1} filter="drop-shadow(0 0 6px #d946ef)" />
                  {showPacketLabels && pkt.label && (
                    <g transform="translate(0, -14)">
                      <rect x={-48} y={-9} width={96} height={17} rx={8.5} fill="#240523" stroke="#d946ef" strokeWidth={1.2} />
                      <text x={0} y={3} fill="#f5d0fe" fontSize="8.5" fontWeight="700" fontFamily="monospace" textAnchor="middle">
                        {pkt.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            }

            // 4. DATA PACKET PARTICLE (Ethernet Frame / Laser Photon Pulse)
            return (
              <g key={pkt.id} transform={`translate(${px}, ${py})`}>
                {/* Glowing Laser Photon Bead */}
                <circle
                  r={8}
                  fill={pkt.status === 'FAILED' ? '#ef4444' : '#0284c7'}
                  opacity={0.35}
                />
                <circle
                  r={4.5}
                  fill={pkt.status === 'FAILED' ? '#ef4444' : '#38bdf8'}
                  stroke="#ffffff"
                  strokeWidth={1.2}
                  filter="drop-shadow(0 0 6px #38bdf8)"
                />
                {/* Data Packet Label Badge (Visible only when showPacketLabels is active) */}
                {showPacketLabels && pkt.label && (
                  <g transform="translate(0, -14)">
                    <rect x={-36} y={-9} width={72} height={17} rx={8.5} fill="#081528" stroke="#38bdf8" strokeWidth={1.2} />
                    <text x={0} y={3} fill="#e0f2fe" fontSize="8.5" fontWeight="700" fontFamily="monospace" textAnchor="middle">
                      {pkt.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Engineering Component Nodes Layer */}
        {Object.values(graph.nodes).map((node) => {
          const isSelected = (selectedNodeIds && selectedNodeIds.includes(node.id)) || selectedNodeId === node.id;
          const isFailed = node.simulationState.isFailed;

          const ip = (node.properties.ipAddress || node.properties.lanIp || node.properties.managementIp) as string;
          const isElecNode = node.domain === 'ELECTRICAL' || node.domain === 'SOLAR' || node.type.includes('TRANSFORMER') || node.type.includes('GENERATOR') || node.type.includes('UPS') || node.type.includes('PDU') || node.type.includes('SOLAR');
          const isPlumbNode = node.domain === 'PLUMBING' || node.type.includes('CHILLER') || node.type.includes('PUMP') || node.type.includes('CRAH') || node.type.includes('WATER') || node.type.includes('TOWER') || node.type.includes('TANK');
          const isMultiDomainNode = node.domain === 'MULTI_DOMAIN' || node.type === 'RACK_HYPERSCALE_42U';

          return (
            <div
              key={node.id}
              onClick={(e) => {
                e.stopPropagation();
                if (e.shiftKey || e.ctrlKey) {
                  selectNode(node.id, true);
                } else {
                  selectNode(node.id, false);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                openQuickEditModal(node.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!selectedNodeIds.includes(node.id)) {
                  selectNode(node.id, false);
                }
                setContextMenu({
                  visible: true,
                  x: e.clientX,
                  y: e.clientY,
                  type: 'NODE',
                  targetId: node.id
                });
              }}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                const isMulti = e.shiftKey || e.ctrlKey;
                let currentSelected = selectedNodeIds;
                if (!selectedNodeIds.includes(node.id)) {
                  if (isMulti) {
                    selectNode(node.id, true);
                    currentSelected = [...selectedNodeIds, node.id];
                  } else {
                    selectNode(node.id, false);
                    currentSelected = [node.id];
                  }
                }

                setDraggingNodeId(node.id);
                setDragOffset({
                  x: (e.clientX - viewport.x) / viewport.zoom - node.position.x,
                  y: (e.clientY - viewport.y) / viewport.zoom - node.position.y
                });

                const initPos: Record<string, { x: number; y: number }> = {};
                for (const id of currentSelected) {
                  if (graph.nodes[id]) {
                    initPos[id] = { ...graph.nodes[id].position };
                  }
                }
                setDragInitialPositions(initPos);
              }}
              style={{
                position: 'absolute',
                left: node.position.x,
                top: node.position.y,
                width: 210,
                backgroundColor: isFailed ? '#1a0b0e' : '#0f172a',
                borderRadius: 8,
                border: isSelected 
                  ? '2px solid #38bdf8' 
                  : isFailed 
                  ? '1px solid #ef4444' 
                  : isElecNode 
                  ? '1px solid #715509' 
                  : isPlumbNode 
                  ? '1px solid #0e5b77' 
                  : isMultiDomainNode
                  ? '1px solid #0891b2'
                  : '1px solid #334155',
                boxShadow: isSelected 
                  ? '0 0 16px rgba(56, 189, 248, 0.35)' 
                  : isFailed 
                  ? '0 0 12px rgba(239, 68, 68, 0.35)' 
                  : isElecNode
                  ? '0 4px 12px rgba(234, 179, 8, 0.12)'
                  : isPlumbNode
                  ? '0 4px 12px rgba(6, 182, 212, 0.12)'
                  : '0 4px 10px rgba(0, 0, 0, 0.4)',
                cursor: draggingNodeId === node.id ? 'grabbing' : 'grab',
                userSelect: 'none',
                transition: 'box-shadow 0.15s, border-color 0.15s'
              }}
            >
              {/* Node Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  backgroundColor: isFailed 
                    ? '#450a0a' 
                    : isElecNode 
                    ? '#291d04' 
                    : isPlumbNode 
                    ? '#05232f' 
                    : isMultiDomainNode
                    ? '#0b2b36'
                    : '#1e293b',
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                  borderBottom: '1px solid #334155'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag 
                    color={
                      isFailed 
                        ? 'error' 
                        : isElecNode 
                        ? 'gold' 
                        : isPlumbNode 
                        ? 'cyan' 
                        : isMultiDomainNode 
                        ? 'blue' 
                        : 'cyan'
                    } 
                    style={{ margin: 0, fontSize: 10, fontWeight: 700 }}
                  >
                    {node.tag}
                  </Tag>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc' }}>
                    {node.type.replace('_', ' ').slice(0, 14)}
                  </span>
                </div>

                <Badge
                  status={isFailed ? 'error' : 'success'}
                  title={isFailed ? 'DEVICE OFFLINE / FAULT' : 'ONLINE'}
                />
              </div>

              {/* Node Body Details (Domain-Specific Telemetry) */}
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {/* 1. Electrical Details */}
                {isElecNode && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
                      <span style={{ color: '#94a3b8' }}>⚡ Voltage:</span>
                      <span style={{ color: '#facc15', fontWeight: 600 }}>
                        {String(node.properties.outputVoltage || node.properties.nominalVoltage || node.properties.dcVoltage || '230V AC')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
                      <span style={{ color: '#94a3b8' }}>⚡ Power Load:</span>
                      <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                        {String(node.properties.activeLoadKw ? `${node.properties.activeLoadKw} kW` : node.properties.currentOutputKw ? `${node.properties.currentOutputKw} kW` : node.properties.kvaRating ? `${node.properties.kvaRating} kVA` : '18.4 A')}
                      </span>
                    </div>
                  </>
                )}

                {/* 2. Plumbing & Cooling Details */}
                {isPlumbNode && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
                      <span style={{ color: '#94a3b8' }}>💧 Temperature:</span>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                        {String(node.properties.setpointTempC ? `${node.properties.setpointTempC}°C Supply` : node.properties.waterTempC ? `${node.properties.waterTempC}°C Potable` : '7.0°C')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
                      <span style={{ color: '#94a3b8' }}>💧 Flow / Press:</span>
                      <span style={{ color: '#22d3ee', fontWeight: 600 }}>
                        {String(node.properties.chwFlowRateLps ? `${node.properties.chwFlowRateLps} L/s (58 PSI)` : node.properties.activeFlowLps ? `${node.properties.activeFlowLps} L/s (52 PSI)` : '45.0 L/s')}
                      </span>
                    </div>
                  </>
                )}

                {/* 3. Multi-Domain Hyperscale Rack Details */}
                {isMultiDomainNode && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
                    <span style={{ color: '#94a3b8' }}>Unified:</span>
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                      14.8kW • 7.2°C • 20G
                    </span>
                  </div>
                )}

                {/* 4. Network Details */}
                {!isElecNode && !isPlumbNode && !isMultiDomainNode && (
                  <>
                    {ip && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
                        <span style={{ color: '#64748b' }}>IP:</span>
                        <span style={{ color: '#38bdf8', fontWeight: 500 }}>{ip}</span>
                      </div>
                    )}
                    {node.properties.vlanId !== undefined && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
                        <span style={{ color: '#64748b' }}>VLAN:</span>
                        <span style={{ color: '#cbd5e1' }}>{String(node.properties.vlanId)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Ports Pinout Tray */}
              <div
                style={{
                  padding: '4px 6px',
                  backgroundColor: '#090d16',
                  borderBottomLeftRadius: 6,
                  borderBottomRightRadius: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3
                }}
              >
                {node.ports.map((port) => {
                  const isConnected = !!port.occupiedByConnectionId;
                  const isPending = pendingPort?.nodeId === node.id && pendingPort?.portId === port.id;

                  return (
                    <div
                      key={port.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (pendingPort) {
                          const res = completeConnection(node.id, port.id);
                          if (!res.success && res.message) {
                            message.error(res.message);
                          } else {
                            message.success('Connected successfully');
                          }
                        } else {
                          if (isConnected) {
                            message.info(`Port ${port.name} is connected.`);
                          } else {
                            startConnection(node.id, port.id);
                          }
                        }
                      }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        backgroundColor: isPending ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                        cursor: 'pointer',
                        border: isPending ? '1px dashed #38bdf8' : '1px solid transparent'
                      }}
                    >
                      <span style={{ color: isConnected ? '#94a3b8' : '#e2e8f0', fontSize: 10 }}>
                        {port.name}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 9, color: '#64748b' }}>{port.type.replace('_', ' ')}</span>
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            backgroundColor: isFailed 
                              ? '#ef4444' 
                              : isPending 
                              ? '#38bdf8' 
                              : isConnected 
                              ? '#f59e0b' 
                              : '#10b981'
                          }}
                          title={isConnected ? 'Port Occupied' : 'Port Available'}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rubber-band Marquee Selection Rectangle */}
      {selectionBox && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.currentX - selectionBox.startX),
            height: Math.abs(selectionBox.currentY - selectionBox.startY),
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            border: '1px dashed #38bdf8',
            borderRadius: 4,
            pointerEvents: 'none',
            zIndex: 60
          }}
        />
      )}

      {/* Floating Multi-Selection Action Toolbar */}
      {selectedNodeIds.length > 1 && (
        <div
          style={{
            position: 'absolute',
            top: 76,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 45,
            backgroundColor: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid #0284c7',
            boxShadow: '0 8px 32px rgba(2, 132, 199, 0.35)',
            borderRadius: 30,
            padding: '6px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🔷</span>
            <span>{selectedNodeIds.length} Nodes Selected</span>
          </span>
          <div style={{ height: 16, width: 1, backgroundColor: '#334155' }} />
          {/* Auto-Wire Dropdown */}
          <Dropdown
            menu={{
              items: [
                { key: 'star', label: 'Star Topology (Hub to Spoke)', onClick: () => { connectSelectedNodes('star'); message.success('Auto-wired selected nodes in Star topology'); } },
                { key: 'daisy', label: 'Daisy-Chain (Linear Sequence)', onClick: () => { connectSelectedNodes('daisy'); message.success('Auto-wired selected nodes in Daisy-Chain'); } },
                { key: 'mesh', label: 'Redundant Full Mesh', onClick: () => { connectSelectedNodes('mesh'); message.success('Auto-wired selected nodes in Redundant Mesh'); } }
              ]
            }}
          >
            <Button size="small" type="text" icon={<BranchesOutlined style={{ color: '#38bdf8' }} />} style={{ color: '#f8fafc' }}>
              Auto-Wire ▾
            </Button>
          </Dropdown>
          {/* Align Dropdown */}
          <Dropdown
            menu={{
              items: [
                { key: 'horiz', label: 'Align Horizontally', onClick: () => alignSelectedNodes('horizontal') },
                { key: 'vert', label: 'Align Vertically', onClick: () => alignSelectedNodes('vertical') },
                { key: 'grid', label: 'Align to Grid', onClick: () => alignSelectedNodes('grid') }
              ]
            }}
          >
            <Button size="small" type="text" icon={<ApartmentOutlined style={{ color: '#a855f7' }} />} style={{ color: '#f8fafc' }}>
              Align ▾
            </Button>
          </Dropdown>
          <Button size="small" type="text" icon={<CopyOutlined style={{ color: '#10b981' }} />} onClick={() => duplicateSelectedComponents()} style={{ color: '#f8fafc' }}>
            Duplicate
          </Button>
          <Button size="small" type="text" icon={<SaveOutlined style={{ color: '#f59e0b' }} />} onClick={() => toggleSaveAssemblyModal(true)} style={{ color: '#f8fafc' }}>
            Save Assembly
          </Button>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => deleteSelectedComponents()}>
            Delete
          </Button>
          <Button size="small" type="text" onClick={clearSelection} style={{ color: '#94a3b8' }}>
            ✕
          </Button>
        </div>
      )}

      {/* Global Context Menu Dropdown */}
      {contextMenu && contextMenu.visible && (
        <Dropdown
          open={true}
          onOpenChange={(open) => {
            if (!open) setContextMenu(null);
          }}
          menu={{
            items: contextMenu.type === 'CANVAS' && contextMenu.canvasPos
              ? getCanvasContextMenuItems(contextMenu.canvasPos)
              : contextMenu.type === 'NODE' && contextMenu.targetId && graph.nodes[contextMenu.targetId]
              ? getNodeContextMenuItems(graph.nodes[contextMenu.targetId])
              : contextMenu.type === 'CONNECTION' && contextMenu.targetId && graph.connections[contextMenu.targetId]
              ? getConnectionContextMenuItems(graph.connections[contextMenu.targetId])
              : []
          }}
        >
          <div
            style={{
              position: 'fixed',
              left: contextMenu.x,
              top: contextMenu.y,
              width: 1,
              height: 1,
              pointerEvents: 'none',
              zIndex: 1000
            }}
          />
        </Dropdown>
      )}
    </div>
  );
};
