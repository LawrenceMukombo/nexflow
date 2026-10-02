import React, { useState } from 'react';
import { Modal, Button, Card, Row, Col, Space, Typography, Tag, Input, Form, message } from 'antd';
import { 
  ExportOutlined, 
  CodeOutlined, 
  FileExcelOutlined, 
  FileTextOutlined, 
  PictureOutlined,
  DownloadOutlined,
  CopyOutlined,
  BuildOutlined,
  PrinterOutlined,
  CompassOutlined,
  DeploymentUnitOutlined,
  FolderOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { 
  generateNetworkBOQ, 
  generateCableSchedule,
  generateAutoCAD_DXF,
  generateArchitecturalSheetSvg,
  generatePrintableSubmittalHtml
} from '@omniflow/network-engine';

const { Paragraph } = Typography;

export const ExportCenterModal: React.FC = () => {
  const {
    graph,
    currentProjectName,
    isExportCenterModalOpen,
    closeExportCenterModal
  } = useGraphStore();

  // Configurable Drawing Title Block attributes
  const [drawingNumber, setDrawingNumber] = useState('E-101');
  const [revision, setRevision] = useState('1.0');
  const [clientName, setClientName] = useState('Enterprise Hyperscale Facility');
  const [engineerOfRecord, setEngineerOfRecord] = useState('Principal Infrastructure Engineer');
  const [peLicenseNumber, setPeLicenseNumber] = useState('PE-89421-US');

  if (!isExportCenterModalOpen) return null;

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success(`Downloaded ${filename}`);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`Copied ${label} to clipboard`);
  };

  // 1. AUTOCAD DXF EXPORT
  const handleExportDXF = (download: boolean) => {
    const dxfContent = generateAutoCAD_DXF(graph, {
      projectName: currentProjectName || 'NexFlow System Blueprint',
      drawingNumber,
      revision,
      author: engineerOfRecord,
      clientName
    });

    if (download) {
      downloadFile(`${drawingNumber}_${graph.designId || 'design'}_AutoCAD.dxf`, dxfContent, 'application/dxf');
    } else {
      copyToClipboard(dxfContent, 'AutoCAD ASCII DXF');
    }
  };

  // 2. ARCHITECTURAL DRAWING SHEET SVG (ANSI D)
  const handleExportArchitecturalSheetSvg = (download: boolean) => {
    const svgContent = generateArchitecturalSheetSvg(graph, {
      projectName: currentProjectName || 'NexFlow System Blueprint',
      clientName,
      drawingNumber,
      revision,
      author: engineerOfRecord,
      peLicenseNumber,
      date: new Date().toISOString().split('T')[0]
    });

    if (download) {
      downloadFile(`${drawingNumber}_Architectural_Sheet.svg`, svgContent, 'image/svg+xml');
    } else {
      copyToClipboard(svgContent, 'Architectural Sheet SVG');
    }
  };

  // 3. PRINTABLE SUBMITTAL HTML / PDF
  const handleOpenPrintableSubmittal = () => {
    const htmlContent = generatePrintableSubmittalHtml(graph, {
      projectName: currentProjectName || 'NexFlow System Blueprint',
      clientName,
      drawingNumber,
      revision,
      author: engineerOfRecord,
      peLicenseNumber,
      date: new Date().toISOString().split('T')[0]
    });

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      message.success('Opened architectural submittal sheet preview');
    } else {
      // Fallback: download as standalone HTML
      downloadFile(`${drawingNumber}_Submittal_Package.html`, htmlContent, 'text/html');
    }
  };

  // 4. CANONICAL ENGINEERING GRAPH JSON
  const handleExportJson = (download: boolean) => {
    const jsonString = JSON.stringify(graph, null, 2);
    if (download) {
      downloadFile(`${graph.designId || 'engineering_design'}_v${revision}.json`, jsonString, 'application/json');
    } else {
      copyToClipboard(jsonString, 'Engineering JSON');
    }
  };

  // 5. BOQ CSV
  const handleExportBOQ = (download: boolean) => {
    const boq = generateNetworkBOQ(graph);
    const headers = ['Item Description', 'Category', 'Part Number', 'Quantity', 'Unit Material ($)', 'Unit Labor ($)', 'Total Cost ($)'];
    const rows = boq.items.map(item => [
      `"${item.description.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      `"${item.partNumber}"`,
      item.quantity,
      item.unitCost.toFixed(2),
      item.unitLabour.toFixed(2),
      item.totalCost.toFixed(2)
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    if (download) {
      downloadFile(`${drawingNumber}_BOQ.csv`, csvContent, 'text/csv');
    } else {
      copyToClipboard(csvContent, 'BOQ CSV');
    }
  };

  // 6. CABLE SCHEDULE CSV
  const handleExportCableSchedule = (download: boolean) => {
    const schedule = generateCableSchedule(graph);
    const headers = ['Cable ID', 'Cable Type', 'Source Device', 'Source Port', 'Target Device', 'Target Port', 'Length (m)'];
    const rows = schedule.map(run => [
      run.cableId,
      run.cableType,
      `"${run.sourceDevice.replace(/"/g, '""')}"`,
      run.sourcePort,
      `"${run.targetDevice.replace(/"/g, '""')}"`,
      run.targetPort,
      run.lengthMeters
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    if (download) {
      downloadFile(`${drawingNumber}_CableSchedule.csv`, csvContent, 'text/csv');
    } else {
      copyToClipboard(csvContent, 'Cable Schedule CSV');
    }
  };

  // 7. TECHNICAL MARKDOWN SPECIFICATION
  const handleExportMarkdown = (download: boolean) => {
    const nodes = Object.values(graph.nodes);
    const connections = Object.values(graph.connections);
    const boq = generateNetworkBOQ(graph);

    const mdContent = `# Engineering Design Specification: ${currentProjectName || 'System Blueprint'}

**Drawing Number:** \`${drawingNumber}\`  
**Design ID:** \`${graph.designId || 'ENG-001'}\`  
**Revision:** \`${revision}\`  
**Client / Facility:** ${clientName}  
**Lead Engineer:** ${engineerOfRecord} (${peLicenseNumber})  
**Generated Date:** ${new Date().toISOString()}  

---

## 1. Architectural Overview
This document specifies the complete physical and logical design for **${currentProjectName}**, comprising **${nodes.length} equipment components** and **${connections.length} structured cable/pipe runs**.

### Equipment Inventory
| Tag | Device Name | Domain | Type | IP / Specs | Power (W) |
|---|---|---|---|---|---|
${nodes.map(n => `| **${n.tag}** | ${n.name} | ${n.domain} | \`${n.type}\` | ${n.properties.ipAddress || n.properties.voltage || 'N/A'} | ${n.properties.ratedWatts || 0}W |`).join('\n')}

