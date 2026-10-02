import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Modal, Tag, Typography, Card, Row, Col, Statistic } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { generateNetworkBOQ } from '@omniflow/network-engine';
import { EnterpriseTable } from './EnterpriseTable';
const { Title } = Typography;
export const BOQModal = () => {
    const { isBOQModalOpen, toggleBOQModal, graph } = useGraphStore();
    const boqSummary = useMemo(() => {
        return generateNetworkBOQ(graph, {
            currency: 'USD',
            taxRatePercent: 15,
            contingencyPercent: 10
        });
    }, [graph]);
    const columns = [
        {
            key: 'itemType',
            title: 'Type',
            dataIndex: 'itemType',
            width: 110,
            sorter: (a, b) => a.itemType.localeCompare(b.itemType),
            render: (type) => (_jsx(Tag, { color: type === 'COMPONENT' ? 'cyan' : 'blue', children: type }))
        },
        {
            key: 'description',
            title: 'Item Description',
            dataIndex: 'description',
            width: 250,
            sorter: (a, b) => a.description.localeCompare(b.description),
            render: (desc) => _jsx("strong", { style: { color: '#f8fafc' }, children: desc })
        },
        {
            key: 'partNumber',
            title: 'Part #',
            dataIndex: 'partNumber',
            width: 140,
            render: (pn) => _jsx("span", { style: { fontFamily: 'monospace', color: '#94a3b8' }, children: pn || 'N/A' })
        },
        {
            key: 'quantity',
            title: 'Qty',
            dataIndex: 'quantity',
            width: 90,
            sorter: (a, b) => a.quantity - b.quantity,
            render: (qty, rec) => (_jsxs("span", { children: [qty, " ", rec.unit] }))
        },
        {
            key: 'unitCost',
            title: 'Unit Material',
            dataIndex: 'unitCost',
            width: 120,
            sorter: (a, b) => a.unitCost - b.unitCost,
            render: (val) => `$${val.toFixed(2)}`
        },
        {
            key: 'unitLabour',
            title: 'Unit Labour',
            dataIndex: 'unitLabour',
            width: 120,
            sorter: (a, b) => a.unitLabour - b.unitLabour,
            render: (val) => `$${val.toFixed(2)}`
        },
        {
            key: 'totalMaterialCost',
            title: 'Total Material',
            dataIndex: 'totalMaterialCost',
            width: 130,
            sorter: (a, b) => a.totalMaterialCost - b.totalMaterialCost,
            render: (val) => _jsxs("span", { style: { color: '#38bdf8' }, children: ["$", val.toFixed(2)] })
        },
        {
            key: 'totalLabourCost',
            title: 'Total Labour',
            dataIndex: 'totalLabourCost',
            width: 130,
            sorter: (a, b) => a.totalLabourCost - b.totalLabourCost,
            render: (val) => _jsxs("span", { style: { color: '#10b981' }, children: ["$", val.toFixed(2)] })
        },
        {
            key: 'totalCost',
            title: 'Line Total',
            dataIndex: 'totalCost',
            width: 140,
            sorter: (a, b) => a.totalCost - b.totalCost,
            render: (val) => _jsxs("strong", { style: { color: '#f8fafc' }, children: ["$", val.toFixed(2)] })
        }
    ];
    return (_jsx(Modal, { title: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx(DollarOutlined, { style: { color: '#10b981', fontSize: 20 } }), _jsx(Title, { level: 4, style: { color: '#f8fafc', margin: 0 }, children: "Bill of Quantities (BOQ) & Cost Schedule" })] }), open: isBOQModalOpen, onCancel: () => toggleBOQModal(false), width: 1100, footer: null, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsxs(Row, { gutter: 12, children: [_jsx(Col, { span: 6, children: _jsx(Card, { size: "small", style: { backgroundColor: '#1e293b', borderColor: '#334155' }, children: _jsx(Statistic, { title: _jsx("span", { style: { color: '#94a3b8', fontSize: 12 }, children: "Total Materials" }), value: boqSummary.totalMaterials, precision: 2, prefix: "$", valueStyle: { color: '#38bdf8', fontSize: 18 } }) }) }), _jsx(Col, { span: 6, children: _jsx(Card, { size: "small", style: { backgroundColor: '#1e293b', borderColor: '#334155' }, children: _jsx(Statistic, { title: _jsx("span", { style: { color: '#94a3b8', fontSize: 12 }, children: "Total Labour" }), value: boqSummary.totalLabour, precision: 2, prefix: "$", valueStyle: { color: '#10b981', fontSize: 18 } }) }) }), _jsx(Col, { span: 6, children: _jsx(Card, { size: "small", style: { backgroundColor: '#1e293b', borderColor: '#334155' }, children: _jsx(Statistic, { title: _jsx("span", { style: { color: '#94a3b8', fontSize: 12 }, children: "Tax (15%) + Contingency (10%)" }), value: boqSummary.taxAmount + boqSummary.contingencyAmount, precision: 2, prefix: "$", valueStyle: { color: '#f59e0b', fontSize: 18 } }) }) }), _jsx(Col, { span: 6, children: _jsx(Card, { size: "small", style: { backgroundColor: '#1e293b', borderColor: '#0ea5e9' }, children: _jsx(Statistic, { title: _jsx("span", { style: { color: '#94a3b8', fontSize: 12 }, children: "Grand Project Total" }), value: boqSummary.grandTotal, precision: 2, prefix: "$", valueStyle: { color: '#ffffff', fontWeight: 700, fontSize: 18 } }) }) })] }), _jsx(EnterpriseTable, { columns: columns, dataSource: boqSummary.items, searchPlaceholder: "Search BOQ items...", searchFields: ['description', 'partNumber', 'itemType', 'category'], exportFileName: `boq-schedule-${graph.name.toLowerCase().replace(/\s+/g, '-')}` })] }) }));
};
//# sourceMappingURL=BOQModal.js.map