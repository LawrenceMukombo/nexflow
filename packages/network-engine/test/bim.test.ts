import { 
  generateMultiDomainSmartFacilityTopology, 
  buildBimModelFromGraph, 
  project3DToScreen, 
  getComponentElevationMm, 
  getConnectionElevationMm 
} from '../src/index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log('=== RUNNING OMNIFLOW 3D ISOMETRIC BIM ENGINE TEST SUITE ===');

// 1. Generate test facility graph
const facility = generateMultiDomainSmartFacilityTopology();
assert(Object.keys(facility.nodes).length >= 6, 'Smart facility loaded with multiple equipment units');

// 2. Test 3D Model Extraction
const bimModel = buildBimModelFromGraph(facility);
assert(bimModel.cuboids.length === Object.keys(facility.nodes).length, `Extracted ${bimModel.cuboids.length} 3D BIM cuboids`);
assert(bimModel.pipes.length === Object.keys(facility.connections).length, `Extracted ${bimModel.pipes.length} 3D conduit/pipe segments`);

// 3. Test Elevation Categories
const underfloorPipes = bimModel.pipes.filter(p => p.elevationCategory === 'UNDERFLOOR');
assert(underfloorPipes.length > 0, `Underfloor chilled water pipes identified at Z < 0 (${underfloorPipes.length} runs)`);

const rackCuboid = bimModel.cuboids.find(c => c.type.includes('RACK'));
assert(rackCuboid !== undefined, 'Hyperscale server rack cuboid found');
assert(rackCuboid!.size.height >= 1800, 'Server rack height corresponds to 42U enclosure (1800mm+)');

// 4. Test 3D Isometric Projection Matrix
const camera = {
  orbitAngleDeg: 45,
  tiltAngleDeg: 35,
  zoom: 1.0,
  panX: 0,
  panY: 0
};

const pt3d = { x: 500, y: 300, z: 1200 };
const screenPt = project3DToScreen(pt3d, camera, { x: 500, y: 400 });
assert(typeof screenPt.x === 'number' && !isNaN(screenPt.x), 'Projection calculates valid screen X coordinate');
assert(typeof screenPt.y === 'number' && !isNaN(screenPt.y), 'Projection calculates valid screen Y coordinate');
assert(typeof screenPt.depth === 'number', 'Projection calculates depth for painter algorithm sorting');

// 5. Test Camera Orbit Rotation
const cameraRotated = { ...camera, orbitAngleDeg: 135 };
const screenPtRot = project3DToScreen(pt3d, cameraRotated, { x: 500, y: 400 });
assert(screenPtRot.x !== screenPt.x, 'Camera orbit rotation produces updated projected screen position');

console.log('======================================================');
console.log('🎉 ALL 3D ISOMETRIC BIM ENGINE TESTS PASSED!');
console.log('======================================================');
