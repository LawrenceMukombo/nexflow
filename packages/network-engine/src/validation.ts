import { EngineeringGraph, EngineeringComponent, ValidationIssue } from '@omniflow/shared-types';

/**
 * Validate IPv4 dot-decimal syntax
 */
export function isValidIPv4(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return false;
    const n = Number(part);
    if (n < 0 || n > 255) return false;
  }
  // Disallow 0.0.0.0 and 255.255.255.255 as usable host IPs
  if (ip === '0.0.0.0' || ip === '255.255.255.255') return false;
  return true;
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
  if (isValidIPv4(trimmed)) {
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
  if (!isValidIPv4(targetSubnetIp)) return '192.168.1.100';
  const targetParts = targetSubnetIp.trim().split('.');
  let lastOctet = '100';
  if (isValidIPv4(currentHostIp)) {
    const currentLast = currentHostIp.trim().split('.').pop() || '100';
    // If current last octet equals target gateway last octet, increment
    lastOctet = currentLast === targetParts[3] ? '101' : currentLast;
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

  // 1. Validate IPv4 Syntax
  if (!isValidIPv4(ip)) {
    return {
      isValid: false,
      canConnect: false,
      statusText: 'INVALID_IP',
      reason: `Device '${node.name}' has an invalid IP address: "${ip}". A valid IPv4 address (e.g. 192.168.1.100) is required.`,
      errorCode: 'NET_INVALID_IP',
      suggestedFix: 'Enter a valid IPv4 address in dot-decimal format (0-255 per octet).'
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

  const mask = (node.properties.subnetMask as string) || '255.255.255.0';
  const gw = node.properties.defaultGateway as string;

  // 3. Check Subnet Match with Configured Default Gateway
  if (gw) {
    if (!isValidIPv4(gw)) {
      return {
        isValid: false,
        canConnect: false,
        statusText: 'INVALID_IP',
        reason: `Default Gateway "${gw}" on '${node.name}' is an invalid IPv4 address.`,
        errorCode: 'NET_INVALID_IP',
        suggestedFix: 'Configure a valid IPv4 Default Gateway.'
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
          suggestedFix: 'Configure Default Gateway (e.g. 192.168.1.1) in the Property Inspector.'
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

  return issues;
}