---

## 2. Structured Cabling & Interconnect Schedule
| Run ID | Media Type | From Device (Port) | To Device (Port) | Length | Bandwidth |
|---|---|---|---|---|---|
${connections.map(c => `| \`${c.id}\` | **${c.connectionType}** | ${graph.nodes[c.sourceComponentId]?.tag || c.sourceComponentId} (${c.sourcePortId}) | ${graph.nodes[c.targetComponentId]?.tag || c.targetComponentId} (${c.targetPortId}) | ${c.lengthMeters}m | ${c.properties.bandwidthLimitMbps || 1000} Mbps |`).join('\n')}

---

## 3. Bill of Quantities (BOQ)
- **Total Material Cost:** $${boq.totalMaterials.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- **Total Installation Labor:** $${boq.totalLabour.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- **Tax (15%):** $${boq.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- **Grand Estimated Capital Expenditure:** **$${boq.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}**

---

## 4. Applicable Standards
- **NFPA 70 / NEC 2023**: National Electrical Code (Branch <3% ΔV)
- **IEEE 141 (Red Book)**: Coincident & Maximum Demand Electrical Loading
- **ASHRAE 90.1 / 188**: Hydronic Chilled Water Velocity & Energy Conservation
- **ANSI/TIA-568-D**: Commercial Building Telecommunications Cabling

*Certified electronic submittal generated via NexFlow Enterprise Engineering Platform.*
`;

    if (download) {
      downloadFile(`${drawingNumber}_Specification.md`, mdContent, 'text/markdown');
    } else {
      copyToClipboard(mdContent, 'Markdown Specification');
    }
  };

  // 8. MASTER SUBMITTAL BUNDLE DOWNLOAD (Exports all key artifacts sequentially)
  const handleExportFullSubmittalBundle = () => {
    message.loading({ content: 'Packaging multi-domain submittal artifacts...', key: 'bundle' });
    setTimeout(() => {
      handleExportDXF(true);
      setTimeout(() => handleExportArchitecturalSheetSvg(true), 250);
      setTimeout(() => handleExportBOQ(true), 500);
      setTimeout(() => handleExportCableSchedule(true), 750);
      setTimeout(() => handleExportMarkdown(true), 1000);
      message.success({ content: 'Complete engineering submittal pack downloaded!', key: 'bundle' });
    }, 400);
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <Space>
            <ExportOutlined style={{ color: '#0284c7', fontSize: 18 }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>Multi-Format Engineering Export Suite</span>
            <Tag color="#0284c7">CAD & BIM Interchange</Tag>
          </Space>
          <Button 
            type="primary" 
            icon={<FolderOutlined />} 
            onClick={handleExportFullSubmittalBundle}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981', fontWeight: 600 }}
          >
            Export Complete Submittal Pack
          </Button>
        </div>
      }
      open={isExportCenterModalOpen}
      onCancel={closeExportCenterModal}
      width={980}
      footer={[
        <Button key="close" onClick={closeExportCenterModal}>
          Close
        </Button>
      ]}
      style={{ top: 25 }}
      styles={{ body: { maxHeight: '82vh', overflowY: 'auto', paddingRight: 8 } }}
    >
      <div style={{ color: '#f8fafc', padding: '4px 0' }}>
        {/* Title Block Parameters Header */}
        <Card 
          size="small"
          title={<Space><CompassOutlined style={{ color: '#38bdf8' }} /><span style={{ color: '#f8fafc', fontSize: 13 }}>Drawing Title Block & Sheet Parameters</span></Space>}
          style={{ backgroundColor: '#090d16', borderColor: '#1e293b', marginBottom: 16 }}
        >
          <Form layout="inline" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
            <Form.Item label={<span style={{ color: '#94a3b8', fontSize: 12 }}>Dwg No.</span>} style={{ margin: 0 }}>
              <Input 
                value={drawingNumber} 
                onChange={e => setDrawingNumber(e.target.value)} 
                style={{ width: 90, backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontWeight: 'bold' }} 
              />
            </Form.Item>
            <Form.Item label={<span style={{ color: '#94a3b8', fontSize: 12 }}>Rev</span>} style={{ margin: 0 }}>
              <Input 
                value={revision} 
                onChange={e => setRevision(e.target.value)} 
                style={{ width: 65, backgroundColor: '#0f172a', borderColor: '#334155', color: '#10b981', fontWeight: 'bold' }} 
              />
            </Form.Item>
            <Form.Item label={<span style={{ color: '#94a3b8', fontSize: 12 }}>Client</span>} style={{ margin: 0 }}>
              <Input 
                value={clientName} 
                onChange={e => setClientName(e.target.value)} 
                style={{ width: 200, backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} 
              />
            </Form.Item>
            <Form.Item label={<span style={{ color: '#94a3b8', fontSize: 12 }}>Lead Engineer</span>} style={{ margin: 0 }}>
              <Input 
                value={engineerOfRecord} 
                onChange={e => setEngineerOfRecord(e.target.value)} 
                style={{ width: 210, backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} 
              />
            </Form.Item>
            <Form.Item label={<span style={{ color: '#94a3b8', fontSize: 12 }}>PE Stamp No.</span>} style={{ margin: 0 }}>
              <Input 
                value={peLicenseNumber} 
                onChange={e => setPeLicenseNumber(e.target.value)} 
                style={{ width: 130, backgroundColor: '#0f172a', borderColor: '#334155', color: '#dc2626', fontWeight: 'bold' }} 
              />
            </Form.Item>
          </Form>
        </Card>

        <Paragraph style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
          Generate certified engineering drawings, CAD interchange models, and procurement schedules compliant with IEEE, NFPA 70, ASHRAE, and TIA standards.
        </Paragraph>

        <Row gutter={[16, 16]}>
          {/* Format 1: AutoCAD DXF Engineering Interchange */}
          <Col span={12}>
            <Card 
              size="small" 
              title={<Space><DeploymentUnitOutlined style={{ color: '#eab308' }} /><span style={{ color: '#f8fafc' }}>AutoCAD DXF Engineering Interchange</span></Space>}
              extra={<Tag color="#eab308">AutoCAD / Revit</Tag>}
              style={{ backgroundColor: '#090d16', borderColor: '#1e293b' }}
            >
              <Paragraph style={{ color: '#cbd5e1', fontSize: 12, minHeight: 48, margin: 0 }}>
                Layered ASCII DXF (AC1009/R12) with dedicated layers for data cabling, power conduits, chilled water hydronics, equipment blocks, and title blocks.
              </Paragraph>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button size="small" icon={<DownloadOutlined />} type="primary" onClick={() => handleExportDXF(true)} style={{ backgroundColor: '#eab308', borderColor: '#eab308', color: '#090d16', fontWeight: 600 }}>
                  Download .dxf
                </Button>
                <Button size="small" icon={<CopyOutlined />} onClick={() => handleExportDXF(false)}>
                  Copy DXF Text
                </Button>
              </div>
            </Card>
          </Col>

          {/* Format 2: Architectural Drawing Sheet (ANSI D) */}
          <Col span={12}>
            <Card 
              size="small" 
              title={<Space><PictureOutlined style={{ color: '#10b981' }} /><span style={{ color: '#f8fafc' }}>Architectural Single-Line Drawing Sheet</span></Space>}
              extra={<Tag color="#10b981">ANSI D / ISO A1</Tag>}
              style={{ backgroundColor: '#090d16', borderColor: '#1e293b' }}
            >
              <Paragraph style={{ color: '#cbd5e1', fontSize: 12, minHeight: 48, margin: 0 }}>
                Standard 2400x1600 architectural vector sheet featuring grid coordinates (A-F, 1-8), title block, revision table, PE seal stamp, and code compliance audits.
              </Paragraph>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button size="small" icon={<DownloadOutlined />} type="primary" onClick={() => handleExportArchitecturalSheetSvg(true)} style={{ backgroundColor: '#10b981', borderColor: '#10b981', fontWeight: 600 }}>
                  Download .svg Sheet
                </Button>
                <Button size="small" icon={<PrinterOutlined />} onClick={handleOpenPrintableSubmittal}>
                  Print / Save PDF
                </Button>
              </div>
            </Card>
          </Col>

          {/* Format 3: Canonical Engineering Graph JSON */}
          <Col span={12}>
            <Card 
              size="small" 
              title={<Space><CodeOutlined style={{ color: '#38bdf8' }} /><span style={{ color: '#f8fafc' }}>Canonical Engineering Graph JSON</span></Space>}
              extra={<Tag color="#0284c7">RFC 8259</Tag>}
              style={{ backgroundColor: '#090d16', borderColor: '#1e293b' }}
            >
              <Paragraph style={{ color: '#cbd5e1', fontSize: 12, minHeight: 48, margin: 0 }}>
                Complete structured model with nodes, typed ports, geometric positions, domain properties, constraints, and telemetry bindings for CI/CD automation.
              </Paragraph>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button size="small" icon={<DownloadOutlined />} type="primary" onClick={() => handleExportJson(true)} style={{ backgroundColor: '#0284c7' }}>
                  Download .json
                </Button>
                <Button size="small" icon={<CopyOutlined />} onClick={() => handleExportJson(false)}>
                  Copy JSON
                </Button>
              </div>
            </Card>
          </Col>

          {/* Format 4: BOQ Equipment Cost Schedule CSV */}
          <Col span={12}>
            <Card 
              size="small" 
              title={<Space><FileExcelOutlined style={{ color: '#f59e0b' }} /><span style={{ color: '#f8fafc' }}>Bill of Quantities (BOQ) Spreadsheet</span></Space>}
              extra={<Tag color="#f59e0b">Excel / CSV</Tag>}
              style={{ backgroundColor: '#090d16', borderColor: '#1e293b' }}
            >
              <Paragraph style={{ color: '#cbd5e1', fontSize: 12, minHeight: 48, margin: 0 }}>
                Structured CSV table with itemized hardware part numbers, quantities, material costs, labor rates, and total capital expenditure for procurement.
              </Paragraph>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button size="small" icon={<DownloadOutlined />} type="primary" onClick={() => handleExportBOQ(true)} style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}>
                  Download BOQ.csv
                </Button>
                <Button size="small" icon={<CopyOutlined />} onClick={() => handleExportBOQ(false)}>
                  Copy CSV
                </Button>
              </div>
            </Card>
          </Col>

          {/* Format 5: Structured Cabling Run Schedule CSV */}
          <Col span={12}>
            <Card 
              size="small" 
              title={<Space><BuildOutlined style={{ color: '#06b6d4' }} /><span style={{ color: '#f8fafc' }}>Cabling & Conduit Run Schedule</span></Space>}
              extra={<Tag color="#06b6d4">Field Schedule</Tag>}
              style={{ backgroundColor: '#090d16', borderColor: '#1e293b' }}
            >
              <Paragraph style={{ color: '#cbd5e1', fontSize: 12, minHeight: 48, margin: 0 }}>
                Field installation schedule detailing point-to-point terminations, media categories (CAT6A, Fiber, 400V, Chilled Water), lengths, and port IDs.
              </Paragraph>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button size="small" icon={<DownloadOutlined />} type="primary" onClick={() => handleExportCableSchedule(true)} style={{ backgroundColor: '#06b6d4', borderColor: '#06b6d4' }}>
                  Download Schedule.csv
                </Button>
                <Button size="small" icon={<CopyOutlined />} onClick={() => handleExportCableSchedule(false)}>
                  Copy CSV
                </Button>
              </div>
            </Card>
          </Col>

          {/* Format 6: Technical Specification Markdown */}
          <Col span={12}>
            <Card 
              size="small" 
              title={<Space><FileTextOutlined style={{ color: '#a855f7' }} /><span style={{ color: '#f8fafc' }}>Technical Specification Document (MD)</span></Space>}
              extra={<Tag color="#a855f7">Documentation</Tag>}
              style={{ backgroundColor: '#090d16', borderColor: '#1e293b' }}
            >
              <Paragraph style={{ color: '#cbd5e1', fontSize: 12, minHeight: 48, margin: 0 }}>
                GitHub-compatible Markdown document containing the complete system specification, equipment inventory tables, cabling matrix, and standards compliance.
              </Paragraph>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button size="small" icon={<DownloadOutlined />} type="primary" onClick={() => handleExportMarkdown(true)} style={{ backgroundColor: '#a855f7', borderColor: '#a855f7' }}>
                  Download Spec.md
                </Button>
                <Button size="small" icon={<CopyOutlined />} onClick={() => handleExportMarkdown(false)}>
                  Copy Markdown
                </Button>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </Modal>
  );
};
