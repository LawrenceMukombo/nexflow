import { EngineeringGraph, EngineeringComponent, ComponentPort } from '@omniflow/shared-types';
import { 
  isValidIPv4, 
  ipToLong, 
  longToIp, 
  parseSubnetMask, 
  areInSameSubnet
} from './validation';
import { checkPortCompatibility } from './ports';

export interface SubnetDeviceEntry {
  nodeId: string;
  tag: string;
  name: string;
  type: string;
  ip: string;
  gateway?: string;
  vlanId?: number;
  hasConflict: boolean;
  canConnect: boolean;
}

export interface SubnetOverview {
  cidr: string;
  networkIp: string;
  subnetMask: string;
  broadcastIp: string;
  gatewayIp: string;
  totalUsableHosts: number;
  assignedCount: number;
  utilizationPercent: number;
  devices: SubnetDeviceEntry[];
  conflicts: string[];
}

/**
 * Finds the best available compatible port on a target node for a given source port.
 * Allows effortless "drop-to-connect" and device-level wiring without hunting for tiny port circles.
 */
export function findBestCompatiblePort(
  sourceNode: EngineeringComponent,
  sourcePort: ComponentPort,
  targetNode: EngineeringComponent,
  graph?: EngineeringGraph
): ComponentPort | null {
  if (sourceNode.id === targetNode.id) return null;

  for (const targetPort of targetNode.ports) {
    // Check if already occupied
    const isOccupied = Boolean(
      targetPort.occupiedByConnectionId ||
      (graph && Object.values(graph.connections).some(
        c => c.sourcePortId === targetPort.id || c.targetPortId === targetPort.id
      ))
    );
    if (isOccupied) continue;

    // Check physical and logical compatibility
    const compat = checkPortCompatibility(sourcePort, targetPort);
    if (compat.compatible) {
      return targetPort;
    }
  }

  return null;
}

/**
 * Discovers the network gateway or upstream infrastructure connected to a given node.
 */
export function discoverConnectedGateway(
  nodeId: string,
  graph: EngineeringGraph
): { gatewayIp: string; subnetMask: string; upstreamNode?: EngineeringComponent } | null {
  const node = graph.nodes[nodeId];
  if (!node) return null;

  // Search directly connected nodes
  for (const port of node.ports) {
    if (!port.occupiedByConnectionId) continue;
    const conn = graph.connections[port.occupiedByConnectionId];
    if (!conn) continue;

    const peerId = conn.sourceComponentId === nodeId ? conn.targetComponentId : conn.sourceComponentId;
    const peer = graph.nodes[peerId];
    if (!peer) continue;

    // Direct router connection
    if (peer.type.includes('ROUTER')) {
      const gwIp = (peer.properties.lanIp || peer.properties.ipAddress || peer.properties.managementIp) as string;
      if (isValidIPv4(gwIp)) {
        return {
          gatewayIp: gwIp,
          subnetMask: (peer.properties.subnetMask as string) || '255.255.255.0',
          upstreamNode: peer
        };
      }
    }

    // Direct switch connection -> check if switch or another peer on switch has a router connection
    if (peer.type.includes('SWITCH')) {
      const swIp = (peer.properties.managementIp || peer.properties.defaultGateway || peer.properties.ipAddress) as string;
      const swMask = (peer.properties.subnetMask as string) || '255.255.255.0';

      // Look for a router connected to the same switch
      for (const swPort of peer.ports) {
        if (!swPort.occupiedByConnectionId) continue;
        const swConn = graph.connections[swPort.occupiedByConnectionId];
        if (!swConn) continue;

        const routerCandidateId = swConn.sourceComponentId === peer.id ? swConn.targetComponentId : swConn.sourceComponentId;
        const routerCandidate = graph.nodes[routerCandidateId];
        if (routerCandidate && routerCandidate.type.includes('ROUTER')) {
          const rIp = (routerCandidate.properties.lanIp || routerCandidate.properties.ipAddress) as string;
          if (isValidIPv4(rIp)) {
            return {
              gatewayIp: rIp,
              subnetMask: (routerCandidate.properties.subnetMask as string) || swMask,
              upstreamNode: routerCandidate
            };
          }
        }
      }

      // If no router connected, use the switch's own IP/subnet
      if (isValidIPv4(swIp)) {
        return {
          gatewayIp: swIp,
          subnetMask: swMask,
          upstreamNode: peer
        };
      }
    }
  }

  // Fallback: check if graph has any Router with a valid LAN IP
  for (const candidate of Object.values(graph.nodes)) {
    if (candidate.type.includes('ROUTER')) {
      const lanIp = (candidate.properties.lanIp || candidate.properties.ipAddress) as string;
      if (isValidIPv4(lanIp)) {
        return {
          gatewayIp: lanIp,
          subnetMask: (candidate.properties.subnetMask as string) || '255.255.255.0',
          upstreamNode: candidate
        };
      }
    }
  }

  return null;
}

