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
  CloseCircleOutlined,
  FullscreenOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { 
  CABLE_CATALOG, 
  checkNodeNetworkConfig,
  solveElectricalNetwork,
  solveHydraulicNetwork,
  solveSolarNetwork
} from '@omniflow/network-engine';
import { executeCliCommand } from '../utils/cliNetworkEngine';
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
    sendDirectedPing,
    openCliModal
  } = useGraphStore();

  const [pingTargetId, setPingTargetId] = useState<string | null>(null);
  const [cmdLines, setCmdLines] = useState<string[]>([]);
  const [activeCmd, setActiveCmd] = useState<string>('');
  const [isCmdStreaming, setIsCmdStreaming] = useState(false);

  const selectedNode = selectedNodeId ? graph.nodes[selectedNodeId] : null;
  const selectedConn = selectedConnectionId ? graph.connections[selectedConnectionId] : null;

  // Multi-Domain Engineering Physics Solvers
  const elecSol = React.useMemo(() => {
    try { return solveElectricalNetwork(graph); } catch { return null; }
  }, [graph]);

  const hydSol = React.useMemo(() => {
    try { return solveHydraulicNetwork(graph); } catch { return null; }
  }, [graph]);

  const solSol = React.useMemo(() => {
    try { return solveSolarNetwork(graph); } catch { return null; }
  }, [graph]);

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

    const isElecConn = selectedConn.domain === 'ELECTRICAL' || selectedConn.domain === 'SOLAR' || selectedConn.connectionType.toUpperCase().includes('POWER') || selectedConn.connectionType.toUpperCase().includes('AC_') || selectedConn.connectionType.toUpperCase().includes('DC_');
    const isHydConn = selectedConn.domain === 'PLUMBING' || selectedConn.connectionType.toUpperCase().includes('PIPE') || selectedConn.connectionType.toUpperCase().includes('WATER') || selectedConn.connectionType.toUpperCase().includes('CHILLED');

    const elecCable = elecSol?.cableResults[selectedConn.id];
    const hydPipe = hydSol?.pipeResults[selectedConn.id];

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
            {isElecConn ? '⚡ Electrical Feeder' : isHydConn ? '💧 Hydraulic Pipe Run' : '🌐 Cable Connection'}
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

          {/* ⚡ REAL ELECTRICAL PHYSICS BREAKDOWN */}
          {isElecConn && elecCable && (
            <div style={{
              backgroundColor: '#090d16',
              border: `1px solid ${elecCable.necCompliance.status === 'VIOLATION_CRITICAL' ? '#ef4444' : elecCable.necCompliance.status === 'WARNING_HIGH_DROP' ? '#f59e0b' : '#334155'}`,
              borderRadius: 6,
              padding: 10
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#eab308' }}>
                  ⚡ VOLTAGE DROP &amp; LOAD FLOW
                </span>
                <Tag color={elecCable.necCompliance.status === 'VIOLATION_CRITICAL' ? 'error' : elecCable.necCompliance.status === 'WARNING_HIGH_DROP' ? 'warning' : 'success'} style={{ margin: 0, fontSize: 10 }}>
                  {elecCable.necCompliance.status === 'VIOLATION_CRITICAL' ? 'NEC VIOLATION (>5%)' : elecCable.necCompliance.status === 'WARNING_HIGH_DROP' ? 'HIGH DROP (>3%)' : 'NEC COMPLIANT'}
                </Tag>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                <div>
                  <span style={{ color: '#64748b' }}>System:</span>{' '}
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{elecCable.nominalVoltage}V {elecCable.phaseSystem.includes('3PHASE') ? '3Φ' : '1Φ'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Conductor:</span>{' '}
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{elecCable.conductorSpec.crossSectionMm2}mm²</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Current:</span>{' '}
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>{elecCable.loadCurrentAmps} A</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Power:</span>{' '}
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>{(elecCable.activePowerWatts / 1000).toFixed(1)} kW</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Voltage Drop:</span>{' '}
                  <span style={{ color: elecCable.voltageDropPercent > 3 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                    {elecCable.voltageDropVolts}V ({elecCable.voltageDropPercent}%)
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Receiving V:</span>{' '}
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{elecCable.receivingVoltage} V</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Resistance R:</span>{' '}
                  <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{elecCable.resistanceOhm} Ω</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Reactance X:</span>{' '}
                  <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{elecCable.reactanceOhm} Ω</span>
                </div>
              </div>
            </div>
          )}

          {/* 💧 REAL HYDRAULIC & CHILLED WATER FRICTION BREAKDOWN */}
          {isHydConn && hydPipe && (
            <div style={{
              backgroundColor: '#090d16',
              border: `1px solid ${hydPipe.pressureDropPsi > 15 ? '#ef4444' : '#334155'}`,
              borderRadius: 6,
              padding: 10
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>
                  💧 DARCY-WEISBACH PIPE FLOW
                </span>
                <Tag color={hydPipe.ashraeVelocityCompliance.status === 'CRITICAL_EROSION_RISK' ? 'error' : hydPipe.ashraeVelocityCompliance.status === 'OPTIMAL' ? 'success' : 'cyan'} style={{ margin: 0, fontSize: 10 }}>
                  {hydPipe.ashraeVelocityCompliance.status === 'OPTIMAL' ? 'ASHRAE OPTIMAL' : hydPipe.ashraeVelocityCompliance.status}
                </Tag>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                <div>
                  <span style={{ color: '#64748b' }}>Pipe Size:</span>{' '}
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{hydPipe.nominalSize}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Flow Rate:</span>{' '}
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>{hydPipe.flowRateLps} L/s</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Velocity:</span>{' '}
                  <span style={{ color: hydPipe.velocityMPerS > 2.5 ? '#ef4444' : '#38bdf8', fontWeight: 600 }}>
                    {hydPipe.velocityMPerS} m/s
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Pressure Drop:</span>{' '}
                  <span style={{ color: hydPipe.pressureDropPsi > 15 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                    {hydPipe.pressureDropPsi} PSI ({hydPipe.pressureDropBar} bar)
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Head Loss:</span>{' '}
                  <span style={{ color: '#cbd5e1' }}>{hydPipe.totalHeadLossMeters} m head</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Friction f:</span>{' '}
                  <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{hydPipe.frictionFactor}</span>
                </div>
                {hydPipe.thermalCapacityKw && (
                  <div style={{ gridColumn: 'span 2', borderTop: '1px solid #1e293b', paddingTop: 4 }}>
                    <span style={{ color: '#64748b' }}>Thermal Capacity (7°C ΔT):</span>{' '}
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                      {hydPipe.thermalCapacityKw} kW ({hydPipe.coolingTonsRefrigeration} TR)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

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

  const runInspectorCommand = (cmdText: string) => {
    if (!selectedNode) return;
    setActiveCmd(cmdText);
    const result = executeCliCommand(graph, selectedNode.id, cmdText);

    if (result.targetNodeId && cmdText.toLowerCase().startsWith('ping')) {
      sendDirectedPing(selectedNode.id, result.targetNodeId);
    }

    if (result.steps && result.steps.length > 0) {
      setIsCmdStreaming(true);
      setCmdLines([]);
      const accumulated: string[] = [];
      let stepIndex = 0;

      const streamNext = () => {
        if (stepIndex >= result.steps!.length) {
          setIsCmdStreaming(false);
          return;
        }
        accumulated.push(result.steps![stepIndex].text);
        stepIndex++;
        setCmdLines([...accumulated]);
        setTimeout(streamNext, result.steps![stepIndex - 1]?.delayMs || 150);
      };
      streamNext();
    } else {
      setCmdLines(result.outputLines);
    }
  };

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

      {/* Interactive Windows Command Prompt Ping & Diagnostics */}
      <div style={{ padding: 10, backgroundColor: '#1e293b', borderRadius: 6, marginBottom: 12, border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 14,
              height: 14,
              backgroundColor: '#000000',
              border: '1px solid #64748b',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 8,
              fontWeight: 700,
              color: '#ffffff',
              fontFamily: 'Consolas, monospace'
            }}>
              &gt;_
            </div>
            <Text style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600 }}>COMMAND PROMPT (CMD)</Text>
          </div>
          <Button
            size="small"
            type="link"
            icon={<FullscreenOutlined />}
            onClick={() => openCliModal(selectedNode!.id)}
            style={{ fontSize: 11, padding: '0 4px', height: 'auto', color: '#38bdf8' }}
          >
            Full CMD
          </Button>
        </div>

        {/* Target Select & Action Buttons */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <Select
            placeholder="Select target to ping..."
            value={pingTargetId}
            onChange={(val) => setPingTargetId(val)}
            style={{ flex: 1 }}
            size="small"
            options={Object.values(graph.nodes)
              .filter(n => n.id !== selectedNode!.id)
              .map(n => ({
                label: `${n.tag} (${(n.properties.ipAddress || n.properties.lanIp || n.name) as string})`,
                value: n.id
              }))}
          />
          <Button
            size="small"
            type="primary"
            icon={<SendOutlined />}
            loading={isCmdStreaming}
            disabled={!pingTargetId}
            onClick={() => {
              if (!pingTargetId) return;
              const targetNode = graph.nodes[pingTargetId];
              const targetIp = (targetNode?.properties.ipAddress || targetNode?.properties.lanIp || pingTargetId) as string;
              runInspectorCommand(`ping ${targetIp}`);
            }}
          >
            Ping
          </Button>
        </div>

        {/* Diagnostic Command Shortcuts */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          <button
            onClick={() => runInspectorCommand('ipconfig')}
            disabled={isCmdStreaming}
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#a78bfa',
              borderRadius: 3,
              padding: '2px 6px',
              fontSize: 10,
              fontFamily: 'Consolas, monospace',
              cursor: isCmdStreaming ? 'not-allowed' : 'pointer'
            }}
          >
            ipconfig
          </button>
          <button
            onClick={() => runInspectorCommand('ipconfig /all')}
            disabled={isCmdStreaming}
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#a78bfa',
              borderRadius: 3,
              padding: '2px 6px',
              fontSize: 10,
              fontFamily: 'Consolas, monospace',
              cursor: isCmdStreaming ? 'not-allowed' : 'pointer'
            }}
          >
            ipconfig /all
          </button>
          <button
            onClick={() => runInspectorCommand('ifconfig')}
            disabled={isCmdStreaming}
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#34d399',
              borderRadius: 3,
              padding: '2px 6px',
              fontSize: 10,
              fontFamily: 'Consolas, monospace',
              cursor: isCmdStreaming ? 'not-allowed' : 'pointer'
            }}
          >
            ifconfig
          </button>
          {pingTargetId && (
            <button
              onClick={() => {
                const targetNode = graph.nodes[pingTargetId];
                const targetIp = (targetNode?.properties.ipAddress || targetNode?.properties.lanIp || pingTargetId) as string;
                runInspectorCommand(`tracert ${targetIp}`);
              }}
              disabled={isCmdStreaming}
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#fbbf24',
                borderRadius: 3,
                padding: '2px 6px',
                fontSize: 10,
                fontFamily: 'Consolas, monospace',
                cursor: isCmdStreaming ? 'not-allowed' : 'pointer'
              }}
            >
              tracert
            </button>
          )}
          {cmdLines.length > 0 && (
            <button
              onClick={() => {
                setCmdLines([]);
                setActiveCmd('');
              }}
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                color: '#94a3b8',
                borderRadius: 3,
                padding: '2px 6px',
                fontSize: 10,
                fontFamily: 'Consolas, monospace',
                cursor: 'pointer',
                marginLeft: 'auto'
              }}
            >
              <ClearOutlined /> cls
            </button>
          )}
        </div>

        {/* Embedded Authentic CMD Console Display */}
        <div
          style={{
            backgroundColor: '#0c0c0c',
            border: '1px solid #000000',
            borderRadius: 4,
            padding: '8px 10px',
            maxHeight: 180,
            overflowY: 'auto',
            fontFamily: "'Consolas', 'Lucida Console', 'Courier New', monospace",
            fontSize: 11,
            lineHeight: 1.4,
            color: '#cccccc',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)'
          }}
        >
          {activeCmd ? (
            <div>
              <div style={{ color: '#f1f1f1', marginBottom: 4 }}>
                <span>C:\Users\Admin&gt;</span>
                <span style={{ color: '#38bdf8', fontWeight: 600, marginLeft: 4 }}>{activeCmd}</span>
              </div>
              {cmdLines.map((line, lIdx) => {
                let color = '#cccccc';
                if (line.includes('Reply from')) {
                  color = line.includes('unreachable') ? '#f87171' : '#34d399';
                } else if (line.includes('timed out') || line.includes('Lost = 4')) {
                  color = '#f87171';
                } else if (line.startsWith('Windows IP Configuration') || line.startsWith('Active Connections')) {
                  color = '#38bdf8';
                } else if (line.includes('IPv4 Address') || line.includes('Subnet Mask') || line.includes('Default Gateway')) {
                  color = '#f8fafc';
                } else if (line.includes('WARNING:')) {
                  color = '#facc15';
                }

                return (
                  <div key={lIdx} style={{ color, whiteSpace: 'pre-wrap' }}>
                    {line}
                  </div>
                );
              })}
              {isCmdStreaming && (
                <span style={{ display: 'inline-block', width: 6, height: 12, backgroundColor: '#38bdf8', marginLeft: 2 }} />
              )}
            </div>
          ) : (
            <div style={{ color: '#64748b' }}>
              <div>Microsoft Windows [Version 10.0.19045]</div>
              <div>(c) Microsoft Corporation. All rights reserved.</div>
              <div style={{ marginTop: 4, color: '#475569' }}>
                C:\Users\Admin&gt; <span style={{ fontStyle: 'italic' }}>Select target &amp; click Ping or ipconfig</span>
              </div>
            </div>
          )}
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
            key: 'physics',
            label: 'Engineering Physics',
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* 1. Electrical Load Flow & Protection Card */}
                {elecSol && elecSol.nodeResults[selectedNode!.id] && (
                  <div style={{ padding: 10, backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#eab308' }}>
                        ⚡ ELECTRICAL LOAD FLOW
                      </span>
                      <Tag color={elecSol.nodeResults[selectedNode!.id].totalVoltageDropPercent > 3 ? 'warning' : 'success'} style={{ margin: 0, fontSize: 10 }}>
                        {elecSol.nodeResults[selectedNode!.id].totalVoltageDropPercent > 3 ? 'HIGH VOLTAGE DROP' : 'POWER OK'}
                      </Tag>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Connected Load:</span>{' '}
                        <span style={{ color: '#f8fafc', fontWeight: 600 }}>{(elecSol.nodeResults[selectedNode!.id].connectedLoadWatts / 1000).toFixed(1)} kW</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Operating Load:</span>{' '}
                        <span style={{ color: '#38bdf8', fontWeight: 600 }}>{(elecSol.nodeResults[selectedNode!.id].operatingLoadWatts / 1000).toFixed(1)} kW</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Operating Current:</span>{' '}
                        <span style={{ color: '#f8fafc', fontWeight: 600 }}>{elecSol.nodeResults[selectedNode!.id].operatingCurrentAmps} A</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Power Factor:</span>{' '}
                        <span style={{ color: '#f8fafc' }}>{elecSol.nodeResults[selectedNode!.id].powerFactor}</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Incoming Voltage:</span>{' '}
                        <span style={{ color: '#10b981', fontWeight: 600 }}>{elecSol.nodeResults[selectedNode!.id].incomingVoltage} V</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Drop from Source:</span>{' '}
                        <span style={{ color: elecSol.nodeResults[selectedNode!.id].totalVoltageDropPercent > 3 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                          {elecSol.nodeResults[selectedNode!.id].totalVoltageDropPercent}%
                        </span>
                      </div>
                      {elecSol.nodeResults[selectedNode!.id].ratedBreakerAmps && (
                        <div style={{ gridColumn: 'span 2', borderTop: '1px solid #1e293b', paddingTop: 6 }}>
                          <span style={{ color: '#64748b' }}>Circuit Breaker:</span>{' '}
                          <span style={{ color: elecSol.nodeResults[selectedNode!.id].isBreakerTripped ? '#ef4444' : '#f8fafc', fontWeight: 600 }}>
                            {elecSol.nodeResults[selectedNode!.id].ratedBreakerAmps}A ({elecSol.nodeResults[selectedNode!.id].breakerLoadingPercent}% loaded)
                          </span>{' '}
                          {elecSol.nodeResults[selectedNode!.id].isBreakerTripped && <Tag color="error">TRIPPED</Tag>}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Hydraulic Pressure & Cooling Card */}
                {hydSol && hydSol.nodeResults[selectedNode!.id] && (
                  <div style={{ padding: 10, backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>
                        💧 HYDRAULIC PRESSURE &amp; FLOW
                      </span>
                      <Tag color="cyan" style={{ margin: 0, fontSize: 10 }}>
                        {hydSol.nodeResults[selectedNode!.id].incomingPressurePsi} PSI
                      </Tag>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Inlet Pressure:</span>{' '}
                        <span style={{ color: '#f8fafc', fontWeight: 600 }}>{hydSol.nodeResults[selectedNode!.id].incomingPressurePsi} PSI</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Bar Equivalent:</span>{' '}
                        <span style={{ color: '#f8fafc' }}>{hydSol.nodeResults[selectedNode!.id].incomingPressureBar} bar</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Flow Demand:</span>{' '}
                        <span style={{ color: '#38bdf8', fontWeight: 600 }}>{hydSol.nodeResults[selectedNode!.id].flowRateDemandLps} L/s</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>GPM Flow:</span>{' '}
                        <span style={{ color: '#38bdf8' }}>{(hydSol.nodeResults[selectedNode!.id].flowRateDemandLps * 15.8503).toFixed(1)} GPM</span>
                      </div>
                      {hydSol.nodeResults[selectedNode!.id].chilledWaterThermalLoadKw && (
                        <div style={{ gridColumn: 'span 2', borderTop: '1px solid #1e293b', paddingTop: 6 }}>
                          <span style={{ color: '#64748b' }}>Cooling Capacity:</span>{' '}
                          <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                            {hydSol.nodeResults[selectedNode!.id].chilledWaterThermalLoadKw} kW ({hydSol.nodeResults[selectedNode!.id].chilledWaterTonsRefrig} TR)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Solar Photovoltaic String Card */}
                {solSol && solSol.strings[selectedNode!.id] && (
                  <div style={{ padding: 10, backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>
                        ☀️ PHOTOVOLTAIC STRING YIELD
                      </span>
                      <Tag color="success" style={{ margin: 0, fontSize: 10 }}>
                        {solSol.strings[selectedNode!.id].totalPeakDcPowerKw} kWp
                      </Tag>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Array Size:</span>{' '}
                        <span style={{ color: '#f8fafc', fontWeight: 600 }}>
                          {solSol.strings[selectedNode!.id].modulesInSeries}S × {solSol.strings[selectedNode!.id].parallelStrings}P ({solSol.strings[selectedNode!.id].totalModules} Mod)
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Peak DC:</span>{' '}
                        <span style={{ color: '#10b981', fontWeight: 600 }}>{solSol.strings[selectedNode!.id].totalPeakDcPowerKw} kWp</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Max Voc (-10°C):</span>{' '}
                        <span style={{ color: solSol.strings[selectedNode!.id].coldVocMaxVolts > 1000 ? '#ef4444' : '#f8fafc', fontWeight: 600 }}>
                          {solSol.strings[selectedNode!.id].coldVocMaxVolts} V
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Min Vmp (70°C):</span>{' '}
                        <span style={{ color: '#f8fafc' }}>{solSol.strings[selectedNode!.id].hotVmpMinVolts} V</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Daily Energy:</span>{' '}
                        <span style={{ color: '#10b981', fontWeight: 600 }}>{solSol.strings[selectedNode!.id].dailyYieldKwh} kWh/day</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Annual Energy:</span>{' '}
                        <span style={{ color: '#10b981', fontWeight: 600 }}>{solSol.strings[selectedNode!.id].annualYieldMwh} MWh/yr</span>
                      </div>
                      <div style={{ gridColumn: 'span 2', borderTop: '1px solid #1e293b', paddingTop: 6 }}>
                        <span style={{ color: '#64748b' }}>CO₂ Emissions Avoided:</span>{' '}
                        <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                          {solSol.strings[selectedNode!.id].avoidedCo2TonsPerYear} Tons CO₂/year
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Battery Energy Storage System (BESS) Card */}
                {solSol && solSol.batteries[selectedNode!.id] && (
                  <div style={{ padding: 10, backgroundColor: '#090d16', border: '1px solid #334155', borderRadius: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>
                        🔋 BESS ENERGY STORAGE
                      </span>
                      <Tag color={solSol.batteries[selectedNode!.id].isSufficientAutonomy ? 'success' : 'warning'} style={{ margin: 0, fontSize: 10 }}>
                        {solSol.batteries[selectedNode!.id].autonomyHours}h AUTONOMY
                      </Tag>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Capacity:</span>{' '}
                        <span style={{ color: '#f8fafc', fontWeight: 600 }}>{solSol.batteries[selectedNode!.id].nominalCapacityKwh} kWh</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>State of Charge:</span>{' '}
                        <span style={{ color: '#10b981', fontWeight: 700 }}>{solSol.batteries[selectedNode!.id].currentSocPct}%</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Stored Energy:</span>{' '}
                        <span style={{ color: '#f8fafc' }}>{solSol.batteries[selectedNode!.id].storedEnergyKwh} kWh</span>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Discharge C-Rate:</span>{' '}
                        <span style={{ color: '#f8fafc' }}>{solSol.batteries[selectedNode!.id].currentCRate} C</span>
                      </div>
                      <div style={{ gridColumn: 'span 2', borderTop: '1px solid #1e293b', paddingTop: 6 }}>
                        <span style={{ color: '#64748b' }}>Backup Autonomy (Load: {solSol.batteries[selectedNode!.id].connectedLoadKw}kW):</span>{' '}
                        <span style={{ color: solSol.batteries[selectedNode!.id].isSufficientAutonomy ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                          {solSol.batteries[selectedNode!.id].autonomyHours} Hours
                        </span>
                      </div>
                    </div>
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
