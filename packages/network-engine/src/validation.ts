import { EngineeringGraph, EngineeringComponent, ValidationIssue } from '@omniflow/shared-types';
import { solveElectricalNetwork } from './solvers/electricalSolver';
import { solveHydraulicNetwork } from './solvers/hydraulicSolver';
import { solveSolarNetwork } from './solvers/solarSolver';

export type IPv4Class = 'A' | 'B' | 'C' | 'D' | 'E' | 'INVALID';

export interface IPv4Diagnostic {
  isValid: boolean;
  error?: string;
  suggestedFix?: string;
  cleanedIp?: string;
  classType?: IPv4Class;
  isPrivate?: boolean;
  isLoopback?: boolean;
  isMulticast?: boolean;
  isReserved?: boolean;
  defaultSubnetMask?: string;
}

/**
 * Returns the default classful subnet mask used by Cisco Packet Tracer
 */
export function getPacketTracerDefaultMask(firstOctet: number): string {
  if (firstOctet >= 1 && firstOctet <= 126) return '255.0.0.0'; // Class A
  if (firstOctet >= 128 && firstOctet <= 191) return '255.255.0.0'; // Class B
  if (firstOctet >= 192 && firstOctet <= 223) return '255.255.255.0'; // Class C
  return '255.255.255.0';
}

/**
 * Identifies the IPv4 address class (A, B, C, D, E) per Cisco networking standards
 */
export function getIpClass(firstOctet: number): IPv4Class {
  if (firstOctet >= 1 && firstOctet <= 126) return 'A';
  if (firstOctet >= 128 && firstOctet <= 191) return 'B';
  if (firstOctet >= 192 && firstOctet <= 223) return 'C';
  if (firstOctet >= 224 && firstOctet <= 239) return 'D';
  if (firstOctet >= 240 && firstOctet <= 255) return 'E';
  return 'INVALID';
}

/**
 * Determines whether an IP is in RFC 1918 Private or RFC 3927 Link-Local range
 */
export function isPrivateIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const parts = ip.trim().split('.').map(Number);
  if (parts.length !== 4) return false;
  const [o1, o2] = parts;
  if (o1 === 10) return true; // 10.0.0.0/8 (Class A Private)
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return true; // 172.16.0.0/12 (Class B Private)
  if (o1 === 192 && o2 === 168) return true; // 192.168.0.0/16 (Class C Private)
  if (o1 === 169 && o2 === 254) return true; // 169.254.0.0/16 (APIPA)
  return false;
}

/**
 * Normalizes user-entered subnet prefixes, stripping consecutive or trailing dots and CIDR masks
 */
export function normalizeSubnetPrefix(rawPrefix?: string): string {
  if (!rawPrefix || typeof rawPrefix !== 'string') return '192.168.10';
  let cleaned = rawPrefix.trim();
  // Strip CIDR mask e.g. /24
  if (cleaned.includes('/')) {
    cleaned = cleaned.split('/')[0].trim();
  }
  // Replace multiple consecutive dots with a single dot
  cleaned = cleaned.replace(/\.+/g, '.');
  // Strip trailing dots
  cleaned = cleaned.replace(/\.+$/, '');
  // Strip leading dots
  cleaned = cleaned.replace(/^\.+/, '');

  const parts = cleaned.split('.').filter(Boolean);
  if (parts.length >= 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  } else if (parts.length === 3) {
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  } else if (parts.length === 2) {
    return `${parts[0]}.${parts[1]}.0`;
  } else if (parts.length === 1 && parts[0]) {
    return `${parts[0]}.0.0`;
  }
  return '192.168.10';
}

/**
 * Cisco Packet Tracer standard IPv4 address validator & classifier
 */