/**
 * Automatically assigns a valid, non-conflicting IP and Gateway to a device (DHCP Emulation).
 */
export function autoAssignNodeIp(
  nodeId: string,
  graph: EngineeringGraph
): { success: boolean; ip?: string; subnetMask?: string; gateway?: string; message: string } {
  const node = graph.nodes[nodeId];
  if (!node) {
    return { success: false, message: 'Node not found' };
  }

  const gwInfo = discoverConnectedGateway(nodeId, graph);
  const gatewayIp = gwInfo ? gwInfo.gatewayIp : '192.168.1.1';
  const subnetMask = gwInfo ? gwInfo.subnetMask : '255.255.255.0';

  const maskLong = parseSubnetMask(subnetMask);
  const gwLong = ipToLong(gatewayIp);
  const netLong = (gwLong & maskLong) >>> 0;

  // Collect all currently used IPs in the entire graph
  const usedIps = new Set<string>();
  for (const other of Object.values(graph.nodes)) {
    if (other.id !== nodeId) {
      const otherIp = (other.properties.ipAddress || other.properties.lanIp || other.properties.managementIp) as string;
      if (otherIp && isValidIPv4(otherIp)) {
        usedIps.add(otherIp.trim());
      }
    }
  }
  usedIps.add(gatewayIp);

  // Scan for lowest free host IP, starting at host offset .10 (reserving .1-.9 for infrastructure)
  let assignedIp: string | null = null;
  const startHost = 10;
  const endHost = 250;

  for (let host = startHost; host <= endHost; host++) {
    const candidateLong = (netLong + host) >>> 0;
    const candidateIp = longToIp(candidateLong);
    if (!usedIps.has(candidateIp)) {
      assignedIp = candidateIp;
      break;
    }
  }

  if (!assignedIp) {
    return {
      success: false,
      message: `Subnet ${longToIp(netLong)} is completely saturated. No free IP addresses available.`
    };
  }

  return {
    success: true,
    ip: assignedIp,
    subnetMask,
    gateway: gatewayIp,
    message: `Assigned IP ${assignedIp} (Gateway: ${gatewayIp}, Mask: ${subnetMask})`
  };
}

/**
 * Audits the entire network graph and automatically configures clean, non-conflicting
 * IP addresses and default gateways for all connected endpoints.
 */
export function autoConfigureAllNetworkIps(
  graph: EngineeringGraph
): { updatedCount: number; assignments: Record<string, { ip: string; gateway: string; subnetMask: string }> } {
  const assignments: Record<string, { ip: string; gateway: string; subnetMask: string }> = {};
  let updatedCount = 0;

  // Create a working copy of used IPs
  const usedIps = new Set<string>();
  for (const node of Object.values(graph.nodes)) {
    const ip = (node.properties.ipAddress || node.properties.lanIp || node.properties.managementIp) as string;
    if (ip && isValidIPv4(ip) && (node.type.includes('ROUTER') || node.type.includes('SWITCH') || node.type.includes('FIREWALL'))) {
      usedIps.add(ip.trim());
    }
  }

  // Iterate over client endpoints (PCs, APs, Servers, VoIP, Printers, Cameras)
  for (const node of Object.values(graph.nodes)) {
    const isEndpoint = 
      node.type.includes('PC') ||
      node.type.includes('WORKSTATION') ||
      node.type.includes('SERVER') ||
      node.type.includes('AP') ||
      node.type.includes('WIFI') ||
      node.type.includes('VOIP') ||
      node.type.includes('PHONE') ||
      node.type.includes('PRINTER') ||
      node.type.includes('CAMERA') ||
      node.type.includes('CCTV');

    if (!isEndpoint) continue;

    const gwInfo = discoverConnectedGateway(node.id, graph);
    const gatewayIp = gwInfo ? gwInfo.gatewayIp : '192.168.1.1';
    const subnetMask = gwInfo ? gwInfo.subnetMask : '255.255.255.0';

    const maskLong = parseSubnetMask(subnetMask);
    const gwLong = ipToLong(gatewayIp);
    const netLong = (gwLong & maskLong) >>> 0;

    let assignedIp: string | null = null;
    for (let host = 10; host <= 250; host++) {
      const candidateIp = longToIp((netLong + host) >>> 0);
      if (!usedIps.has(candidateIp)) {
        assignedIp = candidateIp;
        usedIps.add(candidateIp);
        break;
      }
    }

    if (assignedIp) {
      assignments[node.id] = {
        ip: assignedIp,
        gateway: gatewayIp,
        subnetMask
      };
      updatedCount++;
    }
  }

  return { updatedCount, assignments };
}

