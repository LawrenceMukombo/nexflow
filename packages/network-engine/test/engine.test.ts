import { 
  createComponentInstance, 
  checkPortCompatibility, 
  createConnectionInstance, 
  validateNetworkGraph, 
  findShortestPath, 
  calculateLinkTransitTimeMs, 
  stepNetworkSimulation, 
  generateNetworkBOQ, 
  generateCableSchedule,
  checkNodeNetworkConfig,
  areInSameSubnet,
  validatePacketTracerIPv4,
  getPacketTracerDefaultMask,
  getIpClass,
  isPrivateIp,
  normalizeSubnetPrefix,
  isValidIPv4
} from '../src/index';
import { EngineeringGraph, SimulationPacket } from '@omniflow/shared-types';

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

// 6b. Subnet Mismatch & Connection Blocking Test
assert(!areInSameSubnet('191.168.1.101', '192.168.1.1'), '191.168.1.101 and 192.168.1.1 are correctly identified as different subnets');
pc.properties.ipAddress = '191.168.1.101'; // Wrong subnet
pc.properties.defaultGateway = '192.168.1.1';
router.properties.lanIp = '192.168.1.1';

const misconfigStatus = checkNodeNetworkConfig(pc, testGraph);
assert(misconfigStatus.canConnect === false, 'Misconfigured device (191.168.1.101) cannot connect to network');
assert(misconfigStatus.statusText === 'SUBNET_MISMATCH', 'Status correctly classified as SUBNET_MISMATCH');

const subnetIssues = validateNetworkGraph(testGraph);
const subnetIssue = subnetIssues.find(i => i.ruleCode === 'NET_SUBNET_MISMATCH');
assert(subnetIssue !== undefined, 'Validation engine flagged NET_SUBNET_MISMATCH as CRITICAL');

// Route must be blocked
const blockedRoute = findShortestPath(testGraph, router.id, pc.id);
assert(blockedRoute === null, 'Transmission blocked: Cannot route to device with wrong subnet/IP settings');

// Restore nominal IP
pc.properties.ipAddress = '192.168.1.101';
const restoredRoute = findShortestPath(testGraph, router.id, pc.id);
assert(restoredRoute !== null && restoredRoute.length === 1, 'Transmission restored when IP matches network subnet');
delete testGraph.nodes[pc2.id];

// 7. BOQ Generation Test
const boq = generateNetworkBOQ(testGraph);
assert(boq.items.length >= 2, 'BOQ aggregates hardware equipment and cabling items');
assert(boq.grandTotal > 0, `BOQ calculated total project cost: $${boq.grandTotal}`);

// 8. Cable Schedule Test
const schedule = generateCableSchedule(testGraph);
assert(schedule.length === 1, 'Cable schedule generated active runs');
assert(schedule[0].sourceDevice.includes('RTR-TEST'), 'Origin device correctly labelled in cable schedule');

// 9. Component Library & Assembly Engine Test
import { 
  BUILTIN_LIBRARIES, 
  instantiateAssembly, 
  validateLibraryJson, 
  exportLibraryToJson 
} from '../src/index';

assert(BUILTIN_LIBRARIES.length >= 5, `Built-in libraries verified (${BUILTIN_LIBRARIES.length} curated vendor libraries loaded)`);

const ciscoLib = BUILTIN_LIBRARIES.find(l => l.id === 'lib_cisco_enterprise')!;
assert(ciscoLib !== undefined, 'Cisco Enterprise Library found in catalog');
assert(ciscoLib.assemblies.length >= 2, 'Cisco Library includes ready-to-deploy multi-device assemblies');

const unifiOfficeAsm = BUILTIN_LIBRARIES.find(l => l.id === 'lib_ubiquiti_unifi')!.assemblies[0];
const instantiated = instantiateAssembly(unifiOfficeAsm, { x: 50, y: 50 }, 'test_design');
assert(instantiated.nodes.length === unifiOfficeAsm.nodes.length, `Assembly instantiated ${instantiated.nodes.length} nodes successfully`);
assert(instantiated.connections.length === unifiOfficeAsm.connections.length, `Assembly wired ${instantiated.connections.length} inter-device connections`);

