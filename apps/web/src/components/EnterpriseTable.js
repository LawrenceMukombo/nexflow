import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { Table, Input, Button, Space, Popover, Checkbox, Empty, Spin, Alert, Typography } from 'antd';
import { SearchOutlined, DownloadOutlined, SettingOutlined, ReloadOutlined } from '@ant-design/icons';
const { Text } = Typography;
export function EnterpriseTable({ columns, dataSource, loading = false, error = null, searchPlaceholder = 'Search records...', searchFields = [], title, onRefresh, exportFileName = 'export-data', extraHeaderActions }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    // Column visibility state
    const [visibleColumnKeys, setVisibleColumnKeys] = useState(() => columns.filter(c => c.defaultVisible !== false).map(c => c.key));
    // Filtered dataset
    const filteredData = useMemo(() => {
        if (!searchTerm.trim())
            return dataSource;
        const lower = searchTerm.toLowerCase();
        return dataSource.filter(item => {
            if (searchFields.length > 0) {
                return searchFields.some(f => {
                    const val = item[f];
                    return val !== undefined && val !== null && String(val).toLowerCase().includes(lower);
                });
            }
            return Object.values(item).some(val => val !== undefined && val !== null && String(val).toLowerCase().includes(lower));
        });
    }, [dataSource, searchTerm, searchFields]);
    // Filtered visible columns
    const activeColumns = useMemo(() => {
        return columns
            .filter(col => visibleColumnKeys.includes(col.key))
            .map(col => ({
            key: col.key,
            title: col.title,
            dataIndex: col.dataIndex,
            sorter: col.sorter,
            render: col.render,
            width: col.width
        }));
    }, [columns, visibleColumnKeys]);
    // Export to CSV
    const handleExportCSV = () => {
        if (filteredData.length === 0)
            return;
        const exportCols = columns.filter(c => visibleColumnKeys.includes(c.key));
        const header = exportCols.map(c => `"${c.title}"`).join(',');
        const rows = filteredData.map(record => {
            return exportCols.map(c => {
                const val = c.dataIndex ? record[c.dataIndex] : '';
                return `"${String(val ?? '').replace(/"/g, '""')}"`;
            }).join(',');
        });
        const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${exportFileName}-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    const paginationConfig = {
        current: currentPage,
        pageSize,
        total: filteredData.length,
        showSizeChanger: true,
        pageSizeOptions: ['10', '25', '50', '100'],
        onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
        },
        showTotal: (total, range) => (_jsxs("span", { style: { color: '#94a3b8', fontSize: '12px' }, children: ["Showing ", range[0], "\u2013", range[1], " of ", _jsx("strong", { children: total }), " records"] }))
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }, children: [_jsxs(Space, { size: "middle", wrap: true, children: [title && _jsx(Text, { strong: true, style: { fontSize: '15px', color: '#f8fafc' }, children: title }), _jsx(Input, { prefix: _jsx(SearchOutlined, { style: { color: '#64748b' } }), placeholder: searchPlaceholder, value: searchTerm, onChange: e => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }, allowClear: true, style: { width: 240 } })] }), _jsxs(Space, { size: "small", wrap: true, children: [extraHeaderActions, _jsx(Popover, { title: _jsx(Text, { style: { color: '#f8fafc', fontSize: '13px' }, children: "Customize Columns" }), trigger: "click", placement: "bottomRight", content: _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '200px' }, children: columns.map(col => (_jsx(Checkbox, { checked: visibleColumnKeys.includes(col.key), onChange: e => {
                                            if (e.target.checked) {
                                                setVisibleColumnKeys([...visibleColumnKeys, col.key]);
                                            }
                                            else {
                                                if (visibleColumnKeys.length > 1) {
                                                    setVisibleColumnKeys(visibleColumnKeys.filter(k => k !== col.key));
                                                }
                                            }
                                        }, children: _jsx("span", { style: { color: '#cbd5e1', fontSize: '12px' }, children: col.title }) }, col.key))) }), children: _jsxs(Button, { icon: _jsx(SettingOutlined, {}), size: "middle", children: ["Columns (", visibleColumnKeys.length, "/", columns.length, ")"] }) }), _jsx(Button, { icon: _jsx(DownloadOutlined, {}), onClick: handleExportCSV, size: "middle", children: "Export CSV" }), onRefresh && (_jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: onRefresh, size: "middle" }))] })] }), error && (_jsx(Alert, { message: "Failed to load table records", description: error, type: "error", showIcon: true, style: { marginBottom: '8px' } })), _jsx(Spin, { spinning: loading, children: _jsx(Table, { columns: activeColumns, dataSource: filteredData, rowKey: (r) => (r.id ? String(r.id) : JSON.stringify(r)), pagination: paginationConfig, locale: {
                        emptyText: (_jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: _jsx("span", { style: { color: '#64748b' }, children: searchTerm ? 'No matching records found for query' : 'No engineering records present' }) }))
                    }, scroll: { x: 'max-content' }, size: "middle" }) })] }));
}
//# sourceMappingURL=EnterpriseTable.js.map