/**
 * Compiles a comprehensive IP Address Management (IPAM) overview of all subnets,
 * device allocations, and conflict warnings across the design.
 */
export function getSubnetOverview(graph: EngineeringGraph): SubnetOverview[] {
  const subnetMap = new Map<string, SubnetOverview>();

  // Helper to get or create subnet entry
  const getOrCreateSubnet = (networkIp: string, mask: string, defaultGw: string): SubnetOverview => {
    const maskLong = parseSubnetMask(mask);
    const netLong = (ipToLong(networkIp) & maskLong) >>> 0;
    let cidrBits = 0;
    let tempMask = maskLong >>> 0;
    while (tempMask > 0) {
      if (tempMask & 1) cidrBits++;
      tempMask = tempMask >>> 1;
    }
    const cidr = `${longToIp(netLong)}/${cidrBits}`;

    if (!subnetMap.has(cidr)) {
      const broadcastLong = (netLong | (~maskLong >>> 0)) >>> 0;
      const totalHosts = Math.max(0, Math.pow(2, 32 - cidrBits) - 2);

      subnetMap.set(cidr, {
        cidr,
        networkIp: longToIp(netLong),
        subnetMask: mask,
        broadcastIp: longToIp(broadcastLong),
        gatewayIp: defaultGw || longToIp(netLong + 1),
        totalUsableHosts: totalHosts,
        assignedCount: 0,
        utilizationPercent: 0,
        devices: [],
        conflicts: []
      });
    }

    return subnetMap.get(cidr)!;
  };

  // Inspect all network nodes
  const ipOccurrences = new Map<string, string[]>();

  for (const node of Object.values(graph.nodes)) {
    if (node.domain !== 'NETWORK' && node.domain !== 'MULTI_DOMAIN') continue;

    const ip = (node.properties.ipAddress || node.properties.lanIp || node.properties.managementIp) as string;
    if (!ip || !isValidIPv4(ip)) continue;

    const mask = (node.properties.subnetMask as string) || '255.255.255.0';
    const gw = (node.properties.defaultGateway || node.properties.gateway) as string;

    const subnet = getOrCreateSubnet(ip, mask, gw);

    // Track duplicate IP conflicts
    const owners = ipOccurrences.get(ip) || [];
    owners.push(node.tag);
    ipOccurrences.set(ip, owners);

    const hasConflict = owners.length > 1;
    const canConnect = gw ? areInSameSubnet(ip, gw, mask) : true;

    subnet.devices.push({
      nodeId: node.id,
      tag: node.tag,
      name: node.name,
      type: node.type,
      ip,
      gateway: gw,
      vlanId: (node.properties.vlanId as number) || 1,
      hasConflict,
      canConnect
    });

    subnet.assignedCount = subnet.devices.length;
    subnet.utilizationPercent = subnet.totalUsableHosts > 0 
      ? Math.round((subnet.assignedCount / subnet.totalUsableHosts) * 100) 
      : 100;
  }

  // Populate conflict messages
  for (const [ip, tags] of ipOccurrences.entries()) {
    if (tags.length > 1) {
      for (const subnet of subnetMap.values()) {
        if (subnet.devices.some(d => d.ip === ip)) {
          subnet.conflicts.push(`Duplicate IP ${ip} assigned to multiple devices: ${tags.join(', ')}`);
        }
      }
    }
  }

  return Array.from(subnetMap.values());
}
