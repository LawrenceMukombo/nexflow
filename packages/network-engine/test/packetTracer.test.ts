import { 
  createComponentInstance, 
  createConnectionInstance, 
  generateMacAddress,
  generatePduDetails,
  createSimplePdu,
  stepSimulationPacket
} from '../src/index';
import { EngineeringGraph } from '@omniflow/shared-types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

console.log('=== RUNNING OMNIFLOW PACKET TRACER TEST SUITE ===');

// 1. Build a test topology (PC1 -> Switch -> Router)
const rtr = createComponentInstance('ROUTER_ENTERPRISE', 'design_pt', { x: 100, y: 100 }, 'RTR-01');
rtr.properties.ipAddress = '192.168.1.1';
rtr.properties.subnetMask = '255.255.255.0';

const sw = createComponentInstance('SWITCH_CORE_L3', 'design_pt', { x: 300, y: 100 }, 'SW-01');
sw.properties.ipAddress = '192.168.1.2';
sw.properties.subnetMask = '255.255.255.0';

const pc = createComponentInstance('WORKSTATION_PC', 'design_pt', { x: 500, y: 100 }, 'PC-01');
pc.properties.ipAddress = '192.168.1.10';
pc.properties.subnetMask = '255.255.255.0';
pc.properties.defaultGateway = '192.168.1.1';

// Connect Router to Switch
const rtrPort = rtr.ports.find(p => p.name.includes('LAN')) || rtr.ports[1];
const swPort1 = sw.ports[0];
const conn1 = createConnectionInstance('design_pt', rtr.id, rtrPort.id, sw.id, swPort1.id, 'CAT6', 10);
rtrPort.occupiedByConnectionId = conn1.id;
swPort1.occupiedByConnectionId = conn1.id;

// Connect Switch to PC
const swPort2 = sw.ports[1];
const pcPort = pc.ports[0];
const conn2 = createConnectionInstance('design_pt', sw.id, swPort2.id, pc.id, pcPort.id, 'CAT6', 20);
swPort2.occupiedByConnectionId = conn2.id;
pcPort.occupiedByConnectionId = conn2.id;

const graph: EngineeringGraph = {
  schemaVersion: '1.0',
  designId: 'design_pt',
  name: 'Packet Tracer Test',
  domain: 'NETWORK',
  nodes: {
    [rtr.id]: rtr,
    [sw.id]: sw,
    [pc.id]: pc
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

// 1. MAC Address Test
const mac = generateMacAddress(pc, 0);
assert(mac.startsWith('00-1E-13'), 'MAC address uses authentic Cisco OUI');
assert(mac.split('-').length === 6, 'MAC address format has 6 octets');

// 2. PDU Details Generation Test (OSI Model layers)
const pdu = generatePduDetails(graph, pc, rtr, pc, 'ICMP', false);
assert(pdu.protocol === 'ICMP', 'PDU protocol correctly recorded as ICMP');
assert(pdu.outLayers.length >= 4, 'Outbound PDU generates multiple OSI Model layers');
assert(pdu.outLayers.some(l => l.layer === 7), 'Layer 7 (Application) ping diagnostic is described');
assert(pdu.outLayers.some(l => l.layer === 3), 'Layer 3 (Network) IP encapsulation is described');
assert(pdu.ethernetHeader.destMac.length > 0, 'Ethernet II destination MAC present');
assert(pdu.ipHeader.ttl === 64, 'IPv4 TTL set to 64');
assert(pdu.payloadHeader?.icmpType === 8, 'ICMP Type 8 (Echo Request) generated');

// 3. Simple PDU Dispatch (Envelope generation)
const pduBurst = createSimplePdu(graph, pc.id, rtr.id, 0.125);
assert(pduBurst.packet !== null, 'Simple PDU packet generated');
assert(pduBurst.packet?.isEnvelope === true, 'Packet flagged as Packet Tracer visual envelope');
assert(pduBurst.event !== null, 'Simulation Event generated for Event List');
assert(pduBurst.scenario !== null, 'Scenario entry generated');
assert(pduBurst.scenario?.status === 'In Progress', 'Scenario status is In Progress');

// 4. Step Simulation (Capture / Forward)
const step1 = stepSimulationPacket(pduBurst.packet!, graph, 0.150);
assert(step1.newEvent !== null, 'Capture / Forward generated an event at intermediate switch');
assert(step1.newEvent?.atDeviceTag === 'SW-01', 'Envelope arrived at SW-01');

console.log('======================================================');
console.log('🎉 ALL PACKET TRACER TESTS PASSED SUCCESSFULLY!');
console.log('======================================================');
