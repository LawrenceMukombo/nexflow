import React from 'react';
import { Space, Tag, Badge } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';

export const StatusBar: React.FC = () => {
  const {
    graph,
    validationIssues,
    toggleValidationDrawer,
    telemetry,
    isSimulating,
    viewport
  } = useGraphStore();

  const nodeCount = Object.keys(graph.nodes).length;
  const connCount = Object.keys(graph.connections).length;

  const errors = validationIssues.filter(i => i.severity === 'CRITICAL' || i.severity === 'ERROR').length;
  const warnings = validationIssues.filter(i => i.severity === 'WARNING').length;

  return (
    <div
      style={{
        height: 28,
        backgroundColor: '#090d16',
        borderTop: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: 11,
        color: '#94a3b8',
        zIndex: 30,
        userSelect: 'none'
      }}
    >
      {/* Topology summary */}
      <Space size="middle">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ApartmentOutlined style={{ color: '#38bdf8' }} />
          <span>Graph: <strong style={{ color: '#f8fafc' }}>{nodeCount}</strong> Nodes, <strong style={{ color: '#f8fafc' }}>{connCount}</strong> Cables</span>
        </span>

        <span
          onClick={() => toggleValidationDrawer(true)}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {errors > 0 ? (
            <Tag color="error" style={{ margin: 0, padding: '0 6px', fontSize: 10 }}>
              {errors} Errors
            </Tag>
          ) : warnings > 0 ? (
            <Tag color="warning" style={{ margin: 0, padding: '0 6px', fontSize: 10 }}>
              {warnings} Warnings
            </Tag>
          ) : (
            <Tag color="success" style={{ margin: 0, padding: '0 6px', fontSize: 10 }}>
              Design Valid
            </Tag>
          )}
        </span>
      </Space>

      {/* Simulation Telemetry Live Feed */}
      <Space size="large">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Badge status={isSimulating ? 'processing' : 'default'} />
          <span style={{ color: isSimulating ? '#38bdf8' : '#64748b', fontWeight: 600 }}>
            {isSimulating ? 'SIMULATION TICK: ' + telemetry.tick : 'SIMULATION IDLE'}
          </span>
        </span>

        <span style={{ fontFamily: 'monospace' }}>
          Packets: <strong style={{ color: '#f8fafc' }}>{telemetry.activePackets}</strong> active • <strong style={{ color: '#10b981' }}>{telemetry.deliveredPackets}</strong> delivered
          {telemetry.droppedPackets > 0 && (
            <span style={{ color: '#ef4444', marginLeft: 6 }}>
              • <strong>{telemetry.droppedPackets}</strong> dropped!
            </span>
          )}
        </span>

        <span style={{ fontFamily: 'monospace' }}>
          Avg Latency: <strong style={{ color: '#f8fafc' }}>{telemetry.averageLatencyMs} ms</strong>
        </span>

        <span style={{ fontFamily: 'monospace' }}>
          Throughput: <strong style={{ color: '#38bdf8' }}>{telemetry.throughputMbps} Mbps</strong>
        </span>

        <span style={{ color: '#64748b' }}>
          Zoom: {Math.round(viewport.zoom * 100)}%
        </span>
      </Space>
    </div>
  );
};
