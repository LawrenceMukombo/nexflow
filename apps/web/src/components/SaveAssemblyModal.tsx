import React from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Select, 
  Alert, 
  message 
} from 'antd';
import { 
  SaveOutlined 
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';

export const SaveAssemblyModal: React.FC = () => {
  const { 
    isSaveAssemblyModalOpen, 
    toggleSaveAssemblyModal, 
    libraries, 
    activeLibraryId, 
    saveSelectionAsAssembly,
    graph,
    selectedNodeId 
  } = useGraphStore();

  const [form] = Form.useForm();

  // Determine what is being saved
  const isSingleSelected = Boolean(selectedNodeId && graph.nodes[selectedNodeId]);
  const nodeCount = isSingleSelected ? 'Selected node + connected cluster' : `${Object.keys(graph.nodes).length} devices (all)`;

  const handleFinish = (values: any) => {
    const assembly = saveSelectionAsAssembly(
      values.name,
      values.category,
      values.description || '',
      values.targetLibraryId
    );

    if (assembly) {
      message.success(`Saved reusable assembly "${assembly.name}" into library!`);
      toggleSaveAssemblyModal(false);
      form.resetFields();
    } else {
      message.error('Could not create assembly. Ensure topology has devices.');
    }
  };

  return (
    <Modal
      open={isSaveAssemblyModalOpen}
      onCancel={() => toggleSaveAssemblyModal(false)}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SaveOutlined style={{ color: '#0284c7', fontSize: 18 }} />
          <span>Save Topology as Reusable System Assembly</span>
        </div>
      }
      width={560}
      onOk={() => form.submit()}
      okText="Save Reusable Assembly"
      okButtonProps={{ style: { backgroundColor: '#0284c7' } }}
    >
      <Alert
        message="Create a Reusable Engineering Assembly"
        description={`This will capture the interconnections, port alignments, and device specifications of your ${nodeCount} into a modular template that can be reused across any project.`}
        type="info"
        showIcon
        style={{ marginBottom: 16, backgroundColor: '#1e293b', border: '1px solid #334155' }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          name: 'Modular Access Stack',
          category: 'Enterprise Networking',
          targetLibraryId: activeLibraryId
        }}
      >
        <Form.Item
          label="Assembly Name"
          name="name"
          rules={[{ required: true, message: 'Please enter assembly name' }]}
        >
          <Input placeholder="e.g. Redundant Branch Distribution Pod" />
        </Form.Item>

        <Form.Item
          label="Target Library"
          name="targetLibraryId"
          rules={[{ required: true }]}
        >
          <Select
            options={libraries.map(lib => ({
              label: `${lib.name} (${lib.isBuiltIn ? 'Curated' : 'Custom'})`,
              value: lib.id
            }))}
          />
        </Form.Item>

        <Form.Item
          label="Category"
          name="category"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { label: 'Enterprise Networking', value: 'Enterprise Networking' },
              { label: 'Commercial & Hospitality', value: 'Commercial & Hospitality' },
              { label: 'Network Security', value: 'Network Security' },
              { label: 'Physical Security', value: 'Physical Security' },
              { label: 'Industrial & Utilities', value: 'Industrial & Utilities' },
              { label: 'Custom User Stack', value: 'Custom User Stack' }
            ]}
          />
        </Form.Item>

        <Form.Item
          label="Description / Architectural Purpose"
          name="description"
        >
          <Input.TextArea
            rows={3}
            placeholder="Describe the redundancy model, bandwidth capacity, and intended deployment environment..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
