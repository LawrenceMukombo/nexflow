import React, { useState, useMemo } from 'react';
import { 
  Modal, 
  Table, 
  Input, 
  Button, 
  Space, 
  Tag, 
  Typography, 
  Tooltip, 
  Checkbox, 
  Popover, 
  Empty, 
  Upload, 
  message, 
  Popconfirm 
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  FolderOpenOutlined, 
  PlusOutlined, 
  SaveOutlined, 
  SearchOutlined, 
  SettingOutlined, 
  DownloadOutlined, 
  DeleteOutlined, 
  CopyOutlined, 
  ImportOutlined, 
  CheckCircleFilled
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { SavedProject } from '@omniflow/shared-types';

const { Text } = Typography;

export const ProjectsManagerModal: React.FC = () => {
  const {
    isProjectsModalOpen,
    toggleProjectsModal,
    savedProjects,
    currentProjectId,
    loadProject,
    saveCurrentProject,
    createNewBlankProject,
    deleteProject,
    duplicateProject,
    importProjectFromFile,
    exportProjectToFile
  } = useGraphStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Column Visibility Control
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    name: true,
    domain: true,
    devices: true,
    connections: true,
    cost: true,
    updatedAt: true,
    actions: true
  });

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return savedProjects.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [savedProjects, searchQuery]);

  // Export Projects to CSV (Rule 24 compliance)
  const handleExportCsv = () => {
    if (!filteredProjects.length) {
      message.warning('No projects to export.');
      return;
    }

    const headers = ['Project ID', 'Project Name', 'Domain', 'Device Count', 'Connection Count', 'Estimated Cost (USD)', 'Created At', 'Last Updated', 'Description'];
    const rows = filteredProjects.map(p => [
      `"${p.id}"`,
      `"${p.name}"`,
      `"${p.domain}"`,
      p.deviceCount,
      p.connectionCount,
      p.estimatedCost,
      `"${p.createdAt}"`,
      `"${p.updatedAt}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `omniflow_projects_summary_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success(`Exported ${filteredProjects.length} projects to CSV`);
  };

  // Import JSON project file
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        message.error('File content could not be read.');
        return;
      }
      const res = importProjectFromFile(text);
      if (res.success) {
        message.success(res.message);
      } else {
        message.error(res.message);
      }
    };
    reader.readAsText(file);
    return false;
  };

  const allColumns: ColumnsType<SavedProject> = [
    {
      title: 'Project Name & Description',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record) => {
        const isCurrent = record.id === currentProjectId;
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: 13 }}>
                {name}
              </span>
              {isCurrent && (
                <Tag color="cyan" icon={<CheckCircleFilled />} style={{ fontSize: 10 }}>
                  Active Project
                </Tag>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {record.description || 'No description provided'}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Domain',
      dataIndex: 'domain',
      key: 'domain',
      width: 110,
      render: (domain: string) => (
        <Tag color="geekblue" style={{ borderRadius: 10 }}>
          {domain || 'NETWORK'}
        </Tag>
      )
    },
    {
      title: 'Hardware Devices',
      dataIndex: 'deviceCount',
      key: 'devices',
      width: 130,
      sorter: (a, b) => a.deviceCount - b.deviceCount,
      render: (count: number) => (
        <span style={{ color: '#cbd5e1', fontWeight: 500 }}>
          {count} devices
        </span>
      )
    },
    {
      title: 'Active Cables',
      dataIndex: 'connectionCount',
      key: 'connections',
      width: 120,
      sorter: (a, b) => a.connectionCount - b.connectionCount,
      render: (count: number) => (
        <span style={{ color: '#38bdf8' }}>
          {count} runs
        </span>
      )
    },
    {
      title: 'Est. BOQ Cost',
      dataIndex: 'estimatedCost',
      key: 'cost',
      width: 130,
      sorter: (a, b) => a.estimatedCost - b.estimatedCost,
      render: (cost: number) => (
        <span style={{ color: '#10b981', fontWeight: 600 }}>
          ${(cost || 0).toLocaleString()}
        </span>
      )
    },
    {
      title: 'Last Modified',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      render: (dateStr: string) => {
        const d = new Date(dateStr);
        return (
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            <div>{d.toLocaleDateString()}</div>
            <div style={{ color: '#64748b' }}>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, record) => {
        const isCurrent = record.id === currentProjectId;
        return (
          <Space size="small">
            <Button
              type={isCurrent ? 'default' : 'primary'}
              size="small"
              icon={<FolderOpenOutlined />}
              onClick={() => {
                loadProject(record.id);
                message.success(`Loaded project "${record.name}"`);
              }}
              style={!isCurrent ? { backgroundColor: '#0284c7' } : {}}
            >
              {isCurrent ? 'Switch' : 'Open'}
            </Button>

            <Tooltip title="Duplicate project">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => {
                  duplicateProject(record.id);
                  message.success(`Duplicated "${record.name}"`);
                }}
              />
            </Tooltip>

            <Tooltip title="Export project to JSON file">
              <Button
                type="text"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => exportProjectToFile(record.id)}
              />
            </Tooltip>

            {savedProjects.length > 1 && (
              <Popconfirm
                title="Delete Project"
                description={`Are you sure you want to delete "${record.name}"?`}
                onConfirm={() => {
                  deleteProject(record.id);
                  message.info(`Deleted project`);
                }}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            )}
          </Space>
        );
      }
    }
  ];

  // Filter visible columns
  const filteredColumns = allColumns.filter(col => {
    if (!col.key) return true;
    return visibleColumns[col.key as string] ?? true;
  });

  return (
    <Modal
      open={isProjectsModalOpen}
      onCancel={() => toggleProjectsModal(false)}
      width={1050}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FolderOpenOutlined style={{ color: '#38bdf8', fontSize: 20 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#f8fafc' }}>
              Engineering Projects & Blueprints Manager
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>
              Save multiple projects, switch between workspaces, export topologies, and reopen designs for updates.
            </div>
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {savedProjects.length} Projects saved in persistent local storage
          </Text>
          <Button onClick={() => toggleProjectsModal(false)}>Close</Button>
        </div>
      }
      styles={{
        body: { maxHeight: '72vh', overflowY: 'auto', padding: '16px 20px' }
      }}
    >
      {/* Top Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: 8,
          marginBottom: 16
        }}
      >
        <Space wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              createNewBlankProject();
              message.success('Created new blank project canvas');
            }}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
          >
            New Project
          </Button>

          <Button
            icon={<SaveOutlined style={{ color: '#38bdf8' }} />}
            onClick={() => {
              saveCurrentProject();
              message.success('Current project changes saved!');
            }}
          >
            Save Current Design
          </Button>

          <Upload
            beforeUpload={handleFileUpload}
            showUploadList={false}
            accept=".json"
          >
            <Button icon={<ImportOutlined />}>
              Import JSON Project
            </Button>
          </Upload>
        </Space>

        <Space wrap>
          <Input
            placeholder="Search project name..."
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />

          <Popover
            title="Toggle Visible Columns"
            trigger="click"
            content={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allColumns.map(col => {
                  if (!col.key) return null;
                  const key = col.key as string;
                  return (
                    <Checkbox
                      key={key}
                      checked={visibleColumns[key] ?? true}
                      onChange={(e) => setVisibleColumns({ ...visibleColumns, [key]: e.target.checked })}
                    >
                      {String(col.title)}
                    </Checkbox>
                  );
                })}
              </div>
            }
          >
            <Button icon={<SettingOutlined />}>Columns</Button>
          </Popover>

          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
        </Space>
      </div>

      {/* Enterprise-grade Table */}
      <Table
        dataSource={filteredProjects}
        columns={filteredColumns}
        rowKey="id"
        size="small"
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: filteredProjects.length,
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50', '100'],
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          },
          showTotal: (total, range) => (
            <span style={{ color: '#94a3b8', fontSize: 12 }}>
              Showing {range[0]}-{range[1]} of {total} saved projects
            </span>
          )
        }}
        locale={{
          emptyText: (
            <Empty
              description={
                <span style={{ color: '#94a3b8' }}>
                  No projects match your search criteria.
                </span>
              }
            />
          )
        }}
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: 6
        }}
      />
    </Modal>
  );
};
