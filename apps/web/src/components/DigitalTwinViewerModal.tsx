import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Modal, 
  Button, 
  Space, 
  Tag, 
  Checkbox, 
  Switch, 
  Radio, 
  Card 
} from 'antd';
import { 
  DeploymentUnitOutlined, 
  FireOutlined, 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  ReloadOutlined 
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { 
  buildBimModelFromGraph, 
  project3DToScreen, 
  BimCamera 
} from '@omniflow/network-engine';

export const DigitalTwinViewerModal: React.FC = () => {
  const {
    graph,
    isDigitalTwinModalOpen,
    closeDigitalTwinModal
  } = useGraphStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D Camera State
  const [camera, setCamera] = useState<BimCamera>({
    orbitAngleDeg: 45,
    tiltAngleDeg: 34,
    zoom: 1.15,
    panX: 0,
    panY: 0
  });

  // Layer visibility
  const [showUnderfloor, setShowUnderfloor] = useState(true);
  const [showEquipment, setShowEquipment] = useState(true);
  const [showBusway, setShowBusway] = useState(true);
  const [showOverhead, setShowOverhead] = useState(true);
  const [isHeatMapMode, setIsHeatMapMode] = useState(false);

  // Selected component in 3D
  const [selectedCuboidId, setSelectedCuboidId] = useState<string | null>(null);

  // Mouse interaction state
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);
  const particleTimeRef = useRef(0);

  // Reset Camera
  const resetCamera = useCallback(() => {
    setCamera({
      orbitAngleDeg: 45,
      tiltAngleDeg: 34,
      zoom: 1.15,
      panX: 0,
      panY: 0
    });
  }, []);

  // Set Preset Angle
  const setPresetView = (preset: 'ISO_NE' | 'ISO_NW' | 'TOP_PLAN' | 'FRONT_ELEV') => {
    switch (preset) {
      case 'ISO_NE':
        setCamera(c => ({ ...c, orbitAngleDeg: 45, tiltAngleDeg: 34 }));
        break;
      case 'ISO_NW':
        setCamera(c => ({ ...c, orbitAngleDeg: 135, tiltAngleDeg: 34 }));
        break;
      case 'TOP_PLAN':
        setCamera(c => ({ ...c, orbitAngleDeg: 0, tiltAngleDeg: 88 }));
        break;
      case 'FRONT_ELEV':
        setCamera(c => ({ ...c, orbitAngleDeg: 0, tiltAngleDeg: 15 }));
        break;
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setCamera(c => ({
      ...c,
      zoom: Math.max(0.4, Math.min(3.5, c.zoom * factor))
    }));
  };

  // Mouse down for orbit or pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) {
      isPanningRef.current = true;
    } else {
      isDraggingRef.current = true;
    }
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    if (isDraggingRef.current) {
      setCamera(c => ({
        ...c,
        orbitAngleDeg: (c.orbitAngleDeg + dx * 0.5 + 360) % 360,
        tiltAngleDeg: Math.max(15, Math.min(85, c.tiltAngleDeg - dy * 0.4))
      }));
    } else if (isPanningRef.current) {
      setCamera(c => ({
        ...c,
        panX: c.panX + dx,
        panY: c.panY + dy
      }));
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    isPanningRef.current = false;
  };

  // 3D Render Loop
  useEffect(() => {
    if (!isDigitalTwinModalOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let active = true;

    const render = () => {
      if (!active) return;
      particleTimeRef.current += 0.025;

      const width = canvas.width;
      const height = canvas.height;
      const origin = { x: width / 2, y: height / 2 };

      // Clear Canvas Background (Dark Navy CAD gradient)
      ctx.fillStyle = '#080d1a';
      ctx.fillRect(0, 0, width, height);

      // 1. Draw 3D Ground Grid (Floor Tiles Z = 0)
      ctx.save();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const gridSize = 16;
      const tileSpacing = 240;

      for (let i = -gridSize; i <= gridSize; i++) {
        const p1 = project3DToScreen({ x: i * tileSpacing, y: -gridSize * tileSpacing, z: 0 }, camera, origin);
        const p2 = project3DToScreen({ x: i * tileSpacing, y: gridSize * tileSpacing, z: 0 }, camera, origin);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        const q1 = project3DToScreen({ x: -gridSize * tileSpacing, y: i * tileSpacing, z: 0 }, camera, origin);
        const q2 = project3DToScreen({ x: gridSize * tileSpacing, y: i * tileSpacing, z: 0 }, camera, origin);
        ctx.beginPath();
        ctx.moveTo(q1.x, q1.y);
        ctx.lineTo(q2.x, q2.y);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Build and Filter BIM Geometry
      const { cuboids, pipes } = buildBimModelFromGraph(graph);

      // Collect all 3D drawable elements for painter's depth sorting
      interface DrawableItem {
        depth: number;
        draw: () => void;
      }
      const drawList: DrawableItem[] = [];

      // Filtered Pipes
      const activePipes = pipes.filter(p => {
        if (p.elevationCategory === 'UNDERFLOOR' && !showUnderfloor) return false;
        if (p.elevationCategory === 'POWER_BUSWAY' && !showBusway) return false;
        if (p.elevationCategory === 'OVERHEAD_TRAY' && !showOverhead) return false;
        return true;
      });

      for (const pipe of activePipes) {
        const sp = project3DToScreen(pipe.start, camera, origin);
        const ep = project3DToScreen(pipe.end, camera, origin);
        const avgDepth = (sp.depth + ep.depth) / 2;

        drawList.push({
          depth: avgDepth,
          draw: () => {
            ctx.save();
            ctx.strokeStyle = pipe.color;
            ctx.lineWidth = Math.max(2, (pipe.radius * 0.18) * camera.zoom);
            ctx.lineCap = 'round';

            if (pipe.isFailed) {
              ctx.strokeStyle = '#ef4444';
              ctx.setLineDash([6, 6]);
            }

            ctx.beginPath();
            ctx.moveTo(sp.x, sp.y);
            ctx.lineTo(ep.x, ep.y);
            ctx.stroke();

            // 3D Flow particle traveling along pipe
            const tParam = (particleTimeRef.current + (pipe.start.x * 0.001)) % 1;
            const partX = sp.x + (ep.x - sp.x) * tParam;
            const partY = sp.y + (ep.y - sp.y) * tParam;

            ctx.fillStyle = pipe.domain === 'ELECTRICAL' ? '#facc15' : pipe.domain === 'PLUMBING' ? '#38bdf8' : '#a855f7';
            ctx.beginPath();
            ctx.arc(partX, partY, Math.max(3, 4 * camera.zoom), 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }
        });
      }

      // Filtered Cuboids (Equipment & Racks)
      const activeCuboids = cuboids.filter(c => {
        if (c.elevationCategory === 'UNDERFLOOR' && !showUnderfloor) return false;
        if (c.elevationCategory === 'EQUIPMENT' && !showEquipment) return false;
        if (c.elevationCategory === 'OVERHEAD_TRAY' && !showOverhead) return false;
        return true;
      });

      for (const cuboid of activeCuboids) {
        const c3d = cuboid.center;
        const hw = cuboid.size.width / 2;
        const hd = cuboid.size.depth / 2;
        const hh = cuboid.size.height / 2;

        const centerProj = project3DToScreen(c3d, camera, origin);

        drawList.push({
          depth: centerProj.depth,
          draw: () => {
            // Visible front, top, and side vertices of the cuboid
            const v100 = project3DToScreen({ x: c3d.x + hw, y: c3d.y - hd, z: c3d.z - hh }, camera, origin);
            const v110 = project3DToScreen({ x: c3d.x + hw, y: c3d.y + hd, z: c3d.z - hh }, camera, origin);
            const v010 = project3DToScreen({ x: c3d.x - hw, y: c3d.y + hd, z: c3d.z - hh }, camera, origin);

            const v001 = project3DToScreen({ x: c3d.x - hw, y: c3d.y - hd, z: c3d.z + hh }, camera, origin);
            const v101 = project3DToScreen({ x: c3d.x + hw, y: c3d.y - hd, z: c3d.z + hh }, camera, origin);
            const v111 = project3DToScreen({ x: c3d.x + hw, y: c3d.y + hd, z: c3d.z + hh }, camera, origin);
            const v011 = project3DToScreen({ x: c3d.x - hw, y: c3d.y + hd, z: c3d.z + hh }, camera, origin);

            const isSelected = selectedCuboidId === cuboid.id;

            // Heat map color calculation
            let baseColor = cuboid.color;
            if (isHeatMapMode) {
              if (cuboid.temperatureC < 18) baseColor = '#0284c7';
              else if (cuboid.temperatureC < 24) baseColor = '#10b981';
              else if (cuboid.temperatureC < 28) baseColor = '#f59e0b';
              else baseColor = '#ef4444';
            }

            ctx.save();
            ctx.lineWidth = isSelected ? 2.5 : 1.2;
            ctx.strokeStyle = isSelected ? '#38bdf8' : '#334155';

            // Top Face (Z+) - Brightest
            ctx.fillStyle = isSelected ? '#1e293b' : '#0f172a';
            ctx.beginPath();
            ctx.moveTo(v001.x, v001.y);
            ctx.lineTo(v101.x, v101.y);
            ctx.lineTo(v111.x, v111.y);
            ctx.lineTo(v011.x, v011.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Front Face (Y+) - Medium
            ctx.fillStyle = '#090d16';
            ctx.beginPath();
            ctx.moveTo(v010.x, v010.y);
            ctx.lineTo(v110.x, v110.y);
            ctx.lineTo(v111.x, v111.y);
            ctx.lineTo(v011.x, v011.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Right Face (X+) - Darker
            ctx.fillStyle = '#060911';
            ctx.beginPath();
            ctx.moveTo(v100.x, v100.y);
            ctx.lineTo(v110.x, v110.y);
            ctx.lineTo(v111.x, v111.y);
            ctx.lineTo(v101.x, v101.y);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Rack U-slots / equipment louvers if it's a rack
            if (cuboid.type.includes('RACK')) {
              ctx.strokeStyle = '#1e293b';
              ctx.lineWidth = 1;
              const slots = 6;
              for (let s = 1; s < slots; s++) {
                const f = s / slots;
                const pL = { x: v010.x + (v011.x - v010.x) * f, y: v010.y + (v011.y - v010.y) * f };
                const pR = { x: v110.x + (v111.x - v110.x) * f, y: v110.y + (v111.y - v110.y) * f };
                ctx.beginPath();
                ctx.moveTo(pL.x, pL.y);
                ctx.lineTo(pR.x, pR.y);
                ctx.stroke();
              }
            }

            // Status LED on top front
            ctx.fillStyle = cuboid.isFailed ? '#ef4444' : '#10b981';
            ctx.beginPath();
            ctx.arc(v011.x + 8, v011.y + 10, 3, 0, Math.PI * 2);
            ctx.fill();

            // Tag Callout
            ctx.fillStyle = baseColor;
            ctx.font = `bold ${Math.max(9, Math.round(10 * camera.zoom))}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(cuboid.componentTag, v011.x + (v111.x - v011.x) / 2, v011.y - 6);

            ctx.restore();
          }
        });
      }

      // 3. Sort by Painter's Depth (Furthest to Nearest) and Draw
      drawList.sort((a, b) => b.depth - a.depth);
      for (const item of drawList) {
        item.draw();
      }

      // 4. Draw 3D Orientation Compass (Bottom Left)
      ctx.save();
      const compassX = 70;
      const compassY = height - 70;
      const cAxes = [
        { label: 'X', pt: project3DToScreen({ x: 300, y: 0, z: 0 }, camera, { x: 0, y: 0 }), color: '#ef4444' },
        { label: 'Y', pt: project3DToScreen({ x: 0, y: 300, z: 0 }, camera, { x: 0, y: 0 }), color: '#10b981' },
        { label: 'Z', pt: project3DToScreen({ x: 0, y: 0, z: 300 }, camera, { x: 0, y: 0 }), color: '#38bdf8' }
      ];
      ctx.lineWidth = 2;
      for (const axis of cAxes) {
        ctx.strokeStyle = axis.color;
        ctx.fillStyle = axis.color;
        ctx.beginPath();
        ctx.moveTo(compassX, compassY);
        ctx.lineTo(compassX + axis.pt.x * 0.15, compassY + axis.pt.y * 0.15);
        ctx.stroke();

        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(axis.label, compassX + axis.pt.x * 0.18, compassY + axis.pt.y * 0.18);
      }
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isDigitalTwinModalOpen, graph, camera, showUnderfloor, showEquipment, showBusway, showOverhead, isHeatMapMode, selectedCuboidId]);

  if (!isDigitalTwinModalOpen) return null;

  const { cuboids } = buildBimModelFromGraph(graph);
  const selectedCuboid = cuboids.find(c => c.id === selectedCuboidId);

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <Space>
            <DeploymentUnitOutlined style={{ color: '#0284c7', fontSize: 18 }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>3D Isometric BIM &amp; Digital Twin Facility Viewer</span>
            <Tag color="#0284c7">Axonometric 3D Engine</Tag>
          </Space>
          <Space>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Orbit:</span>
            <Tag color="#0f172a" style={{ borderColor: '#334155', color: '#38bdf8', fontFamily: 'monospace' }}>
              {Math.round(camera.orbitAngleDeg)}°
            </Tag>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Pitch:</span>
            <Tag color="#0f172a" style={{ borderColor: '#334155', color: '#38bdf8', fontFamily: 'monospace' }}>
              {Math.round(camera.tiltAngleDeg)}°
            </Tag>
          </Space>
        </div>
      }
      open={isDigitalTwinModalOpen}
      onCancel={closeDigitalTwinModal}
      width={1120}
      footer={[
        <Button key="reset" icon={<ReloadOutlined />} onClick={resetCamera}>
          Reset 3D View
        </Button>,
        <Button key="close" type="primary" onClick={closeDigitalTwinModal} style={{ backgroundColor: '#0284c7' }}>
          Close
        </Button>
      ]}
      style={{ top: 20 }}
      styles={{ body: { padding: 12 } }}
    >
      {/* Top Toolbar (Layer Filters, Heat Map Toggle, Camera Presets) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 10, padding: '8px 12px', backgroundColor: '#090d16', borderRadius: 6, border: '1px solid #1e293b' }}>
        {/* Layer Toggles */}
        <Space size="middle">
          <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>3D Elevation Layers:</span>
          <Checkbox checked={showUnderfloor} onChange={e => setShowUnderfloor(e.target.checked)}>
            <span style={{ color: '#0284c7', fontSize: 12 }}>🔻 Underfloor (-450mm)</span>
          </Checkbox>
          <Checkbox checked={showEquipment} onChange={e => setShowEquipment(e.target.checked)}>
            <span style={{ color: '#f8fafc', fontSize: 12 }}>🖥️ Racks &amp; Gear (0-2m)</span>
          </Checkbox>
          <Checkbox checked={showBusway} onChange={e => setShowBusway(e.target.checked)}>
            <span style={{ color: '#eab308', fontSize: 12 }}>⚡ Busway (+1.8m)</span>
          </Checkbox>
          <Checkbox checked={showOverhead} onChange={e => setShowOverhead(e.target.checked)}>
            <span style={{ color: '#38bdf8', fontSize: 12 }}>🌐 Fiber Trays (+2.1m)</span>
          </Checkbox>
        </Space>

        {/* View Presets & Heat Map */}
        <Space size="middle">
          {/* Heat map toggle */}
          <Space size="small">
            <FireOutlined style={{ color: isHeatMapMode ? '#ef4444' : '#64748b' }} />
            <span style={{ color: '#cbd5e1', fontSize: 12 }}>Heat Map:</span>
            <Switch 
              checked={isHeatMapMode} 
              onChange={setIsHeatMapMode} 
              size="small" 
            />
          </Space>

          {/* Preset Buttons */}
          <Radio.Group 
            size="small" 
            value={camera.tiltAngleDeg > 80 ? 'TOP_PLAN' : camera.orbitAngleDeg > 90 ? 'ISO_NW' : 'ISO_NE'}
            onChange={e => setPresetView(e.target.value)}
          >
            <Radio.Button value="ISO_NE">Isometric NE</Radio.Button>
            <Radio.Button value="ISO_NW">Isometric NW</Radio.Button>
            <Radio.Button value="TOP_PLAN">Top Plan</Radio.Button>
            <Radio.Button value="FRONT_ELEV">Elevation</Radio.Button>
          </Radio.Group>
        </Space>
      </div>

      {/* Main 3D Canvas Area */}
      <div style={{ position: 'relative', width: '100%', height: 560, backgroundColor: '#080d1a', borderRadius: 8, overflow: 'hidden', border: '1px solid #1e293b' }}>
        <canvas
          ref={canvasRef}
          width={1096}
          height={560}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={e => e.preventDefault()}
          style={{ width: '100%', height: '100%', display: 'block', cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
        />

        {/* Overlay Navigation HUD */}
        <div style={{ position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(9, 13, 22, 0.85)', backdropFilter: 'blur(6px)', padding: '6px 12px', borderRadius: 6, border: '1px solid #1e293b', fontSize: 11, color: '#94a3b8' }}>
          <span>💡 <b>Left Drag:</b> Orbit • <b>Right Drag:</b> Pan • <b>Wheel:</b> Zoom</span>
        </div>

        {/* Zoom Overlay Buttons */}
        <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Button 
            size="small" 
            icon={<ZoomInOutlined />} 
            onClick={() => setCamera(c => ({ ...c, zoom: Math.min(3.5, c.zoom * 1.2) }))}
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', borderColor: '#334155', color: '#f8fafc' }}
          />
          <Button 
            size="small" 
            icon={<ZoomOutOutlined />} 
            onClick={() => setCamera(c => ({ ...c, zoom: Math.max(0.4, c.zoom * 0.8) }))}
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', borderColor: '#334155', color: '#f8fafc' }}
          />
        </div>

        {/* Heat Map Gradient Legend (If Heat Map Enabled) */}
        {isHeatMapMode && (
          <div style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(9, 13, 22, 0.9)', backdropFilter: 'blur(6px)', padding: '8px 12px', borderRadius: 6, border: '1px solid #1e293b' }}>
            <div style={{ fontSize: 11, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 }}>ASHRAE Heat Map Index</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#94a3b8' }}>
              <span style={{ color: '#0284c7' }}>● &lt;18°C</span>
              <span style={{ color: '#10b981' }}>● 20-24°C</span>
              <span style={{ color: '#f59e0b' }}>● 24-28°C</span>
              <span style={{ color: '#ef4444' }}>● &gt;28°C Hotspot</span>
            </div>
          </div>
        )}

        {/* 3D Component Inspector Floating Card (If selected) */}
        {selectedCuboid && (
          <Card 
            size="small"
            title={<span style={{ color: '#38bdf8', fontSize: 12 }}>3D BIM Object: {selectedCuboid.componentTag}</span>}
            extra={<Button size="small" type="text" onClick={() => setSelectedCuboidId(null)} style={{ color: '#94a3b8' }}>✕</Button>}
            style={{ position: 'absolute', bottom: 16, left: 16, width: 280, backgroundColor: 'rgba(9, 13, 22, 0.95)', backdropFilter: 'blur(8px)', borderColor: '#0284c7' }}
          >
            <div style={{ fontSize: 11, color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div><b>Name:</b> {selectedCuboid.name}</div>
              <div><b>Domain:</b> <Tag color="#0284c7" style={{ fontSize: 10 }}>{selectedCuboid.domain}</Tag></div>
              <div><b>Type:</b> <code>{selectedCuboid.type}</code></div>
              <div><b>Elevation:</b> {selectedCuboid.elevationCategory} (Z={selectedCuboid.center.z}mm)</div>
              <div><b>Rated Load:</b> {selectedCuboid.powerWatts} Watts</div>
              <div><b>Operating Temp:</b> <span style={{ color: selectedCuboid.temperatureC > 26 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{selectedCuboid.temperatureC}°C</span></div>
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
};
