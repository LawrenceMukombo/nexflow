import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Tabs, Input, InputNumber, Button, Tag, Typography, Divider, Popconfirm } from 'antd';
import { DeleteOutlined, WarningOutlined, SlidersOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { CABLE_CATALOG } from '@omniflow/network-engine';
const { Text, Title } = Typography;
export const Inspector = () => {
    const { graph, selectedNodeId, selectedConnectionId, updateComponentProperties, toggleComponentFault, removeComponent, removeConnection, toggleConnectionFault, updateConnectionLength } = useGraphStore();
    const selectedNode = selectedNodeId ? graph.nodes[selectedNodeId] : null;
    const selectedConn = selectedConnectionId ? graph.connections[selectedConnectionId] : null;
    if (!selectedNode && !selectedConn) {
        return (_jsxs("div", { style: {
                width: 320,
                height: '100%',
                backgroundColor: '#0f172a',
                borderLeft: '1px solid #334155',
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                color: '#64748b'
            }, children: [_jsx(SlidersOutlined, { style: { fontSize: 32, marginBottom: 12, color: '#334155' } }), _jsx(Text, { strong: true, style: { color: '#94a3b8', fontSize: 14 }, children: "Property Inspector" }), _jsx(Text, { style: { fontSize: 12, marginTop: 6, maxWidth: 220 }, children: "Click any component or cable on the canvas to inspect and configure engineering parameters." })] }));
    }
    // CONNECTION SELECTED
    if (selectedConn) {
        const srcNode = graph.nodes[selectedConn.sourceComponentId];
        const tgtNode = graph.nodes[selectedConn.targetComponentId];
        const isFailed = selectedConn.simulationState.isFailed;
        const cableSpec = CABLE_CATALOG[selectedConn.connectionType] || CABLE_CATALOG.CAT6;
        return (_jsxs("div", { style: {
                width: 320,
                height: '100%',
                backgroundColor: '#0f172a',
                borderLeft: '1px solid #334155',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                padding: 16
            }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Title, { level: 5, style: { color: '#f8fafc', margin: 0 }, children: "Cable Connection" }), _jsx(Tag, { color: isFailed ? 'error' : 'cyan', children: isFailed ? 'SEVERED / FAULT' : 'ACTIVE LINK' })] }), _jsx(Divider, { style: { borderColor: '#334155', margin: '12px 0' } }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: [_jsxs("div", { style: { padding: 10, backgroundColor: '#1e293b', borderRadius: 6 }, children: [_jsx(Text, { style: { fontSize: 11, color: '#64748b' }, children: "ORIGIN ENDPOINT" }), _jsxs("div", { style: { fontSize: 13, color: '#f8fafc', fontWeight: 500 }, children: [srcNode?.tag, " (", srcNode?.name, ")"] })] }), _jsxs("div", { style: { padding: 10, backgroundColor: '#1e293b', borderRadius: 6 }, children: [_jsx(Text, { style: { fontSize: 11, color: '#64748b' }, children: "TARGET ENDPOINT" }), _jsxs("div", { style: { fontSize: 13, color: '#f8fafc', fontWeight: 500 }, children: [tgtNode?.tag, " (", tgtNode?.name, ")"] })] })] }), _jsx(Divider, { style: { borderColor: '#334155', margin: '14px 0' } }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [_jsxs("div", { children: [_jsx(Text, { style: { fontSize: 11, color: '#94a3b8' }, children: "CABLE SPECIFICATION" }), _jsxs("div", { style: { fontSize: 13, color: '#38bdf8', fontWeight: 600 }, children: [cableSpec.name, " (", selectedConn.connectionType, ")"] }), _jsxs("span", { style: { fontSize: 11, color: '#64748b' }, children: ["Rated Max: ", cableSpec.maxBandwidthMbps, " Mbps \u2022 Channel Limit: ", cableSpec.maxDistanceMeters, "m"] })] }), _jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 }, children: [_jsx(Text, { style: { fontSize: 11, color: '#94a3b8' }, children: "RUN LENGTH (METERS)" }), _jsx("span", { style: { fontSize: 11, color: selectedConn.lengthMeters > 100 ? '#ef4444' : '#10b981' }, children: selectedConn.lengthMeters > 100 ? 'Exceeds TIA-568 (>100m)' : 'Within Standards' })] }), _jsx(InputNumber, { min: 1, max: 500, value: selectedConn.lengthMeters, onChange: (val) => updateConnectionLength(selectedConn.id, val || 10), style: { width: '100%' }, addonAfter: "meters" })] }), _jsxs("div", { style: { padding: 10, backgroundColor: '#090d16', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { style: { fontSize: 11, color: '#94a3b8' }, children: "Physics Latency:" }), _jsxs("span", { style: { fontSize: 11, fontFamily: 'monospace', color: '#f8fafc' }, children: [(selectedConn.lengthMeters * 0.005).toFixed(3), " ms"] })] })] }), _jsx(Divider, { style: { borderColor: '#334155', margin: '16px 0' } }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }, children: [_jsx(Button, { danger: !isFailed, type: isFailed ? 'primary' : 'default', icon: _jsx(WarningOutlined, {}), onClick: () => toggleConnectionFault(selectedConn.id), style: { width: '100%' }, children: isFailed ? 'Restore Cable Connection' : 'Inject Fault (Cut Cable)' }), _jsx(Popconfirm, { title: "Disconnect cable?", description: "This will remove the physical connection between both device ports.", onConfirm: () => removeConnection(selectedConn.id), okText: "Disconnect", cancelText: "Cancel", children: _jsx(Button, { icon: _jsx(DeleteOutlined, {}), style: { width: '100%' }, children: "Disconnect Cable" }) })] })] }));
    }
    // NODE SELECTED
    const isFailed = selectedNode.simulationState.isFailed;
    return (_jsxs("div", { style: {
            width: 320,
            height: '100%',
            backgroundColor: '#0f172a',
            borderLeft: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: 16
        }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Tag, { color: "cyan", style: { margin: 0, fontWeight: 600 }, children: selectedNode.tag }), _jsx(Title, { level: 5, style: { color: '#f8fafc', margin: 0, fontSize: 14 }, children: selectedNode.name.split('(')[0] })] }), _jsx(Tag, { color: isFailed ? 'error' : 'success', children: isFailed ? 'OFFLINE' : 'ONLINE' })] }), _jsx(Text, { style: { fontSize: 11, color: '#94a3b8', marginTop: 4 }, children: selectedNode.description }), _jsx(Button, { danger: !isFailed, type: isFailed ? 'primary' : 'default', icon: _jsx(ThunderboltOutlined, {}), onClick: () => toggleComponentFault(selectedNode.id), style: { marginTop: 12 }, children: isFailed ? 'Restore Power / Online' : 'Inject Failure (Offline)' }), _jsx(Divider, { style: { borderColor: '#334155', margin: '14px 0' } }), _jsx(Tabs, { defaultActiveKey: "props", size: "small", items: [
                    {
                        key: 'props',
                        label: 'Properties',
                        children: (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12 }, children: [(selectedNode.properties.ipAddress !== undefined || selectedNode.properties.lanIp !== undefined) && (_jsxs("div", { children: [_jsx(Text, { style: { fontSize: 11, color: '#94a3b8' }, children: "IP ADDRESS" }), _jsx(Input, { value: (selectedNode.properties.ipAddress || selectedNode.properties.lanIp), onChange: (e) => {
                                                const key = selectedNode.properties.lanIp !== undefined ? 'lanIp' : 'ipAddress';
                                                updateComponentProperties(selectedNode.id, { [key]: e.target.value });
                                            }, style: { fontFamily: 'monospace' } })] })), selectedNode.properties.subnetMask !== undefined && (_jsxs("div", { children: [_jsx(Text, { style: { fontSize: 11, color: '#94a3b8' }, children: "SUBNET MASK" }), _jsx(Input, { value: selectedNode.properties.subnetMask, onChange: (e) => updateComponentProperties(selectedNode.id, { subnetMask: e.target.value }), style: { fontFamily: 'monospace' } })] })), selectedNode.properties.defaultGateway !== undefined && (_jsxs("div", { children: [_jsx(Text, { style: { fontSize: 11, color: '#94a3b8' }, children: "DEFAULT GATEWAY" }), _jsx(Input, { value: selectedNode.properties.defaultGateway, onChange: (e) => updateComponentProperties(selectedNode.id, { defaultGateway: e.target.value }), style: { fontFamily: 'monospace' } })] })), selectedNode.properties.vlanId !== undefined && (_jsxs("div", { children: [_jsx(Text, { style: { fontSize: 11, color: '#94a3b8' }, children: "ACCESS VLAN ID" }), _jsx(InputNumber, { min: 1, max: 4094, value: selectedNode.properties.vlanId, onChange: (val) => updateComponentProperties(selectedNode.id, { vlanId: val }), style: { width: '100%' } })] })), selectedNode.properties.poeTotalBudgetWatts !== undefined && (_jsxs("div", { children: [_jsx(Text, { style: { fontSize: 11, color: '#94a3b8' }, children: "POE POWER BUDGET (WATTS)" }), _jsx(InputNumber, { min: 50, max: 1500, value: selectedNode.properties.poeTotalBudgetWatts, onChange: (val) => updateComponentProperties(selectedNode.id, { poeTotalBudgetWatts: val }), style: { width: '100%' }, addonAfter: "Watts" })] }))] }))
                    },
                    {
                        key: 'ports',
                        label: `Ports (${selectedNode.ports.length})`,
                        children: (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }, children: selectedNode.ports.map((port) => {
                                const isConn = !!port.occupiedByConnectionId;
                                return (_jsxs("div", { style: {
                                        padding: '6px 8px',
                                        backgroundColor: '#1e293b',
                                        borderRadius: 4,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, fontWeight: 500, color: '#f8fafc' }, children: port.name }), _jsxs("span", { style: { fontSize: 10, color: '#64748b' }, children: [port.type, " \u2022 ", port.capacity, " ", port.unit] })] }), _jsx(Tag, { color: isConn ? 'amber' : 'green', style: { margin: 0, fontSize: 10 }, children: isConn ? 'Connected' : 'Free' })] }, port.id));
                            }) }))
                    },
                    {
                        key: 'cost',
                        label: 'Cost / BOQ',
                        children: (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: [_jsxs("div", { style: { padding: 10, backgroundColor: '#1e293b', borderRadius: 6 }, children: [_jsx(Text, { style: { fontSize: 11, color: '#64748b' }, children: "PART NUMBER" }), _jsx("div", { style: { fontSize: 12, fontFamily: 'monospace', color: '#f8fafc' }, children: selectedNode.costData?.partNumber || 'N/A' })] }), _jsxs("div", { style: { padding: 10, backgroundColor: '#1e293b', borderRadius: 6 }, children: [_jsx(Text, { style: { fontSize: 11, color: '#64748b' }, children: "MANUFACTURER" }), _jsx("div", { style: { fontSize: 12, color: '#f8fafc' }, children: selectedNode.costData?.manufacturer || 'Generic' })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsxs("div", { style: { flex: 1, padding: 10, backgroundColor: '#1e293b', borderRadius: 6 }, children: [_jsx(Text, { style: { fontSize: 11, color: '#64748b' }, children: "MATERIAL" }), _jsxs("div", { style: { fontSize: 14, fontWeight: 600, color: '#38bdf8' }, children: ["$", selectedNode.costData?.unitCost] })] }), _jsxs("div", { style: { flex: 1, padding: 10, backgroundColor: '#1e293b', borderRadius: 6 }, children: [_jsx(Text, { style: { fontSize: 11, color: '#64748b' }, children: "LABOUR" }), _jsxs("div", { style: { fontSize: 14, fontWeight: 600, color: '#10b981' }, children: ["$", selectedNode.costData?.labourCost] })] })] })] }))
                    }
                ] }), _jsx("div", { style: { marginTop: 'auto', paddingTop: 16 }, children: _jsx(Popconfirm, { title: "Delete component?", description: "This will permanently remove the device and all associated cables.", onConfirm: () => removeComponent(selectedNode.id), okText: "Delete", okType: "danger", cancelText: "Cancel", children: _jsx(Button, { danger: true, icon: _jsx(DeleteOutlined, {}), style: { width: '100%' }, children: "Delete Device" }) }) })] }));
};
//# sourceMappingURL=Inspector.js.map