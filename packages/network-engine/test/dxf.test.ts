import { 
  generateMultiDomainSmartFacilityTopology, 
  generateAutoCAD_DXF, 
  generateArchitecturalSheetSvg,
  generatePrintableSubmittalHtml
} from '../src/index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log('=== RUNNING OMNIFLOW CAD & ARCHITECTURAL DRAWING TEST SUITE ===');

// 1. Generate multi-domain test graph
const facilityGraph = generateMultiDomainSmartFacilityTopology();
assert(Object.keys(facilityGraph.nodes).length >= 6, 'Loaded multi-domain smart facility topology');
assert(Object.keys(facilityGraph.connections).length >= 5, 'Facility has physical connections');

// 2. Test AutoCAD DXF Exporter
const dxfContent = generateAutoCAD_DXF(facilityGraph, {
  projectName: 'Hyperscale DC Submittal',
  drawingNumber: 'E-101',
  revision: '1.0',
  author: 'Principal PE',
  clientName: 'Global Cloud Systems'
});

assert(typeof dxfContent === 'string' && dxfContent.length > 500, 'AutoCAD DXF generated non-empty content');
assert(dxfContent.includes('$ACADVER'), 'DXF includes ACADVER header');
assert(dxfContent.includes('AC1009'), 'DXF targets AC1009 / AutoCAD R12 standard');
assert(dxfContent.includes('CABLES_DATA'), 'DXF contains CABLES_DATA layer');
assert(dxfContent.includes('CABLES_POWER'), 'DXF contains CABLES_POWER layer');
assert(dxfContent.includes('CABLES_PLUMBING'), 'DXF contains CABLES_PLUMBING layer');
assert(dxfContent.includes('EQUIPMENT_BLOCKS'), 'DXF contains EQUIPMENT_BLOCKS layer');
assert(dxfContent.includes('BORDER_TITLE_BLOCK'), 'DXF contains BORDER_TITLE_BLOCK layer');
assert(dxfContent.includes('E-101'), 'DXF contains drawing number text');
assert(dxfContent.endsWith('EOF'), 'DXF terminates properly with EOF marker');

// 3. Test Architectural Drawing Sheet SVG
const sheetSvg = generateArchitecturalSheetSvg(facilityGraph, {
  projectName: 'Mission Critical Data Hall',
  drawingTitle: 'POWER & COOLING SINGLE-LINE RISER',
  drawingNumber: 'E-201',
  sheetNumber: '1',
  totalSheets: '3',
  revision: '2.0',
  author: 'Director of Engineering'
});

assert(typeof sheetSvg === 'string' && sheetSvg.length > 1000, 'Architectural SVG generated valid content');
assert(sheetSvg.includes('<svg xmlns="http://www.w3.org/2000/svg"'), 'SVG root element formatted properly');
assert(sheetSvg.includes('viewBox="0 0 2400 1600"'), 'SVG conforms to ANSI D 2400x1600 sheet coordinates');
assert(sheetSvg.includes('STANDARDS & CODE COMPLIANCE'), 'Drawing sheet embeds code compliance table');
assert(sheetSvg.includes('ENGINEERING BILL OF MATERIALS'), 'Drawing sheet embeds bill of quantities summary');
assert(sheetSvg.includes('REGISTERED PROFESSIONAL'), 'Drawing sheet embeds PE engineer seal stamp');
assert(sheetSvg.includes('E-201'), 'Drawing sheet renders drawing number');
assert(sheetSvg.includes('1/3'), 'Drawing sheet renders sheet pagination (1/3)');

// 4. Test Printable HTML Submittal Package
const submittalHtml = generatePrintableSubmittalHtml(facilityGraph, {
  projectName: 'Mission Critical Data Hall',
  drawingNumber: 'E-201'
});

assert(submittalHtml.includes('<!DOCTYPE html>'), 'Printable submittal produces valid HTML5 document');
assert(submittalHtml.includes('@page {'), 'Printable submittal includes @page landscape rules');
assert(submittalHtml.includes('@media print'), 'Printable submittal includes @media print CSS optimization');
assert(submittalHtml.includes('window.print()'), 'Printable submittal features 1-click print trigger');

console.log('======================================================');
console.log('🎉 ALL CAD EXPORT & ARCHITECTURAL DRAWING TESTS PASSED!');
console.log('======================================================');
