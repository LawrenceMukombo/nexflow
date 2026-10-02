import React from 'react';
import { Tooltip, message } from 'antd';
import { EngineeringComponent } from '@omniflow/shared-types';
import { useGraphStore } from '../store/graphStore';

interface SwitchFaceplateProps {
  node: EngineeringComponent;
}

export const SwitchFaceplate: React.FC<SwitchFaceplateProps> = ({ node }) => {
  const { graph, startConnection, pendingPort } = useGraphStore();

  const isSwitch = node.type.includes('SWITCH') || node.type.includes('PATCH');
  const isRouter = node.type.includes('ROUTER') || node.type.includes('FIREWALL');

  if (!isSwitch && !isRouter) return null;

  const totalPorts = node.ports.length;

  return (
    <div
      style={{
        backgroundColor: '#070b14',
        border: '2px solid #1e293b',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.5)',
        position: 'relative'
      }}
    >
      {/* 1U Chassis Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: '1px solid #1e293b', paddingBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: node.simulationState.isFailed ? '#ef4444' : '#10b981', boxShadow: node.simulationState.isFailed ? '0 0 6px #ef4444' : '0 0 6px #10b981' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc', letterSpacing: 0.5, fontFamily: 'monospace' }}>
            {node.tag} • {node.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>
          <span>1U CHASSIS</span>
          <span>•</span>
          <span style={{ color: '#38bdf8' }}>{totalPorts} PORTS</span>
        </div>
      </div>

      {/* Port Jacks Grid (Dual Row 1U layout) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(12, Math.ceil(totalPorts / 2))}, 1fr)`,
          gap: 6,
          backgroundColor: '#020617',
          padding: '8px',
          borderRadius: 6,
          border: '1px solid #0f172a'
        }}
      >
        {node.ports.map((port, idx) => {
          const isOccupied = Boolean(
            port.occupiedByConnectionId ||
            Object.values(graph.connections).some(c => c.sourcePortId === port.id || c.targetPortId === port.id)
          );

          // Find connected remote device if occupied
          let remoteDeviceTag = 'None';
          let cableType = 'N/A';
          if (isOccupied) {
            const conn = Object.values(graph.connections).find(c => c.sourcePortId === port.id || c.targetPortId === port.id);
            if (conn) {
              const remoteId = conn.sourceComponentId === node.id ? conn.targetComponentId : conn.sourceComponentId;
              const remoteNode = graph.nodes[remoteId];
              if (remoteNode) {
                remoteDeviceTag = `${remoteNode.tag} (${remoteNode.name})`;
              }
              cableType = conn.connectionType;
            }
          }

          const isFiber = port.type.includes('FIBER') || port.type.includes('SFP');
          const isPendingSource = pendingPort && pendingPort.nodeId === node.id && pendingPort.portId === port.id;

          const tooltipContent = (
            <div style={{ fontSize: 11 }}>
              <div style={{ fontWeight: 700, color: '#38bdf8' }}>{port.name}</div>
              <div>Type: {port.type} ({port.capacity} Mbps)</div>
              <div>Status: <span style={{ color: isOccupied ? '#10b981' : '#94a3b8' }}>{isOccupied ? 'Connected' : 'Available'}</span></div>
              {isOccupied && (
                <>
                  <div>Remote: <span style={{ color: '#facc15' }}>{remoteDeviceTag}</span></div>
                  <div>Cable: {cableType}</div>
                </>
              )}
              {!isOccupied && (
                <div style={{ color: '#38bdf8', marginTop: 4 }}>💡 Click to wire new connection from this port</div>
              )}
            </div>
          );

          return (
            <Tooltip key={port.id} title={tooltipContent}>
              <div
                onClick={() => {
                  if (isOccupied) {
                    message.info(`Port ${port.name} is currently connected to ${remoteDeviceTag}`);
                  } else {
                    startConnection(node.id, port.id);
                    message.info(`Connecting from ${node.tag}:${port.name}. Select target device to wire...`);
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '4px 2px',
                  borderRadius: 4,
                  backgroundColor: isPendingSource ? 'rgba(56, 189, 248, 0.25)' : isOccupied ? '#0f172a' : '#090d16',
                  border: isPendingSource ? '1px dashed #38bdf8' : isOccupied ? '1px solid #1e293b' : '1px solid #0f172a',
                  cursor: isOccupied ? 'default' : 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {/* Port Activity LED */}
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: isOccupied ? '#10b981' : '#334155',
                    boxShadow: isOccupied ? '0 0 4px #10b981' : 'none',
                    marginBottom: 3
                  }}
                />

                {/* RJ45 / SFP Port Jack Visual */}
                <div
                  style={{
                    width: isFiber ? 20 : 18,
                    height: 14,
                    backgroundColor: isFiber ? '#1e1b4b' : '#1e293b',
                    borderRadius: 2,
                    border: isOccupied ? '1px solid #38bdf8' : '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}
                >
                  {/* Metal Pins Inside Jack */}
                  <div
                    style={{
                      width: '60%',
                      height: 3,
                      backgroundColor: isOccupied ? '#facc15' : '#475569',
                      borderRadius: 1
                    }}
                  />
                </div>

                {/* Port Index Label */}
                <span style={{ fontSize: 8.5, color: '#64748b', marginTop: 2, fontFamily: 'monospace' }}>
                  {idx + 1}
                </span>
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};