export function validatePacketTracerIPv4(ip: string, subnetMask?: string): IPv4Diagnostic {
  if (!ip || typeof ip !== 'string' || !ip.trim()) {
    return { isValid: false, error: 'IP address cannot be empty.' };
  }

  const trimmed = ip.trim();

  // Check for consecutive or misplaced dots (e.g. "10.28.16..109")
  if (trimmed.includes('..') || trimmed.startsWith('.') || trimmed.endsWith('.')) {
    const cleaned = trimmed.replace(/\.+/g, '.').replace(/^\.+|\.+$/g, '');
    const candidateParts = cleaned.split('.');
    const isCleanedValid = candidateParts.length === 4 && candidateParts.every(p => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
    return {
      isValid: false,
      error: `IP address "${trimmed}" contains consecutive or misplaced dots.`,
      cleanedIp: isCleanedValid ? cleaned : undefined,
      suggestedFix: isCleanedValid ? `Use "${cleaned}" instead.` : 'Enter a valid 4-octet IPv4 address (e.g. 10.0.0.1, 172.16.1.1, 192.168.1.1, or 213.180.45.1).'
    };
  }

  const parts = trimmed.split('.');
  if (parts.length !== 4) {
    return {
      isValid: false,
      error: `IPv4 address must consist of exactly 4 octets separated by dots (e.g. 10.0.0.1, 172.16.1.1, 192.168.1.1, or 213.180.45.1). Found ${parts.length} octet(s).`
    };
  }

  const octets: number[] = [];
  for (let i = 0; i < 4; i++) {
    const p = parts[i];
    if (!/^\d{1,3}$/.test(p)) {
      return { isValid: false, error: `Octet ${i + 1} ("${p}") is invalid: only numeric digits 0-9 are permitted.` };
    }
    const val = Number(p);
    if (val < 0 || val > 255) {
      return { isValid: false, error: `Octet ${i + 1} (${val}) is out of range: must be between 0 and 255.` };
    }
    octets.push(val);
  }

  const first = octets[0];

  // Packet Tracer validation: Host interface cannot be 0.x.x.x
  if (first === 0) {
    return {
      isValid: false,
      error: `IP addresses starting with 0 (${trimmed}) are not valid host addresses (RFC 1122).`,
      suggestedFix: 'Use a valid host address in Class A (1-126), Class B (128-191), or Class C (192-223).'
    };
  }

  // Loopback (127.0.0.0/8)
  if (first === 127) {
    return {
      isValid: false,
      isLoopback: true,
      error: `IP address ${trimmed} is in the 127.0.0.0/8 range, which is reserved for loopback and cannot be assigned to an interface.`,
      suggestedFix: 'Assign an address from the local subnet (e.g. 10.x.x.x, 172.16.x.x, 192.168.x.x, or 213.x.x.x).'
    };
  }

  // Class D Multicast (224.0.0.0 - 239.255.255.255)
  if (first >= 224 && first <= 239) {
    return {
      isValid: false,
      isMulticast: true,
      classType: 'D',
      error: `IP address ${trimmed} is a Class D Multicast address (224.0.0.0 - 239.255.255.255) and cannot be assigned to a host interface.`,
      suggestedFix: 'Assign a standard unicast host address (Class A, B, or C).'
    };
  }

  // Class E Experimental / Broadcast (240.0.0.0 - 255.255.255.255)
  if (first >= 240) {
    return {
      isValid: false,
      isReserved: true,
      classType: 'E',
      error: `IP address ${trimmed} is in the Class E / Broadcast reserved range (240.0.0.0 - 255.255.255.255) and cannot be assigned to a host.`,
      suggestedFix: 'Assign a valid unicast host address.'
    };
  }

  const classType = getIpClass(first);
  const defaultSubnetMask = getPacketTracerDefaultMask(first);
  const isPrivate = isPrivateIp(trimmed);

  // If a subnet mask is specified, verify network & broadcast address rules
  if (subnetMask) {
    const maskLong = parseSubnetMask(subnetMask);
    const ipLong = ipToLong(trimmed);
    const netLong = (ipLong & maskLong) >>> 0;
    const broadcastLong = (netLong | (~maskLong >>> 0)) >>> 0;

    if (ipLong === netLong) {
      return {
        isValid: false,
        classType,
        isPrivate,
        defaultSubnetMask,
        error: `${trimmed} is the Subnet Network Address and cannot be assigned to a host interface.`,
        suggestedFix: `Use a valid host address in this subnet (e.g. ${longToIp((netLong + 1) >>> 0)}).`
      };
    }

    if (ipLong === broadcastLong) {
      return {
        isValid: false,
        classType,
        isPrivate,
        defaultSubnetMask,
        error: `${trimmed} is the Subnet Directed Broadcast Address and cannot be assigned to a host interface.`,
        suggestedFix: `Use a valid host address in this subnet (e.g. ${longToIp((broadcastLong - 1) >>> 0)}).`
      };
    }
  }

  return {
    isValid: true,
    classType,
    isPrivate,
    defaultSubnetMask
  };
}

/**
 * Validate IPv4 dot-decimal syntax
 */
export function isValidIPv4(ip: string, subnetMask?: string): boolean {
  return validatePacketTracerIPv4(ip, subnetMask).isValid;
}

/**
 * Convert IPv4 string to 32-bit unsigned integer
 */
export function ipToLong(ip: string): number {
  return ip
    .trim()
    .split('.')
    .reduce((acc, octet) => ((acc << 8) + Number(octet)) >>> 0, 0);
}

/**
 * Convert 32-bit unsigned integer back to IPv4 string
 */
export function longToIp(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255
  ].join('.');
}

