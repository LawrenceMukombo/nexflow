import React, { useState } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Select, 
  InputNumber, 
  Button, 
  Divider, 
  Card, 
  message 
} from 'antd';
import { 
  PlusOutlined, 
  MinusCircleOutlined, 
  AppstoreAddOutlined 
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { ComponentTemplate, PortBlueprint } from '@omniflow/shared-types';

export const CreateComponentModal: React.FC = () => {
  const { 
    isCreateComponentModalOpen, 
    toggleCreateComponentModal, 
    activeLibraryId, 
    addCustomComponent 
  } = useGraphStore();

  const [form] = Form.useForm();
  const [ports, setPorts] = useState<PortBlueprint[]>([
    {
      name: 'Port 1',
      type: 'RJ45',
      direction: 'bidirectional',
      capacity: 1000,
      unit: 'Mbps',
      compatiblePortTypes: ['RJ45']
    }
  ]);

  const handleAddPort = () => {
    const nextIdx = ports.length + 1;
    setPorts([
      ...ports,
      {
        name: `Port ${nextIdx}`,
        type: 'RJ45',
        direction: 'bidirectional',
        capacity: 1000,
        unit: 'Mbps',
        compatiblePortTypes: ['RJ45']
      }
    ]);
  };

  const handleRemovePort = (index: number) => {
    if (ports.length <= 1) {
      message.warning('Component must have at least one port.');
      return;
    }
    setPorts(ports.filter((_, i) => i !== index));
  };

  const handlePortChange = (index: number, field: keyof PortBlueprint, value: any) => {
    const updated = [...ports];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'type') {
      updated[index].compatiblePortTypes = [value];
    }
    setPorts(updated);
  };

  const handleFinish = (values: any) => {
    const rawType = values.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const type = `CUSTOM_${rawType}_${Date.now().toString(36).substring(4)}`;

    const newTemplate: ComponentTemplate = {
      type,
      category: values.category,
      name: values.name,
      defaultTagPrefix: values.tagPrefix.toUpperCase(),
      description: values.description || '',
      icon: 'DesktopOutlined',
      defaultCost: {
        partNumber: values.partNumber || '',
        manufacturer: values.manufacturer || 'Custom',
        unitCost: Number(values.unitCost || 0),
        labourCost: Number(values.labourCost || 0),
        currency: 'USD'
      },
      defaultProperties: {
        ipAddress: values.ipAddress || '192.168.1.100',
        subnetMask: '255.255.255.0',
        powerWatts: values.powerWatts || 15
      },
      portsTemplate: ports
    };

    addCustomComponent(activeLibraryId, newTemplate);
    message.success(`Custom component "${newTemplate.name}" created and added to library.`);
    toggleCreateComponentModal(false);
    form.resetFields();
  };

  return (
    <Modal
      open={isCreateComponentModalOpen}
      onCancel={() => toggleCreateComponentModal(false)}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AppstoreAddOutlined style={{ color: '#10b981', fontSize: 18 }} />
          <span>Create Custom Component Blueprint</span>
        </div>
      }
      width={720}
      onOk={() => form.submit()}
      okText="Save Component Blueprint"
      okButtonProps={{ style: { backgroundColor: '#10b981', borderColor: '#10b981' } }}
      styles={{
        body: { maxHeight: '70vh', overflowY: 'auto', padding: '16px 20px' }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          category: 'SWITCHING',
          tagPrefix: 'DEV',
          unitCost: 250,
          labourCost: 50,
          powerWatts: 20,
          ipAddress: '192.168.1.50'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item
            label="Device / Component Name"
            name="name"
            rules={[{ required: true, message: 'Please enter component name' }]}
          >
            <Input placeholder="e.g. Arista 7050SX3 48-Port Switch" />
          </Form.Item>

          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: 'Core Routing', value: 'CORE' },
                { label: 'Switching', value: 'SWITCHING' },
                { label: 'Security & UTM', value: 'SECURITY' },
                { label: 'Wireless & WiFi', value: 'WIRELESS' },
                { label: 'Infrastructure / Rack', value: 'INFRASTRUCTURE' },
                { label: 'Endpoints & IoT', value: 'ENDPOINTS' }
              ]}
            />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Form.Item
            label="Tag Prefix"
            name="tagPrefix"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="e.g. SW, RTR, AP" />
          </Form.Item>

          <Form.Item label="Manufacturer" name="manufacturer">
            <Input placeholder="e.g. Arista, Juniper" />
          </Form.Item>

          <Form.Item label="Part / SKU Number" name="partNumber">
            <Input placeholder="e.g. DCS-7050SX3-48YC8" />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Form.Item label="Unit Hardware Cost ($)" name="unitCost">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>

          <Form.Item label="Labour / Install Cost ($)" name="labourCost">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>

          <Form.Item label="Power Consumption (Watts)" name="powerWatts">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </div>

        <Form.Item label="Description / Specification" name="description">
          <Input.TextArea rows={2} placeholder="Key technical characteristics, layer, interfaces..." />
        </Form.Item>

        <Divider orientation="left" style={{ borderColor: '#334155', color: '#38bdf8' }}>
          Physical Ports Specification ({ports.length} ports defined)
        </Divider>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {ports.map((port, idx) => (
            <Card
              key={idx}
              size="small"
              style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1.5fr auto', gap: 10, alignItems: 'center' }}>
                <Input
                  value={port.name}
                  onChange={(e) => handlePortChange(idx, 'name', e.target.value)}
                  placeholder="Port Name"
                  size="small"
                />

                <Select
                  value={port.type}
                  onChange={(val) => handlePortChange(idx, 'type', val)}
                  size="small"
                  options={[
                    { label: 'RJ45 (Ethernet)', value: 'RJ45' },
                    { label: 'Fiber LC (Optical)', value: 'FIBER_LC' },
                    { label: 'AC Terminal (Power)', value: 'AC_TERMINAL' }
                  ]}
                />

                <InputNumber
                  value={port.capacity}
                  onChange={(val) => handlePortChange(idx, 'capacity', val || 1000)}
                  size="small"
                  addonAfter={port.unit}
                />

                <Select
                  value={port.direction}
                  onChange={(val) => handlePortChange(idx, 'direction', val)}
                  size="small"
                  options={[
                    { label: 'Bidirectional', value: 'bidirectional' },
                    { label: 'Input Only', value: 'input' },
                    { label: 'Output Only', value: 'output' }
                  ]}
                />

                <Button
                  type="text"
                  danger
                  icon={<MinusCircleOutlined />}
                  size="small"
                  onClick={() => handleRemovePort(idx)}
                />
              </div>
            </Card>
          ))}
        </div>

        <Button
          type="dashed"
          block
          icon={<PlusOutlined />}
          onClick={handleAddPort}
          style={{ borderColor: '#38bdf8', color: '#38bdf8' }}
        >
          Add Another Port
        </Button>
      </Form>
    </Modal>
  );
};
