import React, { useMemo } from 'react';
import { Modal, Typography, Tag } from 'antd';
import { TableOutlined } from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { generateCableSchedule, CableScheduleEntry } from '@omniflow/network-engine';
import { EnterpriseTable, EnterpriseColumn } from './EnterpriseTable';

const { Title } = Typography;

export const CableScheduleModal: React.FC = () => {
  const { isCableScheduleOpen, toggleCableScheduleModal, graph } = useGraphStore();

  const scheduleData = useMemo(() => {
    return generateCableSchedule(graph);
  }, [graph]);

  const columns: EnterpriseColumn<CableScheduleEntry>[] = [
    {
      key: 'cableId',
      title: 'Cable ID',
      dataIndex: 'cableId',
      width: 140,
      render: (id: string) => <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{id.slice(0, 14)}</span>
    },
    {
      key: 'cableType',
      title: 'Cable Spec',
      dataIndex: 'cableType',
      width: 130,
      sorter: (a, b) => a.cableType.localeCompare(b.cableType),
      render: (type: string) => (
        <Tag color={type.includes('FIBER') ? 'gold' : 'cyan'}>{type}</Tag>
      )
    },
    {
      key: 'sourceDevice',
      title: 'Origin Endpoint',
      dataIndex: 'sourceDevice',
      sorter: (a, b) => a.sourceDevice.localeCompare(b.sourceDevice),
      render: (dev: string) => <strong style={{ color: '#f8fafc' }}>{dev}</strong>
    },
    {
      key: 'sourcePort',
      title: 'Origin Port',
      dataIndex: 'sourcePort',
      width: 130,
      render: (p: string) => <span style={{ color: '#38bdf8' }}>{p}</span>
    },
    {
      key: 'targetDevice',
      title: 'Destination Endpoint',
      dataIndex: 'targetDevice',
      sorter: (a, b) => a.targetDevice.localeCompare(b.targetDevice),
      render: (dev: string) => <strong style={{ color: '#f8fafc' }}>{dev}</strong>
    },
    {
      key: 'targetPort',
      title: 'Destination Port',
      dataIndex: 'targetPort',
      width: 130,
      render: (p: string) => <span style={{ color: '#10b981' }}>{p}</span>
    },
    {
      key: 'lengthMeters',
      title: 'Length (m)',
      dataIndex: 'lengthMeters',
      width: 110,
      sorter: (a, b) => a.lengthMeters - b.lengthMeters,
      render: (len: number) => <span>{len} meters</span>
    }
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TableOutlined style={{ color: '#38bdf8', fontSize: 20 }} />
          <Title level={4} style={{ color: '#f8fafc', margin: 0 }}>
            Structured Cabling Schedule
          </Title>
        </div>
      }
      open={isCableScheduleOpen}
      onCancel={() => toggleCableScheduleModal(false)}
      width={950}
      footer={null}
    >
      <EnterpriseTable<CableScheduleEntry>
        columns={columns}
        dataSource={scheduleData}
        searchPlaceholder="Filter cable schedule..."
        searchFields={['cableType', 'sourceDevice', 'targetDevice', 'sourcePort', 'targetPort']}
        exportFileName="cable-schedule"
      />
    </Modal>
  );
};
