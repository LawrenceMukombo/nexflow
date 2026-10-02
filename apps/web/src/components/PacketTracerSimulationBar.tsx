import React, { useState } from 'react';
import { Button, Tooltip, Tag, Drawer, Radio, message, Badge, Space } from 'antd';
import { 
  StepForwardOutlined, 
  PlayCircleFilled, 
  PauseCircleFilled, 
  ReloadOutlined, 
  SendOutlined, 
  TableOutlined, 
  SearchOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';

export const PacketTracerSimulationBar: React.FC = () => {
  const {
    networkMode,
    setNetworkMode,
    isSimulating,
    toggleSimulation,
    simulationEvents,
    scenarios,
    isAddingPdu,
    toggleAddPduMode,
    stepSimulationForward,
    resetSimulationEvents,
    openPduModal
  } = useGraphStore();

  const [isEventListOpen, setIsEventListOpen] = useState(false);
  const [protocolFilter, setProtocolFilter] = useState<string>('ALL');

  const filteredEvents = protocolFilter === 'ALL'
    ? simulationEvents
    : simulationEvents.filter(e => e.type === protocolFilter);

  return (
    <>
      {/* Floating Bottom Packet Tracer Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid #1e293b',
          borderRadius: 8,
          padding: '6px 12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)'
        }}
      >
        {/* Realtime vs Simulation Mode Radio Switch */}
        <Radio.Group
          value={networkMode}
          onChange={(e) => {
            const mode = e.target.value;
            setNetworkMode(mode);
            message.info(mode === 'SIMULATION' ? 'Switched to Packet Tracer Simulation Mode (Step-by-Step)' : 'Switched to Realtime Mode');
          }}
          size="small"
          buttonStyle="solid"
        >
          <Radio.Button value="REALTIME" style={{ fontSize: 11, fontWeight: 600 }}>
            ⏱️ Realtime
          </Radio.Button>
          <Radio.Button value="SIMULATION" style={{ fontSize: 11, fontWeight: 600 }}>
            🔬 Simulation
          </Radio.Button>
        </Radio.Group>

        <div style={{ width: 1, height: 18, backgroundColor: '#334155' }} />

        {/* Simulation Mode Stepper Controls */}
        {networkMode === 'SIMULATION' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tooltip title="Reset Simulation (Clear Packets & Events)">
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => {
                  resetSimulationEvents();
                  message.info('Simulation reset to initial state');
                }}
                style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
              />
            </Tooltip>

            <Tooltip title={isSimulating ? 'Pause Auto-Capture' : 'Auto-Capture / Play'}>
              <Button
                size="small"
                type="primary"
                icon={isSimulating ? <PauseCircleFilled /> : <PlayCircleFilled />}
                onClick={() => toggleSimulation()}
                style={{ backgroundColor: isSimulating ? '#eab308' : '#10b981', borderColor: 'transparent' }}
              >
                {isSimulating ? 'Pause' : 'Auto-Capture'}
              </Button>
            </Tooltip>

            <Tooltip title="Capture / Forward (Advance 1 Hop)">
              <Button
                size="small"
                type="primary"
                icon={<StepForwardOutlined />}
                onClick={() => {
                  stepSimulationForward();
                }}
                style={{ backgroundColor: '#0284c7', borderColor: '#38bdf8', fontWeight: 600 }}
              >
                Capture / Forward
              </Button>
            </Tooltip>
          </div>
        ) : (
          /* Realtime Controls */
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tooltip title={isSimulating ? 'Pause Simulation' : 'Run Realtime Simulation'}>
              <Button
                size="small"
                type="primary"
                icon={isSimulating ? <PauseCircleFilled /> : <PlayCircleFilled />}
                onClick={() => toggleSimulation()}
                style={{ backgroundColor: isSimulating ? '#eab308' : '#10b981', borderColor: 'transparent' }}
              >
                {isSimulating ? 'Pause' : 'Play'}
              </Button>
            </Tooltip>
          </div>
        )}

        <div style={{ width: 1, height: 18, backgroundColor: '#334155' }} />

        {/* Simple PDU Tool Button (The Packet Tracer Envelope) */}
        <Tooltip title="Add Simple PDU (Click Source device, then Destination device to Ping)">
          <Button
            size="small"
            type={isAddingPdu ? 'primary' : 'default'}
            icon={<SendOutlined />}
            onClick={() => {
              toggleAddPduMode(!isAddingPdu);
              if (!isAddingPdu) {
                message.info('✉️ Simple PDU Mode: Click Source device on canvas, then Destination device.');
              }
            }}
            style={{ 
              backgroundColor: isAddingPdu ? '#a855f7' : '#1e293b', 
              borderColor: isAddingPdu ? '#c084fc' : '#334155', 
              color: '#f8fafc',
              fontWeight: 600,
              fontSize: 11
            }}
          >
            ✉️ Simple PDU
          </Button>
        </Tooltip>

        {/* Event List Sniffer Drawer Trigger */}
        <Tooltip title="Event List (Packet Tracer Sniffer & PDU Inspector)">
          <Button
            size="small"
            icon={<TableOutlined />}
            onClick={() => setIsEventListOpen(true)}
            style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', fontSize: 11 }}
          >
            <span>Event List</span>
            <Badge count={simulationEvents.length} style={{ backgroundColor: '#0284c7', marginLeft: 6, fontSize: 9 }} />
          </Button>
        </Tooltip>
      </div>

      {/* Packet Tracer Event List & Sniffer Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc' }}>
              <span>📋 Packet Tracer Simulation Event List (Sniffer)</span>
              <Tag color="#0284c7">{simulationEvents.length} Events Logged</Tag>
            </div>
            <Space>
              <Radio.Group 
                size="small" 
                value={protocolFilter} 
                onChange={(e) => setProtocolFilter(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value="ALL">All</Radio.Button>
                <Radio.Button value="ICMP">ICMP</Radio.Button>
                <Radio.Button value="ARP">ARP</Radio.Button>
                <Radio.Button value="TCP">TCP</Radio.Button>
                <Radio.Button value="DNS">DNS</Radio.Button>
              </Radio.Group>
              <Button size="small" danger onClick={resetSimulationEvents}>
                Clear Events
              </Button>
            </Space>
          </div>
        }
        placement="bottom"
        height={320}
        open={isEventListOpen}
        onClose={() => setIsEventListOpen(false)}
        styles={{
          body: { backgroundColor: '#090d16', padding: 8 },
          header: { backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b' }
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>VIS</th>
                <th style={{ padding: '6px 8px' }}>TIME (S)</th>
                <th style={{ padding: '6px 8px' }}>LAST DEVICE</th>
                <th style={{ padding: '6px 8px' }}>AT DEVICE</th>
                <th style={{ padding: '6px 8px' }}>TYPE</th>
                <th style={{ padding: '6px 8px' }}>INFO</th>
                <th style={{ padding: '6px 8px' }}>INSPECT PDU</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                    No packet events captured yet. Click "Simple PDU" or run a ping to trace packets!
                  </td>
                </tr>
              ) : (
                filteredEvents.slice().reverse().map((evt) => (
                  <tr 
                    key={evt.id} 
                    style={{ borderBottom: '1px solid #1e293b', color: '#cbd5e1' }}
                    className="hover:bg-slate-800"
                  >
                    <td style={{ padding: '5px 8px' }}>
                      <span style={{ color: evt.color }}>✉️</span>
                    </td>
                    <td style={{ padding: '5px 8px', color: '#38bdf8' }}>
                      {evt.timeSec.toFixed(3)}
                    </td>
                    <td style={{ padding: '5px 8px' }}>{evt.lastDeviceTag}</td>
                    <td style={{ padding: '5px 8px', fontWeight: 600, color: '#f8fafc' }}>
                      {evt.atDeviceTag}
                    </td>
                    <td style={{ padding: '5px 8px' }}>
                      <Tag color={evt.color} style={{ fontSize: 10, margin: 0, fontWeight: 700 }}>
                        {evt.type}
                      </Tag>
                    </td>
                    <td style={{ padding: '5px 8px', color: '#94a3b8' }}>{evt.info}</td>
                    <td style={{ padding: '5px 8px' }}>
                      <Button
                        size="small"
                        type="primary"
                        ghost
                        icon={<SearchOutlined />}
                        onClick={() => openPduModal(evt.pdu)}
                        style={{ fontSize: 10, height: 22, padding: '0 6px' }}
                      >
                        Inspect OSI
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Drawer>

      {/* Packet Tracer Scenario Results Tray (Bottom Left) */}
      {scenarios.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 35,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid #1e293b',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 11,
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{ fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✉️ PDU Scenario:</span>
          </div>
          {scenarios.slice(-1).map((scen) => (
            <div key={scen.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace' }}>
              <span>{scen.sourceTag} ➔ {scen.destTag}</span>
              <Tag 
                color={scen.status === 'Successful' ? 'green' : scen.status === 'In Progress' ? 'processing' : 'error'}
                style={{ margin: 0, fontWeight: 700, fontSize: 10 }}
              >
                {scen.status}
              </Tag>
              <span style={{ color: '#64748b' }}>({scen.timeSec.toFixed(3)}s)</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
