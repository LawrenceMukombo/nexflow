import React, { useRef, useState, useCallback } from 'react';
import { useGraphStore } from '../store/graphStore';
import { Tag, Badge, message } from 'antd';
import { 
  PlusOutlined,
  MinusOutlined,
  FullscreenOutlined
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
    selectNode,
    selectConnection,
    moveComponent,
    addComponent,
    insertAssembly,
    startConnection,
    completeConnection,
    cancelConnection,
    setViewport
  } = useGraphStore();

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Pan Canvas
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking canvas background directly
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
        {/* SVG Connections & Particles Layer */}
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
            <linearGradient id="gradCat6" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="gradFiber" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
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

            // Compute vibrant, high-contrast cable color
            const getCableColor = (connType: string) => {
              if (isFailed) return '#ef4444';
              if (isSelected) return '#38bdf8';
              const type = connType.toUpperCase();
              if (type.includes('FIBER')) return '#f59e0b'; // Amber Gold
              if (type.includes('DAC')) return '#10b981';   // Emerald Green
              if (type.includes('CAT8') || type.includes('CAT7')) return '#a855f7'; // Purple
              if (type.includes('CAT6A')) return '#06b6d4'; // Cyan
              if (type.includes('CAT6')) return '#3b82f6';  // Electric Blue
              if (type.includes('CAT5')) return '#94a3b8';  // Silver Slate
              if (type.includes('COAX')) return '#e2e8f0';  // Bright White
              return '#3b82f6';
            };

            const cableColor = getCableColor(conn.connectionType);
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;

            return (
              <g key={conn.id} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} onClick={() => selectConnection(conn.id)}>
                {/* Hit test wider stroke */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={20}
                />

                {/* Ambient Glow / Halo Path */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={cableColor}
                  strokeWidth={isSelected ? 9 : 6}
                  strokeOpacity={0.25}
                  strokeLinecap="round"
                />

                {/* Primary Crisp Cable Path */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={cableColor}
                  strokeWidth={isSelected ? 3.5 : 2.5}
                  strokeDasharray={isFailed ? '6,4' : undefined}
                  strokeLinecap="round"
                  style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                />

                {/* Terminal Connector Dots */}
                <circle cx={start.x} cy={start.y} r={4.5} fill={cableColor} stroke="#090d16" strokeWidth={1.5} />
                <circle cx={end.x} cy={end.y} r={4.5} fill={cableColor} stroke="#090d16" strokeWidth={1.5} />

                {/* High-Contrast Cable Type & Length Badge Pill */}
                <g transform={`translate(${midX}, ${midY - 10})`}>
                  <rect
                    x={-45}
                    y={-10}
                    width={90}
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
                    {conn.connectionType} • {conn.lengthMeters}m
                  </text>
                </g>
              </g>
            );
          })}

          {/* Render Active Simulation Packet Particles */}
          {activePackets.map((pkt) => {
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

            return (
              <g key={pkt.id} transform={`translate(${px}, ${py})`}>
                <circle
                  r={5}
                  fill={pkt.status === 'FAILED' ? '#ef4444' : '#38bdf8'}
                  filter="drop-shadow(0 0 6px #38bdf8)"
                />
                <circle
                  r={9}
                  fill="none"
                  stroke={pkt.status === 'FAILED' ? '#ef4444' : '#38bdf8'}
                  strokeWidth={1.5}
                  opacity={0.6}
                />
              </g>
            );
          })}
        </svg>

        {/* Engineering Component Nodes Layer */}
        {Object.values(graph.nodes).map((node) => {
          const isSelected = selectedNodeId === node.id;
          const isFailed = node.simulationState.isFailed;

          const ip = (node.properties.ipAddress || node.properties.lanIp || node.properties.managementIp) as string;

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
                border: isSelected ? '2px solid #38bdf8' : isFailed ? '1px solid #ef4444' : '1px solid #334155',
                boxShadow: isSelected 
                  ? '0 0 16px rgba(56, 189, 248, 0.35)' 
                  : isFailed 
                  ? '0 0 12px rgba(239, 68, 68, 0.35)' 
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
                  backgroundColor: isFailed ? '#450a0a' : '#1e293b',
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                  borderBottom: '1px solid #334155'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag color={isFailed ? 'error' : 'cyan'} style={{ margin: 0, fontSize: 10, fontWeight: 600 }}>
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

              {/* Node Body Details */}
              <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                        <span style={{ fontSize: 9, color: '#64748b' }}>{port.type}</span>
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
