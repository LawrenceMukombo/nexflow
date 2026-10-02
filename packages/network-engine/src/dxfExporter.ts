import { EngineeringGraph } from '@omniflow/shared-types';

export interface DxfExportOptions {
  projectName?: string;
  drawingNumber?: string;
  revision?: string;
  author?: string;
  clientName?: string;
}

/**
 * Generate standard AutoCAD ASCII DXF (Release 12 / AC1009 compatible)
 * Compatible with Autodesk AutoCAD, Revit, LibreCAD, DraftSight, and QCAD.
 */
export function generateAutoCAD_DXF(
  graph: EngineeringGraph,
  options: DxfExportOptions = {}
): string {
  const {
    projectName = 'NexFlow Unified Smart Facility',
    drawingNumber = 'E-101',
    revision = '1.0',
    author = 'Principal Infrastructure Engineer',
    clientName = 'Enterprise Data Center'
  } = options;

  const nodes = Object.values(graph.nodes);
  const connections = Object.values(graph.connections);

  // Compute bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach(n => {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + 220);
    maxY = Math.max(maxY, n.position.y + 100);
  });

  if (nodes.length === 0) {
    minX = 0;
    minY = 0;
    maxX = 1200;
    maxY = 800;
  }

  // Margin around drawing
  const margin = 100;
  const bMinX = minX - margin;
  const bMinY = minY - margin;
  const bMaxX = maxX + margin;
  const bMaxY = maxY + margin;

  const lines: string[] = [];

  // Helper to push DXF code/value pair
  const pushCode = (code: number, val: string | number) => {
    lines.push(code.toString());
    lines.push(typeof val === 'number' ? (Number.isInteger(val) ? val.toString() : val.toFixed(4)) : val);
  };

  // DXF HEADER SECTION
  pushCode(0, 'SECTION');
  pushCode(2, 'HEADER');
  pushCode(9, '$ACADVER');
  pushCode(1, 'AC1009'); // Standard R11/R12 ASCII DXF
  pushCode(9, '$INSBASE');
  pushCode(10, 0.0);
  pushCode(20, 0.0);
  pushCode(30, 0.0);
  pushCode(9, '$EXTMIN');
  pushCode(10, bMinX);
  pushCode(20, bMinY);
  pushCode(30, 0.0);
  pushCode(9, '$EXTMAX');
  pushCode(10, bMaxX);
  pushCode(20, bMaxY);
  pushCode(30, 0.0);
  pushCode(0, 'ENDSEC');

  // DXF TABLES SECTION (Layers & Line Types)
  pushCode(0, 'SECTION');
  pushCode(2, 'TABLES');

  // LTYPE TABLE
  pushCode(0, 'TABLE');
  pushCode(2, 'LTYPE');
  pushCode(70, 1);
  pushCode(0, 'LTYPE');
  pushCode(2, 'CONTINUOUS');
  pushCode(70, 0);
  pushCode(3, 'Solid line');
  pushCode(72, 65);
  pushCode(73, 0);
  pushCode(40, 0.0);
  pushCode(0, 'ENDTAB');

  // LAYER TABLE
  // AutoCAD Color indices: 1=Red, 2=Yellow, 3=Green, 4=Cyan, 5=Blue, 6=Magenta, 7=White/Black
  const layers = [
    { name: '0', color: 7 },
    { name: 'CABLES_DATA', color: 4 }, // Cyan for Ethernet/Fiber
    { name: 'CABLES_POWER', color: 2 }, // Yellow for Electrical 400V/230V
    { name: 'CABLES_PLUMBING', color: 5 }, // Blue for Chilled water
    { name: 'EQUIPMENT_BLOCKS', color: 3 }, // Green for physical enclosures
    { name: 'EQUIPMENT_TEXT', color: 7 }, // White for labels
    { name: 'BORDER_TITLE_BLOCK', color: 1 }, // Red for boundary and title block
    { name: 'ANNOTATIONS', color: 6 } // Magenta for specs & lengths
  ];

  pushCode(0, 'TABLE');
  pushCode(2, 'LAYER');
  pushCode(70, layers.length);

  for (const layer of layers) {
    pushCode(0, 'LAYER');
    pushCode(2, layer.name);
    pushCode(70, 0);
    pushCode(62, layer.color);
    pushCode(6, 'CONTINUOUS');
  }
  pushCode(0, 'ENDTAB');
  pushCode(0, 'ENDSEC');

  // DXF ENTITIES SECTION
  pushCode(0, 'SECTION');
  pushCode(2, 'ENTITIES');

  // 1. Draw Architectural Outer Border
  const drawLine = (layer: string, x1: number, y1: number, x2: number, y2: number) => {
    pushCode(0, 'LINE');
    pushCode(8, layer);
    pushCode(10, x1);
    pushCode(20, y1);
    pushCode(30, 0.0);
    pushCode(11, x2);
    pushCode(21, y2);
    pushCode(31, 0.0);
  };

  const drawText = (layer: string, x: number, y: number, height: number, text: string) => {
    pushCode(0, 'TEXT');
    pushCode(8, layer);
    pushCode(10, x);
    pushCode(20, y);
    pushCode(30, 0.0);
    pushCode(40, height);
    pushCode(1, text);
  };

  // Outer boundary line
  drawLine('BORDER_TITLE_BLOCK', bMinX, bMinY, bMaxX, bMinY);
  drawLine('BORDER_TITLE_BLOCK', bMaxX, bMinY, bMaxX, bMaxY);
  drawLine('BORDER_TITLE_BLOCK', bMaxX, bMaxY, bMinX, bMaxY);
  drawLine('BORDER_TITLE_BLOCK', bMinX, bMaxY, bMinX, bMinY);

  // Inner margin line (double border)
  const innerMargin = 10;
  drawLine('BORDER_TITLE_BLOCK', bMinX + innerMargin, bMinY + innerMargin, bMaxX - innerMargin, bMinY + innerMargin);
  drawLine('BORDER_TITLE_BLOCK', bMinX + innerMargin, bMinY + innerMargin, bMinX + innerMargin, bMaxY - innerMargin);
  drawLine('BORDER_TITLE_BLOCK', bMaxX - innerMargin, bMinY + innerMargin, bMaxX - innerMargin, bMaxY - innerMargin);
  drawLine('BORDER_TITLE_BLOCK', bMinX + innerMargin, bMaxY - innerMargin, bMaxX - innerMargin, bMaxY - innerMargin);

  // 2. Draw Title Block (Bottom-Right corner)
  const tbW = 320;
  const tbH = 90;
  const tbX = bMaxX - innerMargin - tbW;
  const tbY = bMinY + innerMargin;

  drawLine('BORDER_TITLE_BLOCK', tbX, tbY, tbX + tbW, tbY);
  drawLine('BORDER_TITLE_BLOCK', tbX + tbW, tbY, tbX + tbW, tbY + tbH);
  drawLine('BORDER_TITLE_BLOCK', tbX + tbW, tbY + tbH, tbX, tbY + tbH);
  drawLine('BORDER_TITLE_BLOCK', tbX, tbY + tbH, tbX, tbY);

  // Dividers within title block
  drawLine('BORDER_TITLE_BLOCK', tbX, tbY + 60, tbX + tbW, tbY + 60);
  drawLine('BORDER_TITLE_BLOCK', tbX, tbY + 30, tbX + tbW, tbY + 30);
  drawLine('BORDER_TITLE_BLOCK', tbX + 200, tbY, tbX + 200, tbY + 60);

  // Title Block Text
  drawText('BORDER_TITLE_BLOCK', tbX + 10, tbY + 70, 10, projectName.toUpperCase());
  drawText('ANNOTATIONS', tbX + 10, tbY + 62, 5, `CLIENT: ${clientName}`);
  drawText('ANNOTATIONS', tbX + 10, tbY + 45, 6, `DRAWING: SINGLE-LINE SCHEMATIC`);
  drawText('ANNOTATIONS', tbX + 10, tbY + 35, 5, `DESIGN ID: ${graph.designId || 'ENG-001'}`);
  drawText('ANNOTATIONS', tbX + 10, tbY + 18, 5, `ENGINEER: ${author}`);
  drawText('ANNOTATIONS', tbX + 10, tbY + 8, 5, `DATE: ${new Date().toISOString().split('T')[0]}`);
  
  drawText('BORDER_TITLE_BLOCK', tbX + 210, tbY + 45, 8, `DWG: ${drawingNumber}`);
  drawText('ANNOTATIONS', tbX + 210, tbY + 32, 6, `REV: ${revision}`);
  drawText('ANNOTATIONS', tbX + 210, tbY + 12, 5, `SCALE: N.T.S.`);

  // 3. Draw Equipment Nodes
  const nodeW = 180;
  const nodeH = 70;

  for (const node of nodes) {
    const nx = node.position.x;
    // In DXF Cartesian coordinates, inverted Y if needed, or preserved direct
    const ny = node.position.y;

    // Enclosure rectangle
    drawLine('EQUIPMENT_BLOCKS', nx, ny, nx + nodeW, ny);
    drawLine('EQUIPMENT_BLOCKS', nx + nodeW, ny, nx + nodeW, ny + nodeH);
    drawLine('EQUIPMENT_BLOCKS', nx + nodeW, ny + nodeH, nx, ny + nodeH);
    drawLine('EQUIPMENT_BLOCKS', nx, ny + nodeH, nx, ny);

    // Header divider line inside node
    drawLine('EQUIPMENT_BLOCKS', nx, ny + nodeH - 20, nx + nodeW, ny + nodeH - 20);

    // Text labels
    drawText('EQUIPMENT_TEXT', nx + 8, ny + nodeH - 14, 7, node.tag);
    drawText('EQUIPMENT_TEXT', nx + 8, ny + nodeH - 35, 6, node.name.substring(0, 24));
    
    const spec = node.properties.ipAddress || node.properties.voltage || node.type;
    drawText('ANNOTATIONS', nx + 8, ny + 12, 5, String(spec).substring(0, 26));
  }

  // 4. Draw Interconnecting Cables and Pipes
  for (const conn of connections) {
    const src = graph.nodes[conn.sourceComponentId];
    const tgt = graph.nodes[conn.targetComponentId];
    if (!src || !tgt) continue;

    const sx = src.position.x + nodeW;
    const sy = src.position.y + nodeH / 2;
    const tx = tgt.position.x;
    const ty = tgt.position.y + nodeH / 2;

    let layer = 'CABLES_DATA';
    const ctype = conn.connectionType.toUpperCase();
    if (conn.domain === 'ELECTRICAL' || ctype.includes('POWER') || ctype.includes('AC_') || ctype.includes('DC_')) {
      layer = 'CABLES_POWER';
    } else if (conn.domain === 'PLUMBING' || ctype.includes('PIPE') || ctype.includes('WATER')) {
      layer = 'CABLES_PLUMBING';
    }

    // Direct line between equipment connection points
    drawLine(layer, sx, sy, tx, ty);

    // Midpoint length and specification label
    const mx = (sx + tx) / 2;
    const my = (sy + ty) / 2 + 5;
    drawText('ANNOTATIONS', mx - 20, my, 5, `${conn.connectionType} (${conn.lengthMeters}m)`);
  }

  pushCode(0, 'ENDSEC');
  pushCode(0, 'EOF');

  return lines.join('\n');
}
