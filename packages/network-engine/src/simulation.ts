import { 
  EngineeringGraph, 
  SimulationPacket, 
  SimulationTelemetry, 
  EngineeringConnection 
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

  return null; // No route available (isolated/partitioned)
}

/**
 * Calculates physics-based latency for a packet on a given link
 * t_total = (Distance / speedOfLight) + (PacketSize / Bandwidth)
 */
export function calculateLinkTransitTimeMs(
  connection: EngineeringConnection,
  packetSizeBytes: number
): number {
  const speedOfLightInCopper = 200000000; // ~200,000 km/s in copper (2/3 c)
  const propagationDelayMs = (connection.lengthMeters / speedOfLightInCopper) * 1000;
  
  const bandwidthMbps = Number(connection.properties.bandwidthLimitMbps || 1000);
  const bandwidthBps = bandwidthMbps * 1000000;
  const transmissionDelayMs = ((packetSizeBytes * 8) / bandwidthBps) * 1000;

  return propagationDelayMs + transmissionDelayMs;
}

/**
 * Advance the simulation tick by 1 step (e.g. 50ms per tick)
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
    // Standard link traverse speed: ~10-25% per step
    packet.progressPercent += 15;

    // Track link load
    linkLoads[conn.id] = (linkLoads[conn.id] || 0) + 1;

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
    const saturation = Math.min(100, activePacketsOnLink * 12);
    linkSaturations[conn.id] = saturation;
    conn.simulationState.saturationPercent = saturation;
    conn.simulationState.isCongested = saturation > 75;
  }

  const telemetry: SimulationTelemetry = {
    tick,
    activePackets: updatedPackets.length,
    deliveredPackets: deliveredCount,
    droppedPackets: droppedCount,
    averageLatencyMs: Number((1.2 + Math.random() * 0.4).toFixed(2)),
    throughputMbps: Number((deliveredCount * 0.85).toFixed(1)),
    nodeLoads: {},
    linkSaturations
  };

  return {
    tick,
    packets: updatedPackets,
    telemetry
  };
}
