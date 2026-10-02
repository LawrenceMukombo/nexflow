import React, { useState, useMemo } from 'react';
import { 
  Table, 
  Input, 
  Button, 
  Space, 
  Popover, 
  Checkbox, 
  Empty, 
  Spin, 
  Alert, 
  Typography 
} from 'antd';
import { 
  SearchOutlined, 
  DownloadOutlined, 
  SettingOutlined, 
  ReloadOutlined 
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';

const { Text } = Typography;

export interface EnterpriseColumn<T> {
  key: string;
  title: string;
  dataIndex?: keyof T | string;
  sorter?: (a: T, b: T) => number;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: number | string;
  defaultVisible?: boolean;
}

interface EnterpriseTableProps<T extends Record<string, any>> {
  columns: EnterpriseColumn<T>[];
  dataSource: T[];
  loading?: boolean;
  error?: string | null;
  searchPlaceholder?: string;
  searchFields?: (keyof T | string)[];
  title?: string;
  onRefresh?: () => void;
  exportFileName?: string;
  extraHeaderActions?: React.ReactNode;
}

export function EnterpriseTable<T extends { id?: string | number }>({
  columns,
  dataSource,
  loading = false,
  error = null,
  searchPlaceholder = 'Search records...',
  searchFields = [],
  title,
  onRefresh,
  exportFileName = 'export-data',
  extraHeaderActions
}: EnterpriseTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Column visibility state
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(() =>
    columns.filter(c => c.defaultVisible !== false).map(c => c.key)
  );

  // Filtered dataset
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return dataSource;
    const lower = searchTerm.toLowerCase();

    return dataSource.filter(item => {
      if (searchFields.length > 0) {
        return searchFields.some(f => {
          const val = (item as any)[f];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(lower);
        });
      }
      return Object.values(item).some(val => 
        val !== undefined && val !== null && String(val).toLowerCase().includes(lower)
      );
    });
  }, [dataSource, searchTerm, searchFields]);

  // Filtered visible columns
  const activeColumns = useMemo<ColumnsType<T>>(() => {
    return columns
      .filter(col => visibleColumnKeys.includes(col.key))
      .map(col => ({
        key: col.key,
        title: col.title,
        dataIndex: col.dataIndex as any,
        sorter: col.sorter,
        render: col.render,
        width: col.width
      }));
  }, [columns, visibleColumnKeys]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;
    const exportCols = columns.filter(c => visibleColumnKeys.includes(c.key));
    const header = exportCols.map(c => `"${c.title}"`).join(',');
    const rows = filteredData.map(record => {
      return exportCols.map(c => {
        const val = c.dataIndex ? (record as any)[c.dataIndex] : '';
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

  const paginationConfig: TablePaginationConfig = {
    current: currentPage,
    pageSize,
    total: filteredData.length,
    showSizeChanger: true,
    pageSizeOptions: ['10', '25', '50', '100'],
    onChange: (page, size) => {
      setCurrentPage(page);
      setPageSize(size);
    },
    showTotal: (total, range) => (
      <span style={{ color: '#94a3b8', fontSize: '12px' }}>
        Showing {range[0]}–{range[1]} of <strong>{total}</strong> records
      </span>
    )
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {/* Table Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <Space size="middle" wrap>
          {title && <Text strong style={{ fontSize: '15px', color: '#f8fafc' }}>{title}</Text>}
          <Input
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            allowClear
            style={{ width: 240 }}
          />
        </Space>

        <Space size="small" wrap>
          {extraHeaderActions}

          {/* Column Visibility Selector (Rule 24 requirement) */}
          <Popover
            title={<Text style={{ color: '#f8fafc', fontSize: '13px' }}>Customize Columns</Text>}
            trigger="click"
            placement="bottomRight"
            content={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '200px' }}>
                {columns.map(col => (
                  <Checkbox
                    key={col.key}
                    checked={visibleColumnKeys.includes(col.key)}
                    onChange={e => {
                      if (e.target.checked) {
                        setVisibleColumnKeys([...visibleColumnKeys, col.key]);
                      } else {
                        if (visibleColumnKeys.length > 1) {
                          setVisibleColumnKeys(visibleColumnKeys.filter(k => k !== col.key));
                        }
                      }
                    }}
                  >
                    <span style={{ color: '#cbd5e1', fontSize: '12px' }}>{col.title}</span>
                  </Checkbox>
                ))}
              </div>
            }
          >
            <Button icon={<SettingOutlined />} size="middle">
              Columns ({visibleColumnKeys.length}/{columns.length})
            </Button>
          </Popover>

          {/* Export to CSV */}
          <Button icon={<DownloadOutlined />} onClick={handleExportCSV} size="middle">
            Export CSV
          </Button>

          {onRefresh && (
            <Button icon={<ReloadOutlined />} onClick={onRefresh} size="middle" />
          )}
        </Space>
      </div>

      {/* Error State */}
      {error && (
        <Alert
          message="Failed to load table records"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: '8px' }}
        />
      )}

      {/* Loading & Empty States */}
      <Spin spinning={loading}>
        <Table<T>
          columns={activeColumns}
          dataSource={filteredData}
          rowKey={(r) => (r.id ? String(r.id) : JSON.stringify(r))}
          pagination={paginationConfig}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ color: '#64748b' }}>
                    {searchTerm ? 'No matching records found for query' : 'No engineering records present'}
                  </span>
                }
              />
            )
          }}
          scroll={{ x: 'max-content' }}
          size="middle"
        />
      </Spin>
    </div>
  );
}