/**
 * Parse subnet mask string (e.g. "255.255.255.0" or "/24") to 32-bit unsigned integer
 */
export function parseSubnetMask(mask?: string): number {
  if (!mask || typeof mask !== 'string') return 0xffffff00; // default /24
  const trimmed = mask.trim();
  if (trimmed.startsWith('/')) {
    const bits = parseInt(trimmed.substring(1), 10);
    if (bits >= 0 && bits <= 32) {
      return bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    }
  }
  // Check basic numeric format before validating
  const parts = trimmed.split('.');
  if (parts.length === 4 && parts.every(p => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255)) {
    return ipToLong(trimmed);
  }
  return 0xffffff00;
}

/**
 * Check if two IPv4 addresses reside within the same subnet
 */
export function areInSameSubnet(ip1: string, ip2: string, mask: string = '255.255.255.0'): boolean {
  if (!isValidIPv4(ip1) || !isValidIPv4(ip2)) return false;
  const maskLong = parseSubnetMask(mask);
  return ((ipToLong(ip1) & maskLong) >>> 0) === ((ipToLong(ip2) & maskLong) >>> 0);
}

/**
 * Derives a valid IP within the target subnet preserving the host octet where possible
 */
export function getSuggestedIpForSubnet(targetSubnetIp: string, currentHostIp: string): string {
  const cleanTarget = targetSubnetIp ? targetSubnetIp.trim().replace(/\.+/g, '.') : '';
  if (!isValidIPv4(cleanTarget)) {
    const prefix = normalizeSubnetPrefix(targetSubnetIp);
    return `${prefix}.100`;
  }
  const targetParts = cleanTarget.split('.');
  let lastOctet = '100';
  const cleanHost = currentHostIp ? currentHostIp.trim().replace(/\.+/g, '.') : '';
  if (cleanHost) {
    const hostParts = cleanHost.split('.');
    const candidateLast = hostParts[hostParts.length - 1];
    if (/^\d{1,3}$/.test(candidateLast)) {
      const n = Number(candidateLast);
      if (n >= 1 && n <= 254 && candidateLast !== targetParts[3]) {
        lastOctet = candidateLast;
      } else if (candidateLast === targetParts[3]) {
        lastOctet = n < 254 ? String(n + 1) : '100';
      }
    }
  }
  return `${targetParts[0]}.${targetParts[1]}.${targetParts[2]}.${lastOctet}`;
}

export interface NodeNetworkConfigStatus {
  isValid: boolean;
  canConnect: boolean;
  statusText: 'ONLINE' | 'SUBNET_MISMATCH' | 'INVALID_IP' | 'IP_CONFLICT' | 'MISSING_GATEWAY' | 'UNCONFIGURED';
  reason?: string;
  suggestedFix?: string;
  suggestedIp?: string;
  errorCode?: 'NET_SUBNET_MISMATCH' | 'NET_INVALID_IP' | 'NET_DUPLICATE_IP' | 'NET_MISSING_GATEWAY';
}

