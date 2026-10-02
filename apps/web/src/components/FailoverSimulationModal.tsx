import React, { useEffect, useState } from 'react';
import { 
  Modal, 
  Button, 
  Card, 
  Row, 
  Col, 
  Space, 
  Typography, 
  Tag, 
  Progress, 
  Radio, 
  Badge
} from 'antd';
import { 
  AlertOutlined, 
  CaretRightOutlined, 
  PauseOutlined, 
  StepForwardOutlined, 
  ReloadOutlined, 
  ThunderboltOutlined, 
  CheckCircleOutlined, 
  ClusterOutlined, 
  FireOutlined,
  CompassOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { 
  FAILOVER_SCENARIOS, 
  FailoverScenarioId, 
  FailoverEventLog 
} from '@omniflow/network-engine';

const { Text } = Typography;

export const FailoverSimulationModal: React.FC = () => {
  const {
    isFailoverModalOpen,
    closeFailoverModal,
    failoverTelemetry,
    selectFailoverScenario,
    toggleFailoverSimulation,
    stepFailoverTick,
    resetFailoverSimulation
  } = useGraphStore();

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x

  // Animation / simulation interval loop
  useEffect(() => {
    if (!isFailoverModalOpen || !failoverTelemetry.isRunning) return;

    const intervalMs = Math.round(1000 / playbackSpeed);
    const timer = setInterval(() => {
      stepFailoverTick(1.0);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isFailoverModalOpen, failoverTelemetry.isRunning, playbackSpeed, stepFailoverTick]);

  if (!isFailoverModalOpen) return null;

  const currentScenario = FAILOVER_SCENARIOS[failoverTelemetry.scenarioId];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NORMAL':
        return <Tag color="#10b981"><CheckCircleOutlined /> NORMAL BASELINE</Tag>;
      case 'FAULT_DETECTED':
        return <Tag color="#ef4444"><AlertOutlined /> FAULT DETECTED</Tag>;
      case 'TRANSFERRING':
        return <Tag color="#f59e0b"><ReloadOutlined spin /> FAILOVER IN PROGRESS</Tag>;
      case 'FAILOVER_STABLE':
        return <Tag color="#06b6d4"><CheckCircleOutlined /> FAILOVER STABILIZED</Tag>;
      case 'RECOVERING':
        return <Tag color="#8b5cf6"><ReloadOutlined spin /> RETRANSFER RECOVERY</Tag>;
      default:
        return <Tag color="#94a3b8">{status}</Tag>;
    }
  };

  const getLogSeverityColor = (sev: FailoverEventLog['severity']) => {
    switch (sev) {
      case 'CRITICAL': return '#ef4444';
      case 'WARNING': return '#f59e0b';
      case 'SUCCESS': return '#10b981';
      case 'INFO': return '#38bdf8';
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <Space>
            <AlertOutlined style={{ color: '#ef4444', fontSize: 18 }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>Disaster Recovery & Redundancy Failover Simulator</span>
            {getStatusBadge(failoverTelemetry.status)}
          </Space>
          <Space>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Time:</span>
            <Tag color="#0f172a" style={{ borderColor: '#334155', color: '#f8fafc', fontWeight: 'bold', fontSize: 13 }}>
              T + {failoverTelemetry.simulationTimeSec.toFixed(1)}s
            </Tag>
          </Space>
        </div>
      }
      open={isFailoverModalOpen}
      onCancel={closeFailoverModal}
      width={1040}
      footer={[
        <Button key="reset" icon={<ReloadOutlined />} onClick={resetFailoverSimulation}>
          Reset Normal
        </Button>,
        <Button key="close" type="primary" onClick={closeFailoverModal} style={{ backgroundColor: '#0284c7' }}>
          Close
        </Button>
      ]}
      style={{ top: 20 }}
      styles={{ body: { maxHeight: '84vh', overflowY: 'auto', paddingRight: 8 } }}
    >
      <div style={{ color: '#f8fafc', padding: '4px 0' }}>
        {/* Scenario Selector Tabs */}
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>
            SELECT MISSION-CRITICAL FAILOVER SCENARIO:
          </Text>
          <Radio.Group 
            value={failoverTelemetry.scenarioId} 
            onChange={(e) => {
              selectFailoverScenario(e.target.value as FailoverScenarioId);
            }}
            buttonStyle="solid"
            style={{ width: '100%', display: 'flex', gap: 8 }}
          >
            {Object.values(FAILOVER_SCENARIOS).map(sc => (
              <Radio.Button 
                key={sc.id} 
                value={sc.id} 
                style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  backgroundColor: failoverTelemetry.scenarioId === sc.id ? '#0284c7' : '#0f172a',
                  borderColor: '#1e293b',
                  color: '#f8fafc',
                  height: 36,
                  lineHeight: '34px',
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                {sc.name.split('&')[0]}
              </Radio.Button>
            ))}
          </Radio.Group>
        </div>

        {/* Active Scenario Overview & Playback Bar */}
        <Card 
          size="small"
          style={{ backgroundColor: '#090d16', borderColor: '#1e293b', marginBottom: 16 }}
        >
          <Row justify="space-between" align="middle">
            <Col span={14}>
              <Text style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: 14 }}>
                {currentScenario.name}
              </Text>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Standard:</span> {currentScenario.standardReference} • {currentScenario.description}
              </div>
            </Col>
            <Col span={10} style={{ textAlign: 'right' }}>
              <Space wrap>
                {/* Speed Controls */}
                <Radio.Group 
                  size="small" 
                  value={playbackSpeed} 
                  onChange={e => setPlaybackSpeed(e.target.value)}
                  style={{ marginRight: 8 }}
                >
                  <Radio.Button value={1}>1x</Radio.Button>
                  <Radio.Button value={2}>2x</Radio.Button>
                  <Radio.Button value={5}>5x</Radio.Button>
                </Radio.Group>

                {/* Play / Pause */}
                <Button 
                  type="primary" 
                  icon={failoverTelemetry.isRunning ? <PauseOutlined /> : <CaretRightOutlined />}
                  onClick={() => toggleFailoverSimulation()}
                  style={{ backgroundColor: failoverTelemetry.isRunning ? '#eab308' : '#10b981', borderColor: 'transparent', fontWeight: 600 }}
                >
                  {failoverTelemetry.isRunning ? 'Pause' : 'Run Scenario'}
                </Button>

                {/* Step Forward */}
                <Button 
                  icon={<StepForwardOutlined />}
                  disabled={failoverTelemetry.isRunning}
                  onClick={() => stepFailoverTick(1.0)}
                >
                  +1s Step
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Subsystem Telemetry Dashboards */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {/* Subsystem 1: Electrical Power Subsystem */}
          <Col span={8}>
            <Card 
              size="small"
              title={<Space><ThunderboltOutlined style={{ color: '#eab308' }} /><span style={{ color: '#f8fafc', fontSize: 13 }}>Electrical Subsystem (ATS/UPS)</span></Space>}
              style={{ backgroundColor: '#090d16', borderColor: '#1e293b', height: '100%' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>Municipal 400V Grid:</span>
                  <Badge 
                    status={failoverTelemetry.gridUtilityAvailable ? 'success' : 'error'} 
                    text={<span style={{ color: failoverTelemetry.gridUtilityAvailable ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{failoverTelemetry.gridUtilityAvailable ? 'ENERGIZED' : 'FAULT / BLACKOUT'}</span>} 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>ATS Source Selection:</span>
                  <Tag color={failoverTelemetry.atsActiveSource === 'UTILITY_NORMAL' ? '#0284c7' : '#eab308'}>
                    {failoverTelemetry.atsActiveSource}
                  </Tag>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: '#94a3b8' }}>Diesel Generator RPM (1500 max):</span>
                    <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>{failoverTelemetry.generatorRpmPercent}%</span>
                  </div>
                  <Progress 
                    percent={failoverTelemetry.generatorRpmPercent} 
                    strokeColor={failoverTelemetry.generatorRpmPercent === 100 ? '#10b981' : '#f59e0b'}
                    showInfo={false} 
                    size="small"
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: '#94a3b8' }}>UPS Battery Reserve ({failoverTelemetry.upsMode}):</span>
                    <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>{failoverTelemetry.upsBatterySocPercent}%</span>
                  </div>
                  <Progress 
                    percent={failoverTelemetry.upsBatterySocPercent} 
                    strokeColor={failoverTelemetry.upsBatterySocPercent > 30 ? '#10b981' : '#ef4444'}
                    showInfo={false} 
                    size="small"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTop: '1px solid #1e293b' }}>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>Runtime Remaining:</span>
                  <span style={{ color: '#38bdf8', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {failoverTelemetry.upsMinutesRemaining.toFixed(1)} Minutes
                  </span>
                </div>
              </div>
            </Card>
          </Col>

          {/* Subsystem 2: Hydronic Cooling & Thermal Subsystem */}
          <Col span={8}>
            <Card 
              size="small"
              title={<Space><FireOutlined style={{ color: '#06b6d4' }} /><span style={{ color: '#f8fafc', fontSize: 13 }}>Hydronic Cooling (ASHRAE)</span></Space>}
              style={{ backgroundColor: '#090d16', borderColor: '#1e293b', height: '100%' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>Primary Chiller 01:</span>
                  <Badge 
                    status={failoverTelemetry.primaryChillerOnline ? 'success' : 'error'} 
                    text={<span style={{ color: failoverTelemetry.primaryChillerOnline ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{failoverTelemetry.primaryChillerOnline ? 'RUNNING 100%' : 'TRIPPED'}</span>} 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>N+1 Redundant Chiller:</span>
                  <Badge 
                    status={failoverTelemetry.backupChillerOnline ? 'success' : 'default'} 
                    text={<span style={{ color: failoverTelemetry.backupChillerOnline ? '#10b981' : '#94a3b8', fontWeight: 'bold' }}>{failoverTelemetry.backupChillerOnline ? 'ACTIVE ONLINE' : 'HOT STANDBY'}</span>} 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>Chilled Water Supply:</span>
                  <span style={{ color: '#38bdf8', fontWeight: 'bold', fontFamily: 'monospace', fontSize: 13 }}>
                    {failoverTelemetry.chilledWaterSupplyTempC.toFixed(2)} °C
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>Data Hall Ambient:</span>
                  <span style={{ color: failoverTelemetry.dataHallTempC > 25 ? '#ef4444' : '#10b981', fontWeight: 'bold', fontFamily: 'monospace', fontSize: 13 }}>
                    {failoverTelemetry.dataHallTempC.toFixed(2)} °C
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTop: '1px solid #1e293b' }}>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>Buffer Tank Thermal Reserve:</span>
                  <span style={{ color: '#06b6d4', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {failoverTelemetry.bufferTankReserveMinutes.toFixed(1)} Min
                  </span>
                </div>
              </div>
            </Card>
          </Col>

          {/* Subsystem 3: Data Network Subsystem */}
          <Col span={8}>
            <Card 
              size="small"
              title={<Space><ClusterOutlined style={{ color: '#38bdf8' }} /><span style={{ color: '#f8fafc', fontSize: 13 }}>Network Topology & Routing</span></Space>}
              style={{ backgroundColor: '#090d16', borderColor: '#1e293b', height: '100%' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>Primary 100G Fiber:</span>
                  <Badge 
                    status={failoverTelemetry.primaryLinkOnline ? 'success' : 'error'} 
                    text={<span style={{ color: failoverTelemetry.primaryLinkOnline ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{failoverTelemetry.primaryLinkOnline ? 'LINK UP (100G)' : 'SEVERED / CARRIER LOSS'}</span>} 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>Topology State (STP):</span>
                  <Tag color={failoverTelemetry.networkTopologyState === 'OPTIMAL_FORWARDING' ? '#10b981' : failoverTelemetry.networkTopologyState === 'CONVERGING_TCN' ? '#ef4444' : '#06b6d4'}>
                    {failoverTelemetry.networkTopologyState}
                  </Tag>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>Packet Loss:</span>
                  <span style={{ color: failoverTelemetry.packetLossPercent > 0 ? '#ef4444' : '#10b981', fontWeight: 'bold', fontFamily: 'monospace', fontSize: 13 }}>
                    {failoverTelemetry.packetLossPercent}%
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>Convergence Latency:</span>
                  <span style={{ color: '#38bdf8', fontWeight: 'bold', fontFamily: 'monospace', fontSize: 13 }}>
                    {failoverTelemetry.convergenceTimeMs} ms
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTop: '1px solid #1e293b' }}>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>Active Route:</span>
                  <span style={{ color: '#cbd5e1', fontSize: 11, fontFamily: 'monospace' }}>
                    {failoverTelemetry.networkTopologyState === 'REDUNDANT_FORWARDING' ? 'Secondary Trunk 100G' : 'Primary Core Backbone'}
                  </span>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Live Event & Telemetry Console */}
        <Card 
          size="small"
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <CompassOutlined style={{ color: '#38bdf8' }} />
                <span style={{ color: '#f8fafc', fontSize: 13 }}>Real-Time Failover Event Console (Telemetry Log)</span>
              </Space>
              <span style={{ color: '#64748b', fontSize: 11 }}>{failoverTelemetry.eventLogs.length} events logged</span>
            </div>
          }
          style={{ backgroundColor: '#090d16', borderColor: '#1e293b' }}
        >
          <div 
            style={{ 
              maxHeight: 180, 
              overflowY: 'auto', 
              fontFamily: 'monospace', 
              fontSize: 12, 
              display: 'flex', 
              flexDirection: 'column-reverse',
              gap: 6,
              paddingRight: 6
            }}
          >
            {failoverTelemetry.eventLogs.slice().reverse().map((log, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: 8, 
                  backgroundColor: '#0c1322', 
                  padding: '4px 8px', 
                  borderRadius: 4,
                  borderLeft: `3px solid ${getLogSeverityColor(log.severity)}` 
                }}
              >
                <span style={{ color: '#64748b', minWidth: 60 }}>
                  [T+{log.timestampSec.toFixed(1)}s]
                </span>
                <Tag 
                  color="#1e293b" 
                  style={{ 
                    color: getLogSeverityColor(log.severity), 
                    borderColor: getLogSeverityColor(log.severity),
                    fontSize: 10,
                    margin: 0,
                    lineHeight: '18px'
                  }}
                >
                  {log.severity}
                </Tag>
                <span style={{ color: '#38bdf8', minWidth: 90 }}>
                  {log.subsystem}:
                </span>
                <span style={{ color: '#cbd5e1', flex: 1 }}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Modal>
  );
};
