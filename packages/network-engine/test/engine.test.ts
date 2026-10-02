import { 
  createComponentInstance, 
  checkPortCompatibility, 
  createConnectionInstance, 
  validateNetworkGraph, 
  findShortestPath, 
  calculateLinkTransitTimeMs, 
  stepNetworkSimulation, 
  generateNetworkBOQ, 
  generateCableSchedule 
} from '../src/index';
import { EngineeringGraph } from '@omniflow/shared-types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

console.log('=== RUNNING OMNIFLOW NETWORK ENGINE SUITE ===');

// 1. Component Factory Test
const router = createComponentInstance('ROUTER_ENTERPRISE', 'test_design', { x: 100, y: 100 }, 'RTR-TEST');
assert(router.tag === 'RTR-TEST', 'Component tag is set correctly');
assert(router.ports.length === 4, 'Enterprise router exposes 4 ports (WAN, LAN1, LAN2, CONSOLE)');
assert(router.ports[0].name === 'WAN1', 'First port is WAN1');

// 2. Port Compatibility Test
const pc = createComponentInstance('WORKSTATION_PC', 'test_design', { x: 300, y: 300 }, 'PC-TEST');
const rtrLanPort = router.ports.find(p => p.name === 'LAN1')!;
const pcEthPort = pc.ports.find(p => p.name === 'ETH0')!;

const compResult = checkPortCompatibility(rtrLanPort, pcEthPort);
assert(compResult.compatible === true, 'RJ45 LAN port connects compatibly with RJ45 PC port');

// Incompatible connection test (Console port to PC Ethernet port)
const rtrConsolePort = router.ports.find(p => p.name === 'CONSOLE')!;
const badComp = checkPortCompatibility(rtrConsolePort, pcEthPort);
assert(badComp.compatible === false, 'Console serial port rejects Ethernet cable connection');

// 3. Connection & Distance Latency Test
const conn = createConnectionInstance('test_design', router.id, rtrLanPort.id, pc.id, pcEthPort.id, 'CAT6', 40);
assert(conn.connectionType === 'CAT6', 'Connection instantiated as CAT6');
assert(conn.lengthMeters === 40, 'Connection length records 40 meters');

const transitTime = calculateLinkTransitTimeMs(conn, 1500);
assert(transitTime > 0, `Physics-based latency computed: ${transitTime.toFixed(4)} ms`);

// 4. Graph Construction & Shortest Path Traversal
rtrLanPort.occupiedByConnectionId = conn.id;
pcEthPort.occupiedByConnectionId = conn.id;

const testGraph: EngineeringGraph = {
  schemaVersion: '1.0',
  designId: 'test_design',
  name: 'Test Topology',
  domain: 'NETWORK',
  nodes: { [router.id]: router, [pc.id]: pc },
  connections: { [conn.id]: conn },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0'
  }
};

const route = findShortestPath(testGraph, router.id, pc.id);
assert(route !== null && route.length === 1, 'Shortest path found between Router and PC via direct link');

// 5. Fault Propagation Test
router.simulationState.isFailed = true;
const brokenRoute = findShortestPath(testGraph, router.id, pc.id);
assert(brokenRoute === null, 'Packet path blocked when router is offline (fault isolation)');
router.simulationState.isFailed = false;

// 6. Network Validation Engine Test
// Add a second PC with duplicate IP
const pc2 = createComponentInstance('WORKSTATION_PC', 'test_design', { x: 500, y: 500 }, 'PC-02');
pc.properties.ipAddress = '192.168.1.100';
pc2.properties.ipAddress = '192.168.1.100'; // Conflict!

testGraph.nodes[pc2.id] = pc2;
const issues = validateNetworkGraph(testGraph);
const dupIpIssue = issues.find(i => i.ruleCode === 'NET_DUPLICATE_IP');
assert(dupIpIssue !== undefined, 'Validation engine automatically flagged NET_DUPLICATE_IP');
assert(dupIpIssue?.severity === 'CRITICAL', 'Duplicate IP is marked as CRITICAL severity');

// 7. BOQ Generation Test
const boq = generateNetworkBOQ(testGraph);
assert(boq.items.length >= 2, 'BOQ aggregates hardware equipment and cabling items');
assert(boq.grandTotal > 0, `BOQ calculated total project cost: $${boq.grandTotal}`);

// 8. Cable Schedule Test
const schedule = generateCableSchedule(testGraph);
assert(schedule.length === 1, 'Cable schedule generated active runs');
assert(schedule[0].sourceDevice.includes('RTR-TEST'), 'Origin device correctly labelled in cable schedule');

console.log('=== ALL 8 VERIFICATION TESTS PASSED SUCCESSFULLY ===');
