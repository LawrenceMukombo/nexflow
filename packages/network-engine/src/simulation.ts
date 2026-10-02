import { 
  EngineeringGraph, 
  SimulationPacket, 
  SimulationTelemetry, 
  EngineeringConnection,
  FlowMedium
} from '@omniflow/shared-types';

export interface RouteHop {
  nodeId: string;
  connectionId: string;
}

export interface NetworkSimulationState {
  tick: number;
  packets: SimulationPacket[];
  telemetry: SimulationTelemetry;
}

/**
 * Finds shortest active path between two nodes in the engineering graph
 */
export function findShortestPath(
  graph: EngineeringGraph,
  startNodeId: string,
  targetNodeId: string
): RouteHop[] | null {
  if (startNodeId === targetNodeId) return [];

  const startNode = graph.nodes[startNodeId];
  const targetNode = graph.nodes[targetNodeId];
  if (!startNode || !targetNode) return null;
  if (startNode.simulationState.isFailed || targetNode.simulationState.isFailed) return null;

  // Adjacency list: node -> array of { neighborId, connectionId }
  const adj = new Map<string, Array<{ neighborId: string; connectionId: string; isFailed: boolean }>>();
  for (const conn of Object.values(graph.connections)) {
    const src = conn.sourceComponentId;
    const tgt = conn.targetComponentId;
    const isFailed = !!conn.simulationState.isFailed;

    if (!adj.has(src)) adj.set(src, []);
    if (!adj.has(tgt)) adj.set(tgt, []);

    adj.get(src)!.push({ neighborId: tgt, connectionId: conn.id, isFailed });
    adj.get(tgt)!.push({ neighborId: src, connectionId: conn.id, isFailed });
  }

  // BFS search
  const queue: Array<{ nodeId: string; path: RouteHop[] }> = [{ nodeId: startNodeId, path: [] }];
  const visited = new Set<string>([startNodeId]);

  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!;

    if (nodeId === targetNodeId) {
      return path;
    }

    const neighbors = adj.get(nodeId) || [];
    for (const { neighborId, connectionId, isFailed } of neighbors) {
      if (visited.has(neighborId)) continue;

      const neighborNode = graph.nodes[neighborId];
      if (!neighborNode) continue;

      // Cannot traverse if node or connection is failed
      if (neighborNode.simulationState.isFailed || isFailed) {
        continue;
      }

      visited.add(neighborId);
      queue.push({
        nodeId: neighborId,
        path: [...path, { nodeId: neighborId, connectionId }]
      });
    }
  }

  return null;
}

/**
 * Calculates physics-based latency for a packet on a given link
 */
export function calculateLinkTransitTimeMs(
  connection: EngineeringConnection,
  packetSizeBytes: number
): number {
  const speedOfLightInCopper = 200000000;
  const propagationDelayMs = (connection.lengthMeters / speedOfLightInCopper) * 1000;
  
  const bandwidthMbps = Number(connection.properties.bandwidthLimitMbps || 1000);
  const bandwidthBps = bandwidthMbps * 1000000;
  const transmissionDelayMs = ((packetSizeBytes * 8) / bandwidthBps) * 1000;

  return propagationDelayMs + transmissionDelayMs;
}

/**
 * Spawns continuous multi-domain flow particles across active connections
 * (Data packets, electrical current sparks, and water/fluid droplets)
 */
