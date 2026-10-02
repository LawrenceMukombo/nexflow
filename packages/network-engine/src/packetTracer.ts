import { 
  EngineeringGraph, 
  EngineeringComponent, 
  SimulationPacket, 
  PduDetails, 
  SimulationEvent, 
  PacketTracerScenario
} from '@omniflow/shared-types';
import { findShortestPath, RouteHop } from './simulation';
import { checkNodeNetworkConfig } from './validation';

/**
 * Deterministic authentic MAC address generator
 */
export function generateMacAddress(node: EngineeringComponent | string, portIndex: number = 0): string {
  const id = typeof node === 'string' ? node : node.id;
  const oui = '00-1E-13'; // Cisco Systems OUI default

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 37 + id.charCodeAt(i) + portIndex * 13) & 0xffffffff;
  }
  const hex = Math.abs(hash).toString(16).padStart(6, '0').slice(-6);
  return `${oui}-${hex.slice(0, 2).toUpperCase()}-${hex.slice(2, 4).toUpperCase()}-${hex.slice(4, 6).toUpperCase()}`;
}

/**
 * Generates rich OSI Model layer inspections and header byte structures matching Cisco Packet Tracer
 */
export function generatePduDetails(
  _graph: EngineeringGraph,
  sourceNode: EngineeringComponent,
  targetNode: EngineeringComponent,
  currentNode: EngineeringComponent,
  protocol: 'ICMP' | 'ARP' | 'HTTP' | 'DNS' | 'TCP' | 'DHCP' = 'ICMP',
  isReply: boolean = false
): PduDetails {
  const srcIp = ((sourceNode.properties.ipAddress || sourceNode.properties.lanIp || '192.168.1.10') as string);
  const dstIp = ((targetNode.properties.ipAddress || targetNode.properties.lanIp || '192.168.1.1') as string);
  const isSource = currentNode.id === sourceNode.id;
  const isDestination = currentNode.id === targetNode.id;

  const srcMac = generateMacAddress(sourceNode, 0);
  const dstMac = isDestination ? generateMacAddress(targetNode, 0) : '00-1E-13-FF-EE-AA';

  // Build OSI Model In Layers
  const inLayers = [];
  if (!isSource) {
    inLayers.push({
      layer: 1,
      layerName: 'Physical',
      description: `FastEthernet0/1 received frame bitstream from adjacent physical link at 1.0 Gbps full-duplex.`
    });
    inLayers.push({
      layer: 2,
      layerName: 'Data Link',
      description: `The destination MAC address (${dstMac}) matches the interface MAC or broadcast. Frame checksum (FCS) valid. Decapsulates packet into IPv4 payload.`
    });
    if (!currentNode.type.includes('SWITCH') || currentNode.type.includes('L3')) {
      inLayers.push({
        layer: 3,
        layerName: 'Network',
        description: isDestination 
          ? `Destination IP (${dstIp}) matches the device IP address. The device decapsulates the packet to process layer 4 protocol (${protocol}).`
          : `Destination IP is ${dstIp}. Routing table lookup found next-hop gateway. Decrements TTL to 63.`
      });
      inLayers.push({
        layer: 4,
        layerName: 'Transport',
        description: protocol === 'ICMP' 
          ? `ICMP ${isReply ? 'Echo Reply' : 'Echo Request'} received. Checksum verified (0x4b2a). Identifier: 0x0001, Sequence: 0x0001.`
          : `${protocol} segment received. Port matching active listener.`
      });
    }
  }

  // Build OSI Model Out Layers
  const outLayers = [];
  if (!isDestination) {
    if (isSource) {
      outLayers.push({
        layer: 7,
        layerName: 'Application',
        description: `Ping diagnostic utility initiated ${protocol} ${isReply ? 'Echo Reply' : 'Echo Request'} with 32 bytes of test payload.`
      });
      outLayers.push({
        layer: 4,
        layerName: 'Transport',
        description: `Constructed ${protocol} message. Type: ${isReply ? '0 (Echo Reply)' : '8 (Echo Request)'}, Code: 0. Calculated payload checksum.`
      });
      outLayers.push({
        layer: 3,
        layerName: 'Network',
        description: `Encapsulated into IPv4 packet. Source IP: ${srcIp}, Destination IP: ${dstIp}, Protocol: 1 (ICMP), TTL: 64.`
      });
      outLayers.push({
        layer: 2,
        layerName: 'Data Link',
        description: `Resolved destination MAC ${dstMac} via ARP table cache. Encapsulated into Ethernet II frame with preamble and FCS.`
      });
      outLayers.push({
        layer: 1,
        layerName: 'Physical',
        description: `Transmitted frame bits out GigabitEthernet0/0 interface into physical copper transmission cable.`
      });
    } else {
      // Intermediate forwarding device
      if (currentNode.type.includes('SWITCH')) {
        outLayers.push({
          layer: 2,
          layerName: 'Data Link',
          description: `CAM MAC table lookup for ${dstMac} mapped to egress port GigabitEthernet0/2. Forwarded unicast frame.`
        });
        outLayers.push({
          layer: 1,
          layerName: 'Physical',
          description: `Serialized Ethernet frame out port GigabitEthernet0/2 onto copper Cat6 cable.`
        });
      } else {
        outLayers.push({
          layer: 3,
          layerName: 'Network',
          description: `IP routing table directs packet to next-hop. Decremented TTL to 63. Recalculated IP header checksum.`
        });
        outLayers.push({
          layer: 2,
          layerName: 'Data Link',
          description: `Encapsulated with egress MAC ${dstMac}.`
        });
        outLayers.push({
          layer: 1,
          layerName: 'Physical',
          description: `Sent frame out WAN/LAN interface.`
        });
      }
    }
  }

  return {
    packetId: `pdu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sourceTag: sourceNode.tag,
    targetTag: targetNode.tag,
    currentDeviceTag: currentNode.tag,
    protocol,
    inLayers,
    outLayers,
    ethernetHeader: {
      preamble: '0xAA-AA-AA-AA-AA-AA-AA-AB',
      destMac: dstMac,
      srcMac: srcMac,
      typeHex: protocol === 'ARP' ? '0x0806 (ARP)' : '0x0800 (IPv4)'
    },
    ipHeader: {
      version: 4,
      ihl: 5,
      tos: '0x00 (Routine)',
      totalLengthBytes: 60,
      id: Math.floor(Math.random() * 65535),
      flags: '0x02 (Don\'t Fragment)',
      ttl: 64,
      protocolNum: protocol === 'ICMP' ? 1 : protocol === 'TCP' ? 6 : 17,
      checksum: '0x3c4f',
      srcIp,
      destIp: dstIp
    },
    payloadHeader: {
      type: protocol,
      icmpType: isReply ? 0 : 8,
      icmpCode: 0,
      seqNum: 1,
      info: protocol === 'ICMP' 
        ? `${isReply ? 'Echo Reply' : 'Echo Request'} seq=1 ttl=64`
        : `${protocol} Data Exchange`
    }
  };
}

/**
 * Creates a Simple PDU (Packet Tracer envelope) between source and target
 */
export function createSimplePdu(
  graph: EngineeringGraph,
  sourceNodeId: string,
  targetNodeId: string,
  timeSec: number = 0
): {
  packet: SimulationPacket | null;
  event: SimulationEvent | null;
  scenario: PacketTracerScenario | null;
  path: RouteHop[] | null;
  error?: string;
} {
  const sourceNode = graph.nodes[sourceNodeId];
  const targetNode = graph.nodes[targetNodeId];
  if (!sourceNode || !targetNode) {
    return { packet: null, event: null, scenario: null, path: null, error: 'Source or target device not found' };
  }

  const srcNet = checkNodeNetworkConfig(sourceNode, graph);
  const tgtNet = checkNodeNetworkConfig(targetNode, graph);
  if (!srcNet.canConnect) {
    return { packet: null, event: null, scenario: null, path: null, error: `${sourceNode.tag}: ${srcNet.reason}` };
  }
  if (!tgtNet.canConnect) {
    return { packet: null, event: null, scenario: null, path: null, error: `${targetNode.tag}: ${tgtNet.reason}` };
  }

  const path = findShortestPath(graph, sourceNodeId, targetNodeId);
  if (!path || path.length === 0) {
    return { packet: null, event: null, scenario: null, path: null, error: `No active network link path between ${sourceNode.tag} and ${targetNode.tag}` };
  }

  const pdu = generatePduDetails(graph, sourceNode, targetNode, sourceNode, 'ICMP', false);

  const packet: SimulationPacket = {
    id: `pkt_pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sourceNodeId,
    targetNodeId,
    currentEdgeId: path[0].connectionId,
    progressPercent: 0,
    medium: 'DATA',
    protocol: 'ICMP',
    sizeBytes: 64,
    label: `✉️ ICMP Echo Req`,
    status: 'ACTIVE',
    color: '#a855f7', // Purple/Magenta envelope
    isEnvelope: true,
    pdu
  };

  const event: SimulationEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timeSec: Number(timeSec.toFixed(3)),
    lastDeviceTag: sourceNode.tag,
    atDeviceTag: sourceNode.tag,
    type: 'ICMP',
    info: `ICMP Echo Request (seq=1)`,
    status: 'SENT',
    color: '#a855f7',
    pdu
  };

  const scenario: PacketTracerScenario = {
    id: `scen_${Date.now()}`,
    sourceTag: sourceNode.tag,
    destTag: targetNode.tag,
    type: 'ICMP',
    status: 'In Progress',
    timeSec: Number(timeSec.toFixed(3)),
    color: '#a855f7'
  };

  return { packet, event, scenario, path };
}

