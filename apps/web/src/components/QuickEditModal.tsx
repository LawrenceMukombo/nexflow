import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Button, Divider, message, Tag } from 'antd';
import { 
  CopyOutlined, 
  DeleteOutlined, 
  CheckCircleOutlined,
  ThunderboltOutlined,
  BranchesOutlined,
  TableOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { ComponentIcon } from './ComponentIcon';

export const QuickEditModal: React.FC = () => {
  const {
    graph,
    isQuickEditModalOpen,
    quickEditNodeId,
    closeQuickEditModal,
    updateComponentProperties,
    removeComponent,
    duplicateComponent
  } = useGraphStore();

  const [form] = Form.useForm();
  const node = quickEditNodeId ? graph.nodes[quickEditNodeId] : null;

  useEffect(() => {
    if (node) {
      form.setFieldsValue({
        name: node.name,
        tag: node.tag,
        status: node.simulationState.status || 'ONLINE',
        ipAddress: node.properties.ipAddress || node.properties.lanIp || '',
        subnetMask: node.properties.subnetMask || '255.255.255.0',
        gateway: node.properties.gateway || '',
        vlanId: node.properties.vlanId || 1,
        voltage: node.properties.voltage || 230,
        ratedWatts: node.properties.ratedWatts || 1000,
        flowRate: node.properties.flowRate || 10,
        pressurePsi: node.properties.pressurePsi || 50,
        supplyTempC: node.properties.supplyTempC || 7
      });
    }
  }, [node, form]);

  if (!node) return null;

  const handleSave = () => {
    form.validateFields().then(values => {
      // Update name/tag if changed
      node.name = values.name;
      node.tag = values.tag;
      node.simulationState.status = values.status;
      node.simulationState.isFailed = values.status === 'FAILED' || values.status === 'OFFLINE';

      // Update properties
      const updatedProps: Record<string, unknown> = {
        ...node.properties,
        ipAddress: values.ipAddress,
        lanIp: values.ipAddress,
        subnetMask: values.subnetMask,
        gateway: values.gateway,
        vlanId: values.vlanId,
        voltage: values.voltage,
        ratedWatts: values.ratedWatts,
        flowRate: values.flowRate,
        pressurePsi: values.pressurePsi,
        supplyTempC: values.supplyTempC
      };

      updateComponentProperties(node.id, updatedProps);
      message.success(`Updated component ${node.tag}`);
      closeQuickEditModal();
    });
  };

  const handleDuplicate = () => {
    if (!node) return;
    duplicateComponent(node.id);
    message.success(`Cloned ${node.tag} as copy`);
    closeQuickEditModal();
  };

  const handleDelete = () => {
    if (!node) return;
    removeComponent(node.id);
    message.info(`Deleted ${node.tag}`);
    closeQuickEditModal();
  };

  const isElec = node.domain === 'ELECTRICAL' || node.type.includes('TRANSFORMER') || node.type.includes('UPS') || node.type.includes('PDU') || node.type.includes('GENERATOR') || node.type.includes('SOLAR');
  const isPlumb = node.domain === 'PLUMBING' || node.type.includes('CHILLER') || node.type.includes('PUMP') || node.type.includes('CRAH') || node.type.includes('WATER') || node.type.includes('TANK');

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: '#1e293b' }}>
            <ComponentIcon type={node.type} domain={node.domain} size={18} />
          </div>
          <span>Edit Component: {node.tag}</span>
          <Tag color="#0284c7" style={{ marginLeft: 8 }}>{node.type}</Tag>
        </div>
      }
      open={isQuickEditModalOpen}
      onCancel={closeQuickEditModal}
      footer={[
        <Button key="delete" danger icon={<DeleteOutlined />} onClick={handleDelete}>
          Delete
        </Button>,
        <Button key="duplicate" icon={<CopyOutlined />} onClick={handleDuplicate}>
          Duplicate
        </Button>,
        <Button key="cancel" onClick={closeQuickEditModal}>
          Cancel
        </Button>,
        <Button key="save" type="primary" icon={<CheckCircleOutlined />} onClick={handleSave}>
          Save Changes
        </Button>
      ]}
      width={520}
      styles={{
        content: { backgroundColor: '#0f172a', border: '1px solid #334155' },
        header: { backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b' },
        footer: { backgroundColor: '#0f172a', borderTop: '1px solid #1e293b' }
      }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="tag" label={<span style={{ color: '#cbd5e1' }}>Device Tag</span>} rules={[{ required: true }]}>
            <Input placeholder="e.g. RTR-01, SW-CORE" />
          </Form.Item>
          <Form.Item name="status" label={<span style={{ color: '#cbd5e1' }}>Operational State</span>}>
            <Select
              options={[
                { label: '🟢 Online (Operational)', value: 'ONLINE' },
                { label: '🟡 Degraded (High Latency/Load)', value: 'DEGRADED' },
                { label: '🔴 Offline / Power Down', value: 'OFFLINE' },
                { label: '❌ Failed (Hardware Fault)', value: 'FAILED' }
              ]}
            />
          </Form.Item>
        </div>

        <Form.Item name="name" label={<span style={{ color: '#cbd5e1' }}>Component Description Name</span>} rules={[{ required: true }]}>
          <Input placeholder="e.g. Edge Core BGP Gateway" />
        </Form.Item>

        <Divider style={{ borderColor: '#334155', margin: '12px 0' }} />

        {/* Network Domain Fields */}
        {!isElec && !isPlumb && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#38bdf8', fontSize: 13, fontWeight: 600 }}>
              <BranchesOutlined /> IP & Network Configuration
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="ipAddress" label={<span style={{ color: '#cbd5e1' }}>IP Address</span>}>
                <Input placeholder="192.168.1.1" />
              </Form.Item>
              <Form.Item name="subnetMask" label={<span style={{ color: '#cbd5e1' }}>Subnet Mask</span>}>
                <Input placeholder="255.255.255.0" />
              </Form.Item>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="gateway" label={<span style={{ color: '#cbd5e1' }}>Default Gateway</span>}>
                <Input placeholder="192.168.1.254" />
              </Form.Item>
              <Form.Item name="vlanId" label={<span style={{ color: '#cbd5e1' }}>Management VLAN</span>}>
                <InputNumber min={1} max={4094} style={{ width: '100%' }} />
              </Form.Item>
            </div>
          </div>
        )}

        {/* Electrical Domain Fields */}
        {isElec && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#facc15', fontSize: 13, fontWeight: 600 }}>
              <ThunderboltOutlined /> Electrical Power Ratings
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="voltage" label={<span style={{ color: '#cbd5e1' }}>Voltage (Volts)</span>}>
                <InputNumber min={12} max={11000} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="ratedWatts" label={<span style={{ color: '#cbd5e1' }}>Rated Power (Watts)</span>}>
                <InputNumber min={50} max={1000000} style={{ width: '100%' }} />
              </Form.Item>
            </div>
          </div>
        )}

        {/* Plumbing / Cooling Domain Fields */}
        {isPlumb && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#06b6d4', fontSize: 13, fontWeight: 600 }}>
              <TableOutlined /> Hydronic & Chilled Water Flow Ratings
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item name="flowRate" label={<span style={{ color: '#cbd5e1' }}>Design Flow Rate (L/s)</span>}>
                <InputNumber min={0.5} max={500} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="pressurePsi" label={<span style={{ color: '#cbd5e1' }}>Pressure (PSI)</span>}>
                <InputNumber min={1} max={300} style={{ width: '100%' }} />
              </Form.Item>
            </div>
            <Form.Item name="supplyTempC" label={<span style={{ color: '#cbd5e1' }}>Supply Temperature (°C)</span>}>
              <InputNumber min={0} max={60} style={{ width: '100%' }} />
            </Form.Item>
          </div>
        )}

        {/* Ports Summary */}
        <div style={{ marginTop: 12, padding: 10, backgroundColor: '#1e293b', borderRadius: 6, border: '1px solid #334155' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
            Device Ports ({node.ports.length} total)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {node.ports.map(port => {
              const isOccupied = Boolean(
                port.occupiedByConnectionId || 
                Object.values(graph.connections).some(c => c.sourcePortId === port.id || c.targetPortId === port.id)
              );
              return (
                <Tag 
                  key={port.id} 
                  color={isOccupied ? 'green' : 'default'}
                  style={{ fontSize: 11 }}
                >
                  {port.name} ({port.type}) {isOccupied ? '• Active' : '• Available'}
                </Tag>
              );
            })}
          </div>
        </div>
      </Form>
    </Modal>
  );
};