export function spawnContinuousFlowPackets(
  graph: EngineeringGraph,
  existingPackets: SimulationPacket[]
): SimulationPacket[] {
  const connections = Object.values(graph.connections);
  if (connections.length === 0) return existingPackets;

  // Count active packets per connection
  const packetsPerConn: Record<string, number> = {};
  for (const p of existingPackets) {
    packetsPerConn[p.currentEdgeId] = (packetsPerConn[p.currentEdgeId] || 0) + 1;
  }

  const newPackets: SimulationPacket[] = [];

  for (const conn of connections) {
    const isFailed = !!conn.simulationState.isFailed;
    const srcNode = graph.nodes[conn.sourceComponentId];
    const tgtNode = graph.nodes[conn.targetComponentId];

    if (isFailed || !srcNode || !tgtNode || srcNode.simulationState.isFailed || tgtNode.simulationState.isFailed) {
      continue;
    }

    // Limit maximum simultaneous particles per connection
    const currentCount = packetsPerConn[conn.id] || 0;
    if (currentCount >= 2) continue;

    // Determine domain & medium
    const connType = conn.connectionType.toUpperCase();
    let medium: FlowMedium = 'DATA';
    let protocol = 'TCP';
    let label = 'TCP 1500B';
    let color = '#38bdf8';
    let value = 1500;
    let unit = 'B';

    if (conn.domain === 'ELECTRICAL' || connType.includes('POWER') || connType.includes('AC_') || connType.includes('DC_')) {
      medium = 'ELECTRICITY';
      if (connType.includes('3PHASE') || connType.includes('400V')) {
        protocol = 'AC_400V';
        value = 28000;
        unit = 'W';
        label = '⚡ 400V • 40A (28 kW)';
        color = '#eab308'; // Amber Gold
      } else if (connType.includes('DC')) {
        protocol = 'DC_48V';
        value = 2400;
        unit = 'W';
        label = '⚡ 48V DC • 50A';
        color = '#f97316'; // Electric Orange
      } else {
        protocol = 'AC_230V';
        value = 3680;
        unit = 'W';
        label = '⚡ 230V • 16A (3.7 kW)';
        color = '#fbbf24'; // Warm Gold
      }
    } else if (conn.domain === 'PLUMBING' || connType.includes('PIPE') || connType.includes('WATER') || connType.includes('CHILLED')) {
      medium = 'FLUID';
      if (connType.includes('RETURN')) {
        protocol = 'CHILLED_WATER';
        value = 45;
        unit = 'L/s';
        label = '💧 45 L/s • 14°C Return';
        color = '#06b6d4'; // Aqua
      } else if (connType.includes('SUPPLY') || connType.includes('CHILLED')) {
        protocol = 'CHILLED_WATER';
        value = 45;
        unit = 'L/s';
        label = '💧 45 L/s • 7°C Supply';
        color = '#0284c7'; // Deep Blue Chilled
      } else if (connType.includes('CONDENSATE')) {
        protocol = 'WATER';
        value = 2.5;
        unit = 'L/s';
        label = '💧 2.5 L/s Condensate';
        color = '#38bdf8';
      } else {
        protocol = 'WATER';
        value = 15;
        unit = 'L/s';
        label = '💧 15 L/s • 60 PSI';
        color = '#0ea5e9';
      }
    } else if (conn.domain === 'SOLAR' || connType.includes('SOLAR')) {
      medium = 'SOLAR';
      protocol = 'SOLAR_DC';
      value = 12500;
      unit = 'W';
      label = '☀️ 650V DC (12.5 kW)';
      color = '#10b981'; // Emerald Green
    } else if (conn.domain === 'CCTV' || connType.includes('COAX')) {
      medium = 'VIDEO';
      protocol = 'RTSP';
      value = 8500;
      unit = 'Kbps';
      label = '📹 4K RTSP (H.265)';
      color = '#d946ef'; // Magenta
    } else if (connType.includes('FIBER')) {
      medium = 'DATA';
      protocol = 'TCP';
      label = 'FIBER 10G (TCP)';
      color = '#f59e0b';
    } else {
      medium = 'DATA';
      const protos = ['HTTP', 'TCP', 'UDP', 'DNS', 'ICMP'];
      protocol = protos[Math.floor(Math.random() * protos.length)];
      label = `${protocol} ${protocol === 'ICMP' ? '64B' : '1500B'}`;
      color = protocol === 'ICMP' ? '#a855f7' : '#38bdf8';
    }

    newPackets.push({
      id: `flow_${conn.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceNodeId: conn.sourceComponentId,
      targetNodeId: conn.targetComponentId,
      currentEdgeId: conn.id,
      progressPercent: Math.floor(Math.random() * 20),
      medium,
      protocol,
      sizeBytes: value,
      value,
      unit,
      label,
      status: 'ACTIVE',
      color
    });
  }

  return [...existingPackets, ...newPackets];
}

/**
 * Advance the multi-domain simulation tick by 1 step
 */
export function stepNetworkSimulation(
  graph: EngineeringGraph,
  currentState: NetworkSimulationState
): NetworkSimulationState {
  const tick = currentState.tick + 1;
  const updatedPackets: SimulationPacket[] = [];
  let deliveredCount = currentState.telemetry.deliveredPackets;
  let droppedCount = currentState.telemetry.droppedPackets;
  const linkLoads: Record<string, number> = {};

  let totalPowerWatts = 0;
  let totalFluidFlowRate = 0;

  for (const packet of currentState.packets) {
    const conn = graph.connections[packet.currentEdgeId];
    const targetNode = graph.nodes[packet.targetNodeId];

    // If link or target node has failed during transit
    if (!conn || conn.simulationState.isFailed || (targetNode && targetNode.simulationState.isFailed)) {
      packet.status = 'FAILED';
      droppedCount++;
      continue;
    }

    // Advance progress along connection
    // Standard traversal speed ~12% per step
    const speedIncrement = packet.medium === 'ELECTRICITY' ? 16 : packet.medium === 'FLUID' ? 10 : 14;
    packet.progressPercent += speedIncrement;

    // Track link load
    linkLoads[conn.id] = (linkLoads[conn.id] || 0) + 1;

    // Aggregate domain metrics
    if (packet.medium === 'ELECTRICITY' && packet.value) {
      totalPowerWatts += packet.value;
    } else if (packet.medium === 'FLUID' && packet.value) {
      totalFluidFlowRate += packet.value;
    }

    if (packet.progressPercent >= 100) {
      packet.status = 'DELIVERED';
      deliveredCount++;
    } else {
      updatedPackets.push(packet);
    }
  }

  // Calculate link saturations
  const linkSaturations: Record<string, number> = {};
  for (const conn of Object.values(graph.connections)) {
    const activePacketsOnLink = linkLoads[conn.id] || 0;
    const saturation = Math.min(100, activePacketsOnLink * 15);
    linkSaturations[conn.id] = saturation;
    conn.simulationState.saturationPercent = saturation;
    conn.simulationState.isCongested = saturation > 75;
  }

  const telemetry: SimulationTelemetry = {
    tick,
    activePackets: updatedPackets.length,
    deliveredPackets: deliveredCount,
    droppedPackets: droppedCount,
    averageLatencyMs: Number((1.2 + Math.random() * 0.3).toFixed(2)),
    throughputMbps: Number(((deliveredCount * 0.85) + 120).toFixed(1)),
    totalPowerWatts: totalPowerWatts > 0 ? totalPowerWatts : 42500,
    totalCurrentAmps: Number(((totalPowerWatts > 0 ? totalPowerWatts : 42500) / 230).toFixed(1)),
    totalFluidFlowRate: totalFluidFlowRate > 0 ? totalFluidFlowRate : 48.5,
    averagePressurePsi: 58,
    nodeLoads: {},
    linkSaturations
  };

  return {
    tick,
    packets: updatedPackets,
    telemetry
  };
}
