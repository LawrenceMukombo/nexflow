import React, { useState } from 'react';
import { Modal, Tabs, Tag, Badge, Button } from 'antd';
import { 
  ApartmentOutlined, 
  FileTextOutlined, 
  SendOutlined, 
  BranchesOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { PduDetails } from '@omniflow/shared-types';

export const PduInspectorModal: React.FC = () => {
  const { 
    isPduModalOpen, 
    closePduModal, 
    selectedPdu 
  } = useGraphStore();

  const [activeTab, setActiveTab] = useState<'osi' | 'inbound' | 'outbound'>('osi');

  if (!selectedPdu) return null;

  const pdu: PduDetails = selectedPdu;

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f8fafc' }}>
            <div style={{ 
              width: 28, 
              height: 28, 
              borderRadius: 6, 
              background: '#0284c7', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 14 
            }}>
              ✉️
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                PDU Information at Device: <span style={{ color: '#38bdf8' }}>{pdu.currentDeviceTag}</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Packet Tracer PDU & OSI Layer Inspection Tool
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Tag color="#a855f7" style={{ fontWeight: 700 }}>{pdu.protocol}</Tag>
            <Tag color="#0284c7">{pdu.sourceTag} ➔ {pdu.targetTag}</Tag>
          </div>
        </div>
      }
      open={isPduModalOpen}
      onCancel={closePduModal}
      footer={[
        <Button key="close" type="primary" onClick={closePduModal} style={{ backgroundColor: '#0284c7' }}>
          Close PDU Inspector
        </Button>
      ]}
      width={780}
      styles={{
        content: { backgroundColor: '#090d16', border: '1px solid #1e293b' },
        header: { backgroundColor: '#090d16', borderBottom: '1px solid #1e293b' },
        footer: { backgroundColor: '#090d16', borderTop: '1px solid #1e293b' }
      }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as any)}
        items={[
          {
            key: 'osi',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ApartmentOutlined /> OSI Model (Layers 1-7)
              </span>
            ),
            children: (
              <div style={{ marginTop: 8 }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: 16, 
                  backgroundColor: '#0f172a', 
                  padding: 14, 
                  borderRadius: 8,
                  border: '1px solid #1e293b'
                }}>
                  {/* IN LAYERS */}
                  <div>
                    <div style={{ 
                      fontSize: 12, 
                      fontWeight: 700, 
                      color: '#38bdf8', 
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6 
                    }}>
                      <SendOutlined rotate={180} /> In Layers (Arrival Process)
                    </div>

                    {pdu.inLayers.length === 0 ? (
                      <div style={{ padding: 12, color: '#64748b', fontSize: 11, fontStyle: 'italic', backgroundColor: '#1e293b', borderRadius: 6 }}>
                        Source device origin: Packet originates locally at Application Layer (No In Layers).
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {pdu.inLayers.map((layer) => (
                          <div 
                            key={`in_${layer.layer}`}
                            style={{
                              backgroundColor: '#1e293b',
                              borderLeft: '3px solid #38bdf8',
                              padding: '8px 10px',
                              borderRadius: 4
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc' }}>
                                Layer {layer.layer}: {layer.layerName}
                              </span>
                              <Badge status="success" text={<span style={{ fontSize: 10, color: '#10b981' }}>Processed</span>} />
                            </div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', lineHeight: 1.4 }}>
                              {layer.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* OUT LAYERS */}
                  <div>
                    <div style={{ 
                      fontSize: 12, 
                      fontWeight: 700, 
                      color: '#10b981', 
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6 
                    }}>
                      <SendOutlined /> Out Layers (Forwarding / Egress)
                    </div>

                    {pdu.outLayers.length === 0 ? (
                      <div style={{ padding: 12, color: '#64748b', fontSize: 11, fontStyle: 'italic', backgroundColor: '#1e293b', borderRadius: 6 }}>
                        Final destination reached: Packet consumed locally by destination process (No Out Layers).
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {pdu.outLayers.map((layer) => (
                          <div 
                            key={`out_${layer.layer}`}
                            style={{
                              backgroundColor: '#1e293b',
                              borderLeft: '3px solid #10b981',
                              padding: '8px 10px',
                              borderRadius: 4
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#f8fafc' }}>
                                Layer {layer.layer}: {layer.layerName}
                              </span>
                              <Badge status="processing" text={<span style={{ fontSize: 10, color: '#38bdf8' }}>Forwarding</span>} />
                            </div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', lineHeight: 1.4 }}>
                              {layer.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          },
          {
            key: 'inbound',
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileTextOutlined /> Inbound PDU Details
              </span>
            ),
            children: (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* 1. Ethernet II Header */}
                <div style={{ backgroundColor: '#0f172a', padding: 12, borderRadius: 6, border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BranchesOutlined /> Ethernet II Frame Header
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontFamily: 'monospace', fontSize: 11 }}>
                    <div style={{ backgroundColor: '#1e293b', padding: '6px 8px', borderRadius: 4 }}>
                      <div style={{ color: '#64748b', fontSize: 9.5 }}>PREAMBLE</div>
                      <div style={{ color: '#cbd5e1', fontWeight: 600 }}>{pdu.ethernetHeader.preamble.slice(0, 10)}...</div>
                    </div>
                    <div style={{ backgroundColor: '#1e293b', padding: '6px 8px', borderRadius: 4 }}>
                      <div style={{ color: '#64748b', fontSize: 9.5 }}>DESTINATION MAC</div>
                      <div style={{ color: '#38bdf8', fontWeight: 700 }}>{pdu.ethernetHeader.destMac}</div>
                    </div>
                    <div style={{ backgroundColor: '#1e293b', padding: '6px 8px', borderRadius: 4 }}>
                      <div style={{ color: '#64748b', fontSize: 9.5 }}>SOURCE MAC</div>
                      <div style={{ color: '#10b981', fontWeight: 700 }}>{pdu.ethernetHeader.srcMac}</div>
                    </div>
                    <div style={{ backgroundColor: '#1e293b', padding: '6px 8px', borderRadius: 4 }}>
                      <div style={{ color: '#64748b', fontSize: 9.5 }}>ETHERTYPE</div>
                      <div style={{ color: '#f59e0b', fontWeight: 600 }}>{pdu.ethernetHeader.typeHex}</div>
                    </div>
                  </div>
                </div>

                {/* 2. IPv4 Header */}
                <div style={{ backgroundColor: '#0f172a', padding: 12, borderRadius: 6, border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BranchesOutlined /> Internet Protocol Version 4 (IPv4) Header
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontFamily: 'monospace', fontSize: 11 }}>
                    <div style={{ backgroundColor: '#1e293b', padding: '6px 8px', borderRadius: 4 }}>
                      <div style={{ color: '#64748b', fontSize: 9.5 }}>VERSION / IHL</div>
                      <div style={{ color: '#cbd5e1' }}>IPv{pdu.ipHeader.version} • {pdu.ipHeader.ihl * 4} Bytes</div>
                    </div>
                    <div style={{ backgroundColor: '#1e293b', padding: '6px 8px', borderRadius: 4 }}>
                      <div style={{ color: '#64748b', fontSize: 9.5 }}>TTL (TIME TO LIVE)</div>
                      <div style={{ color: '#cbd5e1' }}>{pdu.ipHeader.ttl}</div>
                    </div>
                    <div style={{ backgroundColor: '#1e293b', padding: '6px 8px', borderRadius: 4 }}>
                      <div style={{ color: '#64748b', fontSize: 9.5 }}>SOURCE IP</div>
                      <div style={{ color: '#10b981', fontWeight: 700 }}>{pdu.ipHeader.srcIp}</div>
                    </div>
                    <div style={{ backgroundColor: '#1e293b', padding: '6px 8px', borderRadius: 4 }}>
                      <div style={{ color: '#64748b', fontSize: 9.5 }}>DESTINATION IP</div>
                      <div style={{ color: '#38bdf8', fontWeight: 700 }}>{pdu.ipHeader.destIp}</div>
                    </div>
                  </div>
                </div>

                {/* 3. ICMP / Protocol Payload Header */}
                <div style={{ backgroundColor: '#0f172a', padding: 12, borderRadius: 6, border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#a855f7', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileTextOutlined /> {pdu.protocol} Protocol Payload Header
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontFamily: 'monospace', fontSize: 11 }}>
                    <div style={{ backgroundColor: '#1e293b', padding: '6px 8px', borderRadius: 4 }}>
                      <div style={{ color: '#64748b', fontSize: 9.5 }}>TYPE</div>
                      <div style={{ color: '#cbd5e1' }}>
                        {pdu.payloadHeader?.icmpType !== undefined ? `Type ${pdu.payloadHeader.icmpType}` : pdu.protocol}
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#1e293b', padding: '6px 8px', borderRadius: 4 }}>
                      <div style={{ color: '#64748b', fontSize: 9.5 }}>SEQUENCE NUMBER</div>
                      <div style={{ color: '#cbd5e1' }}>seq={pdu.payloadHeader?.seqNum ?? 1}</div>
                    </div>
                    <div style={{ backgroundColor: '#1e293b', padding: '6px 8px', borderRadius: 4 }}>
                      <div style={{ color: '#64748b', fontSize: 9.5 }}>INFO</div>
                      <div style={{ color: '#38bdf8' }}>{pdu.payloadHeader?.info || 'Echo Payload'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }
        ]}
      />
    </Modal>
  );
};
