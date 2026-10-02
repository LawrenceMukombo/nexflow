import { 
  createComponentInstance, 
  createConnectionInstance, 
  findBestCompatiblePort,
  discoverConnectedGateway,
  autoAssignNodeIp,
  autoConfigureAllNetworkIps,
  getSubnetOverview
} from '../src/index';
import { EngineeringGraph } from '@omniflow/shared-types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

console.log('=== RUNNING OMNIFLOW IPAM & SMART CONNECT TEST SUITE ===');

// 1. Build a test topology
const router = createComponentInstance('ROUTER_ENTERPRISE', 'design_ipam', { x: 100, y: 100 }, 'RTR-01');
router.properties.lanIp = '192.168.10.1';
router.properties.subnetMask = '255.255.255.0';

const switchCore = createComponentInstance('SWITCH_CORE_L3', 'design_ipam', { x: 300, y: 100 }, 'SW-01');
switchCore.properties.managementIp = '192.168.10.2';
switchCore.properties.defaultGateway = '192.168.10.1';

const pc1 = createComponentInstance('WORKSTATION_PC', 'design_ipam', { x: 500, y: 50 }, 'PC-01');
const pc2 = createComponentInstance('WORKSTATION_PC', 'design_ipam', { x: 500, y: 150 }, 'PC-02');
const ap1 = createComponentInstance('ACCESS_POINT_WIFI6', 'design_ipam', { x: 500, y: 250 }, 'AP-01');

// Connect Router LAN1 to Switch GigE1
const rtrLan = router.ports.find(p => p.name === 'LAN1')!;
const swPort1 = switchCore.ports[0];
const conn1 = createConnectionInstance('design_ipam', router.id, rtrLan.id, switchCore.id, swPort1.id, 'CAT6', 10);
rtrLan.occupiedByConnectionId = conn1.id;
swPort1.occupiedByConnectionId = conn1.id;

// Connect Switch Port2 to PC1
const swPort2 = switchCore.ports[1];
const pc1Port = pc1.ports[0];
const conn2 = createConnectionInstance('design_ipam', switchCore.id, swPort2.id, pc1.id, pc1Port.id, 'CAT6', 15);
swPort2.occupiedByConnectionId = conn2.id;
pc1Port.occupiedByConnectionId = conn2.id;

const graph: EngineeringGraph = {
  schemaVersion: '1.0',
  designId: 'design_ipam',
  name: 'IPAM Test Blueprint',
  domain: 'NETWORK',
  nodes: {
    [router.id]: router,
    [switchCore.id]: switchCore,
    [pc1.id]: pc1,
    [pc2.id]: pc2,
    [ap1.id]: ap1
  },
  connections: {
    [conn1.id]: conn1,
    [conn2.id]: conn2
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0.0',
    author: 'Test Architect'
  }
};

// 2. Test Smart Compatible Port Finder (Device-to-Device Wiring)
const bestPortForPc2 = findBestCompatiblePort(pc2, pc2.ports[0], switchCore, graph);
assert(bestPortForPc2 !== null, 'Finds available compatible port on switch for PC');
assert(bestPortForPc2!.id !== swPort1.id && bestPortForPc2!.id !== swPort2.id, 'Picks an unoccupied port on the switch');
assert(bestPortForPc2!.type === 'RJ45', 'Compatible port is RJ45 Ethernet');

// 3. Test Discover Gateway
const gwInfo = discoverConnectedGateway(pc1.id, graph);
assert(gwInfo !== null, 'Discovers upstream gateway through switch');
assert(gwInfo!.gatewayIp === '192.168.10.1', 'Gateway IP correctly identified as router 192.168.10.1');

// 4. Test Single-Device Auto-Assign IP (DHCP)
const assignResult = autoAssignNodeIp(pc1.id, graph);
assert(assignResult.success === true, 'Auto-assign IP succeeded');
assert(assignResult.ip === '192.168.10.10', 'First available host IP assigned as 192.168.10.10');
assert(assignResult.gateway === '192.168.10.1', 'Gateway assigned as 192.168.10.1');

// Apply assignment to PC1
pc1.properties.ipAddress = assignResult.ip;
pc1.properties.defaultGateway = assignResult.gateway;

// 5. Connect PC2 to switch and test second assignment
const swPort3 = bestPortForPc2!;
const pc2Port = pc2.ports[0];
const conn3 = createConnectionInstance('design_ipam', switchCore.id, swPort3.id, pc2.id, pc2Port.id, 'CAT6', 20);
swPort3.occupiedByConnectionId = conn3.id;
pc2Port.occupiedByConnectionId = conn3.id;
graph.connections[conn3.id] = conn3;

const assignResult2 = autoAssignNodeIp(pc2.id, graph);
assert(assignResult2.success === true, 'Auto-assign IP for PC2 succeeded');
assert(assignResult2.ip === '192.168.10.11', 'Non-conflicting incremental IP 192.168.10.11 assigned to PC2');

// 6. Test Auto-Configure All Network IPs
const autoAll = autoConfigureAllNetworkIps(graph);
assert(autoAll.updatedCount >= 2, 'Auto-configured all connected endpoints across graph');

// 7. Test Subnet Overview
const overview = getSubnetOverview(graph);
assert(overview.length >= 1, 'Grouped devices into subnets');
const subnet10 = overview.find(s => s.cidr === '192.168.10.0/24');
assert(subnet10 !== undefined, 'Subnet 192.168.10.0/24 identified');
assert(subnet10!.assignedCount >= 3, 'Overview tracks assigned hosts in subnet');

console.log('======================================================');
console.log('🎉 ALL IPAM & SMART CONNECTIVITY TESTS PASSED!');
console.log('======================================================');
