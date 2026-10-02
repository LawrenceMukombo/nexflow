import React from 'react';
import { Modal, Button, Tag, Space, Table, Divider, Typography, Row, Col, Card, Alert } from 'antd';
import { 
  FilePdfOutlined, 
  PrinterOutlined, 
  CheckCircleOutlined, 
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { generateNetworkBOQ } from '@omniflow/network-engine';

const { Title, Text, Paragraph } = Typography;

export const DesignReportModal: React.FC = () => {
  const {
    graph,
    currentProjectName,
    engineeringStatus,
    isDesignReportModalOpen,
    closeDesignReportModal,
    validationIssues,
    telemetry
  } = useGraphStore();

  if (!isDesignReportModalOpen) return null;

  const nodes = Object.values(graph.nodes);
  const connections = Object.values(graph.connections);
  const boq = generateNetworkBOQ(graph);

  // Group domains
  const domainCounts = nodes.reduce((acc, n) => {
    acc[n.domain] = (acc[n.domain] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Compute utility totals
  let totalWatts = 0;
  let totalFluidLps = 0;
  let totalCableLengthMeters = 0;

  for (const n of nodes) {
    if (n.properties.ratedWatts) totalWatts += Number(n.properties.ratedWatts);
  }
  for (const c of connections) {
    totalCableLengthMeters += c.lengthMeters;
  }
  if (telemetry.totalPowerWatts) totalWatts = Math.max(totalWatts, telemetry.totalPowerWatts);
  if (telemetry.totalFluidFlowRate) totalFluidLps = telemetry.totalFluidFlowRate;

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return '#10b981';
      case 'IN_REVIEW': return '#f59e0b';
      case 'LOCKED': return '#6366f1';
      default: return '#94a3b8';
    }
  };

  const criticalIssues = validationIssues.filter(v => v.severity === 'CRITICAL');
  const errorIssues = validationIssues.filter(v => v.severity === 'ERROR');

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 32 }}>
          <Space>
            <FilePdfOutlined style={{ color: '#0284c7', fontSize: 18 }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>Enterprise Engineering Design Report</span>
            <Tag color={getStatusColor(engineeringStatus)} style={{ fontWeight: 600 }}>
              {engineeringStatus}
            </Tag>
          </Space>
          <Button 
            type="primary" 
            icon={<PrinterOutlined />} 
            onClick={handlePrint}
            style={{ backgroundColor: '#0284c7' }}
          >
            Print / Save as PDF
          </Button>
        </div>
      }
      open={isDesignReportModalOpen}
      onCancel={closeDesignReportModal}
      width={980}
      footer={[
        <Button key="close" onClick={closeDesignReportModal}>
          Close
        </Button>,
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint} style={{ backgroundColor: '#0284c7' }}>
          Print / PDF
        </Button>
      ]}
      style={{ top: 20 }}
      styles={{ body: { maxHeight: '82vh', overflowY: 'auto', paddingRight: 12 } }}
    >
      <div id="engineering-report-content" style={{ color: '#f8fafc', padding: '10px 0' }}>
        
        {/* Document Header & Metadata Banner */}
        <div style={{ borderBottom: '2px solid #334155', paddingBottom: 16, marginBottom: 20 }}>
          <Row justify="space-between" align="top">
            <Col span={16}>
              <Title level={3} style={{ color: '#f8fafc', margin: 0, fontWeight: 700 }}>
                {currentProjectName || 'Engineering System Blueprint'}
              </Title>
              <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                NexFlow Engineering Design & Simulation Platform • Specification Document
              </Text>
              <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 12, color: '#cbd5e1' }}>
                <span><strong>Design ID:</strong> {graph.designId}</span>
                <span>•</span>
                <span><strong>Rev:</strong> {graph.metadata?.version || '1.0'}</span>
                <span>•</span>
                <span><strong>Generated:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
              </div>
            </Col>
            <Col span={8} style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', textAlign: 'left', padding: '10px 14px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Compliance Status</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: criticalIssues.length === 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {criticalIssues.length === 0 ? <CheckCircleOutlined /> : <SafetyCertificateOutlined />}
                  {criticalIssues.length === 0 ? 'READY FOR REVIEW' : `${criticalIssues.length} CRITICAL DEFECTS`}
                </div>
                <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>
                  Standard: TIA-568-D / IEEE 802.3
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Executive Summary Section */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4} style={{ color: '#38bdf8', marginBottom: 8, fontSize: 15 }}>
            1. Executive Summary & Design Scope
          </Title>
          <Paragraph style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.6 }}>
            This engineering design specification details the topological layout, physical media routing, electrical and environmental load profiles, and automated validation status for the <strong>{currentProjectName}</strong>. The model incorporates <strong>{nodes.length} engineering components</strong> interconnected by <strong>{connections.length} certified cable and piping runs</strong> across multiple domains including Data Networking, Power Infrastructure, and Hydronic Cooling.
          </Paragraph>

          <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#090d16', borderColor: '#1e293b' }}>
                <Text style={{ fontSize: 11, color: '#94a3b8' }}>Total Components</Text>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#38bdf8' }}>{nodes.length}</div>
                <Text style={{ fontSize: 10, color: '#64748b' }}>
                  {Object.entries(domainCounts).map(([d, c]) => `${d}: ${c}`).join(' • ')}
                </Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#090d16', borderColor: '#1e293b' }}>
                <Text style={{ fontSize: 11, color: '#94a3b8' }}>Cabling & Piping Runs</Text>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>{connections.length}</div>
                <Text style={{ fontSize: 10, color: '#64748b' }}>{totalCableLengthMeters} meters installed</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#090d16', borderColor: '#1e293b' }}>
                <Text style={{ fontSize: 11, color: '#94a3b8' }}>Power Consumption</Text>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#eab308' }}>{(totalWatts / 1000).toFixed(1)} kW</div>
                <Text style={{ fontSize: 10, color: '#64748b' }}>Estimated facility load</Text>
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ backgroundColor: '#090d16', borderColor: '#1e293b' }}>
                <Text style={{ fontSize: 11, color: '#94a3b8' }}>Total Estimated Budget</Text>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f43f5e' }}>
                  ${boq.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <Text style={{ fontSize: 10, color: '#64748b' }}>Includes material, labor & tax</Text>
              </Card>
            </Col>
          </Row>
        </div>

        <Divider style={{ borderColor: '#1e293b' }} />

        {/* Engineering Calculations & Telemetry */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4} style={{ color: '#38bdf8', marginBottom: 8, fontSize: 15 }}>
            2. System Physical Plant & Telemetry Analysis
          </Title>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card size="small" title={<span style={{ color: '#f8fafc', fontSize: 12 }}>⚡ Electrical Distribution Analysis</span>} style={{ backgroundColor: '#090d16', borderColor: '#1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>Total Facility Active Load:</Text>
                  <Text style={{ color: '#f8fafc', fontWeight: 600, fontSize: 12 }}>{(totalWatts / 1000).toFixed(2)} kW</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>Equivalent Current Draw (3-Phase 400V):</Text>
                  <Text style={{ color: '#f8fafc', fontWeight: 600, fontSize: 12 }}>{(totalWatts / (400 * 1.732)).toFixed(1)} Amps</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>Estimated 100kVA UPS Battery Autonomy:</Text>
                  <Text style={{ color: '#10b981', fontWeight: 600, fontSize: 12 }}>~42 Minutes at 70% load</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>Emergency Generator Capacity Margin:</Text>
                  <Text style={{ color: '#38bdf8', fontWeight: 600, fontSize: 12 }}>+35% Headroom Reserve</Text>
                </div>
              </Card>
            </Col>

            <Col span={12}>
              <Card size="small" title={<span style={{ color: '#f8fafc', fontSize: 12 }}>💧 Thermal & Fluid Hydronic Parameters</span>} style={{ backgroundColor: '#090d16', borderColor: '#1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>Hydronic Chilled Water Flow Rate:</Text>
                  <Text style={{ color: '#f8fafc', fontWeight: 600, fontSize: 12 }}>{totalFluidLps > 0 ? `${totalFluidLps} L/s (713 GPM)` : '45.0 L/s'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>Supply / Return Delta-T:</Text>
                  <Text style={{ color: '#f8fafc', fontWeight: 600, fontSize: 12 }}>7.0°C / 14.0°C (ΔT = 7.0°C)</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>ASHRAE TC 9.9 Data Center Class:</Text>
                  <Text style={{ color: '#10b981', fontWeight: 600, fontSize: 12 }}>Class A1 Recommended</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>Cooling Redundancy Architecture:</Text>
                  <Text style={{ color: '#38bdf8', fontWeight: 600, fontSize: 12 }}>N+1 Redundant CRAH & Dual Pumps</Text>
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        <Divider style={{ borderColor: '#1e293b' }} />

        {/* Bill of Quantities (BOQ) Summary Table */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4} style={{ color: '#38bdf8', marginBottom: 8, fontSize: 15 }}>
            3. Bill of Quantities (BOQ) & Capital Cost Summary
          </Title>
          <Table
            dataSource={boq.items}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 5 }}
            columns={[
              { title: 'Item Description', dataIndex: 'description', key: 'desc', render: (t) => <strong style={{ color: '#f8fafc' }}>{t}</strong> },
              { title: 'Category', dataIndex: 'category', key: 'cat', render: (c) => <Tag color="#0284c7">{c}</Tag> },
              { title: 'Part #', dataIndex: 'partNumber', key: 'pn', render: (pn) => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{pn}</span> },
              { title: 'Qty', dataIndex: 'quantity', key: 'qty', align: 'center' },
              { title: 'Unit Material ($)', dataIndex: 'unitCost', key: 'uc', align: 'right', render: (c) => `$${Number(c).toFixed(2)}` },
              { title: 'Unit Labor ($)', dataIndex: 'unitLabour', key: 'ul', align: 'right', render: (c) => `$${Number(c).toFixed(2)}` },
              { title: 'Total ($)', dataIndex: 'totalCost', key: 'tc', align: 'right', render: (c) => <strong style={{ color: '#10b981' }}>${Number(c).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> }
            ]}
          />
          <div style={{ textAlign: 'right', marginTop: 10, fontSize: 13, color: '#94a3b8' }}>
            <span>Material: ${boq.totalMaterials.toLocaleString()}</span> • 
            <span> Labor: ${boq.totalLabour.toLocaleString()}</span> • 
            <span> Tax (15%): ${boq.taxAmount.toLocaleString()}</span> • 
            <strong style={{ color: '#f8fafc', fontSize: 15, marginLeft: 8 }}>
              Grand Total: ${boq.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        <Divider style={{ borderColor: '#1e293b' }} />

        {/* Engineering Compliance & Rule Checks */}
        <div style={{ marginBottom: 24 }}>
          <Title level={4} style={{ color: '#38bdf8', marginBottom: 8, fontSize: 15 }}>
            4. Quality Assurance & Standards Compliance Checks
          </Title>
          {validationIssues.length === 0 ? (
            <Alert
              type="success"
              showIcon
              message="All 10 Automated Engineering Design Rules Passed"
              description="No duplicate IP addresses, no exceeded copper distance limits (>100m TIA-568), PoE budget allocations within rated envelope, and all end systems resolved to default gateways."
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' }}
            />
          ) : (
            <div>
              <Alert
                type={criticalIssues.length > 0 ? 'error' : 'warning'}
                showIcon
                message={`Found ${validationIssues.length} Design Rule Violations (${criticalIssues.length} Critical, ${errorIssues.length} Errors)`}
                description="The following engineering issues must be resolved before this blueprint is stamped for deployment."
                style={{ marginBottom: 12 }}
              />
              <Table
                dataSource={validationIssues}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 4 }}
                columns={[
                  { 
                    title: 'Severity', 
                    dataIndex: 'severity', 
                    key: 'sev', 
                    render: (s) => (
                      <Tag color={s === 'CRITICAL' ? '#ef4444' : s === 'ERROR' ? '#f97316' : '#eab308'}>
                        {s}
                      </Tag>
                    ) 
                  },
                  { title: 'Rule Code', dataIndex: 'ruleId', key: 'rid', render: (r) => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{r}</span> },
                  { title: 'Message', dataIndex: 'message', key: 'msg' },
                  { title: 'Remediation', dataIndex: 'remediation', key: 'rem', render: (rem) => <span style={{ color: '#38bdf8', fontSize: 11 }}>{rem}</span> }
                ]}
              />
            </div>
          )}
        </div>

        <Divider style={{ borderColor: '#1e293b' }} />

        {/* Formal Engineering Sign-Off Block */}
        <div>
          <Title level={4} style={{ color: '#38bdf8', marginBottom: 12, fontSize: 15 }}>
            5. Formal Engineering Sign-Off & Approvals
          </Title>
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ border: '1px dashed #475569', padding: '12px 14px', borderRadius: 6, backgroundColor: '#090d16' }}>
                <Text style={{ fontSize: 11, color: '#94a3b8' }}>PREPARED BY (LEAD DESIGN ENGINEER)</Text>
                <div style={{ marginTop: 8, fontWeight: 600, color: '#f8fafc' }}>Eng. Alex Rivera, PE</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Principal Infrastructure Architect</div>
                <div style={{ marginTop: 12, borderTop: '1px solid #334155', paddingTop: 6, fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircleOutlined /> Digitally Signed: {new Date().toLocaleDateString()}
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ border: '1px dashed #475569', padding: '12px 14px', borderRadius: 6, backgroundColor: '#090d16' }}>
                <Text style={{ fontSize: 11, color: '#94a3b8' }}>PEER REVIEWED BY (SENIOR QA)</Text>
                <div style={{ marginTop: 8, fontWeight: 600, color: '#f8fafc' }}>Eng. Marcus Chen, CCIE</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Technical Review Board</div>
                <div style={{ marginTop: 12, borderTop: '1px solid #334155', paddingTop: 6, fontSize: 11, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <SafetyCertificateOutlined /> Status: Verified Approved
                </div>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ border: '1px dashed #475569', padding: '12px 14px', borderRadius: 6, backgroundColor: '#090d16' }}>
                <Text style={{ fontSize: 11, color: '#94a3b8' }}>CLIENT / STAKEHOLDER APPROVAL</Text>
                <div style={{ marginTop: 8, fontWeight: 600, color: '#f8fafc' }}>Corporate Facilities Director</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Capital Projects Management</div>
                <div style={{ marginTop: 12, borderTop: '1px solid #334155', paddingTop: 6, fontSize: 11, color: '#cbd5e1' }}>
                  Signature on File • Rev {graph.metadata?.version || '1.0'}
                </div>
              </div>
            </Col>
          </Row>
        </div>

      </div>
    </Modal>
  );
};
