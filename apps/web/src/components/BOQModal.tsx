import React, { useMemo } from 'react';
import { Modal, Tag, Typography, Card, Row, Col, Statistic } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { generateNetworkBOQ } from '@omniflow/network-engine';
import { EnterpriseTable, EnterpriseColumn } from './EnterpriseTable';
import { BOQItem } from '@omniflow/shared-types';

const { Title } = Typography;

export const BOQModal: React.FC = () => {
  const { isBOQModalOpen, toggleBOQModal, graph } = useGraphStore();

  const boqSummary = useMemo(() => {
    return generateNetworkBOQ(graph, {
      currency: 'USD',
      taxRatePercent: 15,
      contingencyPercent: 10
    });
  }, [graph]);

  const columns: EnterpriseColumn<BOQItem>[] = [
    {
      key: 'itemType',
      title: 'Type',
      dataIndex: 'itemType',
      width: 110,
      sorter: (a, b) => a.itemType.localeCompare(b.itemType),
      render: (type: BOQItem['itemType']) => (
        <Tag color={type === 'COMPONENT' ? 'cyan' : 'blue'}>{type}</Tag>
      )
    },
    {
      key: 'description',
      title: 'Item Description',
      dataIndex: 'description',
      width: 250,
      sorter: (a, b) => a.description.localeCompare(b.description),
      render: (desc: string) => <strong style={{ color: '#f8fafc' }}>{desc}</strong>
    },
    {
      key: 'partNumber',
      title: 'Part #',
      dataIndex: 'partNumber',
      width: 140,
      render: (pn: string) => <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{pn || 'N/A'}</span>
    },
    {
      key: 'quantity',
      title: 'Qty',
      dataIndex: 'quantity',
      width: 90,
      sorter: (a, b) => a.quantity - b.quantity,
      render: (qty: number, rec) => (
        <span>{qty} {rec.unit}</span>
      )
    },
    {
      key: 'unitCost',
      title: 'Unit Material',
      dataIndex: 'unitCost',
      width: 120,
      sorter: (a, b) => a.unitCost - b.unitCost,
      render: (val: number) => `$${val.toFixed(2)}`
    },
    {
      key: 'unitLabour',
      title: 'Unit Labour',
      dataIndex: 'unitLabour',
      width: 120,
      sorter: (a, b) => a.unitLabour - b.unitLabour,
      render: (val: number) => `$${val.toFixed(2)}`
    },
    {
      key: 'totalMaterialCost',
      title: 'Total Material',
      dataIndex: 'totalMaterialCost',
      width: 130,
      sorter: (a, b) => a.totalMaterialCost - b.totalMaterialCost,
      render: (val: number) => <span style={{ color: '#38bdf8' }}>${val.toFixed(2)}</span>
    },
    {
      key: 'totalLabourCost',
      title: 'Total Labour',
      dataIndex: 'totalLabourCost',
      width: 130,
      sorter: (a, b) => a.totalLabourCost - b.totalLabourCost,
      render: (val: number) => <span style={{ color: '#10b981' }}>${val.toFixed(2)}</span>
    },
    {
      key: 'totalCost',
      title: 'Line Total',
      dataIndex: 'totalCost',
      width: 140,
      sorter: (a, b) => a.totalCost - b.totalCost,
      render: (val: number) => <strong style={{ color: '#f8fafc' }}>${val.toFixed(2)}</strong>
    }
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <DollarOutlined style={{ color: '#10b981', fontSize: 20 }} />
          <Title level={4} style={{ color: '#f8fafc', margin: 0 }}>
            Bill of Quantities (BOQ) & Cost Schedule
          </Title>
        </div>
      }
      open={isBOQModalOpen}
      onCancel={() => toggleBOQModal(false)}
      width={1100}
      footer={null}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Cost Summary Cards */}
        <Row gutter={12}>
          <Col span={6}>
            <Card size="small" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
              <Statistic
                title={<span style={{ color: '#94a3b8', fontSize: 12 }}>Total Materials</span>}
                value={boqSummary.totalMaterials}
                precision={2}
                prefix="$"
                valueStyle={{ color: '#38bdf8', fontSize: 18 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
              <Statistic
                title={<span style={{ color: '#94a3b8', fontSize: 12 }}>Total Labour</span>}
                value={boqSummary.totalLabour}
                precision={2}
                prefix="$"
                valueStyle={{ color: '#10b981', fontSize: 18 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
              <Statistic
                title={<span style={{ color: '#94a3b8', fontSize: 12 }}>Tax (15%) + Contingency (10%)</span>}
                value={boqSummary.taxAmount + boqSummary.contingencyAmount}
                precision={2}
                prefix="$"
                valueStyle={{ color: '#f59e0b', fontSize: 18 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ backgroundColor: '#1e293b', borderColor: '#0ea5e9' }}>
              <Statistic
                title={<span style={{ color: '#94a3b8', fontSize: 12 }}>Grand Project Total</span>}
                value={boqSummary.grandTotal}
                precision={2}
                prefix="$"
                valueStyle={{ color: '#ffffff', fontWeight: 700, fontSize: 18 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Enterprise BOQ Table */}
        <EnterpriseTable<BOQItem>
          columns={columns}
          dataSource={boqSummary.items}
          searchPlaceholder="Search BOQ items..."
          searchFields={['description', 'partNumber', 'itemType', 'category']}
          exportFileName={`boq-schedule-${graph.name.toLowerCase().replace(/\s+/g, '-')}`}
        />
      </div>
    </Modal>
  );
};