/**
 * Evaluates whether a network component has valid IP and subnet configuration to connect to the network.
 * If settings are wrong (e.g. subnet mismatch, invalid IP, conflict), the device cannot connect or transmit.
 */
export function checkNodeNetworkConfig(
  node: EngineeringComponent,
  graph: EngineeringGraph
): NodeNetworkConfigStatus {
  // Purely physical/structural, electrical, or plumbing nodes do not require IP configuration
  if (node.domain === 'ELECTRICAL' || node.domain === 'PLUMBING' || node.domain === 'SOLAR') {
    return { isValid: true, canConnect: true, statusText: 'ONLINE' };
  }
  if (node.type === 'RACK_HYPERSCALE_42U' || node.type === 'ISP_FEED') {
    return { isValid: true, canConnect: true, statusText: 'ONLINE' };
  }

  const ip = (node.properties.ipAddress || node.properties.lanIp || node.properties.managementIp) as string;

  // Unconfigured device (no IP assigned yet)
  if (!ip) {
    return { isValid: true, canConnect: true, statusText: 'ONLINE' };
  }

  const mask = (node.properties.subnetMask as string) || '255.255.255.0';
  const gw = node.properties.defaultGateway as string;

  // 1. Validate IPv4 Syntax using Packet Tracer validation rules
  const diag = validatePacketTracerIPv4(ip, mask);
  if (!diag.isValid) {
    const errorMsg = diag.error || `A valid IPv4 host address (e.g. 10.x.x.x, 172.16.x.x, 192.168.x.x, or 213.x.x.x) is required.`;
    return {
      isValid: false,
      canConnect: false,
      statusText: 'INVALID_IP',
      reason: `Device '${node.name}' has an invalid IP address: "${ip}". ${errorMsg}`,
      errorCode: 'NET_INVALID_IP',
      suggestedFix: diag.suggestedFix || 'Enter a valid IPv4 address in dot-decimal format (0-255 per octet).',
      suggestedIp: diag.cleanedIp
    };
  }

  // 2. Check for Duplicate IP Conflicts
  for (const other of Object.values(graph.nodes)) {
    if (other.id !== node.id) {
      const otherIp = (other.properties.ipAddress || other.properties.lanIp || other.properties.managementIp) as string;
      if (otherIp && otherIp.trim() === ip.trim()) {
        return {
          isValid: false,
          canConnect: false,
          statusText: 'IP_CONFLICT',
          reason: `IP Conflict! Both '${node.name}' and '${other.name}' are configured with IP address ${ip}. ARP collision prevents network transmission.`,
          errorCode: 'NET_DUPLICATE_IP',
          suggestedFix: `Assign a unique IP address to '${node.name}'.`
        };
      }
    }
  }

  // 3. Check Subnet Match with Configured Default Gateway
  if (gw) {
    const gwDiag = validatePacketTracerIPv4(gw);
    if (!gwDiag.isValid) {
      return {
        isValid: false,
        canConnect: false,
        statusText: 'INVALID_IP',
        reason: `Default Gateway "${gw}" on '${node.name}' is an invalid IPv4 address: ${gwDiag.error || 'A valid IPv4 address is required.'}`,
        errorCode: 'NET_INVALID_IP',
        suggestedFix: gwDiag.suggestedFix || 'Configure a valid IPv4 Default Gateway.'
      };
    }
    if (!areInSameSubnet(ip, gw, mask)) {
      const suggested = getSuggestedIpForSubnet(gw, ip);
      const maskLong = parseSubnetMask(mask);
      const ipSubnet = longToIp((ipToLong(ip) & maskLong) >>> 0);
      const gwSubnet = longToIp((ipToLong(gw) & maskLong) >>> 0);
      return {
        isValid: false,
        canConnect: false,
        statusText: 'SUBNET_MISMATCH',
        reason: `Subnet Mismatch! Device IP ${ip} (subnet ${ipSubnet}) is not in the same subnet as Default Gateway ${gw} (subnet ${gwSubnet}). The device cannot reach its gateway or connect to the network.`,
        errorCode: 'NET_SUBNET_MISMATCH',
        suggestedFix: `Reconfigure IP to match Gateway subnet (e.g. ${suggested}).`,
        suggestedIp: suggested
      };
    }
  }

  // 4. Check Subnet Match with Connected Network Infrastructure (Switch / Router / Network Segment)
  for (const port of node.ports) {
    if (port.occupiedByConnectionId) {
      const conn = graph.connections[port.occupiedByConnectionId];
      if (!conn) continue;
      const remoteId = conn.sourceComponentId === node.id ? conn.targetComponentId : conn.sourceComponentId;
      const remoteNode = graph.nodes[remoteId];
      if (!remoteNode) continue;

      // Connected to Router
      if (remoteNode.type.includes('ROUTER')) {
        const routerIp = (remoteNode.properties.lanIp || remoteNode.properties.ipAddress) as string;
        if (routerIp && isValidIPv4(routerIp) && !areInSameSubnet(ip, routerIp, mask)) {
          const suggested = getSuggestedIpForSubnet(routerIp, ip);
          return {
            isValid: false,
            canConnect: false,
            statusText: 'SUBNET_MISMATCH',
            reason: `Subnet Mismatch! Device IP ${ip} does not match connected Router subnet (${routerIp}). Device cannot communicate with the router.`,
            errorCode: 'NET_SUBNET_MISMATCH',
            suggestedFix: `Reconfigure IP to match Router subnet (e.g. ${suggested}).`,
            suggestedIp: suggested
          };
        }
      }

      // Connected to Switch
      if (remoteNode.type.includes('SWITCH')) {
        const switchIp = (remoteNode.properties.managementIp || remoteNode.properties.defaultGateway || remoteNode.properties.ipAddress) as string;
        if (switchIp && isValidIPv4(switchIp) && !areInSameSubnet(ip, switchIp, mask)) {
          const suggested = getSuggestedIpForSubnet(switchIp, ip);
          return {
            isValid: false,
            canConnect: false,
            statusText: 'SUBNET_MISMATCH',
            reason: `Subnet Mismatch! Device IP ${ip} does not match the connected Switch subnet (${switchIp}). Device cannot establish Layer 3 communication on this network.`,
            errorCode: 'NET_SUBNET_MISMATCH',
            suggestedFix: `Change IP to match the switch network (e.g. ${suggested}).`,
            suggestedIp: suggested
          };
        }

        // Check peer devices connected to the same switch
        for (const swPort of remoteNode.ports) {
          if (swPort.occupiedByConnectionId && swPort.occupiedByConnectionId !== conn.id) {
            const peerConn = graph.connections[swPort.occupiedByConnectionId];
            if (peerConn) {
              const peerId = peerConn.sourceComponentId === remoteNode.id ? peerConn.targetComponentId : peerConn.sourceComponentId;
              const peer = graph.nodes[peerId];
              if (peer && peer.id !== node.id) {
                const peerGw = (peer.properties.defaultGateway || peer.properties.ipAddress) as string;
                if (peerGw && isValidIPv4(peerGw) && !areInSameSubnet(ip, peerGw, mask)) {
                  const suggested = getSuggestedIpForSubnet(peerGw, ip);
                  return {
                    isValid: false,
                    canConnect: false,
                    statusText: 'SUBNET_MISMATCH',
                    reason: `Subnet Mismatch! Device IP ${ip} is isolated from the switch segment subnet (Gateway ${peerGw}). Device cannot transmit to network peers.`,
                    errorCode: 'NET_SUBNET_MISMATCH',
                    suggestedFix: `Reconfigure IP to match the local subnet (e.g. ${suggested}).`,
                    suggestedIp: suggested
                  };
                }
              }
            }
          }
        }
      }
    }
  }

  return { isValid: true, canConnect: true, statusText: 'ONLINE' };
}

