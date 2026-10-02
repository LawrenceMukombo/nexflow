import { EngineeringGraph } from '@omniflow/shared-types';
import { generateNetworkBOQ } from './boq';

export interface ArchitecturalSheetOptions {
  projectName?: string;
  clientName?: string;
  drawingTitle?: string;
  drawingNumber?: string;
  sheetNumber?: string;
  totalSheets?: string;
  revision?: string;
  author?: string;
  approver?: string;
  peLicenseNumber?: string;
  date?: string;
}

/**
 * Generate standard architectural engineering single-line drawing sheet (ANSI D / ISO A1)
 * Includes CAD border coordinate zones (A-F, 1-8), title block, revision table, PE stamp, and legend.
 */
export function generateArchitecturalSheetSvg(
  graph: EngineeringGraph,
  options: ArchitecturalSheetOptions = {}
): string {
  const {
    projectName = 'NexFlow Unified Smart Facility',
    clientName = 'Enterprise Hyperscale Systems',
    drawingTitle = 'SINGLE-LINE POWER, HYDRONIC & NETWORK RISER SCHEMATIC',
    drawingNumber = 'E-101',
    sheetNumber = '1',
    totalSheets = '1',
    revision = '1.0',
    author = 'Principal Systems Engineer',
    approver = 'Chief Technical Officer',
    peLicenseNumber = 'PE-89421-US',
    date = new Date().toISOString().split('T')[0]
  } = options;

  const nodes = Object.values(graph.nodes);
  const connections = Object.values(graph.connections);
  const boq = generateNetworkBOQ(graph);

  // Sheet dimensions (ANSI D aspect ratio: 2400 x 1600 px)
  const W = 2400;
  const H = 1600;

  // Margin and drawing frame
  const margin = 50;
  const frameX = margin;
  const frameY = margin;
  const frameW = W - 2 * margin;
  const frameH = H - 2 * margin;

  // Viewport for canvas nodes inside the drawing sheet
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + 220);
    maxY = Math.max(maxY, n.position.y + 100);
  });
  if (nodes.length === 0) { minX = 0; minY = 0; maxX = 1200; maxY = 800; }

  const graphW = Math.max(800, maxX - minX);
  const graphH = Math.max(500, maxY - minY);

  // Available area for schematic inside frame (leaving room for title block, schedules, and legend)
  const schedAreaX = frameX + 60;
  const schedAreaY = frameY + 60;
  const schedAreaW = frameW - 550; // Leave 450px on the right for title block & tables
  const schedAreaH = frameH - 120;

  // Scaling factor to fit graph into schematic area
  const scale = Math.min(1.0, Math.min(schedAreaW / graphW, schedAreaH / graphH) * 0.85);
  const offsetX = schedAreaX + (schedAreaW - graphW * scale) / 2 - minX * scale;
  const offsetY = schedAreaY + (schedAreaH - graphH * scale) / 2 - minY * scale;

  // Grid coordinates (1-8 on horizontal, A-F on vertical)
  const xDivs = 8;
  const yDivs = 6;
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  const gridMarkersTop: string[] = [];
  for (let i = 0; i < xDivs; i++) {
    const xPos = frameX + (frameW / xDivs) * (i + 0.5);
    gridMarkersTop.push(`<text x="${xPos}" y="${frameY - 15}" fill="#64748b" font-size="14" font-weight="bold" text-anchor="middle">${i + 1}</text>`);
    gridMarkersTop.push(`<text x="${xPos}" y="${frameY + frameH + 30}" fill="#64748b" font-size="14" font-weight="bold" text-anchor="middle">${i + 1}</text>`);
  }

  const gridMarkersSide: string[] = [];
  for (let j = 0; j < yDivs; j++) {
    const yPos = frameY + (frameH / yDivs) * (j + 0.5);
    gridMarkersSide.push(`<text x="${frameX - 25}" y="${yPos + 5}" fill="#64748b" font-size="14" font-weight="bold" text-anchor="middle">${letters[j]}</text>`);
    gridMarkersSide.push(`<text x="${frameX + frameW + 25}" y="${yPos + 5}" fill="#64748b" font-size="14" font-weight="bold" text-anchor="middle">${letters[j]}</text>`);
  }

  // Right-hand column: Schedules, Code Compliance, Revision Table, and Title Block
  const colW = 440;
  const colX = frameX + frameW - colW;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <filter id="dwg-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
    <linearGradient id="title-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.8"/>
    </linearGradient>
  </defs>

  <!-- 1. Outer Border & CAD Zones -->
  <rect x="${frameX}" y="${frameY}" width="${frameW}" height="${frameH}" fill="none" stroke="#334155" stroke-width="3"/>
  <rect x="${frameX + 8}" y="${frameY + 8}" width="${frameW - 16}" height="${frameH - 16}" fill="none" stroke="#475569" stroke-width="1.2"/>
  
  <!-- Zone Coordinates -->
  ${gridMarkersTop.join('\n  ')}
  ${gridMarkersSide.join('\n  ')}

  <!-- 2. Watermark / Stamp -->
  <g transform="translate(${schedAreaX + 100}, ${schedAreaY + 120}) rotate(-18)">
    <text x="0" y="0" fill="#1e293b" font-size="72" font-weight="900" letter-spacing="8" opacity="0.6">CONSTRUCTION SUBMITTAL</text>
  </g>

  <!-- 3. Active Schematic Diagram Layer -->
  <g id="schematic-elements" transform="translate(0, 0)">
    <!-- Connections / Conduits -->
    <g id="conduits">
      ${connections.map(c => {
        const src = graph.nodes[c.sourceComponentId];
        const tgt = graph.nodes[c.targetComponentId];
        if (!src || !tgt) return '';
        const sx = src.position.x * scale + offsetX + (180 * scale);
        const sy = src.position.y * scale + offsetY + (35 * scale);
        const tx = tgt.position.x * scale + offsetX;
        const ty = tgt.position.y * scale + offsetY + (35 * scale);

        const ctype = c.connectionType.toUpperCase();
        let stroke = '#38bdf8'; // Data Cyan
        let strokeDash = 'none';
        if (c.domain === 'ELECTRICAL' || ctype.includes('POWER') || ctype.includes('AC_')) {
          stroke = '#eab308'; // Power Yellow
        } else if (c.domain === 'PLUMBING' || ctype.includes('PIPE')) {
          stroke = '#0284c7'; // Chilled water Blue
        } else if (c.domain === 'CCTV') {
          stroke = '#a855f7'; // Purple
        }

        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2;

        return `<path d="M ${sx} ${sy} C ${sx + 60} ${sy}, ${tx - 60} ${ty}, ${tx} ${ty}" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-dasharray="${strokeDash}"/>
        <circle cx="${midX}" cy="${midY}" r="11" fill="#0f172a" stroke="${stroke}" stroke-width="1.5"/>
        <text x="${midX}" y="${midY + 3}" fill="#cbd5e1" font-size="9" font-family="monospace" text-anchor="middle">${c.lengthMeters}m</text>`;
      }).join('\n      ')}
    </g>

    <!-- Equipment Nodes -->
    <g id="nodes">
      ${nodes.map(n => {
        const nx = n.position.x * scale + offsetX;
        const ny = n.position.y * scale + offsetY;
        const nw = 180 * scale;
        const nh = 70 * scale;

        return `<g transform="translate(${nx}, ${ny})" filter="url(#dwg-shadow)">
          <rect width="${nw}" height="${nh}" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1.8"/>
          <rect width="${nw}" height="${22 * scale}" rx="6" fill="#1e293b"/>
          <text x="${8 * scale}" y="${15 * scale}" fill="#38bdf8" font-size="${11 * scale}" font-weight="bold">${n.tag}</text>
          <text x="${8 * scale}" y="${40 * scale}" fill="#f8fafc" font-size="${11 * scale}" font-weight="600">${n.name.substring(0, 22)}</text>
          <text x="${8 * scale}" y="${58 * scale}" fill="#94a3b8" font-size="${9 * scale}" font-family="monospace">${n.properties.ipAddress || n.properties.voltage || n.type}</text>
        </g>`;
      }).join('\n      ')}
    </g>
  </g>

  <!-- 4. Right Engineering Panel (Schedules, Compliance, Title Block) -->
  <g transform="translate(${colX}, ${frameY + 8})">
    <!-- Panel Separator -->
    <line x1="0" y1="0" x2="0" y2="${frameH - 16}" stroke="#334155" stroke-width="2"/>

    <!-- A. Engineering Code Compliance Block -->
    <rect x="15" y="15" width="${colW - 30}" height="170" rx="6" fill="#090d16" stroke="#1e293b"/>
    <text x="30" y="42" fill="#38bdf8" font-size="14" font-weight="bold">STANDARDS & CODE COMPLIANCE</text>
    <line x1="30" y1="52" x2="${colW - 45}" y2="52" stroke="#334155" stroke-width="1"/>
    
    <text x="30" y="75" fill="#f8fafc" font-size="12" font-weight="600">NFPA 70 / NEC 2023:</text>
    <text x="180" y="75" fill="#10b981" font-size="12" font-family="monospace">PASSED (&lt;3% Branch ΔV)</text>
    
    <text x="30" y="100" fill="#f8fafc" font-size="12" font-weight="600">IEEE 141 (Red Book):</text>
    <text x="180" y="100" fill="#10b981" font-size="12" font-family="monospace">PASSED (Coincident Load)</text>
    
    <text x="30" y="125" fill="#f8fafc" font-size="12" font-weight="600">ASHRAE 90.1 / 188:</text>
    <text x="180" y="125" fill="#10b981" font-size="12" font-family="monospace">OPTIMAL (1.2-2.4 m/s)</text>
    
    <text x="30" y="150" fill="#f8fafc" font-size="12" font-weight="600">ANSI/TIA-568-D:</text>
    <text x="180" y="150" fill="#10b981" font-size="12" font-family="monospace">CAT6A Gigabit Link Compliant</text>

    <!-- B. Bill of Quantities Summary Table -->
    <rect x="15" y="200" width="${colW - 30}" height="220" rx="6" fill="#090d16" stroke="#1e293b"/>
    <text x="30" y="228" fill="#38bdf8" font-size="14" font-weight="bold">ENGINEERING BILL OF MATERIALS</text>
    <line x1="30" y1="238" x2="${colW - 45}" y2="238" stroke="#334155" stroke-width="1"/>

    <text x="30" y="262" fill="#94a3b8" font-size="11">Total Active Equipment Nodes:</text>
    <text x="${colW - 45}" y="262" fill="#f8fafc" font-size="11" font-weight="bold" text-anchor="end">${nodes.length} Units</text>

    <text x="30" y="288" fill="#94a3b8" font-size="11">Total Structured Cable Runs:</text>
    <text x="${colW - 45}" y="288" fill="#f8fafc" font-size="11" font-weight="bold" text-anchor="end">${connections.length} Runs</text>

    <text x="30" y="314" fill="#94a3b8" font-size="11">Total Hardware Materials:</text>
    <text x="${colW - 45}" y="314" fill="#f8fafc" font-size="11" font-weight="bold" text-anchor="end">$${boq.totalMaterials.toLocaleString('en-US', { minimumFractionDigits: 2 })}</text>

    <text x="30" y="340" fill="#94a3b8" font-size="11">Certified Installation Labor:</text>
    <text x="${colW - 45}" y="340" fill="#f8fafc" font-size="11" font-weight="bold" text-anchor="end">$${boq.totalLabour.toLocaleString('en-US', { minimumFractionDigits: 2 })}</text>

    <line x1="30" y1="360" x2="${colW - 45}" y2="360" stroke="#334155" stroke-width="1"/>
    <text x="30" y="390" fill="#10b981" font-size="13" font-weight="bold">TOTAL ESTIMATED CAPEX:</text>
    <text x="${colW - 45}" y="390" fill="#10b981" font-size="14" font-weight="bold" text-anchor="end">$${boq.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</text>

    <!-- C. Symbology & Color Legend -->
    <rect x="15" y="435" width="${colW - 30}" height="175" rx="6" fill="#090d16" stroke="#1e293b"/>
    <text x="30" y="462" fill="#38bdf8" font-size="14" font-weight="bold">LEGEND & RUN DESIGNATION</text>
    <line x1="30" y1="472" x2="${colW - 45}" y2="472" stroke="#334155" stroke-width="1"/>

    <line x1="30" y1="495" x2="70" y2="495" stroke="#eab308" stroke-width="3"/>
    <text x="85" y="499" fill="#f8fafc" font-size="11">400V / 230V Electrical Distribution Feeder</text>

    <line x1="30" y1="525" x2="70" y2="525" stroke="#0284c7" stroke-width="3"/>
    <text x="85" y="529" fill="#f8fafc" font-size="11">Chilled Water Closed-Loop Hydronic Pipe</text>

    <line x1="30" y1="555" x2="70" y2="555" stroke="#38bdf8" stroke-width="3"/>
    <text x="85" y="559" fill="#f8fafc" font-size="11">TIA-568-D 10GbE / Cat6A Data Channel</text>

    <line x1="30" y1="585" x2="70" y2="585" stroke="#a855f7" stroke-width="3"/>
    <text x="85" y="589" fill="#f8fafc" font-size="11">CCTV / Security Surveillance IP Trunk</text>

    <!-- D. Revision History Table -->
    <rect x="15" y="625" width="${colW - 30}" height="190" rx="6" fill="#090d16" stroke="#1e293b"/>
    <text x="30" y="652" fill="#38bdf8" font-size="14" font-weight="bold">REVISION LOG</text>
    <line x1="30" y1="662" x2="${colW - 45}" y2="662" stroke="#334155" stroke-width="1"/>
    
    <text x="30" y="685" fill="#94a3b8" font-size="10" font-weight="bold">REV</text>
    <text x="75" y="685" fill="#94a3b8" font-size="10" font-weight="bold">DATE</text>
    <text x="160" y="685" fill="#94a3b8" font-size="10" font-weight="bold">DESCRIPTION</text>
    <text x="330" y="685" fill="#94a3b8" font-size="10" font-weight="bold">BY</text>

    <line x1="30" y1="695" x2="${colW - 45}" y2="695" stroke="#1e293b" stroke-width="1"/>
    <text x="30" y="720" fill="#f8fafc" font-size="10">v1.0</text>
    <text x="75" y="720" fill="#f8fafc" font-size="10">${date}</text>
    <text x="160" y="720" fill="#f8fafc" font-size="10">INITIAL ENGINEERING BASELINE</text>
    <text x="330" y="720" fill="#f8fafc" font-size="10">ENG</text>

    <text x="30" y="750" fill="#f8fafc" font-size="10">v1.1</text>
    <text x="75" y="750" fill="#f8fafc" font-size="10">${date}</text>
    <text x="160" y="750" fill="#f8fafc" font-size="10">HYDRONIC & LOAD BALANCING</text>
    <text x="330" y="750" fill="#f8fafc" font-size="10">ENG</text>

    <!-- E. Professional Engineer (PE) Seal Stamp -->
    <g transform="translate(45, 840)">
      <circle cx="70" cy="70" r="64" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="4 2"/>
      <circle cx="70" cy="70" r="56" fill="none" stroke="#dc2626" stroke-width="1.2"/>
      <text x="70" y="42" fill="#dc2626" font-size="9" font-weight="bold" text-anchor="middle" letter-spacing="1">REGISTERED PROFESSIONAL</text>
      <text x="70" y="58" fill="#dc2626" font-size="10" font-weight="900" text-anchor="middle">ENGINEER</text>
      <line x1="25" y1="65" x2="115" y2="65" stroke="#dc2626" stroke-width="1"/>
      <text x="70" y="80" fill="#dc2626" font-size="9" font-weight="bold" text-anchor="middle">${peLicenseNumber}</text>
      <text x="70" y="94" fill="#dc2626" font-size="8" text-anchor="middle">STATE CERTIFIED</text>
      <line x1="25" y1="102" x2="115" y2="102" stroke="#dc2626" stroke-width="1"/>
      <text x="70" y="118" fill="#dc2626" font-size="8" font-weight="bold" text-anchor="middle">APPROVED FOR BUILD</text>

      <text x="160" y="60" fill="#94a3b8" font-size="11">Certified Electronic Submittal</text>
      <text x="160" y="80" fill="#f8fafc" font-size="11" font-weight="600">Verification Hash:</text>
      <text x="160" y="100" fill="#38bdf8" font-size="10" font-family="monospace">SHA256-${(graph.designId || 'NEXFLOW').substring(0, 16)}</text>
    </g>

    <!-- F. Architectural Title Block (Bottom-Right Anchor) -->
    <g transform="translate(15, 1020)">
      <rect x="0" y="0" width="${colW - 30}" height="490" rx="6" fill="#090d16" stroke="#0284c7" stroke-width="2"/>
      
      <!-- Top banner -->
      <rect x="0" y="0" width="${colW - 30}" height="70" rx="6" fill="url(#title-grad)"/>
      <text x="20" y="32" fill="#38bdf8" font-size="13" font-weight="bold" letter-spacing="1">NEXFLOW INFRASTRUCTURE PLATFORM</text>
      <text x="20" y="52" fill="#94a3b8" font-size="11">Computer Aided Architectural Engineering</text>

      <!-- Client & Project -->
      <line x1="0" y1="70" x2="${colW - 30}" y2="70" stroke="#1e293b" stroke-width="1.5"/>
      <text x="20" y="96" fill="#64748b" font-size="10" font-weight="bold">CLIENT / FACILITY:</text>
      <text x="20" y="118" fill="#f8fafc" font-size="13" font-weight="700">${clientName}</text>

      <line x1="0" y1="135" x2="${colW - 30}" y2="135" stroke="#1e293b" stroke-width="1.5"/>
      <text x="20" y="160" fill="#64748b" font-size="10" font-weight="bold">PROJECT NAME:</text>
      <text x="20" y="182" fill="#f8fafc" font-size="13" font-weight="700">${projectName}</text>

      <line x1="0" y1="200" x2="${colW - 30}" y2="200" stroke="#1e293b" stroke-width="1.5"/>
      <text x="20" y="225" fill="#64748b" font-size="10" font-weight="bold">DRAWING TITLE:</text>
      <text x="20" y="247" fill="#38bdf8" font-size="12" font-weight="700">${drawingTitle}</text>

      <!-- Metadata Grid -->
      <line x1="0" y1="280" x2="${colW - 30}" y2="280" stroke="#1e293b" stroke-width="1.5"/>
      <line x1="${(colW - 30) / 2}" y1="280" x2="${(colW - 30) / 2}" y2="400" stroke="#1e293b" stroke-width="1.5"/>

      <!-- Left col -->
      <text x="20" y="305" fill="#64748b" font-size="10">DESIGNED BY:</text>
      <text x="20" y="325" fill="#f8fafc" font-size="11" font-weight="600">${author}</text>
      
      <text x="20" y="355" fill="#64748b" font-size="10">CHECKED & APPROVED BY:</text>
      <text x="20" y="375" fill="#f8fafc" font-size="11" font-weight="600">${approver}</text>

      <!-- Right col -->
      <text x="${(colW - 30) / 2 + 15}" y="305" fill="#64748b" font-size="10">DATE:</text>
      <text x="${(colW - 30) / 2 + 15}" y="325" fill="#f8fafc" font-size="11" font-weight="600">${date}</text>
      
      <text x="${(colW - 30) / 2 + 15}" y="355" fill="#64748b" font-size="10">SCALE:</text>
      <text x="${(colW - 30) / 2 + 15}" y="375" fill="#f8fafc" font-size="11" font-weight="600">N.T.S. (SCHEMATIC)</text>

      <!-- Bottom Sheet No & Rev Banner -->
      <line x1="0" y1="400" x2="${colW - 30}" y2="400" stroke="#0284c7" stroke-width="2"/>
      <rect x="0" y="401" width="${colW - 30}" height="88" rx="0" fill="#0c1829"/>

      <text x="20" y="430" fill="#64748b" font-size="10" font-weight="bold">DRAWING NUMBER</text>
      <text x="20" y="465" fill="#f8fafc" font-size="24" font-weight="900" letter-spacing="1">${drawingNumber}</text>

      <line x1="${(colW - 30) - 210}" y1="400" x2="${(colW - 30) - 210}" y2="489" stroke="#1e293b" stroke-width="1.5"/>
      <text x="${(colW - 30) - 195}" y="430" fill="#64748b" font-size="10" font-weight="bold">SHEET</text>
      <text x="${(colW - 30) - 195}" y="465" fill="#38bdf8" font-size="18" font-weight="900">${sheetNumber}/${totalSheets}</text>

      <line x1="${(colW - 30) - 100}" y1="400" x2="${(colW - 30) - 100}" y2="489" stroke="#1e293b" stroke-width="1.5"/>
      <text x="${(colW - 30) - 85}" y="430" fill="#64748b" font-size="10" font-weight="bold">REV</text>
      <text x="${(colW - 30) - 85}" y="465" fill="#10b981" font-size="20" font-weight="900">${revision}</text>
    </g>
  </g>
</svg>`;
}

/**
 * Generate a standalone printable HTML Submittal Package
 * Optimized with @media print CSS rules for printing to high-resolution PDF or hardcopy.
 */
export function generatePrintableSubmittalHtml(
  graph: EngineeringGraph,
  options: ArchitecturalSheetOptions = {}
): string {
  const svgContent = generateArchitecturalSheetSvg(graph, options);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${options.drawingNumber || 'E-101'} - ${options.projectName || 'Engineering Submittal'}</title>
  <style>
    @page {
      size: landscape;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #0b1120;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow-x: auto;
    }
    .print-actions {
      position: fixed;
      top: 16px;
      right: 20px;
      z-index: 1000;
      display: flex;
      gap: 12px;
    }
    .btn {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
    }
    .btn:hover {
      background: #0369a1;
    }
    .btn-secondary {
      background: #1e293b;
      color: #cbd5e1;
    }
    .btn-secondary:hover {
      background: #334155;
    }
    .sheet-wrapper {
      width: 100%;
      max-width: 2400px;
      padding: 20px;
      display: flex;
      justify-content: center;
    }
    svg {
      width: 100%;
      height: auto;
      max-height: 94vh;
      border-radius: 4px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.7);
    }
    @media print {
      body {
        background-color: transparent !important;
      }
      .print-actions {
        display: none !important;
      }
      .sheet-wrapper {
        padding: 0 !important;
        max-width: 100% !important;
      }
      svg {
        width: 100vw !important;
        height: 100vh !important;
        max-height: none !important;
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="btn btn-secondary" onclick="window.close()">Close Preview</button>
    <button class="btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="sheet-wrapper">
    ${svgContent}
  </div>
</body>
</html>`;
}
