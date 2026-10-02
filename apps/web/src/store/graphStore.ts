import { create } from 'zustand';
import { 
  EngineeringGraph, 
  EngineeringComponent, 
  EngineeringConnection, 
  ValidationIssue, 
  SimulationPacket, 
  SimulationTelemetry,
  EngineeringDomain
} from '@omniflow/shared-types';
import { 
  createComponentInstance, 
  checkPortCompatibility, 
  createConnectionInstance, 
  validateNetworkGraph,
  stepNetworkSimulation,
  findShortestPath,
  generateWizardTopology,
  NetworkWizardOptions,
  CABLE_CATALOG
} from '@omniflow/network-engine';
import { createDemoSmallOfficeGraph } from '../seed/demoTopology';

export interface GraphState {
  graph: EngineeringGraph;
  activeDomain: EngineeringDomain;
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  pendingPort: { nodeId: string; portId: string } | null;
  viewport: { x: number; y: number; zoom: number };
  
  // Validation
  validationIssues: ValidationIssue[];
  isValidationDrawerOpen: boolean;
  
  // Modals
  isBOQModalOpen: boolean;
  isCableScheduleOpen: boolean;
  isWizardOpen: boolean;
  
  // Simulation
  isSimulating: boolean;
  simulationSpeed: number; // 1, 2, 5
  simulationTick: number;
  activePackets: SimulationPacket[];
  telemetry: SimulationTelemetry;

  // History for Undo/Redo
  history: string[]; // JSON snapshot array
  historyIndex: number;

  // Actions
  setActiveDomain: (domain: EngineeringDomain) => void;
  selectNode: (id: string | null) => void;
  selectConnection: (id: string | null) => void;
  addComponent: (type: string, position: { x: number; y: number }) => void;
  moveComponent: (id: string, position: { x: number; y: number }) => void;
  removeComponent: (id: string) => void;
  updateComponentProperties: (id: string, properties: Record<string, unknown>) => void;
  toggleComponentFault: (id: string) => void;
  
  startConnection: (nodeId: string, portId: string) => void;
  completeConnection: (targetNodeId: string, targetPortId: string) => { success: boolean; message?: string };
  cancelConnection: () => void;
  removeConnection: (id: string) => void;
  toggleConnectionFault: (id: string) => void;
  updateConnectionLength: (id: string, lengthMeters: number) => void;
  updateConnectionCableType: (id: string, cableType: string) => void;
  
  validate: () => void;
  toggleValidationDrawer: (open?: boolean) => void;
  toggleBOQModal: (open?: boolean) => void;
  toggleCableScheduleModal: (open?: boolean) => void;
  toggleWizardModal: (open?: boolean) => void;
  applyWizardTopology: (options: NetworkWizardOptions) => void;

  toggleSimulation: (running?: boolean) => void;
  setSimulationSpeed: (speed: number) => void;
  triggerPacketBurst: () => void;
  sendDirectedPing: (sourceNodeId: string, targetNodeId: string) => boolean;
  tickSimulation: () => void;
  resetSimulation: () => void;
  autoLayout: () => void;
  
  setViewport: (vp: { x: number; y: number; zoom: number }) => void;
  loadDemoTopology: () => void;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
}

const initialGraph: EngineeringGraph = {
  schemaVersion: '1.0',
  designId: 'design_default',
  name: 'Corporate HQ Network Blueprint',
  domain: 'NETWORK',
  nodes: {},
  connections: {},
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0.0',
    author: 'Chief Network Architect'
  }
};

const initialTelemetry: SimulationTelemetry = {
  tick: 0,
  activePackets: 0,
  deliveredPackets: 0,
  droppedPackets: 0,
  averageLatencyMs: 0,
  throughputMbps: 0,
  nodeLoads: {},
  linkSaturations: {}
};

function pushSnapshot(state: GraphState): Partial<GraphState> {
  const currentSnapshot = JSON.stringify(state.graph);
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(currentSnapshot);
  if (newHistory.length > 30) newHistory.shift(); // retain max 30 snapshots
  return {
    history: newHistory,
    historyIndex: newHistory.length - 1
  };
}

