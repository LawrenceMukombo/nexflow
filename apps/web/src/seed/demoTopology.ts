import { EngineeringGraph } from '@omniflow/shared-types';
import { 
  createComponentInstance, 
  createConnectionInstance 
} from '@omniflow/network-engine';

export function createDemoSmallOfficeGraph(): EngineeringGraph {
  const designId = 'design_small_office_01';

  // 1. Create Core Devices
  const isp = createComponentInstance('ISP_FEED', designId, { x: 80, y: 180 }, 'ISP-01');
  const router = createComponentInstance('ROUTER_ENTERPRISE', designId, { x: 300, y: 180 }, 'RTR-01');
  const firewall = createComponentInstance('FIREWALL_UTM', designId, { x: 520, y: 180 }, 'FW-01');
  const coreSwitch = createComponentInstance('SWITCH_CORE_L3', designId, { x: 760, y: 180 }, 'SW-CORE-01');
  const poeSwitch = createComponentInstance('SWITCH_POE_24', designId, { x: 760, y: 380 }, 'SW-POE-01');

  // Servers & Shared Equipment
  const server = createComponentInstance('SERVER_APP', designId, { x: 1040, y: 80 }, 'SRV-DB01');
  const printer = createComponentInstance('NETWORK_PRINTER', designId, { x: 1040, y: 220 }, 'PRN-OFFICE');
  const ap1 = createComponentInstance('ACCESS_POINT_WIFI6', designId, { x: 1040, y: 360 }, 'AP-ZONE-A');
  const voip = createComponentInstance('IP_PHONE_VOIP', designId, { x: 1040, y: 500 }, 'VOIP-EXEC');

  // Workstation Pod (4 Desktops)
  const pc1 = createComponentInstance('WORKSTATION_PC', designId, { x: 480, y: 580 }, 'PC-01');
  const pc2 = createComponentInstance('WORKSTATION_PC', designId, { x: 680, y: 580 }, 'PC-02');
  const pc3 = createComponentInstance('WORKSTATION_PC', designId, { x: 880, y: 580 }, 'PC-03');
  const pc4 = createComponentInstance('WORKSTATION_PC', designId, { x: 1080, y: 580 }, 'PC-04');

  // IP Configurations
  router.properties.lanIp = '192.168.1.1';
  firewall.properties.ipAddress = '192.168.1.2';
  coreSwitch.properties.managementIp = '192.168.1.10';
  coreSwitch.properties.defaultGateway = '192.168.1.1';
  poeSwitch.properties.managementIp = '192.168.1.11';
  poeSwitch.properties.defaultGateway = '192.168.1.1';

  server.properties.ipAddress = '192.168.1.50';
  server.properties.defaultGateway = '192.168.1.1';
  printer.properties.ipAddress = '192.168.1.200';
  printer.properties.defaultGateway = '192.168.1.1';
  ap1.properties.ipAddress = '192.168.1.20';
  ap1.properties.defaultGateway = '192.168.1.1';
  voip.properties.ipAddress = '192.168.1.160';
  voip.properties.defaultGateway = '192.168.1.1';

  pc1.properties.ipAddress = '192.168.1.101';
  pc1.properties.defaultGateway = '192.168.1.1';
  pc2.properties.ipAddress = '192.168.1.102';
  pc2.properties.defaultGateway = '192.168.1.1';
  pc3.properties.ipAddress = '192.168.1.103';
  pc3.properties.defaultGateway = '192.168.1.1';
  pc4.properties.ipAddress = '192.168.1.104';
  pc4.properties.defaultGateway = '192.168.1.1';

  const nodes = {
    [isp.id]: isp,
    [router.id]: router,
    [firewall.id]: firewall,
    [coreSwitch.id]: coreSwitch,
    [poeSwitch.id]: poeSwitch,
    [server.id]: server,
    [printer.id]: printer,
    [ap1.id]: ap1,
    [voip.id]: voip,
    [pc1.id]: pc1,
    [pc2.id]: pc2,
    [pc3.id]: pc3,
    [pc4.id]: pc4
  };

  const connections: Record<string, ReturnType<typeof createConnectionInstance>> = {};

  function connect(
    srcNode: typeof isp,
    srcPortIdx: number,
    tgtNode: typeof isp,
    tgtPortIdx: number,
    cable: string = 'CAT6',
    distMeters: number = 10
  ) {
    const conn = createConnectionInstance(
      designId,
      srcNode.id,
      srcNode.ports[srcPortIdx].id,
      tgtNode.id,
      tgtNode.ports[tgtPortIdx].id,
      cable,
      distMeters
    );
    srcNode.ports[srcPortIdx].occupiedByConnectionId = conn.id;
    tgtNode.ports[tgtPortIdx].occupiedByConnectionId = conn.id;
    connections[conn.id] = conn;
  }

  // ISP -> Router WAN1
  connect(isp, 0, router, 0, 'FIBER_SM', 25);
  // Router LAN1 -> Firewall WAN_IN
  connect(router, 1, firewall, 0, 'CAT6A', 5);
  // Firewall LAN_OUT -> Core Switch Port 1
  connect(firewall, 1, coreSwitch, 0, 'CAT6A', 5);
  // Core Switch Port 2 -> PoE Switch Uplink 1
  connect(coreSwitch, 1, poeSwitch, 12, 'CAT6A', 8);
  // Core Switch Port 3 -> Server NIC1
  connect(coreSwitch, 2, server, 0, 'CAT6A', 15);
  // Core Switch Port 4 -> Printer LAN
  connect(coreSwitch, 3, printer, 0, 'CAT6', 20);
  // PoE Switch Port 1 -> AP-01 ETH0_POE
  connect(poeSwitch, 0, ap1, 0, 'CAT6', 35);
  // PoE Switch Port 2 -> VoIP Phone
  connect(poeSwitch, 1, voip, 0, 'CAT6', 18);
  // PoE Switch Port 3 -> PC1
  connect(poeSwitch, 2, pc1, 0, 'CAT6', 22);
  // PoE Switch Port 4 -> PC2
  connect(poeSwitch, 3, pc2, 0, 'CAT6', 24);
  // PoE Switch Port 5 -> PC3
  connect(poeSwitch, 4, pc3, 0, 'CAT6', 26);
  // PoE Switch Port 6 -> PC4
  connect(poeSwitch, 5, pc4, 0, 'CAT6', 28);

  return {
    schemaVersion: '1.0',
    designId,
    name: 'Small Office Enterprise Network (Production Blueprint)',
    domain: 'NETWORK',
    nodes,
    connections,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
      author: 'Principal Systems Architect'
    }
  };
}
