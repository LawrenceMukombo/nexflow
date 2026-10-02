import React, { useMemo } from 'react';
import { Modal, Button, Tag, Progress, message, Alert, Tooltip } from 'antd';
import { 
  ApartmentOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DownloadOutlined,
  EditOutlined,
  CloseCircleOutlined,
  BranchesOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { EnterpriseTable } from './EnterpriseTable';

export interface NetworkHostRow {
  id: string;
  nodeId: string;
  tag: string;
  name: string;
  type: string;
  ip: string;
  gateway?: string;
  vlanId?: number;
  hasConflict: boolean;
  canConnect: boolean;
  subnetCidr: string;
}

export const NetworkIpamModal: React.FC = () => {
  const {
    isIpamModalOpen,
    closeIpamModal,
    getSubnets,
    autoConfigureAllIps,
    autoAssignDeviceIp,
    openQuickEditModal
  } = useGraphStore();

  const subnets = useMemo(() => {
    return isIpamModalOpen ? getSubnets() : [];
  }, [isIpamModalOpen, getSubnets]);

  const allDevices: NetworkHostRow[] = useMemo(() => {
    return subnets.flatMap(s => s.devices.map((d: any): NetworkHostRow => ({ ...d, id: d.nodeId, subnetCidr: s.cidr })));
  }, [subnets]);

  const totalConflicts = useMemo(() => {
    return subnets.reduce((acc, s) => acc + s.conflicts.length, 0);
  }, [subnets]);

  const handleAutoConfigureAll = () => {
    const res = autoConfigureAllIps();
    if (res.updatedCount > 0) {
      message.success(`Successfully configured ${res.updatedCount} network device(s) via automated DHCP`);
    } else {
      message.info('All network devices are already properly addressed with non-conflicting IPs');
    }
  };

  const handleExportCsv = () => {
    if (allDevices.length === 0) {
      message.warning('No network devices available to export');
      return;
    }
    const headers = ['Device Tag', 'Device Name', 'Device Type', 'Subnet', 'IP Address', 'Gateway', 'VLAN', 'Status'];
    const rows = allDevices.map(d => [
      d.tag,
      `"${d.name.replace(/"/g, '""')}"`,
      d.type,
      d.subnetCidr,
      d.ip,
      d.gateway || 'N/A',
      d.vlanId || 1,
      d.hasConflict ? 'IP CONFLICT' : !d.canConnect ? 'SUBNET MISMATCH' : 'HEALTHY'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OmniFlow_IPAM_Subnet_Plan_${new Date().toISOString().substring(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('Exported IPAM allocation schedule to CSV');
  };

  const columns = [
    {
      key: 'tag',
      title: 'Device Tag',
      dataIndex: 'tag',
      sortable: true,
      render: (tag: string) => (
        <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
          {tag}
        </span>
      )
    },
    {
      key: 'name',
      title: 'Component Name',
      dataIndex: 'name',
      sortable: true
    },
    {
      key: 'subnetCidr',
      title: 'Subnet CIDR',
      dataIndex: 'subnetCidr',
      sortable: true,
      render: (cidr: string) => (
        <Tag color="#0284c7" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
          {cidr}
        </Tag>
      )
    },
    {
      key: 'ip',
      title: 'Assigned IPv4',
      dataIndex: 'ip',
      sortable: true,
      render: (ip: string, record: any) => (
        <span style={{ 
          fontFamily: 'monospace', 
          fontWeight: 700, 
          color: record.hasConflict ? '#ef4444' : '#f8fafc' 
        }}>
          {ip}
        </span>
      )
    },
    {
      key: 'gateway',
      title: 'Default Gateway',
      dataIndex: 'gateway',
      sortable: true,
      render: (gw: string) => (
        <span style={{ fontFamily: 'monospace', color: gw ? '#94a3b8' : '#64748b' }}>
          {gw || 'None'}
        </span>
      )
    },
    {
      key: 'vlanId',
      title: 'VLAN',
      dataIndex: 'vlanId',
      sortable: true,
      render: (vlan: number) => (
        <Tag color="cyan">VLAN {vlan || 1}</Tag>
      )
    },
    {
      key: 'status',
      title: 'Layer 3 State',
      dataIndex: 'hasConflict',
      render: (_: any, record: any) => {
        if (record.hasConflict) {
          return (
            <Tag color="error" icon={<CloseCircleOutlined />} style={{ fontWeight: 700 }}>
              IP CONFLICT
            </Tag>
          );
        }
        if (!record.canConnect) {
          return (
            <Tag color="warning" icon={<WarningOutlined />} style={{ fontWeight: 700 }}>
              MISCONFIGURED
            </Tag>
          );
        }
        return (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            ONLINE
          </Tag>
        );
      }
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Tooltip title="Automatically assign clean, non-conflicting IP and Gateway via DHCP">
            <Button
              size="small"
              type="primary"
              icon={<ThunderboltOutlined />}
              style={{ backgroundColor: '#0284c7', borderColor: '#38bdf8', fontSize: 11 }}
              onClick={() => {
                const ok = autoAssignDeviceIp(record.nodeId);
                if (ok) {
                  message.success(`Reconfigured ${record.tag} with verified subnet IP`);
                } else {
                  message.error(`Could not auto-assign IP for ${record.tag}`);
                }
              }}
            >
              DHCP
            </Button>
          </Tooltip>
          <Button
            size="small"
            icon={<EditOutlined />}
            style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#cbd5e1', fontSize: 11 }}
            onClick={() => {
              closeIpamModal();
              openQuickEditModal(record.nodeId);
            }}
          >
            Edit
          </Button>
        </div>
      )
    }
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '96%', color: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(2, 132, 199, 0.2)', border: '1px solid #0284c7' }}>
              <ApartmentOutlined style={{ color: '#38bdf8', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>IP Address Management (IPAM) & Subnet Planner</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Visual subnet capacity, dynamic DHCP allocation, and duplicate IP collision prevention
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              style={{ backgroundColor: '#0284c7', borderColor: '#38bdf8', fontWeight: 600 }}
              onClick={handleAutoConfigureAll}
            >
              Auto-DHCP All Devices
            </Button>
            <Button
              icon={<DownloadOutlined />}
              style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
              onClick={handleExportCsv}
            >
              Export CSV
            </Button>
          </div>
        </div>
      }
      open={isIpamModalOpen}
      onCancel={closeIpamModal}
      footer={null}
      width={1060}
      styles={{
        content: { backgroundColor: '#090d16', border: '1px solid #1e293b', padding: '20px 24px' },
        header: { backgroundColor: '#090d16', borderBottom: '1px solid #1e293b', paddingBottom: 14 }
      }}
    >
      {/* Conflict Alert Banner */}
      {totalConflicts > 0 && (
        <Alert
          type="error"
          showIcon
          message="IP Address Conflict Detected"
          description={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span>Multiple network nodes share identical IP addresses. Network transmission is suspended on conflicting links.</span>
              <Button size="small" danger type="primary" onClick={handleAutoConfigureAll}>
                Resolve Conflicts Now
              </Button>
            </div>
          }
          style={{ marginBottom: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }}
        />
      )}

      {/* Subnet Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 14, marginBottom: 20 }}>
        {subnets.map(subnet => {
          const isFull = subnet.utilizationPercent >= 90;
          return (
            <div
              key={subnet.cidr}
              style={{
                backgroundColor: '#0f172a',
                border: subnet.conflicts.length > 0 ? '1px solid #ef4444' : '1px solid #1e293b',
                borderRadius: 10,
                padding: '14px 16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                  {subnet.cidr}
                </span>
                <Tag color={subnet.conflicts.length > 0 ? 'error' : 'cyan'}>
                  {subnet.assignedCount} / {subnet.totalUsableHosts} Hosts
                </Tag>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', marginBottom: 10 }}>
                <div>Gateway: <strong style={{ color: '#f8fafc' }}>{subnet.gatewayIp}</strong></div>
                <div>Mask: <strong style={{ color: '#f8fafc' }}>{subnet.subnetMask}</strong></div>
                <div>Net IP: <span style={{ color: '#64748b' }}>{subnet.networkIp}</span></div>
                <div>Broadcast: <span style={{ color: '#64748b' }}>{subnet.broadcastIp}</span></div>
              </div>

              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 2 }}>
                  <span>Host Pool Utilization</span>
                  <span>{subnet.utilizationPercent}%</span>
                </div>
                <Progress 
                  percent={subnet.utilizationPercent} 
                  size="small" 
                  strokeColor={isFull ? '#ef4444' : subnet.utilizationPercent > 60 ? '#f59e0b' : '#10b981'}
                  trailColor="#1e293b"
                  showInfo={false}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Enterprise Subnet Device Allocations Table (Rule 24 Compliant) */}
      <div style={{ backgroundColor: '#0f172a', borderRadius: 10, border: '1px solid #1e293b', padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
            <BranchesOutlined style={{ color: '#38bdf8' }} />
            <span>Active Network Host Registrations ({allDevices.length} endpoints)</span>
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            Click "DHCP" on any host to automatically match the connected gateway subnet
          </span>
        </div>

        <EnterpriseTable<NetworkHostRow>
          dataSource={allDevices}
          columns={columns as any}
          searchPlaceholder="Filter by device tag, IP address, or subnet..."
          searchFields={['tag', 'name', 'ip', 'subnetCidr']}
        />
      </div>
    </Modal>
  );
};
