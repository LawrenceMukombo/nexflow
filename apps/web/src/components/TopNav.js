import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Space, Select, Badge, Tooltip, message } from 'antd';
import { PlayCircleFilled, PauseCircleFilled, CheckCircleOutlined, ExclamationCircleOutlined, DollarOutlined, TableOutlined, UndoOutlined, RedoOutlined, ClearOutlined, DownloadOutlined, ThunderboltFilled, BranchesOutlined } from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
export const TopNav = () => {
    const { graph, activeDomain, setActiveDomain, validationIssues, toggleValidationDrawer, toggleBOQModal, toggleCableScheduleModal, isSimulating, toggleSimulation, simulationSpeed, setSimulationSpeed, triggerPacketBurst, loadDemoTopology, clearCanvas, undo, redo, historyIndex, history } = useGraphStore();
    const errorCount = validationIssues.filter((i) => i.severity === 'CRITICAL' || i.severity === 'ERROR').length;
    const handleExportJSON = () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(graph, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute('href', dataStr);
        dlAnchor.setAttribute('download', `${graph.name.toLowerCase().replace(/\s+/g, '_')}_v1.0.json`);
        dlAnchor.click();
        message.success('Exported engineering graph schema (JSON)');
    };
    return (_jsxs("div", { style: {
            height: 52,
            backgroundColor: '#0f172a',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 30
        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 16 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("div", { style: {
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
                                }, children: "\u03A9" }), _jsxs("span", { style: { fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }, children: ["Omni", _jsx("span", { style: { color: '#38bdf8' }, children: "Flow" })] })] }), _jsx("div", { style: { width: 1, height: 20, backgroundColor: '#334155' } }), _jsx(Select, { value: activeDomain, onChange: (val) => setActiveDomain(val), style: { width: 130 }, size: "small", options: [
                            { label: '🌐 Network', value: 'NETWORK' },
                            { label: '⚡ Electrical', value: 'ELECTRICAL' },
                            { label: '💧 Plumbing', value: 'PLUMBING' }
                        ] }), _jsx("span", { style: { fontSize: 13, color: '#94a3b8', fontWeight: 500 }, children: graph.name })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsxs(Space, { size: 2, children: [_jsx(Tooltip, { title: "Undo (Ctrl+Z)", children: _jsx(Button, { type: "text", icon: _jsx(UndoOutlined, { style: { color: historyIndex > 0 ? '#cbd5e1' : '#475569' } }), disabled: historyIndex <= 0, onClick: undo }) }), _jsx(Tooltip, { title: "Redo (Ctrl+Y)", children: _jsx(Button, { type: "text", icon: _jsx(RedoOutlined, { style: { color: historyIndex < history.length - 1 ? '#cbd5e1' : '#475569' } }), disabled: historyIndex >= history.length - 1, onClick: redo }) })] }), _jsx("div", { style: { width: 1, height: 20, backgroundColor: '#334155' } }), _jsx(Button, { icon: _jsx(BranchesOutlined, {}), onClick: loadDemoTopology, style: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }, children: "Load Small Office Demo" }), _jsxs(Space.Compact, { children: [_jsx(Button, { type: isSimulating ? 'primary' : 'default', icon: isSimulating ? _jsx(PauseCircleFilled, {}) : _jsx(PlayCircleFilled, { style: { color: '#10b981' } }), onClick: () => toggleSimulation(), style: {
                                    backgroundColor: isSimulating ? '#0284c7' : '#1e293b',
                                    borderColor: '#334155',
                                    color: '#f8fafc',
                                    fontWeight: 500
                                }, children: isSimulating ? 'Simulating' : 'Simulate' }), _jsx(Button, { icon: _jsx(ThunderboltFilled, { style: { color: '#f59e0b' } }), onClick: triggerPacketBurst, title: "Inject simulated traffic packet burst", style: { backgroundColor: '#1e293b', borderColor: '#334155' } }), _jsx(Select, { value: simulationSpeed, onChange: (s) => setSimulationSpeed(s), style: { width: 70 }, options: [
                                    { label: '1x', value: 1 },
                                    { label: '2x', value: 2 },
                                    { label: '5x', value: 5 }
                                ] })] }), _jsx(Badge, { count: errorCount, offset: [-4, 4], children: _jsxs(Button, { icon: errorCount > 0 ? _jsx(ExclamationCircleOutlined, { style: { color: '#ef4444' } }) : _jsx(CheckCircleOutlined, { style: { color: '#10b981' } }), onClick: () => toggleValidationDrawer(true), style: {
                                backgroundColor: '#1e293b',
                                borderColor: errorCount > 0 ? '#ef4444' : '#334155',
                                color: '#f8fafc'
                            }, children: ["Validate (", validationIssues.length, ")"] }) }), _jsx(Button, { icon: _jsx(DollarOutlined, { style: { color: '#10b981' } }), onClick: () => toggleBOQModal(true), style: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }, children: "BOQ" }), _jsx(Button, { icon: _jsx(TableOutlined, { style: { color: '#38bdf8' } }), onClick: () => toggleCableScheduleModal(true), style: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }, children: "Cable Schedule" }), _jsx(Button, { icon: _jsx(DownloadOutlined, {}), onClick: handleExportJSON, style: { backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }, children: "Export JSON" }), _jsx(Tooltip, { title: "Clear Canvas", children: _jsx(Button, { type: "text", icon: _jsx(ClearOutlined, { style: { color: '#ef4444' } }), onClick: clearCanvas }) })] })] }));
};
//# sourceMappingURL=TopNav.js.map