/**
 * Advances a Simulation Packet by one step in Simulation Mode (Capture / Forward)
 */
export function stepSimulationPacket(
  packet: SimulationPacket,
  graph: EngineeringGraph,
  timeSec: number = 0
): {
  updatedPacket: SimulationPacket | null;
  newEvent: SimulationEvent | null;
  completedScenarioStatus?: 'Successful' | 'Failed';
} {
  const currentConn = graph.connections[packet.currentEdgeId];
  if (!currentConn) {
    return { updatedPacket: null, newEvent: null, completedScenarioStatus: 'Failed' };
  }

  const srcNode = graph.nodes[packet.sourceNodeId];
  const tgtNode = graph.nodes[packet.targetNodeId];
  if (!srcNode || !tgtNode) {
    return { updatedPacket: null, newEvent: null, completedScenarioStatus: 'Failed' };
  }

  // Determine receiving hop node along path
  const path = findShortestPath(graph, packet.sourceNodeId, packet.targetNodeId);
  const currentHop = path?.find(h => h.connectionId === packet.currentEdgeId);
  const currentNodeId = currentHop?.nodeId || 
    (currentConn.targetComponentId === packet.sourceNodeId ? currentConn.sourceComponentId : currentConn.targetComponentId);
  const currentNode = graph.nodes[currentNodeId] || tgtNode;

  // If packet hasn't completed current cable hop, finish it
  if (packet.progressPercent < 100) {
    const isEchoReply = packet.label?.includes('Reply');
    const pdu = generatePduDetails(graph, srcNode, tgtNode, currentNode, 'ICMP', isEchoReply);

    const event: SimulationEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timeSec: Number(timeSec.toFixed(3)),
      lastDeviceTag: graph.nodes[currentConn.sourceComponentId]?.tag || srcNode.tag,
      atDeviceTag: currentNode.tag,
      type: 'ICMP',
      info: `${isEchoReply ? 'ICMP Echo Reply' : 'ICMP Echo Request'} arrived at ${currentNode.tag}`,
      status: currentNode.id === tgtNode.id ? 'RECEIVED' : 'FORWARDED',
      color: isEchoReply ? '#10b981' : '#a855f7',
      pdu
    };

    // If reached destination, transform into Echo Reply or mark completed
    if (currentNode.id === tgtNode.id) {
      if (!isEchoReply) {
        // Spawn Echo Reply heading back to source!
        const returnPath = findShortestPath(graph, tgtNode.id, srcNode.id);
        if (returnPath && returnPath.length > 0) {
          const replyPacket: SimulationPacket = {
            id: `pkt_reply_${Date.now()}`,
            sourceNodeId: tgtNode.id,
            targetNodeId: srcNode.id,
            currentEdgeId: returnPath[0].connectionId,
            progressPercent: 0,
            medium: 'DATA',
            protocol: 'ICMP',
            sizeBytes: 64,
            label: '✉️ ICMP Echo Reply',
            status: 'ACTIVE',
            color: '#10b981', // Green envelope for successful reply
            isEnvelope: true,
            pdu: generatePduDetails(graph, tgtNode, srcNode, tgtNode, 'ICMP', true)
          };
          return { updatedPacket: replyPacket, newEvent: event };
        }
      }
      // Reached original sender on reply!
      return { updatedPacket: null, newEvent: event, completedScenarioStatus: 'Successful' };
    }

    // Forward through next hop along path
    const remainingPath = findShortestPath(graph, currentNode.id, tgtNode.id);
    if (remainingPath && remainingPath.length > 0) {
      const nextHop = remainingPath[0];
      const nextPacket: SimulationPacket = {
        ...packet,
        currentEdgeId: nextHop.connectionId,
        progressPercent: 0
      };
      return { updatedPacket: nextPacket, newEvent: event };
    }

    return { updatedPacket: null, newEvent: event, completedScenarioStatus: 'Failed' };
  }

  return { updatedPacket: null, newEvent: null };
}
