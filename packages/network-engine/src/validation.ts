import { EngineeringGraph, ValidationIssue } from '@omniflow/shared-types';

export function validateNetworkGraph(graph: EngineeringGraph): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodes = Object.values(graph.nodes);
  const connections = Object.values(graph.connections);

  // 1. Check for Duplicate IP Addresses
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

  // 2. Check for Missing Default Gateway on Endpoints
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