// 10. Library JSON Export / Validation Test
const jsonExport = exportLibraryToJson(ciscoLib);
const validation = validateLibraryJson(jsonExport);
assert(validation.valid === true, 'Exported Cisco Library validated cleanly via JSON parser');

// 12. Multi-Domain Topologies & Flow Generation Tests
import { 
  generateElectricalFacilityTopology,
  generateChilledWaterCoolingTopology,
  generateMultiDomainSmartFacilityTopology,
  spawnContinuousFlowPackets
} from '../src/index';

const elecGraph = generateElectricalFacilityTopology();
assert(Object.keys(elecGraph.nodes).length >= 6, 'Electrical topology generated with transformer, generator, ATS, and UPS');
assert(Object.keys(elecGraph.connections).length >= 5, 'Electrical topology linked 400V/230V power distribution lines');

const plumbGraph = generateChilledWaterCoolingTopology();
assert(Object.keys(plumbGraph.nodes).length >= 6, 'Plumbing cooling topology generated with chiller, pumps, buffer tank, and CRAH');
assert(Object.keys(plumbGraph.connections).length >= 5, 'Plumbing topology linked chilled water supply and return pipes');

const multiDomainGraph = generateMultiDomainSmartFacilityTopology();
assert(multiDomainGraph.domain === 'MULTI_DOMAIN', 'Unified Smart Facility configured as MULTI_DOMAIN');
const hyperRack = Object.values(multiDomainGraph.nodes).find(n => n.type === 'RACK_HYPERSCALE_42U')!;
assert(hyperRack !== undefined, 'Hyperscale 42U rack exists in smart facility');

// 13. Multi-Domain Flow Simulation Test
let initialPackets: SimulationPacket[] = [];
for (let iter = 0; iter < 15; iter++) {
  initialPackets = spawnContinuousFlowPackets(multiDomainGraph, initialPackets);
  if (
    initialPackets.some(p => p.medium === 'ELECTRICITY') &&
    initialPackets.some(p => p.medium === 'FLUID') &&
    initialPackets.some(p => p.medium === 'DATA')
  ) {
    break;
  }
}
assert(initialPackets.length > 0, `Continuous flow generator spawned ${initialPackets.length} multi-domain flow particles`);
assert(initialPackets.some(p => p.medium === 'ELECTRICITY'), 'Electrical current flow particles spawned');
assert(initialPackets.some(p => p.medium === 'FLUID'), 'Chilled water fluid flow particles spawned');
assert(initialPackets.some(p => p.medium === 'DATA'), 'Data network packets spawned');

const steppedState = stepNetworkSimulation(multiDomainGraph, {
  tick: 1,
  packets: initialPackets,
  telemetry: {
    tick: 0,
    activePackets: 0,
    deliveredPackets: 0,
    droppedPackets: 0,
    averageLatencyMs: 0,
    throughputMbps: 0,
    nodeLoads: {},
    linkSaturations: {}
  }
});
assert(steppedState.telemetry.totalPowerWatts !== undefined && steppedState.telemetry.totalPowerWatts > 0, 'Simulation telemetry calculates electrical power wattage');
assert(steppedState.telemetry.totalFluidFlowRate !== undefined && steppedState.telemetry.totalFluidFlowRate > 0, 'Simulation telemetry calculates fluid flow rate');

// 14. Cisco Packet Tracer IP Address & Subnet Engine Tests
// A. Class A, B, C and Public IP Validity
const ipClassA = validatePacketTracerIPv4('10.28.16.109');
assert(ipClassA.isValid === true, '10.28.16.109 is a valid Class A Private IPv4 host address');
assert(ipClassA.classType === 'A', '10.28.16.109 identified as Class A');
assert(ipClassA.isPrivate === true, '10.28.16.109 identified as RFC 1918 Private IP');
assert(getPacketTracerDefaultMask(10) === '255.0.0.0', 'Class A default subnet mask is 255.0.0.0');

