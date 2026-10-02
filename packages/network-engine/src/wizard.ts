import { EngineeringGraph } from '@omniflow/shared-types';
import { createComponentInstance } from './components';
import { createConnectionInstance } from './ports';

export interface NetworkWizardOptions {
  archetype: 'BRANCH_OFFICE' | 'ENTERPRISE_CAMPUS' | 'DATA_CENTER' | 'SECURITY_CCTV' | 'INDUSTRIAL_IOT';
  projectName: string;
  subnetPrefix: string; // e.g. "192.168.10" or "10.0.1"
  clientCount: number;  // 2 - 24
  includeWifi: boolean;
  includeVoip: boolean;
  includeRedundancy: boolean;
}

export function generateWizardTopology(options: NetworkWizardOptions): EngineeringGraph {
  const designId = `design_wiz_${Date.now()}`;
  const prefix = options.subnetPrefix || '192.168.10';
  const nodes: Record<string, ReturnType<typeof createComponentInstance>> = {};
  const connections: Record<string, ReturnType<typeof createConnectionInstance>> = {};

  function addNode(type: string, tag: string, x: number, y: number) {
    const node = createComponentInstance(type, designId, { x, y }, tag);
    nodes[node.id] = node;
    return node;
  }

  function link(
    srcNode: ReturnType<typeof createComponentInstance>,
    srcPortIdx: number,
    tgtNode: ReturnType<typeof createComponentInstance>,
    tgtPortIdx: number,
    cableType: string = 'CAT6',
    distanceMeters: number = 15
  ) {
    const srcPort = srcNode.ports[srcPortIdx];
    const tgtPort = tgtNode.ports[tgtPortIdx];
    if (!srcPort || !tgtPort) return;

    const conn = createConnectionInstance(
      designId,
      srcNode.id,
      srcPort.id,
      tgtNode.id,
      tgtPort.id,
      cableType,
      distanceMeters
    );
    srcPort.occupiedByConnectionId = conn.id;
    tgtPort.occupiedByConnectionId = conn.id;
    connections[conn.id] = conn;
  }

  // === ARCHETYPE 1: BRANCH OFFICE ===
  if (options.archetype === 'BRANCH_OFFICE') {
    const isp = addNode('ISP_FEED', 'ISP-MAIN', 60, 200);
    const router = addNode('ROUTER_BRANCH', 'BR-RTR-01', 280, 200);
    router.properties.lanIp = `${prefix}.1`;

    const sw = addNode('SWITCH_POE_24', 'SW-ACC-01', 500, 200);
    sw.properties.managementIp = `${prefix}.10`;
    sw.properties.defaultGateway = `${prefix}.1`;

    link(isp, 0, router, 0, 'FIBER_SM', 25);
    link(router, 2, sw, 12, 'CAT6A', 5);

    let switchPort = 0;

    if (options.includeWifi) {
      const ap = addNode('ACCESS_POINT_WIFI6', 'AP-OFFICE', 740, 100);
      ap.properties.ipAddress = `${prefix}.20`;
      ap.properties.defaultGateway = `${prefix}.1`;
      link(sw, switchPort++, ap, 0, 'CAT6', 25);
    }

    if (options.includeVoip) {
      const voip = addNode('IP_PHONE_VOIP', 'VOIP-01', 740, 220);
      voip.properties.ipAddress = `${prefix}.150`;
      voip.properties.defaultGateway = `${prefix}.1`;
      link(sw, switchPort++, voip, 0, 'CAT6', 15);
    }

    const printer = addNode('NETWORK_PRINTER', 'PRN-OFFICE', 740, 340);
    printer.properties.ipAddress = `${prefix}.200`;
    printer.properties.defaultGateway = `${prefix}.1`;
    link(sw, switchPort++, printer, 0, 'CAT6', 20);

    // Clients
    const count = Math.min(12, Math.max(2, options.clientCount));
    for (let i = 0; i < count; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 500 + col * 200;
      const y = 460 + row * 130;
      const pc = addNode('WORKSTATION_PC', `PC-${String(i + 1).padStart(2, '0')}`, x, y);
      pc.properties.ipAddress = `${prefix}.${101 + i}`;
      pc.properties.defaultGateway = `${prefix}.1`;
      if (switchPort < sw.ports.length - 1) {
        link(sw, switchPort++, pc, 0, 'CAT6', 15 + i * 2);
      }
    }
  }

  // === ARCHETYPE 2: ENTERPRISE CAMPUS ===
  else if (options.archetype === 'ENTERPRISE_CAMPUS') {
    const isp1 = addNode('ISP_FEED', 'ISP-PRIMARY', 60, 140);
    const fw = addNode('FIREWALL_HA_CLUSTER', 'FW-HA-CLUSTER', 280, 200);
    fw.properties.virtualIp = `${prefix}.1`;
    link(isp1, 0, fw, 0, 'FIBER_SM', 30);

    if (options.includeRedundancy) {
      const isp2 = addNode('ISP_FEED', 'ISP-BACKUP', 60, 280);
      link(isp2, 0, fw, 1, 'FIBER_SM', 30);
    }

    const coreSw = addNode('SWITCH_CORE_L3', 'SW-CORE-01', 520, 200);
    coreSw.properties.managementIp = `${prefix}.2`;
    coreSw.properties.defaultGateway = `${prefix}.1`;
    link(fw, 2, coreSw, 0, 'CAT6A', 5);

    // Distribution / Access
    const swFloor1 = addNode('SWITCH_POE_24', 'SW-FL1', 760, 100);
    swFloor1.properties.managementIp = `${prefix}.11`;
    swFloor1.properties.defaultGateway = `${prefix}.1`;
    link(coreSw, 1, swFloor1, 12, 'CAT6A', 15);

    const swFloor2 = addNode('SWITCH_POE_24', 'SW-FL2', 760, 320);
    swFloor2.properties.managementIp = `${prefix}.12`;
    swFloor2.properties.defaultGateway = `${prefix}.1`;
    link(coreSw, 2, swFloor2, 12, 'CAT6A', 25);

    // Server & Storage
    const srv = addNode('SERVER_APP', 'SRV-APP-01', 520, 360);
    srv.properties.ipAddress = `${prefix}.50`;
    srv.properties.defaultGateway = `${prefix}.1`;
    link(coreSw, 3, srv, 0, 'CAT6A', 5);

    // APs
    const ap1 = addNode('ACCESS_POINT_WIFI6', 'AP-FL1', 980, 80);
    ap1.properties.ipAddress = `${prefix}.21`;
    ap1.properties.defaultGateway = `${prefix}.1`;
    link(swFloor1, 0, ap1, 0, 'CAT6', 30);

    const ap2 = addNode('ACCESS_POINT_WIFI6', 'AP-FL2', 980, 220);
    ap2.properties.ipAddress = `${prefix}.22`;
    ap2.properties.defaultGateway = `${prefix}.1`;
    link(swFloor2, 0, ap2, 0, 'CAT6', 30);

    // Workstations
    for (let i = 0; i < Math.min(8, options.clientCount); i++) {
      const pc = addNode('WORKSTATION_PC', `PC-FL1-${i + 1}`, 980 + (i % 2) * 190, 340 + Math.floor(i / 2) * 120);
      pc.properties.ipAddress = `${prefix}.${101 + i}`;
      pc.properties.defaultGateway = `${prefix}.1`;
      link(swFloor1, 1 + i, pc, 0, 'CAT6', 20);
    }
  }

  // === ARCHETYPE 3: DATA CENTER & SERVER FARM ===
  else if (options.archetype === 'DATA_CENTER') {
    const bgp1 = addNode('ROUTER_CORE_BGP', 'BGP-RTR-01', 80, 160);
    const bgp2 = addNode('ROUTER_CORE_BGP', 'BGP-RTR-02', 80, 340);
    
    const aggSw = addNode('SWITCH_AGGREGATION_10G', 'SW-AGG-10G', 320, 250);
    aggSw.properties.managementIp = `${prefix}.2`;

    link(bgp1, 2, aggSw, 0, 'FIBER_LC', 10);
    link(bgp2, 2, aggSw, 1, 'FIBER_LC', 10);

    // Rack Infrastructure
    addNode('RACK_CABINET_42U', 'RCK-BAY-01', 560, 250);
    const ups = addNode('UPS_ONLINE_3KVA', 'UPS-3KVA', 560, 420);
    ups.properties.snmpCardIp = `${prefix}.250`;

    // Servers & Storage
    const clusterSrv1 = addNode('SERVER_APP', 'SRV-COMPUTE-01', 800, 120);
    clusterSrv1.properties.ipAddress = `${prefix}.51`;
    clusterSrv1.properties.defaultGateway = `${prefix}.1`;
    link(aggSw, 2, clusterSrv1, 0, 'CAT6A', 8);

    const clusterSrv2 = addNode('SERVER_APP', 'SRV-COMPUTE-02', 800, 240);
    clusterSrv2.properties.ipAddress = `${prefix}.52`;
    clusterSrv2.properties.defaultGateway = `${prefix}.1`;
    link(aggSw, 3, clusterSrv2, 0, 'CAT6A', 8);

    const san = addNode('STORAGE_NAS_SAN', 'SAN-FLASH-01', 800, 360);
    san.properties.ipAddress = `${prefix}.60`;
    san.properties.defaultGateway = `${prefix}.1`;
    link(aggSw, 4, san, 0, 'FIBER_LC', 6);
  }

  // === ARCHETYPE 4: CCTV & ACCESS SECURITY ===
  else if (options.archetype === 'SECURITY_CCTV') {
    const gw = addNode('FIREWALL_EDGE', 'SEC-GATEWAY', 80, 200);
    gw.properties.ipAddress = `${prefix}.1`;

    const poeSw = addNode('SWITCH_POE_24', 'SW-CCTV-POE', 320, 200);
    poeSw.properties.managementIp = `${prefix}.10`;
    poeSw.properties.defaultGateway = `${prefix}.1`;
    link(gw, 1, poeSw, 12, 'CAT6A', 10);

    // Surveillance NVR / Storage
    const nvr = addNode('STORAGE_NAS_SAN', 'NVR-RECORDER', 540, 100);
    nvr.properties.ipAddress = `${prefix}.80`;
    nvr.properties.defaultGateway = `${prefix}.1`;
    link(poeSw, 0, nvr, 2, 'CAT6A', 12);

    // Security Monitoring Client
    const mon = addNode('WORKSTATION_PC', 'SEC-MONITOR-01', 540, 300);
    mon.properties.ipAddress = `${prefix}.90`;
    mon.properties.defaultGateway = `${prefix}.1`;
    link(poeSw, 1, mon, 0, 'CAT6', 15);

    // PTZ Cameras
    const cam1 = addNode('CCTV_CAMERA_PTZ', 'CAM-NORTH-GATE', 780, 80);
    cam1.properties.ipAddress = `${prefix}.181`;
    cam1.properties.defaultGateway = `${prefix}.1`;
    link(poeSw, 2, cam1, 0, 'CAT6', 45);

    const cam2 = addNode('CCTV_CAMERA_PTZ', 'CAM-SOUTH-PERIM', 780, 200);
    cam2.properties.ipAddress = `${prefix}.182`;
    cam2.properties.defaultGateway = `${prefix}.1`;
    link(poeSw, 3, cam2, 0, 'CAT6', 55);

    // Access Control
    const door = addNode('ACCESS_CONTROL_PANEL', 'DOOR-CTRL-MAIN', 780, 320);
    door.properties.ipAddress = `${prefix}.191`;
    door.properties.defaultGateway = `${prefix}.1`;
    link(poeSw, 4, door, 0, 'CAT6', 35);
  }

  // === ARCHETYPE 5: INDUSTRIAL IOT ===
  else {
    const indGw = addNode('ROUTER_INDUSTRIAL', 'IND-GW-CELLULAR', 80, 200);
    indGw.properties.ipAddress = `${prefix}.1`;

    const indSw = addNode('SWITCH_INDUSTRIAL_DIN', 'SW-IND-DIN', 320, 200);
    link(indGw, 1, indSw, 0, 'CAT7', 10);

    // Point to Point Bridge
    const ptp = addNode('WIRELESS_PTP_BRIDGE', 'PTP-YARD-LINK', 540, 120);
    link(indSw, 1, ptp, 0, 'CAT7', 25);

    // Outdoor Rugged AP
    const outdoorAp = addNode('ACCESS_POINT_OUTDOOR', 'AP-OUT-RUGGED', 540, 280);
    outdoorAp.properties.ipAddress = `${prefix}.25`;
    outdoorAp.properties.defaultGateway = `${prefix}.1`;
    link(indSw, 2, outdoorAp, 0, 'CAT7', 40);

    // Workstation
    const ws = addNode('WORKSTATION_PC', 'PLANT-HMI-01', 780, 200);
    ws.properties.ipAddress = `${prefix}.110`;
    ws.properties.defaultGateway = `${prefix}.1`;
    link(indSw, 3, ws, 0, 'CAT7', 15);
  }

  return {
    schemaVersion: '1.0',
    designId,
    name: options.projectName || `${options.archetype.replace('_', ' ')} System`,
    domain: 'NETWORK',
    nodes,
    connections,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0',
      author: 'OmniFlow Network Wizard'
    }
  };
}