export const useGraphStore = create<GraphState>((set, get) => ({
  graph: initialGraph,
  activeDomain: 'NETWORK',
  selectedNodeId: null,
  selectedConnectionId: null,
  pendingPort: null,
  viewport: { x: 50, y: 50, zoom: 1.0 },

  validationIssues: [],
  isValidationDrawerOpen: false,
  isBOQModalOpen: false,
  isCableScheduleOpen: false,
  isWizardOpen: false,

  isSimulating: false,
  simulationSpeed: 1,
  simulationTick: 0,
  activePackets: [],
  telemetry: initialTelemetry,

  history: [JSON.stringify(initialGraph)],
  historyIndex: 0,

  setActiveDomain: (domain) => set({ activeDomain: domain }),

  selectNode: (id) => set({ selectedNodeId: id, selectedConnectionId: null }),
  selectConnection: (id) => set({ selectedConnectionId: id, selectedNodeId: null }),

  addComponent: (type, position) => {
    const { graph } = get();
    const newComponent = createComponentInstance(type, graph.designId, position);
    
    const newNodes = {
      ...graph.nodes,
      [newComponent.id]: newComponent
    };

    const updatedGraph: EngineeringGraph = {
      ...graph,
      nodes: newNodes,
      metadata: { ...graph.metadata, updatedAt: new Date().toISOString() }
    };

    set((state) => ({
      graph: updatedGraph,
      selectedNodeId: newComponent.id,
      selectedConnectionId: null,
      ...pushSnapshot({ ...state, graph: updatedGraph })
    }));

    get().validate();
  },

  moveComponent: (id, position) => {
    set((state) => {
      const node = state.graph.nodes[id];
      if (!node) return state;

      const updatedNode: EngineeringComponent = {
        ...node,
        position
      };

      return {
        graph: {
          ...state.graph,
          nodes: {
            ...state.graph.nodes,
            [id]: updatedNode
          }
        }
      };
    });
  },

  removeComponent: (id) => {
    const { graph } = get();
    const targetNode = graph.nodes[id];
    if (!targetNode) return;

    // Disconnect any connections linked to this node
    const remainingConnections: Record<string, EngineeringConnection> = {};
    for (const [connId, conn] of Object.entries(graph.connections)) {
      if (conn.sourceComponentId !== id && conn.targetComponentId !== id) {
        remainingConnections[connId] = conn;
      }
    }

    const remainingNodes = { ...graph.nodes };
    delete remainingNodes[id];

    const updatedGraph: EngineeringGraph = {
      ...graph,
      nodes: remainingNodes,
      connections: remainingConnections,
      metadata: { ...graph.metadata, updatedAt: new Date().toISOString() }
    };

    set((state) => ({
      graph: updatedGraph,
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      ...pushSnapshot({ ...state, graph: updatedGraph })
    }));

    get().validate();
  },

  updateComponentProperties: (id, properties) => {
    set((state) => {
      const node = state.graph.nodes[id];
      if (!node) return state;

      const updatedNode: EngineeringComponent = {
        ...node,
        properties: {
          ...node.properties,
          ...properties
        }
      };

      const updatedGraph: EngineeringGraph = {
        ...state.graph,
        nodes: {
          ...state.graph.nodes,
          [id]: updatedNode
        }
      };

      return {
        graph: updatedGraph,
        ...pushSnapshot({ ...state, graph: updatedGraph })
      };
    });

    get().validate();
  },

  toggleComponentFault: (id) => {
    set((state) => {
      const node = state.graph.nodes[id];
      if (!node) return state;

      const isFailed = !node.simulationState.isFailed;
      const updatedNode: EngineeringComponent = {
        ...node,
        simulationState: {
          ...node.simulationState,
          status: isFailed ? 'FAILED' : 'ONLINE',
          isFailed
        }
      };

      return {
        graph: {
          ...state.graph,
          nodes: {
            ...state.graph.nodes,
            [id]: updatedNode
          }
        }
      };
    });
    get().validate();
  },

  startConnection: (nodeId, portId) => {
    set({ pendingPort: { nodeId, portId } });
  },

  completeConnection: (targetNodeId, targetPortId) => {
    const { graph, pendingPort } = get();
    if (!pendingPort) return { success: false, message: 'No connection initiated.' };

    const sourceNode = graph.nodes[pendingPort.nodeId];
    const targetNode = graph.nodes[targetNodeId];
    if (!sourceNode || !targetNode) {
      set({ pendingPort: null });
      return { success: false, message: 'Invalid node endpoints.' };
    }

    const sourcePort = sourceNode.ports.find((p) => p.id === pendingPort.portId);
    const targetPort = targetNode.ports.find((p) => p.id === targetPortId);
    if (!sourcePort || !targetPort) {
      set({ pendingPort: null });
      return { success: false, message: 'Invalid port endpoints.' };
    }

    // Validate Compatibility
    const check = checkPortCompatibility(sourcePort, targetPort);
    if (!check.compatible) {
      set({ pendingPort: null });
      return { success: false, message: check.reason };
    }

    // Calculate approximate visual distance in meters
    const dx = targetNode.position.x - sourceNode.position.x;
    const dy = targetNode.position.y - sourceNode.position.y;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);
    const estimatedMeters = Math.max(2, Math.round(pixelDistance / 20)); // ~20 pixels per meter

    // Create Connection
    const newConnection = createConnectionInstance(
      graph.designId,
      sourceNode.id,
      sourcePort.id,
      targetNode.id,
      targetPort.id,
      check.recommendedCable || 'CAT6',
      estimatedMeters
    );

    // Mark ports occupied
    sourcePort.occupiedByConnectionId = newConnection.id;
    targetPort.occupiedByConnectionId = newConnection.id;

    const updatedGraph: EngineeringGraph = {
      ...graph,
      connections: {
        ...graph.connections,
        [newConnection.id]: newConnection
      },
      metadata: { ...graph.metadata, updatedAt: new Date().toISOString() }
    };

    set((state) => ({
      graph: updatedGraph,
      pendingPort: null,
      selectedConnectionId: newConnection.id,
      ...pushSnapshot({ ...state, graph: updatedGraph })
    }));

    get().validate();
    return { success: true };
  },

  cancelConnection: () => set({ pendingPort: null }),

  removeConnection: (id) => {
    const { graph } = get();
    const conn = graph.connections[id];
    if (!conn) return;

    // Release port occupancy
    const srcNode = graph.nodes[conn.sourceComponentId];
    const tgtNode = graph.nodes[conn.targetComponentId];
    if (srcNode) {
      const p = srcNode.ports.find((pt) => pt.id === conn.sourcePortId);
      if (p) p.occupiedByConnectionId = null;
    }
    if (tgtNode) {
      const p = tgtNode.ports.find((pt) => pt.id === conn.targetPortId);
      if (p) p.occupiedByConnectionId = null;
    }

    const remainingConnections = { ...graph.connections };
    delete remainingConnections[id];

    const updatedGraph: EngineeringGraph = {
      ...graph,
      connections: remainingConnections,
      metadata: { ...graph.metadata, updatedAt: new Date().toISOString() }
    };

    set((state) => ({
      graph: updatedGraph,
      selectedConnectionId: state.selectedConnectionId === id ? null : state.selectedConnectionId,
      ...pushSnapshot({ ...state, graph: updatedGraph })
    }));

    get().validate();
  },

  toggleConnectionFault: (id) => {
    set((state) => {
      const conn = state.graph.connections[id];
      if (!conn) return state;

      const isFailed = !conn.simulationState.isFailed;
      const updatedConn: EngineeringConnection = {
        ...conn,
        simulationState: {
          ...conn.simulationState,
          isFailed
        }
      };

      return {
        graph: {
          ...state.graph,
          connections: {
            ...state.graph.connections,
            [id]: updatedConn
          }
        }
      };
    });
  },

  updateConnectionLength: (id, lengthMeters) => {
    set((state) => {
      const conn = state.graph.connections[id];
      if (!conn) return state;

      const updatedConn: EngineeringConnection = {
        ...conn,
        lengthMeters,
        simulationState: {
          ...conn.simulationState,
          latencyMs: Number((lengthMeters * 0.005).toFixed(3))
        }
      };

      const updatedGraph: EngineeringGraph = {
        ...state.graph,
        connections: {
          ...state.graph.connections,
          [id]: updatedConn
        }
      };

      return {
        graph: updatedGraph,
        ...pushSnapshot({ ...state, graph: updatedGraph })
      };
    });

    get().validate();
  },

  updateConnectionCableType: (id, cableType) => {
    const spec = CABLE_CATALOG[cableType] || CABLE_CATALOG.CAT6;
    set((state) => {
      const conn = state.graph.connections[id];
      if (!conn) return state;

      const updatedConn: EngineeringConnection = {
        ...conn,
        connectionType: spec.type,
        properties: {
          ...conn.properties,
          bandwidthLimitMbps: spec.maxBandwidthMbps,
          maxDistanceMeters: spec.maxDistanceMeters,
          cableName: spec.name
        }
      };

      const updatedGraph: EngineeringGraph = {
        ...state.graph,
        connections: {
          ...state.graph.connections,
          [id]: updatedConn
        }
      };

      return {
        graph: updatedGraph,
        ...pushSnapshot({ ...state, graph: updatedGraph })
      };
    });
    get().validate();
  },

  validate: () => {
    const { graph } = get();
    const issues = validateNetworkGraph(graph);
    set({ validationIssues: issues });
  },

  toggleValidationDrawer: (open) => {
    set((state) => ({
      isValidationDrawerOpen: open !== undefined ? open : !state.isValidationDrawerOpen
    }));
  },

  toggleBOQModal: (open) => {
    set((state) => ({
      isBOQModalOpen: open !== undefined ? open : !state.isBOQModalOpen
    }));
  },

  toggleCableScheduleModal: (open) => {
    set((state) => ({
      isCableScheduleOpen: open !== undefined ? open : !state.isCableScheduleOpen
    }));
  },

  toggleWizardModal: (open) => {
    set((state) => ({
      isWizardOpen: open !== undefined ? open : !state.isWizardOpen
    }));
  },

  applyWizardTopology: (options) => {
    const newGraph = generateWizardTopology(options);
    set((state) => ({
      graph: newGraph,
      isWizardOpen: false,
      selectedNodeId: null,
      selectedConnectionId: null,
      pendingPort: null,
      activePackets: [],
      viewport: { x: 40, y: 40, zoom: 0.8 },
      ...pushSnapshot({ ...state, graph: newGraph })
    }));
    get().validate();
  },

  sendDirectedPing: (sourceNodeId, targetNodeId) => {
    const { graph } = get();
    const path = findShortestPath(graph, sourceNodeId, targetNodeId);
    if (!path || path.length === 0) return false;

    const newPacket: SimulationPacket = {
      id: `ping_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceNodeId,
      targetNodeId,
      currentEdgeId: path[0].connectionId,
      progressPercent: 5,
      protocol: 'ICMP',
      sizeBytes: 64,
      status: 'ACTIVE',
      color: '#06b6d4'
    };

    set((state) => ({
      activePackets: [...state.activePackets, newPacket],
      isSimulating: true
    }));
    return true;
  },

  autoLayout: () => {
    const { graph } = get();
    const nodes = Object.values(graph.nodes);
    if (nodes.length === 0) return;

    // Categorize nodes into 5 horizontal tiers
    const tiers: Record<number, EngineeringComponent[]> = {
      0: [], // WAN / ISP
      1: [], // Firewalls / Routers
      2: [], // Distribution / Core Switches
      3: [], // Access Switches / Infrastructure / Racks
      4: []  // Endpoints / Servers / Cameras / Workstations
    };

    for (const node of nodes) {
      if (node.type === 'ISP_FEED' || node.type === 'ROUTER_CORE_BGP') {
        tiers[0].push(node);
      } else if (node.type.startsWith('FIREWALL') || node.type.startsWith('ROUTER')) {
        tiers[1].push(node);
      } else if (node.type === 'SWITCH_CORE_L3' || node.type === 'SWITCH_AGGREGATION_10G') {
        tiers[2].push(node);
      } else if (node.type.startsWith('SWITCH') || node.type.startsWith('RACK') || node.type.startsWith('UPS') || node.type.startsWith('PATCH')) {
        tiers[3].push(node);
      } else {
        tiers[4].push(node);
      }
    }

    const updatedNodes = { ...graph.nodes };
    const tierX = [60, 290, 530, 770, 1050];

    Object.entries(tiers).forEach(([tierStr, tierNodes]) => {
      const tierIdx = Number(tierStr);
      const startX = tierX[tierIdx] || 1050;
      tierNodes.forEach((node, idx) => {
        const y = 80 + idx * 130;
        updatedNodes[node.id] = {
          ...node,
          position: { x: startX, y }
        };
      });
    });

    const updatedGraph: EngineeringGraph = {
      ...graph,
      nodes: updatedNodes,
      metadata: { ...graph.metadata, updatedAt: new Date().toISOString() }
    };

    set((state) => ({
      graph: updatedGraph,
      ...pushSnapshot({ ...state, graph: updatedGraph })
    }));
  },

  toggleSimulation: (running) => {
    set((state) => ({
      isSimulating: running !== undefined ? running : !state.isSimulating
    }));
  },

  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

  triggerPacketBurst: () => {
    const { graph } = get();
    const nodes = Object.values(graph.nodes);
    const clients = nodes.filter((n) => n.type === 'WORKSTATION_PC' && !n.simulationState.isFailed);
    const servers = nodes.filter((n) => (n.type === 'SERVER_APP' || n.type === 'ISP_FEED') && !n.simulationState.isFailed);

    if (clients.length === 0 || servers.length === 0) return;

    const newPackets: SimulationPacket[] = [];
    for (const client of clients) {
      const target = servers[Math.floor(Math.random() * servers.length)];
      const path = findShortestPath(graph, client.id, target.id);
      if (path && path.length > 0) {
        newPackets.push({
          id: `pkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sourceNodeId: client.id,
          targetNodeId: target.id,
          currentEdgeId: path[0].connectionId,
          progressPercent: 5,
          protocol: Math.random() > 0.4 ? 'HTTP' : 'ICMP',
          sizeBytes: 1500,
          status: 'ACTIVE',
          color: '#38bdf8'
        });
      }
    }

    set((state) => ({
      activePackets: [...state.activePackets, ...newPackets]
    }));
  },

  tickSimulation: () => {
    const { graph, simulationTick, activePackets, telemetry } = get();
    
    // Spawn automatic traffic packets if simulation is running and packet count is low
    if (activePackets.length < 8 && Math.random() > 0.4) {
      get().triggerPacketBurst();
    }

    const simState = stepNetworkSimulation(graph, {
      tick: simulationTick,
      packets: activePackets,
      telemetry
    });

    set({
      simulationTick: simState.tick,
      activePackets: simState.packets,
      telemetry: simState.telemetry
    });
  },

  resetSimulation: () => {
    set({
      simulationTick: 0,
      activePackets: [],
      telemetry: initialTelemetry,
      isSimulating: false
    });
  },

  setViewport: (viewport) => set({ viewport }),

  loadDemoTopology: () => {
    const demo = createDemoSmallOfficeGraph();
    set((state) => ({
      graph: demo,
      selectedNodeId: null,
      selectedConnectionId: null,
      pendingPort: null,
      viewport: { x: 30, y: 30, zoom: 0.85 },
      ...pushSnapshot({ ...state, graph: demo })
    }));
    get().validate();
  },

  clearCanvas: () => {
    const emptyGraph: EngineeringGraph = {
      ...initialGraph,
      nodes: {},
      connections: {},
      metadata: { ...initialGraph.metadata, updatedAt: new Date().toISOString() }
    };
    set((state) => ({
      graph: emptyGraph,
      selectedNodeId: null,
      selectedConnectionId: null,
      pendingPort: null,
      activePackets: [],
      validationIssues: [],
      ...pushSnapshot({ ...state, graph: emptyGraph })
    }));
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevSnapshot = history[historyIndex - 1];
      const parsedGraph = JSON.parse(prevSnapshot) as EngineeringGraph;
      set({
        graph: parsedGraph,
        historyIndex: historyIndex - 1,
        selectedNodeId: null,
        selectedConnectionId: null
      });
      get().validate();
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextSnapshot = history[historyIndex + 1];
      const parsedGraph = JSON.parse(nextSnapshot) as EngineeringGraph;
      set({
        graph: parsedGraph,
        historyIndex: historyIndex + 1,
        selectedNodeId: null,
        selectedConnectionId: null
      });
      get().validate();
    }
  }
}));
