import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState, useCallback } from 'react';
import { useGraphStore } from '../store/graphStore';
import { Tag, Badge, message } from 'antd';
import { PlusOutlined, MinusOutlined, FullscreenOutlined } from '@ant-design/icons';
export const Canvas = () => {
    const containerRef = useRef(null);
    const { graph, selectedNodeId, selectedConnectionId, pendingPort, viewport, activePackets, selectNode, selectConnection, moveComponent, addComponent, startConnection, completeConnection, cancelConnection, setViewport } = useGraphStore();
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [draggingNodeId, setDraggingNodeId] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    // Pan Canvas
    const handleMouseDown = (e) => {
        // Only pan if clicking canvas background directly
        if (e.target === containerRef.current || e.target.tagName === 'svg') {
            setIsPanning(true);
            setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
            selectNode(null);
            selectConnection(null);
            if (pendingPort)
                cancelConnection();
        }
    };
    const handleMouseMove = (e) => {
        if (isPanning) {
            setViewport({
                ...viewport,
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
        }
        else if (draggingNodeId) {
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
    const handleWheel = (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        const newZoom = Math.min(2.5, Math.max(0.3, viewport.zoom * zoomFactor));
        setViewport({ ...viewport, zoom: newZoom });
    };
    // Drag and Drop from Palette
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };
    const handleDrop = (e) => {
        e.preventDefault();
        const componentType = e.dataTransfer.getData('application/omniflow-component');
        if (!componentType || !containerRef.current)
            return;
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        const canvasX = Math.round((clientX - viewport.x) / viewport.zoom);
        const canvasY = Math.round((clientY - viewport.y) / viewport.zoom);
        addComponent(componentType, { x: canvasX, y: canvasY });
        message.success(`Added ${componentType} to topology`);
    };
    // Helper to compute port screen coordinates for connection lines
    const getPortCoordinates = useCallback((node, port) => {
        const nodeWidth = 210;
        const nodeHeaderHeight = 38;
        const portItemHeight = 22;
        const portIndex = node.ports.findIndex(p => p.id === port.id);
        // Position port anchor on either left or right edge depending on index or direction
        const isLeft = port.direction === 'input' || (portIndex % 2 === 0 && port.direction !== 'output');
        const x = isLeft ? node.position.x : node.position.x + nodeWidth;
        const y = node.position.y + nodeHeaderHeight + 14 + (portIndex * portItemHeight);
        return { x, y };
    }, []);
    return (_jsxs("div", { ref: containerRef, onMouseDown: handleMouseDown, onMouseMove: handleMouseMove, onMouseUp: handleMouseUp, onWheel: handleWheel, onDragOver: handleDragOver, onDrop: handleDrop, style: {
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
        }, children: [_jsxs("div", { style: {
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
                }, children: [_jsx("button", { onClick: () => setViewport({ ...viewport, zoom: Math.min(2.5, viewport.zoom * 1.15) }), style: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }, title: "Zoom In", children: _jsx(PlusOutlined, {}) }), _jsxs("span", { style: { fontSize: 12, fontFamily: 'monospace', color: '#f8fafc', minWidth: 42, textAlign: 'center' }, children: [Math.round(viewport.zoom * 100), "%"] }), _jsx("button", { onClick: () => setViewport({ ...viewport, zoom: Math.max(0.3, viewport.zoom * 0.85) }), style: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }, title: "Zoom Out", children: _jsx(MinusOutlined, {}) }), _jsx("div", { style: { width: 1, height: 16, backgroundColor: '#334155' } }), _jsx("button", { onClick: () => setViewport({ x: 50, y: 50, zoom: 1.0 }), style: { background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }, title: "Reset View", children: _jsx(FullscreenOutlined, {}) })] }), pendingPort && (_jsxs("div", { style: {
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
                }, children: [_jsx("span", { children: "Select destination port to complete connection..." }), _jsx("button", { onClick: cancelConnection, style: {
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            color: '#fff',
                            borderRadius: 4,
                            padding: '2px 8px',
                            cursor: 'pointer',
                            fontSize: 11
                        }, children: "Cancel (Esc)" })] })), _jsxs("div", { style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                    transformOrigin: '0 0'
                }, children: [_jsxs("svg", { style: {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 10000,
                            height: 10000,
                            pointerEvents: 'none',
                            overflow: 'visible'
                        }, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "gradCat6", x1: "0%", y1: "0%", x2: "100%", y2: "0%", children: [_jsx("stop", { offset: "0%", stopColor: "#0ea5e9" }), _jsx("stop", { offset: "100%", stopColor: "#38bdf8" })] }), _jsxs("linearGradient", { id: "gradFiber", x1: "0%", y1: "0%", x2: "100%", y2: "0%", children: [_jsx("stop", { offset: "0%", stopColor: "#f59e0b" }), _jsx("stop", { offset: "100%", stopColor: "#fbbf24" })] })] }), Object.values(graph.connections).map((conn) => {
                                const srcNode = graph.nodes[conn.sourceComponentId];
                                const tgtNode = graph.nodes[conn.targetComponentId];
                                if (!srcNode || !tgtNode)
                                    return null;
                                const srcPort = srcNode.ports.find((p) => p.id === conn.sourcePortId);
                                const tgtPort = tgtNode.ports.find((p) => p.id === conn.targetPortId);
                                if (!srcPort || !tgtPort)
                                    return null;
                                const start = getPortCoordinates(srcNode, srcPort);
                                const end = getPortCoordinates(tgtNode, tgtPort);
                                // Compute smooth cubic bezier path
                                const dx = Math.abs(end.x - start.x) * 0.5;
                                const pathData = `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
                                const isSelected = selectedConnectionId === conn.id;
                                const isFailed = conn.simulationState.isFailed || srcNode.simulationState.isFailed || tgtNode.simulationState.isFailed;
                                const isFiber = conn.connectionType.includes('FIBER');
                                return (_jsxs("g", { style: { pointerEvents: 'stroke', cursor: 'pointer' }, onClick: () => selectConnection(conn.id), children: [_jsx("path", { d: pathData, fill: "none", stroke: "transparent", strokeWidth: 14 }), _jsx("path", { d: pathData, fill: "none", stroke: isFailed ? '#ef4444' : isSelected ? '#38bdf8' : isFiber ? 'url(#gradFiber)' : 'url(#gradCat6)', strokeWidth: isSelected ? 3.5 : 2, strokeDasharray: isFailed ? '6,4' : undefined, style: { transition: 'stroke 0.2s, stroke-width 0.2s' } }), _jsxs("text", { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 8, fill: "#94a3b8", fontSize: "10", fontFamily: "monospace", textAnchor: "middle", style: { pointerEvents: 'none', userSelect: 'none' }, children: [conn.connectionType, " \u2022 ", conn.lengthMeters, "m"] })] }, conn.id));
                            }), activePackets.map((pkt) => {
                                const conn = graph.connections[pkt.currentEdgeId];
                                if (!conn)
                                    return null;
                                const srcNode = graph.nodes[conn.sourceComponentId];
                                const tgtNode = graph.nodes[conn.targetComponentId];
                                if (!srcNode || !tgtNode)
                                    return null;
                                const srcPort = srcNode.ports.find((p) => p.id === conn.sourcePortId);
                                const tgtPort = tgtNode.ports.find((p) => p.id === conn.targetPortId);
                                if (!srcPort || !tgtPort)
                                    return null;
                                const start = getPortCoordinates(srcNode, srcPort);
                                const end = getPortCoordinates(tgtNode, tgtPort);
                                // Interpolate position along bezier curve
                                const t = Math.min(1, Math.max(0, pkt.progressPercent / 100));
                                const dx = Math.abs(end.x - start.x) * 0.5;
                                // Standard cubic bezier formula
                                const cx1 = start.x + dx;
                                const cy1 = start.y;
                                const cx2 = end.x - dx;
                                const cy2 = end.y;
                                const px = Math.pow(1 - t, 3) * start.x + 3 * Math.pow(1 - t, 2) * t * cx1 + 3 * (1 - t) * Math.pow(t, 2) * cx2 + Math.pow(t, 3) * end.x;
                                const py = Math.pow(1 - t, 3) * start.y + 3 * Math.pow(1 - t, 2) * t * cy1 + 3 * (1 - t) * Math.pow(t, 2) * cy2 + Math.pow(t, 3) * end.y;
                                return (_jsxs("g", { transform: `translate(${px}, ${py})`, children: [_jsx("circle", { r: 5, fill: pkt.status === 'FAILED' ? '#ef4444' : '#38bdf8', filter: "drop-shadow(0 0 6px #38bdf8)" }), _jsx("circle", { r: 9, fill: "none", stroke: pkt.status === 'FAILED' ? '#ef4444' : '#38bdf8', strokeWidth: 1.5, opacity: 0.6 })] }, pkt.id));
                            })] }), Object.values(graph.nodes).map((node) => {
                        const isSelected = selectedNodeId === node.id;
                        const isFailed = node.simulationState.isFailed;
                        const ip = (node.properties.ipAddress || node.properties.lanIp || node.properties.managementIp);
                        return (_jsxs("div", { onClick: (e) => {
                                e.stopPropagation();
                                selectNode(node.id);
                            }, onMouseDown: (e) => {
                                e.stopPropagation();
                                setDraggingNodeId(node.id);
                                setDragOffset({
                                    x: (e.clientX - viewport.x) / viewport.zoom - node.position.x,
                                    y: (e.clientY - viewport.y) / viewport.zoom - node.position.y
                                });
                                selectNode(node.id);
                            }, style: {
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
                            }, children: [_jsxs("div", { style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '6px 10px',
                                        backgroundColor: isFailed ? '#450a0a' : '#1e293b',
                                        borderTopLeftRadius: 6,
                                        borderTopRightRadius: 6,
                                        borderBottom: '1px solid #334155'
                                    }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Tag, { color: isFailed ? 'error' : 'cyan', style: { margin: 0, fontSize: 10, fontWeight: 600 }, children: node.tag }), _jsx("span", { style: { fontSize: 12, fontWeight: 600, color: '#f8fafc' }, children: node.type.replace('_', ' ').slice(0, 14) })] }), _jsx(Badge, { status: isFailed ? 'error' : 'success', title: isFailed ? 'DEVICE OFFLINE / FAULT' : 'ONLINE' })] }), _jsxs("div", { style: { padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }, children: [ip && (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }, children: [_jsx("span", { style: { color: '#64748b' }, children: "IP:" }), _jsx("span", { style: { color: '#38bdf8', fontWeight: 500 }, children: ip })] })), node.properties.vlanId !== undefined && (_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }, children: [_jsx("span", { style: { color: '#64748b' }, children: "VLAN:" }), _jsx("span", { style: { color: '#cbd5e1' }, children: String(node.properties.vlanId) })] }))] }), _jsx("div", { style: {
                                        padding: '4px 6px',
                                        backgroundColor: '#090d16',
                                        borderBottomLeftRadius: 6,
                                        borderBottomRightRadius: 6,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 3
                                    }, children: node.ports.map((port) => {
                                        const isConnected = !!port.occupiedByConnectionId;
                                        const isPending = pendingPort?.nodeId === node.id && pendingPort?.portId === port.id;
                                        return (_jsxs("div", { onClick: (e) => {
                                                e.stopPropagation();
                                                if (pendingPort) {
                                                    const res = completeConnection(node.id, port.id);
                                                    if (!res.success && res.message) {
                                                        message.error(res.message);
                                                    }
                                                    else {
                                                        message.success('Connected successfully');
                                                    }
                                                }
                                                else {
                                                    if (isConnected) {
                                                        message.info(`Port ${port.name} is connected.`);
                                                    }
                                                    else {
                                                        startConnection(node.id, port.id);
                                                    }
                                                }
                                            }, style: {
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                fontSize: 10,
                                                backgroundColor: isPending ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                                                cursor: 'pointer',
                                                border: isPending ? '1px dashed #38bdf8' : '1px solid transparent'
                                            }, children: [_jsx("span", { style: { color: isConnected ? '#94a3b8' : '#e2e8f0', fontSize: 10 }, children: port.name }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx("span", { style: { fontSize: 9, color: '#64748b' }, children: port.type }), _jsx("div", { style: {
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
                                                            }, title: isConnected ? 'Port Occupied' : 'Port Available' })] })] }, port.id));
                                    }) })] }, node.id));
                    })] })] }));
};
//# sourceMappingURL=Canvas.js.map