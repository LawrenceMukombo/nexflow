import React, { useState } from 'react';
import { Modal, Select, Button, Space, Typography, Table, Tag, Row, Col, Card, Input, message } from 'antd';
import { 
  HistoryOutlined, 
  DiffOutlined, 
  PlusCircleOutlined, 
  MinusCircleOutlined, 
  ExclamationCircleOutlined,
  RollbackOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { EngineeringGraph } from '@omniflow/shared-types';

const { Title, Text } = Typography;

interface DiffItem {
  key: string;
  type: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
  entityType: 'COMPONENT' | 'CONNECTION';
  name: string;
  tag: string;
  detail: string;
}

export const VersionDiffModal: React.FC = () => {
  const {
    graph,
    designRevisions,
    isVersionDiffModalOpen,
    closeVersionDiffModal,
    createDesignRevision,
    revertToRevision
  } = useGraphStore();

  const [baseRevId, setBaseRevId] = useState<string>(designRevisions[0]?.id || 'rev_v1_0');
  const [targetRevId, setTargetRevId] = useState<string>('CURRENT_CANVAS');

  // Form for new revision
  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [newVersionSummary, setNewVersionSummary] = useState('');
  const [isCreatingNewRev, setIsCreatingNewRev] = useState(false);

  if (!isVersionDiffModalOpen) return null;

  // Resolve base graph
  const baseRev = designRevisions.find((r) => r.id === baseRevId);
  const baseGraph: EngineeringGraph | null = baseRev ? baseRev.graphSnapshot : null;

  // Resolve target graph
  let targetGraph: EngineeringGraph = graph;
  if (targetRevId !== 'CURRENT_CANVAS') {
    const rev = designRevisions.find((r) => r.id === targetRevId);
    if (rev) {
      targetGraph = rev.graphSnapshot;
    }
  }

  // Calculate Diff between baseGraph and targetGraph
  const diffItems: DiffItem[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;

  if (baseGraph) {
    const baseNodeIds = new Set(Object.keys(baseGraph.nodes));
    const targetNodeIds = new Set(Object.keys(targetGraph.nodes));

    // Nodes in target
    for (const [id, targetNode] of Object.entries(targetGraph.nodes)) {
      if (!baseNodeIds.has(id)) {
        addedCount++;
        diffItems.push({
          key: `add_node_${id}`,
          type: 'ADDED',
          entityType: 'COMPONENT',
          name: targetNode.name,
          tag: targetNode.tag,
          detail: `Added ${targetNode.type} (${targetNode.domain}) at [${targetNode.position.x}, ${targetNode.position.y}]`
        });
      } else {
        const baseNode = baseGraph.nodes[id];
        const changedProps: string[] = [];
        if (baseNode.name !== targetNode.name) changedProps.push(`Name: "${baseNode.name}" → "${targetNode.name}"`);
        if (baseNode.properties.ipAddress !== targetNode.properties.ipAddress) {
          changedProps.push(`IP: ${baseNode.properties.ipAddress || 'none'} → ${targetNode.properties.ipAddress || 'none'}`);
        }
        if (baseNode.properties.vlanId !== targetNode.properties.vlanId) {
          changedProps.push(`VLAN: ${baseNode.properties.vlanId || 1} → ${targetNode.properties.vlanId || 1}`);
        }
        if (baseNode.properties.ratedWatts !== targetNode.properties.ratedWatts) {
          changedProps.push(`Watts: ${baseNode.properties.ratedWatts || 0}W → ${targetNode.properties.ratedWatts || 0}W`);
        }

        if (changedProps.length > 0) {
          modifiedCount++;
          diffItems.push({
            key: `mod_node_${id}`,
            type: 'MODIFIED',
            entityType: 'COMPONENT',
            name: targetNode.name,
            tag: targetNode.tag,
            detail: changedProps.join(' • ')
          });
        }
      }
    }

    // Nodes removed from base
    for (const [id, baseNode] of Object.entries(baseGraph.nodes)) {
      if (!targetNodeIds.has(id)) {
        removedCount++;
        diffItems.push({
          key: `rem_node_${id}`,
          type: 'REMOVED',
          entityType: 'COMPONENT',
          name: baseNode.name,
          tag: baseNode.tag,
          detail: `Removed ${baseNode.type} (${baseNode.domain})`
        });
      }
    }

    // Connections diff
    const baseConnIds = new Set(Object.keys(baseGraph.connections));
    const targetConnIds = new Set(Object.keys(targetGraph.connections));

    for (const [id, targetConn] of Object.entries(targetGraph.connections)) {
      if (!baseConnIds.has(id)) {
        addedCount++;
        diffItems.push({
          key: `add_conn_${id}`,
          type: 'ADDED',
          entityType: 'CONNECTION',
          name: targetConn.connectionType,
          tag: `${targetConn.connectionType} (${targetConn.lengthMeters}m)`,
          detail: `New connection: ${targetConn.sourcePortId} ➔ ${targetConn.targetPortId}`
        });
      }
    }

    for (const [id, baseConn] of Object.entries(baseGraph.connections)) {
      if (!targetConnIds.has(id)) {
        removedCount++;
        diffItems.push({
          key: `rem_conn_${id}`,
          type: 'REMOVED',
          entityType: 'CONNECTION',
          name: baseConn.connectionType,
          tag: `${baseConn.connectionType} (${baseConn.lengthMeters}m)`,
          detail: `Deleted connection run`
        });
      }
    }
  }

  const handleCreateSnapshot = () => {
    if (!newVersionLabel.trim()) {
      message.error('Please enter a version identifier (e.g. v1.2, v2.0)');
      return;
    }
    createDesignRevision(
      newVersionLabel.trim(), 
      newVersionSummary.trim() || 'Engineering design baseline update',
      'Lead Design Engineer'
    );
    message.success(`Created revision ${newVersionLabel.trim()}`);
    setNewVersionLabel('');
    setNewVersionSummary('');
    setIsCreatingNewRev(false);
  };

  const handleRevert = (revId: string) => {
    revertToRevision(revId);
    message.success('Restored working canvas to selected revision snapshot');
    closeVersionDiffModal();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 32 }}>
          <Space>
            <HistoryOutlined style={{ color: '#0284c7', fontSize: 18 }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>Version Comparison & Revision History</span>
          </Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => setIsCreatingNewRev(!isCreatingNewRev)}
            style={{ backgroundColor: '#0284c7' }}
          >
            Create Revision Snapshot
          </Button>
        </div>
      }
      open={isVersionDiffModalOpen}
      onCancel={closeVersionDiffModal}
      width={940}
      footer={[
        <Button key="close" onClick={closeVersionDiffModal}>
          Close
        </Button>,
        baseRev && (
          <Button 
            key="revert" 
            danger 
            icon={<RollbackOutlined />} 
            onClick={() => handleRevert(baseRev.id)}
          >
            Revert Canvas to Base ({baseRev.version})
          </Button>
        )
      ]}
      style={{ top: 20 }}
      styles={{ body: { maxHeight: '80vh', overflowY: 'auto', paddingRight: 10 } }}
    >
      <div style={{ color: '#f8fafc' }}>
        
        {/* Inline Create Revision Snapshot Form */}
        {isCreatingNewRev && (
          <Card 
            size="small" 
            title={<span style={{ color: '#38bdf8', fontSize: 12 }}>Snapshot Current Canvas as New Immutable Revision</span>} 
            style={{ marginBottom: 16, backgroundColor: '#090d16', borderColor: '#0284c7' }}
          >
            <Row gutter={12}>
              <Col span={6}>
                <Input 
                  placeholder="Version e.g. v1.2" 
                  value={newVersionLabel} 
                  onChange={(e) => setNewVersionLabel(e.target.value)} 
                />
              </Col>
              <Col span={14}>
                <Input 
                  placeholder="Change Summary (e.g. Expanded access layer with 48-port PoE switch)" 
                  value={newVersionSummary} 
                  onChange={(e) => setNewVersionSummary(e.target.value)} 
                />
              </Col>
              <Col span={4}>
                <Button type="primary" block onClick={handleCreateSnapshot} style={{ backgroundColor: '#10b981' }}>
                  Save Rev
                </Button>
              </Col>
            </Row>
          </Card>
        )}

        {/* Revision Selectors Bar */}
        <div style={{ backgroundColor: '#090d16', padding: '12px 16px', borderRadius: 8, border: '1px solid #1e293b', marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={11}>
              <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                BASELINE REVISION (FROM)
              </Text>
              <Select
                value={baseRevId}
                onChange={setBaseRevId}
                style={{ width: '100%' }}
                options={designRevisions.map((r) => ({
                  label: `${r.version} — ${r.summary} (${r.timestamp})`,
                  value: r.id
                }))}
              />
            </Col>

            <Col span={2} style={{ textAlign: 'center' }}>
              <DiffOutlined style={{ fontSize: 18, color: '#38bdf8', marginTop: 16 }} />
            </Col>

            <Col span={11}>
              <Text style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                COMPARISON TARGET (TO)
              </Text>
              <Select
                value={targetRevId}
                onChange={setTargetRevId}
                style={{ width: '100%' }}
                options={[
                  { label: 'Current Working Canvas (Unsaved Changes)', value: 'CURRENT_CANVAS' },
                  ...designRevisions.map((r) => ({
                    label: `${r.version} — ${r.summary} (${r.timestamp})`,
                    value: r.id
                  }))
                ]}
              />
            </Col>
          </Row>
        </div>

        {/* Change Metrics Summary Card */}
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small" style={{ backgroundColor: '#090d16', borderColor: '#1e293b', textAlign: 'center' }}>
              <Text style={{ fontSize: 11, color: '#94a3b8' }}>Added</Text>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <PlusCircleOutlined /> +{addedCount}
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ backgroundColor: '#090d16', borderColor: '#1e293b', textAlign: 'center' }}>
              <Text style={{ fontSize: 11, color: '#94a3b8' }}>Removed</Text>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <MinusCircleOutlined /> -{removedCount}
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ backgroundColor: '#090d16', borderColor: '#1e293b', textAlign: 'center' }}>
              <Text style={{ fontSize: 11, color: '#94a3b8' }}>Modified Configs</Text>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ExclamationCircleOutlined /> {modifiedCount}
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ backgroundColor: '#090d16', borderColor: '#1e293b', textAlign: 'center' }}>
              <Text style={{ fontSize: 11, color: '#94a3b8' }}>Total Variance</Text>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8' }}>
                {addedCount + removedCount + modifiedCount} Items
              </div>
            </Card>
          </Col>
        </Row>

        {/* Differences Table */}
        <Title level={5} style={{ color: '#f8fafc', marginBottom: 8, fontSize: 13 }}>
          Detailed Architectural & Configuration Modifications
        </Title>
        <Table
          dataSource={diffItems}
          rowKey="key"
          size="small"
          pagination={{ pageSize: 6 }}
          columns={[
            {
              title: 'Action',
              dataIndex: 'type',
              key: 'type',
              width: 110,
              render: (t) => (
                <Tag color={t === 'ADDED' ? '#10b981' : t === 'REMOVED' ? '#ef4444' : '#f59e0b'} style={{ fontWeight: 600 }}>
                  {t}
                </Tag>
              )
            },
            {
              title: 'Type',
              dataIndex: 'entityType',
              key: 'ent',
              width: 110,
              render: (et) => <Tag color="#1e293b">{et}</Tag>
            },
            {
              title: 'Component / Tag',
              dataIndex: 'tag',
              key: 'tag',
              width: 170,
              render: (tag, record) => (
                <div>
                  <strong style={{ color: '#f8fafc' }}>{tag}</strong>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{record.name}</div>
                </div>
              )
            },
            {
              title: 'Modification Details',
              dataIndex: 'detail',
              key: 'det',
              render: (det) => <span style={{ color: '#cbd5e1', fontSize: 12 }}>{det}</span>
            }
          ]}
        />

        {/* Revision Log History Timeline */}
        <div style={{ marginTop: 24 }}>
          <Title level={5} style={{ color: '#f8fafc', marginBottom: 8, fontSize: 13 }}>
            Historical Revision Snapshots
          </Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {designRevisions.map((rev) => (
              <div 
                key={rev.id} 
                style={{ 
                  padding: '8px 12px', 
                  backgroundColor: '#090d16', 
                  border: '1px solid #1e293b', 
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <Space>
                    <Tag color="#0284c7" style={{ fontWeight: 700 }}>{rev.version}</Tag>
                    <strong style={{ color: '#f8fafc', fontSize: 13 }}>{rev.summary}</strong>
                    <Tag color={rev.status === 'APPROVED' ? '#10b981' : '#f59e0b'}>{rev.status}</Tag>
                  </Space>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    By {rev.author} • {rev.timestamp} • {rev.nodeCount} Components • {rev.connectionCount} Links • Total Est: ${rev.totalCost.toLocaleString()}
                  </div>
                </div>
                <Space>
                  <Button size="small" onClick={() => setBaseRevId(rev.id)}>
                    Set as Base
                  </Button>
                  <Button size="small" type="primary" ghost icon={<RollbackOutlined />} onClick={() => handleRevert(rev.id)}>
                    Revert
                  </Button>
                </Space>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Modal>
  );
};
