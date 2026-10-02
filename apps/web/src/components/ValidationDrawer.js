import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Drawer, Tag, Button, Typography } from 'antd';
import { AimOutlined } from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { EnterpriseTable } from './EnterpriseTable';
const { Title } = Typography;
export const ValidationDrawer = () => {
    const { isValidationDrawerOpen, toggleValidationDrawer, validationIssues, selectNode, graph } = useGraphStore();
    const columns = [
        {
            key: 'severity',
            title: 'Severity',
            dataIndex: 'severity',
            width: 110,
            sorter: (a, b) => a.severity.localeCompare(b.severity),
            render: (sev) => {
                switch (sev) {
                    case 'CRITICAL':
                        return _jsx(Tag, { color: "magenta", children: "CRITICAL" });
                    case 'ERROR':
                        return _jsx(Tag, { color: "red", children: "ERROR" });
                    case 'WARNING':
                        return _jsx(Tag, { color: "gold", children: "WARNING" });
                    default:
                        return _jsx(Tag, { color: "blue", children: "INFO" });
                }
            }
        },
        {
            key: 'ruleCode',
            title: 'Rule Code',
            dataIndex: 'ruleCode',
            width: 170,
            render: (code) => _jsx("span", { style: { fontFamily: 'monospace', color: '#38bdf8' }, children: code })
        },
        {
            key: 'title',
            title: 'Issue Title',
            dataIndex: 'title',
            width: 200,
            render: (title) => _jsx("strong", { style: { color: '#f8fafc' }, children: title })
        },
        {
            key: 'message',
            title: 'Engineering Details',
            dataIndex: 'message',
            render: (msg) => _jsx("span", { style: { color: '#cbd5e1' }, children: msg })
        },
        {
            key: 'suggestedFix',
            title: 'Suggested Fix',
            dataIndex: 'suggestedFix',
            render: (fix) => _jsx("span", { style: { color: '#10b981', fontStyle: 'italic' }, children: fix })
        },
        {
            key: 'actions',
            title: 'Action',
            width: 120,
            render: (_, record) => {
                const firstNodeId = record.affectedNodeIds[0];
                if (!firstNodeId || !graph.nodes[firstNodeId])
                    return null;
                return (_jsx(Button, { size: "small", icon: _jsx(AimOutlined, {}), onClick: () => {
                        selectNode(firstNodeId);
                        toggleValidationDrawer(false);
                    }, children: "Locate" }));
            }
        }
    ];
    return (_jsx(Drawer, { title: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx(Title, { level: 5, style: { color: '#f8fafc', margin: 0 }, children: "Automated Engineering Validation Audit" }), _jsxs(Tag, { color: validationIssues.length === 0 ? 'success' : 'warning', children: [validationIssues.length, " rule issues detected"] })] }), placement: "bottom", height: 380, onClose: () => toggleValidationDrawer(false), open: isValidationDrawerOpen, styles: {
            body: { padding: '16px 24px', backgroundColor: '#0f172a' },
            header: { backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }
        }, children: _jsx(EnterpriseTable, { columns: columns, dataSource: validationIssues, searchPlaceholder: "Filter issues by code, title, or rule...", searchFields: ['ruleCode', 'title', 'message', 'severity'], exportFileName: "validation-audit-log" }) }));
};
//# sourceMappingURL=ValidationDrawer.js.map