import React, { useState, useMemo } from 'react';
import { 
  Modal, 
  Tabs, 
  Table, 
  Input, 
  Select, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Card, 
  Row, 
  Col, 
  Upload, 
  message, 
  Tooltip, 
  Checkbox, 
  Popover, 
  Empty, 
  Alert 
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  BookOutlined, 
  ImportOutlined, 
  ExportOutlined, 
  PlusOutlined, 
  SearchOutlined, 
  SettingOutlined, 
  DownloadOutlined, 
  DeleteOutlined, 
  ApartmentOutlined, 
  BranchesOutlined, 
  DollarOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { ComponentTemplate } from '@omniflow/shared-types';

const { Text, Title, Paragraph } = Typography;

export const LibraryManagerModal: React.FC = () => {
  const {
    isLibraryModalOpen,
    toggleLibraryModal,
    libraries,
    activeLibraryId,
    setActiveLibraryId,
    importLibrary,
    exportLibrary,
    deleteLibrary,
    addComponent,
    insertAssembly,
    toggleCreateComponentModal,
    deleteCustomComponent
  } = useGraphStore();

  const [activeTab, setActiveTab] = useState<'components' | 'assemblies' | 'import_export'>('components');
  
  // Search & Filter state for Enterprise Table
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Column Visibility Control
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    name: true,
    category: true,
    partNumber: true,
    ports: true,
    unitCost: true,
    labourCost: true,
    description: true,
    actions: true
  });

  const activeLibrary = useMemo(() => {
    return libraries.find(l => l.id === activeLibraryId) || libraries[0];
  }, [libraries, activeLibraryId]);

  // Filtered components
  const filteredComponents = useMemo(() => {
    if (!activeLibrary) return [];
    return activeLibrary.components.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.defaultCost.partNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.defaultCost.manufacturer || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'ALL' || c.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activeLibrary, searchQuery, selectedCategory]);

  // CSV Export for Table Data (Enterprise Grade Table requirement)
  const handleExportCsv = () => {
    if (!filteredComponents.length) {
      message.warning('No components available to export.');
      return;
    }

    const headers = ['Type', 'Name', 'Category', 'Manufacturer', 'Part Number', 'Ports Count', 'Unit Cost', 'Labour Cost', 'Currency', 'Description'];
    const rows = filteredComponents.map(c => [
      `"${c.type}"`,
      `"${c.name}"`,
      `"${c.category}"`,
      `"${c.defaultCost.manufacturer || ''}"`,
      `"${c.defaultCost.partNumber || ''}"`,
      c.portsTemplate.length,
      c.defaultCost.unitCost,
      c.defaultCost.labourCost,
      `"${c.defaultCost.currency}"`,
      `"${(c.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeLibrary?.name || 'components'}_catalog.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success(`Exported ${filteredComponents.length} components to CSV`);
  };

  // Download Active Library as JSON
  const handleExportActiveLibraryJson = () => {
    if (!activeLibrary) return;
    const jsonStr = exportLibrary(activeLibrary.id);
    if (!jsonStr) return;

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeLibrary.id}_${activeLibrary.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(`Exported library "${activeLibrary.name}"`);
  };

  // Import JSON File
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        message.error('File content could not be read.');
        return;
      }
      const result = importLibrary(text);
      if (result.success) {
        message.success(result.message);
      } else {
        message.error(result.message);
      }
    };
    reader.readAsText(file);
    return false; // Prevent automatic upload post
  };

  const getCategoryTag = (category: string) => {
    switch (category) {
      case 'CORE': return <Tag color="cyan">Core Routing</Tag>;
      case 'SWITCHING': return <Tag color="blue">Switching</Tag>;
      case 'SECURITY': return <Tag color="red">Security & Firewalls</Tag>;
      case 'WIRELESS': return <Tag color="gold">Wireless & WiFi</Tag>;
      case 'INFRASTRUCTURE': return <Tag color="purple">Infrastructure / Racks</Tag>;
      case 'ENDPOINTS': return <Tag color="green">Endpoints & IoT</Tag>;
      default: return <Tag color="default">{category}</Tag>;
    }
  };

  // Table Columns Definition
  const allColumns: ColumnsType<ComponentTemplate> = [
    {
      title: 'Component / Model',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#f8fafc' }}>{text}</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Type: {record.type} • Prefix: {record.defaultTagPrefix}</div>
        </div>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      filters: [
        { text: 'Core Routing', value: 'CORE' },
        { text: 'Switching', value: 'SWITCHING' },
        { text: 'Security', value: 'SECURITY' },
        { text: 'Wireless', value: 'WIRELESS' },
        { text: 'Infrastructure', value: 'INFRASTRUCTURE' },
        { text: 'Endpoints', value: 'ENDPOINTS' }
      ],
      onFilter: (value, record) => record.category === value,
      render: (category: string) => getCategoryTag(category)
    },
    {
      title: 'Manufacturer / Part #',
      key: 'partNumber',
      render: (_, record) => (
        <div>
          <div style={{ color: '#38bdf8', fontWeight: 500 }}>{record.defaultCost.manufacturer || 'Generic'}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{record.defaultCost.partNumber || '—'}</div>
        </div>
      )
    },
    {
      title: 'Ports',
      key: 'ports',
      sorter: (a, b) => a.portsTemplate.length - b.portsTemplate.length,
      render: (_, record) => (
        <Tag color="geekblue" style={{ borderRadius: 12 }}>
          {record.portsTemplate.length} Ports
        </Tag>
      )
    },
    {
      title: 'Unit Cost',
      dataIndex: ['defaultCost', 'unitCost'],
      key: 'unitCost',
      sorter: (a, b) => a.defaultCost.unitCost - b.defaultCost.unitCost,
      render: (cost: number, record) => (
        <span style={{ fontWeight: 600, color: '#10b981' }}>
          ${cost.toLocaleString()} {record.defaultCost.currency}
        </span>
      )
    },
    {
      title: 'Labour',
      dataIndex: ['defaultCost', 'labourCost'],
      key: 'labourCost',
      sorter: (a, b) => a.defaultCost.labourCost - b.defaultCost.labourCost,
      render: (labour: number) => (
        <span style={{ color: '#94a3b8' }}>${labour}</span>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => (
        <span style={{ fontSize: 12, color: '#cbd5e1' }}>{desc}</span>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Add component to Canvas">
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                addComponent(record.type, { x: 300, y: 250 });
                message.success(`Added ${record.name} to topology`);
              }}
              style={{ backgroundColor: '#0284c7' }}
            >
              Add
            </Button>
          </Tooltip>
          {!activeLibrary?.isBuiltIn && (
            <Tooltip title="Delete custom component">
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => {
                  deleteCustomComponent(activeLibrary.id, record.type);
                  message.info(`Removed ${record.name}`);
                }}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  // Filter columns based on visibility settings
  const filteredColumns = allColumns.filter(col => {
    if (!col.key) return true;
    return visibleColumns[col.key as string] ?? true;
  });

  return (
    <Modal
      open={isLibraryModalOpen}
      onCancel={() => toggleLibraryModal(false)}
      width={1100}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BookOutlined style={{ color: '#38bdf8', fontSize: 20 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#f8fafc' }}>
              Component Libraries & Hardware Catalog
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>
              Browse curated vendor hardware, deploy multi-device subsystem assemblies, and manage custom libraries.
            </div>
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Space>
            <Tag color={activeLibrary?.isBuiltIn ? 'blue' : 'green'}>
              {activeLibrary?.isBuiltIn ? 'Curated Official' : 'User Library'} • v{activeLibrary?.version}
            </Tag>
            <Text type="secondary" style={{ fontSize: 11 }}>
              By {activeLibrary?.author}
            </Text>
          </Space>
          <Button onClick={() => toggleLibraryModal(false)}>Close</Button>
        </div>
      }
      styles={{
        body: { maxHeight: '72vh', overflowY: 'auto', padding: '16px 20px' }
      }}
    >
      {/* Top Controls: Library Selector & Action Buttons */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Text strong style={{ color: '#f8fafc' }}>Active Library:</Text>
          <Select
            value={activeLibraryId}
            onChange={(val) => setActiveLibraryId(val)}
            style={{ width: 280 }}
            options={libraries.map(lib => ({
              label: (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{lib.name}</span>
                  <Tag color={lib.isBuiltIn ? 'cyan' : 'green'} style={{ fontSize: 10, marginLeft: 6 }}>
                    {lib.components.length} items
                  </Tag>
                </div>
              ),
              value: lib.id
            }))}
          />
        </div>

        <Space wrap>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => toggleCreateComponentModal(true)}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
          >
            Create Custom Component
          </Button>

          <Upload
            beforeUpload={handleFileUpload}
            showUploadList={false}
            accept=".json"
          >
            <Button icon={<ImportOutlined />}>
              Import JSON
            </Button>
          </Upload>

          <Button
            icon={<ExportOutlined />}
            onClick={handleExportActiveLibraryJson}
          >
            Export JSON
          </Button>

          {!activeLibrary?.isBuiltIn && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                deleteLibrary(activeLibrary.id);
                message.success('Custom library deleted');
              }}
            >
              Delete Library
            </Button>
          )}
        </Space>
      </div>

      {/* Library Description Alert */}
      <Alert
        message={activeLibrary?.description}
        type="info"
        showIcon
        style={{ marginBottom: 16, backgroundColor: '#1e293b', border: '1px solid #334155' }}
      />

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as any)}
        items={[
          {
            key: 'components',
            label: (
              <span>
                <BranchesOutlined /> Component Catalog ({activeLibrary?.components.length || 0})
              </span>
            ),
            children: (
              <div>
                {/* Enterprise Table Controls: Search, Category, Visibility, CSV Export */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 14
                  }}
                >
                  <Space wrap>
                    <Input
                      placeholder="Search component name, SKU, manufacturer..."
                      prefix={<SearchOutlined style={{ color: '#64748b' }} />}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: 280 }}
                      allowClear
                    />

                    <Select
                      value={selectedCategory}
                      onChange={setSelectedCategory}
                      style={{ width: 170 }}
                      options={[
                        { label: 'All Categories', value: 'ALL' },
                        { label: 'Core Routing', value: 'CORE' },
                        { label: 'Switching', value: 'SWITCHING' },
                        { label: 'Security & UTM', value: 'SECURITY' },
                        { label: 'Wireless & WiFi', value: 'WIRELESS' },
                        { label: 'Infrastructure', value: 'INFRASTRUCTURE' },
                        { label: 'Endpoints & IoT', value: 'ENDPOINTS' }
                      ]}
                    />
                  </Space>

                  <Space wrap>
                    {/* Column Visibility Selector Popover */}
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

                {/* Enterprise Grade Table */}
                <Table
                  dataSource={filteredComponents}
                  columns={filteredColumns}
                  rowKey="type"
                  size="small"
                  pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: filteredComponents.length,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '25', '50', '100'],
                    onChange: (page, size) => {
                      setCurrentPage(page);
                      setPageSize(size);
                    },
                    showTotal: (total, range) => (
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>
                        Showing {range[0]}-{range[1]} of {total} items
                      </span>
                    )
                  }}
                  locale={{
                    emptyText: (
                      <Empty
                        description={
                          <span style={{ color: '#94a3b8' }}>
                            No components match the search criteria in this library.
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
              </div>
            )
          },
          {
            key: 'assemblies',
            label: (
              <span>
                <ApartmentOutlined /> Pre-Engineered Assemblies ({activeLibrary?.assemblies.length || 0})
              </span>
            ),
            children: (
              <div>
                <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                  Assemblies are complete, pre-configured multi-device subsystems with validated interconnections, cabling specifications, and IP addressing ready to deploy to the canvas with one click.
                </Paragraph>

                {(!activeLibrary?.assemblies || activeLibrary.assemblies.length === 0) ? (
                  <Empty description="No assemblies in this library. Select nodes on the canvas and click 'Save Selection as Assembly' to add one." />
                ) : (
                  <Row gutter={[16, 16]}>
                    {activeLibrary.assemblies.map(asm => (
                      <Col xs={24} md={12} key={asm.id}>
                        <Card
                          hoverable
                          style={{
                            backgroundColor: '#1e293b',
                            borderColor: '#334155',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <div>
                                <Title level={5} style={{ color: '#f8fafc', margin: 0 }}>
                                  {asm.name}
                                </Title>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  Category: {asm.category} • Author: {asm.author || 'OmniFlow'}
                                </Text>
                              </div>
                              {asm.estimatedCost && (
                                <Tag color="green" icon={<DollarOutlined />}>
                                  ${asm.estimatedCost.toLocaleString()}
                                </Tag>
                              )}
                            </div>

                            <Paragraph style={{ color: '#cbd5e1', fontSize: 12, minHeight: 40 }}>
                              {asm.description}
                            </Paragraph>

                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                              <Tag color="cyan">{asm.nodes.length} Devices</Tag>
                              <Tag color="blue">{asm.connections.length} Pre-wired Links</Tag>
                              {asm.tags?.map(t => (
                                <Tag key={t} color="default" style={{ fontSize: 10 }}>{t}</Tag>
                              ))}
                            </div>

                            {/* Node list preview */}
                            <div 
                              style={{ 
                                padding: '8px 10px', 
                                backgroundColor: '#0f172a', 
                                borderRadius: 6, 
                                fontSize: 11, 
                                color: '#94a3b8',
                                marginBottom: 14 
                              }}
                            >
                              <strong>Included Hardware: </strong>
                              {asm.nodes.map(n => n.name).join(', ')}
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button
                              type="text"
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => {
                                const blob = new Blob([JSON.stringify(asm, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${asm.id}.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                                message.success(`Exported ${asm.name}`);
                              }}
                            >
                              Export JSON
                            </Button>

                            <Button
                              type="primary"
                              icon={<ApartmentOutlined />}
                              style={{ backgroundColor: '#0284c7' }}
                              onClick={() => {
                                insertAssembly(asm);
                                toggleLibraryModal(false);
                                message.success(`Deployed "${asm.name}" to topology canvas!`);
                              }}
                            >
                              Deploy Assembly to Canvas
                            </Button>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </div>
            )
          },
          {
            key: 'import_export',
            label: (
              <span>
                <ImportOutlined /> Import & Sharing
              </span>
            ),
            children: (
              <div style={{ padding: '8px 0' }}>
                <Row gutter={[20, 20]}>
                  <Col span={12}>
                    <Card
                      title={<span style={{ color: '#f8fafc' }}><ImportOutlined /> Import Component Library</span>}
                      style={{ backgroundColor: '#1e293b', borderColor: '#334155', height: '100%' }}
                    >
                      <Paragraph style={{ color: '#cbd5e1' }}>
                        Import any OmniFlow JSON library file created by team members or exported from other projects.
                      </Paragraph>

                      <Upload.Dragger
                        beforeUpload={handleFileUpload}
                        showUploadList={false}
                        accept=".json"
                        style={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                      >
                        <p className="ant-upload-drag-icon">
                          <ImportOutlined style={{ fontSize: 32, color: '#38bdf8' }} />
                        </p>
                        <p className="ant-upload-text" style={{ color: '#f8fafc' }}>
                          Click or drag JSON library file to this area to import
                        </p>
                        <p className="ant-upload-hint" style={{ color: '#94a3b8' }}>
                          Supports .json library files with component and assembly definitions.
                        </p>
                      </Upload.Dragger>
                    </Card>
                  </Col>

                  <Col span={12}>
                    <Card
                      title={<span style={{ color: '#f8fafc' }}><ExportOutlined /> Export Current Library</span>}
                      style={{ backgroundColor: '#1e293b', borderColor: '#334155', height: '100%' }}
                    >
                      <Paragraph style={{ color: '#cbd5e1' }}>
                        Download the active library (<strong>{activeLibrary?.name}</strong>) as a standalone JSON file to share across your engineering organization.
                      </Paragraph>

                      <div 
                        style={{ 
                          padding: 12, 
                          backgroundColor: '#0f172a', 
                          borderRadius: 6, 
                          fontSize: 12, 
                          color: '#94a3b8',
                          marginBottom: 16 
                        }}
                      >
                        <div><strong>Library ID:</strong> {activeLibrary?.id}</div>
                        <div><strong>Version:</strong> {activeLibrary?.version}</div>
                        <div><strong>Components:</strong> {activeLibrary?.components.length}</div>
                        <div><strong>Assemblies:</strong> {activeLibrary?.assemblies.length}</div>
                      </div>

                      <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        block
                        onClick={handleExportActiveLibraryJson}
                        style={{ backgroundColor: '#0284c7' }}
                      >
                        Download {activeLibrary?.name} JSON
                      </Button>
                    </Card>
                  </Col>
                </Row>
              </div>
            )
          }
        ]}
      />
    </Modal>
  );
};
