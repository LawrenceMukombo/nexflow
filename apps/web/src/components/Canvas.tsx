import React, { useRef, useState, useCallback } from 'react';
import { useGraphStore } from '../store/graphStore';
import { Tag, Badge, message, Dropdown, MenuProps } from 'antd';
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
  RocketOutlined
} from '@ant-design/icons';
import { ComponentPort, EngineeringComponent } from '@omniflow/shared-types';

export const Canvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    graph,
    selectedNodeId,
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
    selectNode,
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
    injectFaultOrSurge
  } = useGraphStore();

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);

  // Pan Canvas
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      selectNode(null);
      selectConnection(null);
      if (pendingPort) cancelConnection();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setViewport({
        ...viewport,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else if (draggingNodeId) {
      const zoom = viewport.zoom;
      const newX = Math.round((e.clientX - viewport.x) / zoom - dragOffset.x);
      const newY = Math.round((e.clientY - viewport.y) / zoom - dragOffset.y);
      moveComponent(draggingNodeId, { x: Math.max(20, newX), y: Math.max(20, newY) });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Zoom Canvas via Wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(2.5, Math.max(0.3, viewport.zoom * zoomFactor));
    setViewport({ ...viewport, zoom: newZoom });
  };

  // Drag and Drop from Palette
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

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
                {[0.5, 1, 2, 5].map((speed) => (
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
                  >
                    {speed}x
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
              <g key={conn.id} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} onClick={() => selectConnection(conn.id)}>
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
                  <circle r={12} fill={sparkColor} opacity={0.25} filter="blur(2px)" />
                  {/* Core Lightning Orb */}
                  <circle r={6.5} fill={sparkColor} stroke="#ffffff" strokeWidth={1.5} filter={`drop-shadow(0 0 6px ${sparkColor})`} />
                  {/* Micro Lightning Bolt Icon */}
                  <path d="M -1 -4 L 2 -1 L 0 -1 L 1 4 L -2 0 L 0 0 Z" fill="#ffffff" />
                  
                  {/* Current / Wattage Pill Badge */}
                  {pkt.label && (
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
                  <circle r={11} fill="#0284c7" opacity={0.3} filter="blur(1px)" />
                  {/* Liquid Water Sphere */}
                  <circle r={7} fill="#06b6d4" stroke="#e0f2fe" strokeWidth={1.5} filter="drop-shadow(0 0 6px #06b6d4)" />
                  {/* Specular Glint Highlight */}
                  <circle cx={-2} cy={-2} r={2} fill="#ffffff" opacity={0.9} />
                  
                  {/* Hydronic Flow Rate / Temp Pill Badge */}
                  {pkt.label && (
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
                  <circle r={10} fill="#c026d3" opacity={0.25} />
                  <rect x={-6} y={-4.5} width={12} height={9} rx={2} fill="#d946ef" stroke="#ffffff" strokeWidth={1.2} filter="drop-shadow(0 0 6px #d946ef)" />
                  {pkt.label && (
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

            // 4. DATA PACKET PARTICLE (Ethernet Frame / IP Packet)
            return (
              <g key={pkt.id} transform={`translate(${px}, ${py})`}>
                <circle
                  r={8}
                  fill={pkt.status === 'FAILED' ? '#ef4444' : '#0284c7'}
                  opacity={0.3}
                />
                <rect
                  x={-6}
                  y={-4.5}
                  width={12}
                  height={9}
                  rx={2.5}
                  fill={pkt.status === 'FAILED' ? '#ef4444' : '#38bdf8'}
                  stroke="#ffffff"
                  strokeWidth={1}
                  filter="drop-shadow(0 0 6px #38bdf8)"
                />
                {pkt.label && (
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
          const isSelected = selectedNodeId === node.id;
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
                selectNode(node.id);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingNodeId(node.id);
                setDragOffset({
                  x: (e.clientX - viewport.x) / viewport.zoom - node.position.x,
                  y: (e.clientY - viewport.y) / viewport.zoom - node.position.y
                });
                selectNode(node.id);
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
    </div>
  );
};
