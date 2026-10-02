import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Space, Tag, Badge } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
export const StatusBar = () => {
    const { graph, validationIssues, toggleValidationDrawer, telemetry, isSimulating, viewport } = useGraphStore();
    const nodeCount = Object.keys(graph.nodes).length;
    const connCount = Object.keys(graph.connections).length;
    const errors = validationIssues.filter(i => i.severity === 'CRITICAL' || i.severity === 'ERROR').length;
    const warnings = validationIssues.filter(i => i.severity === 'WARNING').length;
    return (_jsxs("div", { style: {
            height: 28,
            backgroundColor: '#090d16',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            fontSize: 11,
            color: '#94a3b8',
            zIndex: 30,
            userSelect: 'none'
        }, children: [_jsxs(Space, { size: "middle", children: [_jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(ApartmentOutlined, { style: { color: '#38bdf8' } }), _jsxs("span", { children: ["Graph: ", _jsx("strong", { style: { color: '#f8fafc' }, children: nodeCount }), " Nodes, ", _jsx("strong", { style: { color: '#f8fafc' }, children: connCount }), " Cables"] })] }), _jsx("span", { onClick: () => toggleValidationDrawer(true), style: { cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }, children: errors > 0 ? (_jsxs(Tag, { color: "error", style: { margin: 0, padding: '0 6px', fontSize: 10 }, children: [errors, " Errors"] })) : warnings > 0 ? (_jsxs(Tag, { color: "warning", style: { margin: 0, padding: '0 6px', fontSize: 10 }, children: [warnings, " Warnings"] })) : (_jsx(Tag, { color: "success", style: { margin: 0, padding: '0 6px', fontSize: 10 }, children: "Design Valid" })) })] }), _jsxs(Space, { size: "large", children: [_jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx(Badge, { status: isSimulating ? 'processing' : 'default' }), _jsx("span", { style: { color: isSimulating ? '#38bdf8' : '#64748b', fontWeight: 600 }, children: isSimulating ? 'SIMULATION TICK: ' + telemetry.tick : 'SIMULATION IDLE' })] }), _jsxs("span", { style: { fontFamily: 'monospace' }, children: ["Packets: ", _jsx("strong", { style: { color: '#f8fafc' }, children: telemetry.activePackets }), " active \u2022 ", _jsx("strong", { style: { color: '#10b981' }, children: telemetry.deliveredPackets }), " delivered", telemetry.droppedPackets > 0 && (_jsxs("span", { style: { color: '#ef4444', marginLeft: 6 }, children: ["\u2022 ", _jsx("strong", { children: telemetry.droppedPackets }), " dropped!"] }))] }), _jsxs("span", { style: { fontFamily: 'monospace' }, children: ["Avg Latency: ", _jsxs("strong", { style: { color: '#f8fafc' }, children: [telemetry.averageLatencyMs, " ms"] })] }), _jsxs("span", { style: { fontFamily: 'monospace' }, children: ["Throughput: ", _jsxs("strong", { style: { color: '#38bdf8' }, children: [telemetry.throughputMbps, " Mbps"] })] }), _jsxs("span", { style: { color: '#64748b' }, children: ["Zoom: ", Math.round(viewport.zoom * 100), "%"] })] })] }));
};
//# sourceMappingURL=StatusBar.js.map