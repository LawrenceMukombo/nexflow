import React from 'react';
import { Drawer, Tag, Button, Typography } from 'antd';
import { AimOutlined } from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { EnterpriseTable, EnterpriseColumn } from './EnterpriseTable';
import { ValidationIssue } from '@omniflow/shared-types';

const { Title } = Typography;

export const ValidationDrawer: React.FC = () => {
  const {
    isValidationDrawerOpen,
    toggleValidationDrawer,
    validationIssues,
    selectNode,
    graph
  } = useGraphStore();

  const columns: EnterpriseColumn<ValidationIssue>[] = [
    {
      key: 'severity',
      title: 'Severity',
      dataIndex: 'severity',
      width: 110,
      sorter: (a, b) => a.severity.localeCompare(b.severity),
      render: (sev: ValidationIssue['severity']) => {
        switch (sev) {
          case 'CRITICAL':
            return <Tag color="magenta">CRITICAL</Tag>;
          case 'ERROR':
            return <Tag color="red">ERROR</Tag>;
          case 'WARNING':
            return <Tag color="gold">WARNING</Tag>;
          default:
            return <Tag color="blue">INFO</Tag>;
        }
      }
    },
    {
      key: 'ruleCode',
      title: 'Rule Code',
      dataIndex: 'ruleCode',
      width: 170,
      render: (code: string) => <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{code}</span>
    },
    {
      key: 'title',
      title: 'Issue Title',
      dataIndex: 'title',
      width: 200,
      render: (title: string) => <strong style={{ color: '#f8fafc' }}>{title}</strong>
    },
    {
      key: 'message',
      title: 'Engineering Details',
      dataIndex: 'message',
      render: (msg: string) => <span style={{ color: '#cbd5e1' }}>{msg}</span>
    },
    {
      key: 'suggestedFix',
      title: 'Suggested Fix',
      dataIndex: 'suggestedFix',
      render: (fix: string) => <span style={{ color: '#10b981', fontStyle: 'italic' }}>{fix}</span>
    },
    {
      key: 'actions',
      title: 'Action',
      width: 120,
      render: (_, record) => {
        const firstNodeId = record.affectedNodeIds[0];
        if (!firstNodeId || !graph.nodes[firstNodeId]) return null;
        return (
          <Button
            size="small"
            icon={<AimOutlined />}
            onClick={() => {
              selectNode(firstNodeId);
              toggleValidationDrawer(false);
            }}
          >
            Locate
          </Button>
        );
      }
    }
  ];

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Title level={5} style={{ color: '#f8fafc', margin: 0 }}>
            Automated Engineering Validation Audit
          </Title>
          <Tag color={validationIssues.length === 0 ? 'success' : 'warning'}>
            {validationIssues.length} rule issues detected
          </Tag>
        </div>
      }
      placement="bottom"
      height={380}
      onClose={() => toggleValidationDrawer(false)}
      open={isValidationDrawerOpen}
      styles={{
        body: { padding: '16px 24px', backgroundColor: '#0f172a' },
        header: { backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }
      }}
    >
      <EnterpriseTable<ValidationIssue>
        columns={columns}
        dataSource={validationIssues}
        searchPlaceholder="Filter issues by code, title, or rule..."
        searchFields={['ruleCode', 'title', 'message', 'severity']}
        exportFileName="validation-audit-log"
      />
    </Drawer>
  );
};
