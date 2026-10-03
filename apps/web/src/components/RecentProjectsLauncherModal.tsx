import React, { useState, useMemo } from 'react';
import { 
  Modal, 
  Table, 
  Input, 
  Button, 
  Space, 
  Tag, 
  Upload, 
  message,
  Radio
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  FolderOpenOutlined, 
  PlusOutlined, 
  SearchOutlined, 
  UploadOutlined, 
  ThunderboltFilled, 
  CheckCircleFilled,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { SavedProject } from '@omniflow/shared-types';
import { NexFlowBrandIcon } from './ComponentIcon';

export const RecentProjectsLauncherModal: React.FC = () => {
  const {
    isRecentProjectsModalOpen,
    closeRecentProjectsModal,
    savedProjects,
    currentProjectId,
    loadProject,
    createNewBlankProject,
    importProjectFromFile,
    toggleWizardModal
  } = useGraphStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // Filtered recent projects
  const filteredProjects = useMemo(() => {
    return savedProjects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDomain = domainFilter === 'ALL' || (p.domain || 'NETWORK') === domainFilter;
      return matchesSearch && matchesDomain;
    });
  }, [savedProjects, searchQuery, domainFilter]);

  // Handle direct file import (.json)
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
        closeRecentProjectsModal();
      } else {
        message.error(res.message);
      }
    };
    reader.readAsText(file);
    return false; // Prevent automatic HTTP post
  };

  // Rule 24 Compliant Columns
  const columns: ColumnsType<SavedProject> = [
    {
      title: 'Project Name & Blueprint',
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
                  Active
                </Tag>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {record.description || 'Enterprise visual topology'}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Domain',
      dataIndex: 'domain',
      key: 'domain',
      width: 120,
      render: (domain: string) => {
        const d = domain || 'NETWORK';
        const color = d === 'NETWORK' ? 'geekblue' : d === 'ELECTRICAL' ? 'gold' : d === 'PLUMBING' ? 'cyan' : d === 'CCTV' ? 'purple' : 'green';
        return (
          <Tag color={color} style={{ borderRadius: 10, fontWeight: 600, fontSize: 10 }}>
            {d}
          </Tag>
        );
      }
    },
    {
      title: 'Devices',
      dataIndex: 'deviceCount',
      key: 'deviceCount',
      width: 90,
      sorter: (a, b) => a.deviceCount - b.deviceCount,
      render: (count: number) => (
        <span style={{ color: '#cbd5e1', fontWeight: 500 }}>
          {count} nodes
        </span>
      )
    },
    {
      title: 'Cables',
      dataIndex: 'connectionCount',
      key: 'connectionCount',
      width: 90,
      sorter: (a, b) => a.connectionCount - b.connectionCount,
      render: (count: number) => (
        <span style={{ color: '#38bdf8' }}>
          {count} runs
        </span>
      )
    },
    {
      title: 'Last Modified',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 140,
      sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      render: (dateStr: string) => {
        const d = new Date(dateStr);
        return (
          <div style={{ fontSize: 11, color: '#94a3b8' }}>
            <span>{d.toLocaleDateString()}</span>
            <span style={{ marginLeft: 4, color: '#64748b' }}>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        );
      }
    },
    {
      title: 'Action',
      key: 'action',
      width: 110,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<FolderOpenOutlined />}
          onClick={() => {
            loadProject(record.id);
            closeRecentProjectsModal();
            message.success(`Loaded project "${record.name}"`);
          }}
          style={{ backgroundColor: '#0284c7', borderColor: 'transparent', fontWeight: 600 }}
        >
          Open
        </Button>
      )
    }
  ];

  return (
    <Modal
      open={isRecentProjectsModalOpen}
      onCancel={closeRecentProjectsModal}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            You can reopen recent projects anytime from the Top Menu or Canvas.
          </div>
          <Space>
            <Button 
              onClick={() => {
                createNewBlankProject();
                closeRecentProjectsModal();
                message.info('Clean blank canvas ready');
              }}
              style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
            >
              Start Blank Canvas
            </Button>
            <Button type="primary" onClick={closeRecentProjectsModal} style={{ backgroundColor: '#0284c7' }}>
              Dismiss
            </Button>
          </Space>
        </div>
      }
      width={900}
      styles={{
        content: {
          backgroundColor: '#0b111e',
          border: '1px solid #1e293b',
          borderRadius: 12,
          padding: '20px 24px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85)'
        },
        header: {
          backgroundColor: '#0b111e',
          borderBottom: '1px solid #1e293b',
          paddingBottom: 16
        }
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <NexFlowBrandIcon size={32} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
              NexFlow Studio — Project Launcher
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Open a recently saved blueprint, import a design file, or begin drafting on a clean blank canvas.
            </div>
          </div>
        </div>
      }
    >
      {/* 1. Quick Launch Action Cards (Top Bar) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 14, marginBottom: 20 }}>
        {/* Card 1: New Blank Canvas */}
        <div
          onClick={() => {
            createNewBlankProject();
            closeRecentProjectsModal();
            message.info('Started fresh with a blank canvas');
          }}
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 8,
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          className="hover:border-sky-500 hover:shadow-lg"
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#38bdf8', fontWeight: 700, fontSize: 13 }}>
              <PlusOutlined style={{ fontSize: 16 }} />
              <span>New Blank Canvas</span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, lineHeight: 1.4 }}>
              Start with an empty workspace. Place devices and route cables from scratch.
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <Button size="small" type="primary" ghost style={{ width: '100%', fontSize: 11 }}>
              Create Blank
            </Button>
          </div>
        </div>

        {/* Card 2: Open File (.json) */}
        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 8,
            padding: '14px 16px',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          className="hover:border-purple-500 hover:shadow-lg"
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c084fc', fontWeight: 700, fontSize: 13 }}>
              <UploadOutlined style={{ fontSize: 16 }} />
              <span>Open File (.json)</span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, lineHeight: 1.4 }}>
              Import an existing OmniFlow or Packet Tracer design JSON from your computer.
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <Upload 
              accept=".json" 
              showUploadList={false} 
              beforeUpload={handleFileUpload}
            >
              <Button size="small" icon={<FolderOpenOutlined />} style={{ width: '100%', fontSize: 11, backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}>
                Browse File...
              </Button>
            </Upload>
          </div>
        </div>

        {/* Card 3: Network Wizard */}
        <div
          onClick={() => {
            closeRecentProjectsModal();
            toggleWizardModal(true);
          }}
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 8,
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          className="hover:border-amber-500 hover:shadow-lg"
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fbbf24', fontWeight: 700, fontSize: 13 }}>
              <ThunderboltFilled style={{ fontSize: 16 }} />
              <span>Architecture Wizard</span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, lineHeight: 1.4 }}>
              Auto-generate structured enterprise topologies (SME, CCTV, Chilled Water, etc.).
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <Button size="small" style={{ width: '100%', fontSize: 11, backgroundColor: '#1e293b', borderColor: '#334155', color: '#fbbf24' }}>
              Open Wizard
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Recent Projects Header & Filter Controls */}
      <div style={{ borderTop: '1px solid #1e293b', paddingTop: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClockCircleOutlined style={{ color: '#38bdf8' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
              Recently Opened Projects ({savedProjects.length})
            </span>
          </div>

          {/* Domain Filter Chips */}
          <Radio.Group 
            size="small" 
            value={domainFilter} 
            onChange={(e) => {
              setDomainFilter(e.target.value);
              setCurrentPage(1);
            }}
            buttonStyle="solid"
          >
            <Radio.Button value="ALL">All Domains</Radio.Button>
            <Radio.Button value="NETWORK">Network</Radio.Button>
            <Radio.Button value="ELECTRICAL">Electrical</Radio.Button>
            <Radio.Button value="PLUMBING">Plumbing</Radio.Button>
            <Radio.Button value="CCTV">CCTV</Radio.Button>
          </Radio.Group>
        </div>

        {/* Search Input */}
        <Input
          placeholder="Search recent projects by name, description, or keyword..."
          prefix={<SearchOutlined style={{ color: '#64748b' }} />}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            backgroundColor: '#0f172a',
            borderColor: '#1e293b',
            color: '#f8fafc',
            borderRadius: 6
          }}
          allowClear
        />
      </div>

      {/* 3. Enterprise Table of Recent Projects (Rule 24 compliant) */}
      <Table
        dataSource={filteredProjects}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: filteredProjects.length,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20'],
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          },
          showTotal: (total, range) => (
            <span style={{ color: '#64748b', fontSize: 11 }}>
              Showing {range[0]}-{range[1]} of {total} saved projects
            </span>
          )
        }}
        style={{
          border: '1px solid #1e293b',
          borderRadius: 8,
          overflow: 'hidden'
        }}
      />
    </Modal>
  );
};