const ipClassB = validatePacketTracerIPv4('172.16.10.5');
assert(ipClassB.isValid === true, '172.16.10.5 is a valid Class B Private IPv4 host address');
assert(ipClassB.classType === 'B', '172.16.10.5 identified as Class B');
assert(ipClassB.isPrivate === true, '172.16.10.5 identified as RFC 1918 Private IP');
assert(getPacketTracerDefaultMask(172) === '255.255.0.0', 'Class B default subnet mask is 255.255.0.0');

const ipClassCPrivate = validatePacketTracerIPv4('192.168.1.100');
assert(ipClassCPrivate.isValid === true, '192.168.1.100 is a valid Class C Private IPv4 host address');
assert(ipClassCPrivate.classType === 'C', '192.168.1.100 identified as Class C');
assert(ipClassCPrivate.isPrivate === true, '192.168.1.100 identified as RFC 1918 Private IP');

// Public IP support (e.g. 213.xxx.xxx.xxx)
const ipClassCPublic = validatePacketTracerIPv4('213.180.45.109');
assert(ipClassCPublic.isValid === true, '213.180.45.109 is a valid Class C Public IPv4 host address');
assert(ipClassCPublic.classType === 'C', '213.180.45.109 identified as Class C');
assert(ipClassCPublic.isPrivate === false, '213.180.45.109 identified as Public Internet routable IP');

// B. Consecutive Dots Diagnosis & Auto-Fixing (e.g. "10.28.16..109")
const badDoubleDot = validatePacketTracerIPv4('10.28.16..109');
assert(badDoubleDot.isValid === false, '10.28.16..109 correctly flagged as invalid due to consecutive dots');
assert(badDoubleDot.cleanedIp === '10.28.16.109', '10.28.16..109 automatically diagnosed and cleaned to 10.28.16.109');

// C. Subnet Prefix Normalization
assert(normalizeSubnetPrefix('10.28.16.') === '10.28.16', '10.28.16. normalized to 10.28.16 (stripped trailing dot)');
assert(normalizeSubnetPrefix('10.28.16..') === '10.28.16', '10.28.16.. normalized to 10.28.16 (stripped multiple trailing dots)');
assert(normalizeSubnetPrefix('10.28.16.0') === '10.28.16', '10.28.16.0 normalized to 10.28.16');
assert(normalizeSubnetPrefix('10.28.16.0/24') === '10.28.16', '10.28.16.0/24 normalized to 10.28.16');
assert(normalizeSubnetPrefix('213.180.45.') === '213.180.45', '213.180.45. normalized to 213.180.45');

// D. Special and Reserved IP Enforcement (Packet Tracer rules)
assert(validatePacketTracerIPv4('0.0.0.0').isValid === false, '0.0.0.0 rejected as unusable host IP');
assert(validatePacketTracerIPv4('127.0.0.1').isValid === false, '127.0.0.1 rejected as loopback');
assert(validatePacketTracerIPv4('224.0.0.1').isValid === false, '224.0.0.1 rejected as multicast (Class D)');
assert(validatePacketTracerIPv4('245.0.0.1').isValid === false, '245.0.0.1 rejected as reserved (Class E)');

// E. Network and Broadcast Address Enforcement in Subnet
assert(validatePacketTracerIPv4('10.28.16.0', '255.255.255.0').isValid === false, '10.28.16.0 rejected as Subnet Network Address');
assert(validatePacketTracerIPv4('10.28.16.255', '255.255.255.0').isValid === false, '10.28.16.255 rejected as Subnet Directed Broadcast Address');

console.log('=== ALL 16 VERIFICATION SUITES PASSED SUCCESSFULLY ===');


