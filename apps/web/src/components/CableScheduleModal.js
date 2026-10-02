import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Modal, Typography, Tag } from 'antd';
import { TableOutlined } from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { generateCableSchedule } from '@omniflow/network-engine';
import { EnterpriseTable } from './EnterpriseTable';
const { Title } = Typography;
export const CableScheduleModal = () => {
    const { isCableScheduleOpen, toggleCableScheduleModal, graph } = useGraphStore();
    const scheduleData = useMemo(() => {
        return generateCableSchedule(graph);
    }, [graph]);
    const columns = [
        {
            key: 'cableId',
            title: 'Cable ID',
            dataIndex: 'cableId',
            width: 140,
            render: (id) => _jsx("span", { style: { fontFamily: 'monospace', color: '#94a3b8' }, children: id.slice(0, 14) })
        },
        {
            key: 'cableType',
            title: 'Cable Spec',
            dataIndex: 'cableType',
            width: 130,
            sorter: (a, b) => a.cableType.localeCompare(b.cableType),
            render: (type) => (_jsx(Tag, { color: type.includes('FIBER') ? 'gold' : 'cyan', children: type }))
        },
        {
            key: 'sourceDevice',
            title: 'Origin Endpoint',
            dataIndex: 'sourceDevice',
            sorter: (a, b) => a.sourceDevice.localeCompare(b.sourceDevice),
            render: (dev) => _jsx("strong", { style: { color: '#f8fafc' }, children: dev })
        },
        {
            key: 'sourcePort',
            title: 'Origin Port',
            dataIndex: 'sourcePort',
            width: 130,
            render: (p) => _jsx("span", { style: { color: '#38bdf8' }, children: p })
        },
        {
            key: 'targetDevice',
            title: 'Destination Endpoint',
            dataIndex: 'targetDevice',
            sorter: (a, b) => a.targetDevice.localeCompare(b.targetDevice),
            render: (dev) => _jsx("strong", { style: { color: '#f8fafc' }, children: dev })
        },
        {
            key: 'targetPort',
            title: 'Destination Port',
            dataIndex: 'targetPort',
            width: 130,
            render: (p) => _jsx("span", { style: { color: '#10b981' }, children: p })
        },
        {
            key: 'lengthMeters',
            title: 'Length (m)',
            dataIndex: 'lengthMeters',
            width: 110,
            sorter: (a, b) => a.lengthMeters - b.lengthMeters,
            render: (len) => _jsxs("span", { children: [len, " meters"] })
        }
    ];
    return (_jsx(Modal, { title: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx(TableOutlined, { style: { color: '#38bdf8', fontSize: 20 } }), _jsx(Title, { level: 4, style: { color: '#f8fafc', margin: 0 }, children: "Structured Cabling Schedule" })] }), open: isCableScheduleOpen, onCancel: () => toggleCableScheduleModal(false), width: 950, footer: null, children: _jsx(EnterpriseTable, { columns: columns, dataSource: scheduleData, searchPlaceholder: "Filter cable schedule...", searchFields: ['cableType', 'sourceDevice', 'targetDevice', 'sourcePort', 'targetPort'], exportFileName: "cable-schedule" }) }));
};
//# sourceMappingURL=CableScheduleModal.js.map