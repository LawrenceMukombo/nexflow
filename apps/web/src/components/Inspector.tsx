import React, { useState } from 'react';
import { 
  Tabs, 
  Input, 
  InputNumber, 
  Button, 
  Tag, 
  Typography, 
  Divider, 
  Popconfirm,
  Select,
  message
} from 'antd';
import { 
  DeleteOutlined, 
  WarningOutlined, 
  SlidersOutlined, 
  ThunderboltOutlined,
  SendOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { CABLE_CATALOG, checkNodeNetworkConfig } from '@omniflow/network-engine';
import { ComponentIcon } from './ComponentIcon';

const { Text, Title } = Typography;

export const Inspector: React.FC = () => {
  const {
    graph,
    selectedNodeId,
    selectedConnectionId,
    updateComponentProperties,
    toggleComponentFault,
    removeComponent,
    removeConnection,
    toggleConnectionFault,
    updateConnectionLength,
    updateConnectionCableType,
    sendDirectedPing
  } = useGraphStore();

  const [pingTargetId, setPingTargetId] = useState<string | null>(null);

  const selectedNode = selectedNodeId ? graph.nodes[selectedNodeId] : null;
  const selectedConn = selectedConnectionId ? graph.connections[selectedConnectionId] : null;

  if (!selectedNode && !selectedConn) {
    return (
      <div
        style={{
          width: 320,
          height: '100%',
          backgroundColor: '#0f172a',
          borderLeft: '1px solid #334155',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          color: '#64748b'
        }}
      >
        <SlidersOutlined style={{ fontSize: 32, marginBottom: 12, color: '#334155' }} />
        <Text strong style={{ color: '#94a3b8', fontSize: 14 }}>Property Inspector</Text>
        <Text style={{ fontSize: 12, marginTop: 6, maxWidth: 220 }}>
          Click any component or cable on the canvas to inspect and configure engineering parameters.
        </Text>
      </div>
    );
  }

  // CONNECTION SELECTED
  if (selectedConn) {
    const srcNode = graph.nodes[selectedConn.sourceComponentId];
    const tgtNode = graph.nodes[selectedConn.targetComponentId];
    const isFailed = selectedConn.simulationState.isFailed;
    const cableSpec = CABLE_CATALOG[selectedConn.connectionType] || CABLE_CATALOG.CAT6;

    return (
      <div
        style={{
          width: 320,
          height: '100%',
          backgroundColor: '#0f172a',
          borderLeft: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: 16
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={5} style={{ color: '#f8fafc', margin: 0 }}>
            Cable Connection
          </Title>
          <Tag color={isFailed ? 'error' : 'cyan'}>
            {isFailed ? 'SEVERED / FAULT' : 'ACTIVE LINK'}
          </Tag>
        </div>

        <Divider style={{ borderColor: '#334155', margin: '12px 0' }} />

        {/* Cable Endpoints */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: 10, backgroundColor: '#1e293b', borderRadius: 6 }}>
            <Text style={{ fontSize: 11, color: '#64748b' }}>ORIGIN ENDPOINT</Text>
            <div style={{ fontSize: 13, color: '#f8fafc', fontWeight: 500 }}>
              {srcNode?.tag} ({srcNode?.name})
            </div>
          </div>

          <div style={{ padding: 10, backgroundColor: '#1e293b', borderRadius: 6 }}>
            <Text style={{ fontSize: 11, color: '#64748b' }}>TARGET ENDPOINT</Text>
            <div style={{ fontSize: 13, color: '#f8fafc', fontWeight: 500 }}>
              {tgtNode?.tag} ({tgtNode?.name})
            </div>
          </div>
        </div>

        <Divider style={{ borderColor: '#334155', margin: '14px 0' }} />

        {/* Cable Properties */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Text style={{ fontSize: 11, color: '#94a3b8' }}>CABLE SPECIFICATION</Text>
            <Select
              value={selectedConn.connectionType}
              onChange={(val) => updateConnectionCableType(selectedConn.id, val)}
              style={{ width: '100%', marginTop: 4 }}
              options={Object.values(CABLE_CATALOG).map(c => ({
                label: `${c.name} (${c.type})`,
                value: c.type
              }))}
            />
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Max: {cableSpec.maxBandwidthMbps} Mbps • Channel Limit: {cableSpec.maxDistanceMeters}m
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 11, color: '#94a3b8' }}>RUN LENGTH (METERS)</Text>
              <span style={{ fontSize: 11, color: selectedConn.lengthMeters > cableSpec.maxDistanceMeters ? '#ef4444' : '#10b981' }}>
                {selectedConn.lengthMeters > cableSpec.maxDistanceMeters ? `Exceeds Limit (>${cableSpec.maxDistanceMeters}m)` : 'Within Standards'}
              </span>
            </div>
            <InputNumber
              min={1}
              max={500}
              value={selectedConn.lengthMeters}
              onChange={(val) => updateConnectionLength(selectedConn.id, val || 10)}
              style={{ width: '100%' }}
              addonAfter="meters"
            />
          </div>

          <div style={{ padding: 10, backgroundColor: '#090d16', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>Physics Latency:</span>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#f8fafc' }}>
              {(selectedConn.lengthMeters * 0.005).toFixed(3)} ms
            </span>
          </div>
        </div>

        <Divider style={{ borderColor: '#334155', margin: '16px 0' }} />

        {/* Fault Injection & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
          <Button
            danger={!isFailed}
            type={isFailed ? 'primary' : 'default'}
            icon={<WarningOutlined />}
            onClick={() => toggleConnectionFault(selectedConn.id)}
            style={{ width: '100%' }}
          >
            {isFailed ? 'Restore Cable Connection' : 'Inject Fault (Cut Cable)'}
          </Button>

          <Popconfirm
            title="Disconnect cable?"
            description="This will remove the physical connection between both device ports."
            onConfirm={() => removeConnection(selectedConn.id)}
            okText="Disconnect"
            cancelText="Cancel"
          >
            <Button icon={<DeleteOutlined />} style={{ width: '100%' }}>
              Disconnect Cable
            </Button>
          </Popconfirm>
        </div>
      </div>
    );
  }

  // NODE SELECTED
  const isFailed = selectedNode!.simulationState.isFailed;
  const netStatus = selectedNode ? checkNodeNetworkConfig(selectedNode, graph) : null;
  const isNetMisconfigured = netStatus ? !netStatus.canConnect : false;

  return (
    <div
      style={{
        width: 320,
        height: '100%',
        backgroundColor: '#0f172a',
        borderLeft: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        padding: 16
      }}
    >
      {/* Node Title & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ComponentIcon type={selectedNode!.type} domain={selectedNode!.domain} size={18} />
          <Tag color="cyan" style={{ margin: 0, fontWeight: 600 }}>{selectedNode!.tag}</Tag>
          <Title level={5} style={{ color: '#f8fafc', margin: 0, fontSize: 14 }}>
            {selectedNode!.name.split('(')[0]}
          </Title>
        </div>
        <Tag color={isFailed ? 'error' : isNetMisconfigured ? 'error' : 'success'}>
          {isFailed 
            ? 'OFFLINE' 
            : isNetMisconfigured 
            ? (netStatus?.statusText === 'SUBNET_MISMATCH' ? 'SUBNET MISMATCH' : 'DISCONNECTED') 
            : 'ONLINE'}
        </Tag>
      </div>

      <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
        {selectedNode!.description}
      </Text>

      {/* Prominent Network Misconfiguration Warning */}
      {isNetMisconfigured && netStatus && (
        <div style={{
          backgroundColor: '#450a0a',
          border: '1px solid #dc2626',
          borderRadius: 6,
          padding: '10px 12px',
          marginTop: 10,
          marginBottom: 4
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fca5a5', fontWeight: 700, fontSize: 12 }}>
            <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 14 }} />
            <span>Network Transmission Blocked</span>
          </div>
          <div style={{ color: '#fecaca', fontSize: 11, marginTop: 4, lineHeight: '16px' }}>
            {netStatus.reason}
          </div>
          {netStatus.suggestedIp && (
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px solid #7f1d1d' }}>
              <span style={{ fontSize: 10.5, color: '#fca5a5' }}>
                Suggested IP: <code style={{ color: '#38bdf8', backgroundColor: '#0f172a', padding: '1px 4px', borderRadius: 3 }}>{netStatus.suggestedIp}</code>
              </span>
              <Button
                size="small"
                type="primary"
                danger
                onClick={() => {
                  const key = selectedNode!.properties.lanIp !== undefined ? 'lanIp' : 'ipAddress';
                  updateComponentProperties(selectedNode!.id, { [key]: netStatus.suggestedIp });
                  message.success(`Reconfigured ${selectedNode!.name} IP to ${netStatus.suggestedIp}. Connected to network.`);
                }}
              >
                Auto-Fix IP
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Fault Injection Button */}
      <Button
        danger={!isFailed}
        type={isFailed ? 'primary' : 'default'}
        icon={<ThunderboltOutlined />}
        onClick={() => toggleComponentFault(selectedNode!.id)}
        style={{ marginTop: 12 }}
      >
        {isFailed ? 'Restore Power / Online' : 'Inject Failure (Offline)'}
      </Button>

      <Divider style={{ borderColor: '#334155', margin: '14px 0' }} />

      {/* Interactive Point-to-Point Ping Tool */}
      <div style={{ padding: 10, backgroundColor: '#1e293b', borderRadius: 6, marginBottom: 12 }}>
        <Text style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600 }}>TRANSMIT PING (ICMP)</Text>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <Select
            placeholder="Select target device..."
            value={pingTargetId}
            onChange={(val) => setPingTargetId(val)}
            style={{ flex: 1 }}
            size="small"
            options={Object.values(graph.nodes)
              .filter(n => n.id !== selectedNode!.id)
              .map(n => ({
                label: `${n.tag} (${n.name.split('(')[0]})`,
                value: n.id
              }))}
          />
          <Button
            size="small"
            type="primary"
            icon={<SendOutlined />}
            disabled={!pingTargetId || isNetMisconfigured}
            onClick={() => {
              if (!pingTargetId) return;
              if (isNetMisconfigured) {
                message.error(`Transmission blocked: ${selectedNode!.name} has wrong IP settings (${netStatus?.statusText}).`);
                return;
              }
              const reached = sendDirectedPing(selectedNode!.id, pingTargetId);
              if (reached) {
                message.success('Packet dispatched! Routing along active path...');
              } else {
                message.error('Destination unreachable! Target device offline or subnet mismatch.');
              }
            }}
          >
            Ping
          </Button>
        </div>
      </div>

      {/* Configuration Tabs */}
      <Tabs
        defaultActiveKey="props"
        size="small"
        items={[
          {
            key: 'props',
            label: 'Properties',
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* IP Address */}
                {(selectedNode!.properties.ipAddress !== undefined || selectedNode!.properties.lanIp !== undefined) && (
                  <div>
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>IP ADDRESS</Text>
                    <Input
                      value={(selectedNode!.properties.ipAddress || selectedNode!.properties.lanIp) as string}
                      onChange={(e) => {
                        const key = selectedNode!.properties.lanIp !== undefined ? 'lanIp' : 'ipAddress';
                        updateComponentProperties(selectedNode!.id, { [key]: e.target.value });
                      }}
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                )}

                {/* Subnet Mask */}
                {selectedNode!.properties.subnetMask !== undefined && (
                  <div>
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>SUBNET MASK</Text>
                    <Input
                      value={selectedNode!.properties.subnetMask as string}
                      onChange={(e) => updateComponentProperties(selectedNode!.id, { subnetMask: e.target.value })}
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                )}

                {/* Default Gateway */}
                {selectedNode!.properties.defaultGateway !== undefined && (
                  <div>
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>DEFAULT GATEWAY</Text>
                    <Input
                      value={selectedNode!.properties.defaultGateway as string}
                      onChange={(e) => updateComponentProperties(selectedNode!.id, { defaultGateway: e.target.value })}
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                )}

                {/* VLAN ID */}
                {selectedNode!.properties.vlanId !== undefined && (
                  <div>
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>ACCESS VLAN ID</Text>
                    <InputNumber
                      min={1}
                      max={4094}
                      value={selectedNode!.properties.vlanId as number}
                      onChange={(val) => updateComponentProperties(selectedNode!.id, { vlanId: val })}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}

                {/* PoE Total Budget for Switches */}
                {selectedNode!.properties.poeTotalBudgetWatts !== undefined && (
                  <div>
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>POE POWER BUDGET (WATTS)</Text>
                    <InputNumber
                      min={50}
                      max={1500}
                      value={selectedNode!.properties.poeTotalBudgetWatts as number}
                      onChange={(val) => updateComponentProperties(selectedNode!.id, { poeTotalBudgetWatts: val })}
                      style={{ width: '100%' }}
                      addonAfter="Watts"
                    />
                  </div>
                )}
              </div>
            )
          },
          {
            key: 'ports',
            label: `Ports (${selectedNode!.ports.length})`,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                {selectedNode!.ports.map((port) => {
                  const isConn = !!port.occupiedByConnectionId;
                  return (
                    <div
                      key={port.id}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: '#1e293b',
                        borderRadius: 4,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#f8fafc' }}>{port.name}</div>
                        <span style={{ fontSize: 10, color: '#64748b' }}>
                          {port.type} • {port.capacity} {port.unit}
                        </span>
                      </div>
                      <Tag color={isConn ? 'amber' : 'green'} style={{ margin: 0, fontSize: 10 }}>
                        {isConn ? 'Connected' : 'Free'}
                      </Tag>
                    </div>
                  );
                })}
              </div>
            )
          },
          {
            key: 'cost',
            label: 'Cost / BOQ',
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: 10, backgroundColor: '#1e293b', borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>PART NUMBER</Text>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#f8fafc' }}>
                    {selectedNode!.costData?.partNumber || 'N/A'}
                  </div>
                </div>

                <div style={{ padding: 10, backgroundColor: '#1e293b', borderRadius: 6 }}>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>MANUFACTURER</Text>
                  <div style={{ fontSize: 12, color: '#f8fafc' }}>
                    {selectedNode!.costData?.manufacturer || 'Generic'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, padding: 10, backgroundColor: '#1e293b', borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>MATERIAL</Text>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#38bdf8' }}>
                      ${selectedNode!.costData?.unitCost}
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: 10, backgroundColor: '#1e293b', borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>LABOUR</Text>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>
                      ${selectedNode!.costData?.labourCost}
                    </div>
                  </div>
                </div>
              </div>
            )
          }
        ]}
      />

      {/* Delete Device Action */}
      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <Popconfirm
          title="Delete component?"
          description="This will permanently remove the device and all associated cables."
          onConfirm={() => removeComponent(selectedNode!.id)}
          okText="Delete"
          okType="danger"
          cancelText="Cancel"
        >
          <Button danger icon={<DeleteOutlined />} style={{ width: '100%' }}>
            Delete Device
          </Button>
        </Popconfirm>
      </div>
    </div>
  );
};