export function validateNetworkGraph(graph: EngineeringGraph): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodes = Object.values(graph.nodes);
  const connections = Object.values(graph.connections);

  // 1. Check Network IP Configuration & Subnet Health for Every Node
  for (const node of nodes) {
    const netStatus = checkNodeNetworkConfig(node, graph);
    if (!netStatus.isValid || !netStatus.canConnect) {
      issues.push({
        id: `val_net_config_${node.id}`,
        severity: 'CRITICAL',
        ruleCode: netStatus.errorCode || 'NET_SUBNET_MISMATCH',
        title: netStatus.statusText === 'SUBNET_MISMATCH'
          ? `Subnet Mismatch: ${node.name} Disconnected`
          : netStatus.statusText === 'IP_CONFLICT'
          ? `IP Address Conflict: ${node.name}`
          : `Invalid IP Configuration: ${node.name}`,
        message: netStatus.reason || `Device '${node.name}' has invalid network configuration and cannot connect.`,
        affectedNodeIds: [node.id],
        affectedConnectionIds: node.ports.map(p => p.occupiedByConnectionId).filter((id): id is string => !!id),
        suggestedFix: netStatus.suggestedFix || 'Update IP settings in Property Inspector.'
      });
    }
  }

  // 2. Check for Duplicate IP Addresses
  const ipMap = new Map<string, string[]>(); // ip -> nodeIds[]
  for (const node of nodes) {
    const ip = (node.properties.ipAddress || node.properties.lanIp || node.properties.managementIp) as string;
    if (ip && typeof ip === 'string') {
      const existing = ipMap.get(ip) || [];
      existing.push(node.id);
      ipMap.set(ip, existing);
    }
  }

  for (const [ip, nodeIds] of ipMap.entries()) {
    if (nodeIds.length > 1) {
      issues.push({
        id: `val_dup_ip_${ip}`,
        severity: 'CRITICAL',
        ruleCode: 'NET_DUPLICATE_IP',
        title: 'Duplicate IP Address Detected',
        message: `Multiple devices are configured with the conflicting IP address: ${ip}. This causes ARP flapping and packet blackholing.`,
        affectedNodeIds: nodeIds,
        affectedConnectionIds: [],
        suggestedFix: `Reassign unique IP addresses in the subnet to devices: ${nodeIds.map(id => graph.nodes[id]?.name).join(', ')}.`
      });
    }
  }

  // 3. Check for Missing Default Gateway on Endpoints
  for (const node of nodes) {
    if (['WORKSTATION_PC', 'ACCESS_POINT_WIFI6', 'SERVER_APP', 'NETWORK_PRINTER', 'IP_PHONE_VOIP'].includes(node.type)) {
      const gw = node.properties.defaultGateway as string;
      const ip = (node.properties.ipAddress || node.properties.lanIp) as string;
      if (ip && !gw) {
        issues.push({
          id: `val_missing_gw_${node.id}`,
          severity: 'WARNING',
          ruleCode: 'NET_MISSING_GATEWAY',
          title: 'Missing Default Gateway',
          message: `Device '${node.name}' has an IP (${ip}) but no Default Gateway configured. It will be unable to route traffic beyond its local subnet.`,
          affectedNodeIds: [node.id],
          affectedConnectionIds: [],
          suggestedFix: 'Configure Default Gateway (e.g. 10.0.0.1, 172.16.1.1, 192.168.1.1, or 213.180.45.1) in the Property Inspector.'
        });
      }
    }
  }

  // 3. Cable Length Thresholds (Cat6/Cat6A exceeds 100 meters)
  for (const conn of connections) {
    if (['CAT6', 'CAT6A'].includes(conn.connectionType) && conn.lengthMeters > 100) {
      issues.push({
        id: `val_cable_length_${conn.id}`,
        severity: 'ERROR',
        ruleCode: 'NET_CABLE_LENGTH_EXCEEDED',
        title: 'Ethernet Distance Limit Exceeded (>100m)',
        message: `Cable connection '${conn.id}' measures ${conn.lengthMeters}m. Standard TIA/EIA-568 specifies maximum 100m channel limit for copper Ethernet. Signal degradation and CRC packet loss will occur.`,
        affectedNodeIds: [conn.sourceComponentId, conn.targetComponentId],
        affectedConnectionIds: [conn.id],
        suggestedFix: 'Shorten cable run, insert an intermediate PoE repeater switch, or use Single-Mode/Multi-Mode Fiber.'
      });
    }
  }

  // 4. PoE Budget Verification for PoE Switches
  for (const node of nodes) {
    if (node.type === 'SWITCH_POE_24') {
      const budget = Number(node.properties.poeTotalBudgetWatts || 370);
      let consumedWatts = 0;

      // Find all connected nodes to this switch
      for (const port of node.ports) {
        if (port.occupiedByConnectionId) {
          const conn = graph.connections[port.occupiedByConnectionId];
          if (conn) {
            const remoteNodeId = conn.sourceComponentId === node.id ? conn.targetComponentId : conn.sourceComponentId;
            const remoteNode = graph.nodes[remoteNodeId];
            if (remoteNode && remoteNode.properties.poeDrawWatts) {
              consumedWatts += Number(remoteNode.properties.poeDrawWatts);
            }
          }
        }
      }

      if (consumedWatts > budget) {
        issues.push({
          id: `val_poe_exceeded_${node.id}`,
          severity: 'CRITICAL',
          ruleCode: 'NET_POE_BUDGET_EXCEEDED',
          title: 'PoE Power Budget Exceeded',
          message: `Switch '${node.name}' has allocated ${consumedWatts}W which exceeds its rated hardware budget of ${budget}W. Lower priority ports will brown out or reboot.`,
          affectedNodeIds: [node.id],
          affectedConnectionIds: [],
          suggestedFix: 'Offload some PoE devices (e.g. WiFi 6 APs or IP phones) to an additional switch or use dedicated PoE midspan injectors.'
        });
      }
    }
  }

  // 5. Check for Isolated / Disconnected Endpoints
  for (const node of nodes) {
    const connectedPorts = node.ports.filter(p => !!p.occupiedByConnectionId);
    if (connectedPorts.length === 0) {
      issues.push({
        id: `val_isolated_node_${node.id}`,
        severity: 'INFO',
        ruleCode: 'NET_DEVICE_ISOLATED',
        title: 'Device Not Connected',
        message: `Component '${node.name}' is placed on the canvas but has no active cable connections.`,
        affectedNodeIds: [node.id],
        affectedConnectionIds: [],
        suggestedFix: 'Connect device ports to an access switch or router.'
      });
    }
  }

  // 6. Real Electrical Load Flow & Voltage Drop Physics Solver Checks (NEC / IEC 60364)
  try {
    const elecSol = solveElectricalNetwork(graph);
    for (const v of elecSol.violations) {
      issues.push({
        id: `val_${v.code}_${v.affectedConnectionIds[0] || v.affectedNodeIds[0] || 'elec'}`,
        severity: v.severity,
        ruleCode: v.code,
        title: v.title,
        message: v.message,
        affectedNodeIds: v.affectedNodeIds,
        affectedConnectionIds: v.affectedConnectionIds,
        suggestedFix: v.suggestedFix
      });
    }
  } catch {
    // Non-critical if non-electrical domain
  }

  // 7. Real Hydraulic Darcy-Weisbach & Pressure Drop Solver Checks (ASHRAE / Crane 410)
  try {
    const hydSol = solveHydraulicNetwork(graph);
    for (const v of hydSol.violations) {
      issues.push({
        id: `val_${v.code}_${v.affectedConnectionIds[0] || v.affectedNodeIds[0] || 'hyd'}`,
        severity: v.severity,
        ruleCode: v.code,
        title: v.title,
        message: v.message,
        affectedNodeIds: v.affectedNodeIds,
        affectedConnectionIds: v.affectedConnectionIds,
        suggestedFix: v.suggestedFix
      });
    }
  } catch {
    // Non-critical if non-hydraulic domain
  }

  // 8. Real Solar PV String Sizing & BESS Storage Solver Checks (STC / NOCT)
  try {
    const solSol = solveSolarNetwork(graph);
    for (const v of solSol.violations) {
      issues.push({
        id: `val_${v.code}_${v.affectedNodeIds[0] || 'sol'}`,
        severity: v.severity,
        ruleCode: v.code,
        title: v.title,
        message: v.message,
        affectedNodeIds: v.affectedNodeIds,
        affectedConnectionIds: v.affectedConnectionIds,
        suggestedFix: v.suggestedFix
      });
    }
  } catch {
    // Non-critical if non-solar domain
  }

  return issues;
}
