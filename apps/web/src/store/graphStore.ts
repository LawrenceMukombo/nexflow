import { create } from 'zustand';
import { 
  EngineeringGraph, 
  EngineeringComponent, 
  EngineeringConnection, 
  ValidationIssue, 
  SimulationPacket, 
  SimulationTelemetry,
  EngineeringDomain,
  ComponentLibrary,
  LibraryAssembly,
  ComponentTemplate,
  SavedProject
} from '@omniflow/shared-types';
import { 
  createComponentInstance, 
  checkPortCompatibility, 
  createConnectionInstance, 
  validateNetworkGraph,
  stepNetworkSimulation,
  findShortestPath,
  generateWizardTopology,
  generateElectricalFacilityTopology,
  generateChilledWaterCoolingTopology,
  generateMultiDomainSmartFacilityTopology,
  spawnContinuousFlowPackets,
  NetworkWizardOptions,
  CABLE_CATALOG,
  BUILTIN_LIBRARIES,
  instantiateAssembly,
  createAssemblyFromSelection,
  validateLibraryJson,
  exportLibraryToJson,
  registerLibraryComponents,
  NETWORK_COMPONENT_CATALOG
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
  isLibraryModalOpen: boolean;
  isCreateComponentModalOpen: boolean;
  isSaveAssemblyModalOpen: boolean;
  isProjectsModalOpen: boolean;

  // Projects Management
  currentProjectId: string;
  currentProjectName: string;
  savedProjects: SavedProject[];
  isProjectDirty: boolean;

  // Libraries & Assemblies
  libraries: ComponentLibrary[];
  activeLibraryId: string;
  
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

  // Library & Assembly Actions
  toggleLibraryModal: (open?: boolean) => void;
  toggleCreateComponentModal: (open?: boolean) => void;
  toggleSaveAssemblyModal: (open?: boolean) => void;
  setActiveLibraryId: (id: string) => void;
  importLibrary: (jsonString: string) => { success: boolean; message: string };
  exportLibrary: (libraryId: string) => string | null;
  addCustomComponent: (libraryId: string, template: ComponentTemplate) => void;
  addAssembly: (libraryId: string, assembly: LibraryAssembly) => void;
  insertAssembly: (assembly: LibraryAssembly, position?: { x: number; y: number }) => void;
  saveSelectionAsAssembly: (name: string, category: string, description: string, targetLibraryId?: string) => LibraryAssembly | null;
  deleteLibrary: (libraryId: string) => void;
  deleteCustomComponent: (libraryId: string, componentType: string) => void;

  // Project Management Actions
  toggleProjectsModal: (open?: boolean) => void;
  saveCurrentProject: (name?: string, description?: string) => void;
  saveAsNewProject: (name: string, description?: string) => void;
  loadProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  duplicateProject: (projectId: string) => void;
  renameProject: (projectId: string, newName: string) => void;
  importProjectFromFile: (jsonString: string) => { success: boolean; message: string };
  exportProjectToFile: (projectId: string) => void;
  setCurrentProjectName: (name: string) => void;
  createNewBlankProject: (name?: string) => void;

  // Domain Flow Filters & Controls
  showDataFlow: boolean;
  showElectricFlow: boolean;
  showFluidFlow: boolean;
  showVideoFlow: boolean;
  toggleDomainFlow: (domain: 'DATA' | 'ELECTRICITY' | 'FLUID' | 'VIDEO') => void;
  loadSystemDesign: (type: 'NETWORK' | 'ELECTRICAL' | 'PLUMBING' | 'MULTI_DOMAIN' | 'CCTV') => void;
  injectFaultOrSurge: (type: 'POWER_SURGE' | 'PUMP_BOOST' | 'PACKET_BURST') => void;

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
  averageLatencyMs: 1.2,
  throughputMbps: 350,
  totalPowerWatts: 42500,
  totalCurrentAmps: 184.8,
  totalFluidFlowRate: 48.5,
  averagePressurePsi: 58,
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

const PROJECTS_STORAGE_KEY = 'omniflow_saved_projects_v1';

function getStoredProjects(): SavedProject[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(PROJECTS_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Could not read saved projects from localStorage', err);
  }

  // Initial Seed Projects across Engineering Domains
  const demoGraph = createDemoSmallOfficeGraph();
  const seed1: SavedProject = {
    id: 'proj_small_office_01',
    name: 'Corporate HQ Small Office Network',
    description: 'Baseline SME multi-tier network with firewall, PoE switching, and workstations with live data packets.',
    domain: 'NETWORK',
    graph: demoGraph,
    deviceCount: Object.keys(demoGraph.nodes).length,
    connectionCount: Object.keys(demoGraph.connections).length,
    estimatedCost: 14500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const elecGraph = generateElectricalFacilityTopology();
  const seedElec: SavedProject = {
    id: 'proj_elec_facility_01',
    name: 'Critical Facility Electrical Distribution',
    description: 'Grid transformer, standby diesel generator, ATS, 40kVA UPS, and PDUs with live 400V/230V AC current flow.',
    domain: 'ELECTRICAL',
    graph: elecGraph,
    deviceCount: Object.keys(elecGraph.nodes).length,
    connectionCount: Object.keys(elecGraph.connections).length,
    estimatedCost: 89000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const chwGraph = generateChilledWaterCoolingTopology();
  const seedPlumb: SavedProject = {
    id: 'proj_chw_cooling_01',
    name: 'Data Center Chilled Water & Liquid Cooling',
    description: '100-ton liquid chiller, dual circulation pumps, in-row CRAH air handlers with live flowing chilled water.',
    domain: 'PLUMBING',
    graph: chwGraph,
    deviceCount: Object.keys(chwGraph.nodes).length,
    connectionCount: Object.keys(chwGraph.connections).length,
    estimatedCost: 172000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const facilityGraph = generateMultiDomainSmartFacilityTopology();
  const seedFacility: SavedProject = {
    id: 'proj_smart_facility_01',
    name: 'Integrated Multi-Domain Smart Data Center',
    description: 'Unified facility with simultaneous Network (10G Fiber), Electrical Power (230V AC), and Chilled Water (7°C).',
    domain: 'MULTI_DOMAIN',
    graph: facilityGraph,
    deviceCount: Object.keys(facilityGraph.nodes).length,
    connectionCount: Object.keys(facilityGraph.connections).length,
    estimatedCost: 215000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return [seed1, seedElec, seedPlumb, seedFacility];
}

function persistProjects(projects: SavedProject[]) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    }
  } catch (err) {
    console.warn('Could not save projects to localStorage', err);
  }
}

const initialProjects = getStoredProjects();

export const useGraphStore = create<GraphState>((set, get) => ({
  graph: initialProjects[0]?.graph || initialGraph,
  activeDomain: 'NETWORK',
  selectedNodeId: null,
  selectedConnectionId: null,
  pendingPort: null,
  viewport: { x: 50, y: 50, zoom: 0.9 },

  validationIssues: [],
  isValidationDrawerOpen: false,
  isBOQModalOpen: false,
  isCableScheduleOpen: false,
  isWizardOpen: false,
  isLibraryModalOpen: false,
  isCreateComponentModalOpen: false,
  isSaveAssemblyModalOpen: false,
  isProjectsModalOpen: false,

  currentProjectId: initialProjects[0]?.id || 'proj_default',
  currentProjectName: initialProjects[0]?.name || 'Corporate HQ Network Blueprint',
  savedProjects: initialProjects,
  isProjectDirty: false,

  libraries: BUILTIN_LIBRARIES,
  activeLibraryId: 'lib_cisco_enterprise',

  isSimulating: true, // Default to true so flowing packets, electrical current, and fluids are immediately visible!
  simulationSpeed: 1,
  simulationTick: 0,
  activePackets: [],
  telemetry: initialTelemetry,

  // Domain Flow Filters
  showDataFlow: true,
  showElectricFlow: true,
  showFluidFlow: true,
  showVideoFlow: true,

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

  toggleLibraryModal: (open) => {
    set((state) => ({
      isLibraryModalOpen: open !== undefined ? open : !state.isLibraryModalOpen
    }));
  },

  toggleCreateComponentModal: (open) => {
    set((state) => ({
      isCreateComponentModalOpen: open !== undefined ? open : !state.isCreateComponentModalOpen
    }));
  },

  toggleSaveAssemblyModal: (open) => {
    set((state) => ({
      isSaveAssemblyModalOpen: open !== undefined ? open : !state.isSaveAssemblyModalOpen
    }));
  },

  setActiveLibraryId: (id) => {
    set({ activeLibraryId: id });
  },

  importLibrary: (jsonString) => {
    const result = validateLibraryJson(jsonString);
    if (!result.valid || !result.library) {
      return { success: false, message: result.error || 'Failed to parse library file' };
    }

    const newLib = result.library;
    registerLibraryComponents(newLib);

    set((state) => {
      // Upsert library by ID
      const existingIdx = state.libraries.findIndex(l => l.id === newLib.id);
      let updated: ComponentLibrary[];
      if (existingIdx >= 0) {
        updated = [...state.libraries];
        updated[existingIdx] = newLib;
      } else {
        updated = [newLib, ...state.libraries];
      }
      return {
        libraries: updated,
        activeLibraryId: newLib.id
      };
    });

    return { 
      success: true, 
      message: `Successfully imported "${newLib.name}" with ${newLib.components.length} components and ${newLib.assemblies.length} assemblies.` 
    };
  },

  exportLibrary: (libraryId) => {
    const { libraries } = get();
    const lib = libraries.find(l => l.id === libraryId);
    if (!lib) return null;
    return exportLibraryToJson(lib);
  },

  addCustomComponent: (libraryId, template) => {
    // Register in engine catalog
    NETWORK_COMPONENT_CATALOG[template.type] = template;

    set((state) => {
      const updated = state.libraries.map(lib => {
        if (lib.id === libraryId) {
          return {
            ...lib,
            components: [...lib.components.filter(c => c.type !== template.type), template],
            updatedAt: new Date().toISOString()
          };
        }
        return lib;
      });
      return { libraries: updated };
    });
  },

  addAssembly: (libraryId, assembly) => {
    set((state) => {
      const updated = state.libraries.map(lib => {
        if (lib.id === libraryId) {
          return {
            ...lib,
            assemblies: [...lib.assemblies.filter(a => a.id !== assembly.id), assembly],
            updatedAt: new Date().toISOString()
          };
        }
        return lib;
      });
      return { libraries: updated };
    });
  },

  insertAssembly: (assembly, position) => {
    const { graph } = get();
    const basePos = position || { x: 300, y: 200 };
    const { nodes: newNodesList, connections: newConnsList } = instantiateAssembly(
      assembly,
      basePos,
      graph.designId
    );

    const mergedNodes = { ...graph.nodes };
    for (const n of newNodesList) {
      mergedNodes[n.id] = n;
    }

    const mergedConns = { ...graph.connections };
    for (const c of newConnsList) {
      mergedConns[c.id] = c;
    }

    const updatedGraph: EngineeringGraph = {
      ...graph,
      nodes: mergedNodes,
      connections: mergedConns,
      metadata: { ...graph.metadata, updatedAt: new Date().toISOString() }
    };

    set((state) => ({
      graph: updatedGraph,
      selectedNodeId: newNodesList[0]?.id || null,
      selectedConnectionId: null,
      ...pushSnapshot({ ...state, graph: updatedGraph })
    }));

    get().validate();
  },

  saveSelectionAsAssembly: (name, category, description, targetLibraryId) => {
    const { graph, selectedNodeId, libraries } = get();
    let selectedNodes: EngineeringComponent[] = [];
    let selectedConnections: EngineeringConnection[] = [];

    if (selectedNodeId && graph.nodes[selectedNodeId]) {
      // Find selected node and all directly connected nodes
      const relatedConns = Object.values(graph.connections).filter(
        c => c.sourceComponentId === selectedNodeId || c.targetComponentId === selectedNodeId
      );
      const connectedNodeIds = new Set<string>([selectedNodeId]);
      for (const c of relatedConns) {
        connectedNodeIds.add(c.sourceComponentId);
        connectedNodeIds.add(c.targetComponentId);
      }
      selectedNodes = Array.from(connectedNodeIds).map(id => graph.nodes[id]).filter(Boolean);
      selectedConnections = relatedConns;
    } else {
      // If nothing selected, use all nodes in graph
      selectedNodes = Object.values(graph.nodes);
      selectedConnections = Object.values(graph.connections);
    }

    if (selectedNodes.length === 0) return null;

    const assembly = createAssemblyFromSelection(name, category, description, selectedNodes, selectedConnections);

    // Save into targeted library or active library or create custom user library
    const libId = targetLibraryId || get().activeLibraryId || 'lib_user_custom';
    
    // Check if target library exists
    const libExists = libraries.some(l => l.id === libId);
    if (!libExists) {
      const customLib: ComponentLibrary = {
        id: libId,
        name: 'My Custom Hardware & Assemblies',
        category: 'User Custom',
        description: 'User created templates and modular assemblies',
        version: '1.0.0',
        author: 'Network Designer',
        isBuiltIn: false,
        components: [],
        assemblies: [assembly],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      set(state => ({
        libraries: [customLib, ...state.libraries],
        activeLibraryId: customLib.id
      }));
    } else {
      get().addAssembly(libId, assembly);
    }

    return assembly;
  },

  deleteLibrary: (libraryId) => {
    set((state) => {
      const target = state.libraries.find(l => l.id === libraryId);
      if (target?.isBuiltIn) return state; // Built-in libraries are protected

      const updated = state.libraries.filter(l => l.id !== libraryId);
      return {
        libraries: updated,
        activeLibraryId: updated[0]?.id || 'lib_cisco_enterprise'
      };
    });
  },

  deleteCustomComponent: (libraryId, componentType) => {
    set((state) => {
      const updated = state.libraries.map(lib => {
        if (lib.id === libraryId && !lib.isBuiltIn) {
          return {
            ...lib,
            components: lib.components.filter(c => c.type !== componentType),
            updatedAt: new Date().toISOString()
          };
        }
        return lib;
      });
      return { libraries: updated };
    });
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

  toggleDomainFlow: (domain) => {
    set((state) => {
      if (domain === 'DATA') return { showDataFlow: !state.showDataFlow };
      if (domain === 'ELECTRICITY') return { showElectricFlow: !state.showElectricFlow };
      if (domain === 'FLUID') return { showFluidFlow: !state.showFluidFlow };
      if (domain === 'VIDEO') return { showVideoFlow: !state.showVideoFlow };
      return state;
    });
  },

  loadSystemDesign: (type) => {
    let newGraph: EngineeringGraph;
    let projName = '';
    if (type === 'ELECTRICAL') {
      newGraph = generateElectricalFacilityTopology();
      projName = 'Critical Facility Electrical Distribution';
    } else if (type === 'PLUMBING') {
      newGraph = generateChilledWaterCoolingTopology();
      projName = 'Data Center Chilled Water & Liquid Cooling';
    } else if (type === 'MULTI_DOMAIN') {
      newGraph = generateMultiDomainSmartFacilityTopology();
      projName = 'Integrated Smart Facility (Data + Power + Water)';
    } else if (type === 'CCTV') {
      newGraph = generateWizardTopology({
        archetype: 'SECURITY_CCTV',
        projectName: 'Enterprise CCTV & Perimeter Security',
        subnetPrefix: '192.168.20',
        clientCount: 4,
        includeWifi: false,
        includeVoip: false,
        includeRedundancy: true
      });
      projName = 'Enterprise CCTV Surveillance System';
    } else {
      newGraph = createDemoSmallOfficeGraph();
      projName = 'Corporate HQ Network Blueprint';
    }

    set((state) => ({
      graph: newGraph,
      currentProjectId: newGraph.designId,
      currentProjectName: projName,
      selectedNodeId: null,
      selectedConnectionId: null,
      pendingPort: null,
      activePackets: [],
      isSimulating: true,
      viewport: { x: 40, y: 40, zoom: 0.8 },
      ...pushSnapshot({ ...state, graph: newGraph })
    }));
    get().validate();
  },

  injectFaultOrSurge: (type) => {
    if (type === 'PACKET_BURST') {
      get().triggerPacketBurst();
      return;
    }

    const { graph } = get();
    const conns = Object.values(graph.connections);
    const targetConns = conns.filter(c => type === 'POWER_SURGE' ? (c.domain === 'ELECTRICAL' || c.connectionType.includes('POWER')) : (c.domain === 'PLUMBING' || c.connectionType.includes('PIPE')));
    if (targetConns.length === 0) return;

    const surgePackets: SimulationPacket[] = targetConns.map(c => ({
      id: `surge_${c.id}_${Date.now()}`,
      sourceNodeId: c.sourceComponentId,
      targetNodeId: c.targetComponentId,
      currentEdgeId: c.id,
      progressPercent: 5,
      medium: type === 'POWER_SURGE' ? 'ELECTRICITY' : 'FLUID',
      protocol: type === 'POWER_SURGE' ? 'AC_400V' : 'CHILLED_WATER',
      value: type === 'POWER_SURGE' ? 55000 : 75,
      unit: type === 'POWER_SURGE' ? 'W' : 'L/s',
      label: type === 'POWER_SURGE' ? '⚡ SURGE 400V • 55kW' : '💧 PUMP SURGE 75 L/s',
      status: 'ACTIVE',
      color: type === 'POWER_SURGE' ? '#ef4444' : '#0284c7'
    }));

    set(state => ({ activePackets: [...state.activePackets, ...surgePackets] }));
  },

  tickSimulation: () => {
    const { graph, simulationTick, activePackets, telemetry } = get();
    
    // Continuously generate realistic domain flow particles across active connections
    let currentPackets = activePackets;
    if (currentPackets.length < 24) {
      currentPackets = spawnContinuousFlowPackets(graph, currentPackets);
    }

    const simState = stepNetworkSimulation(graph, {
      tick: simulationTick,
      packets: currentPackets,
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
  },
  // Project Management Implementations
  toggleProjectsModal: (open) => {
    set((state) => ({
      isProjectsModalOpen: open !== undefined ? open : !state.isProjectsModalOpen
    }));
  },

  setCurrentProjectName: (name) => {
    set((state) => ({
      currentProjectName: name,
      graph: {
        ...state.graph,
        name,
        metadata: { ...state.graph.metadata, updatedAt: new Date().toISOString() }
      },
      isProjectDirty: true
    }));
  },

  saveCurrentProject: (name, description) => {
    const { currentProjectId, currentProjectName, graph, savedProjects } = get();
    const projName = name || currentProjectName || graph.name;
    const now = new Date().toISOString();

    const deviceCount = Object.keys(graph.nodes).length;
    const connectionCount = Object.keys(graph.connections).length;
    const estimatedCost = Object.values(graph.nodes).reduce((s, n) => s + (n.costData?.unitCost || 0), 0);

    const existingIdx = savedProjects.findIndex(p => p.id === currentProjectId);
    let updated: SavedProject[];

    if (existingIdx >= 0) {
      const existing = savedProjects[existingIdx];
      const updatedProj: SavedProject = {
        ...existing,
        name: projName,
        description: description !== undefined ? description : existing.description,
        graph: JSON.parse(JSON.stringify(graph)),
        deviceCount,
        connectionCount,
        estimatedCost,
        updatedAt: now
      };
      updated = [...savedProjects];
      updated[existingIdx] = updatedProj;
    } else {
      const newProj: SavedProject = {
        id: currentProjectId || `proj_${Date.now()}`,
        name: projName,
        description: description || 'Visual Engineering Project',
        domain: graph.domain,
        graph: JSON.parse(JSON.stringify(graph)),
        deviceCount,
        connectionCount,
        estimatedCost,
        createdAt: now,
        updatedAt: now
      };
      updated = [newProj, ...savedProjects];
    }

    persistProjects(updated);
    set({
      savedProjects: updated,
      currentProjectName: projName,
      isProjectDirty: false
    });
  },

  saveAsNewProject: (name, description) => {
    const { graph, savedProjects } = get();
    const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const deviceCount = Object.keys(graph.nodes).length;
    const connectionCount = Object.keys(graph.connections).length;
    const estimatedCost = Object.values(graph.nodes).reduce((s, n) => s + (n.costData?.unitCost || 0), 0);

    const newGraph: EngineeringGraph = {
      ...graph,
      name,
      designId: newId,
      metadata: { ...graph.metadata, updatedAt: now }
    };

    const newProj: SavedProject = {
      id: newId,
      name,
      description: description || 'Custom Engineering Project',
      domain: newGraph.domain,
      graph: newGraph,
      deviceCount,
      connectionCount,
      estimatedCost,
      createdAt: now,
      updatedAt: now
    };

    const updated = [newProj, ...savedProjects];
    persistProjects(updated);

    set((state) => ({
      currentProjectId: newId,
      currentProjectName: name,
      savedProjects: updated,
      graph: newGraph,
      isProjectDirty: false,
      ...pushSnapshot({ ...state, graph: newGraph })
    }));
  },

  loadProject: (projectId) => {
    const { savedProjects } = get();
    const project = savedProjects.find(p => p.id === projectId);
    if (!project) return;

    const clonedGraph: EngineeringGraph = JSON.parse(JSON.stringify(project.graph));

    set((state) => ({
      graph: clonedGraph,
      currentProjectId: project.id,
      currentProjectName: project.name,
      selectedNodeId: null,
      selectedConnectionId: null,
      pendingPort: null,
      activePackets: [],
      isProjectsModalOpen: false,
      isProjectDirty: false,
      viewport: { x: 40, y: 40, zoom: 0.85 },
      ...pushSnapshot({ ...state, graph: clonedGraph })
    }));

    get().validate();
  },

  deleteProject: (projectId) => {
    const { savedProjects, currentProjectId } = get();
    if (savedProjects.length <= 1) return; // Keep at least one

    const updated = savedProjects.filter(p => p.id !== projectId);
    persistProjects(updated);

    if (currentProjectId === projectId) {
      // Switch to first available project
      const nextProj = updated[0];
      get().loadProject(nextProj.id);
    } else {
      set({ savedProjects: updated });
    }
  },

  duplicateProject: (projectId) => {
    const { savedProjects } = get();
    const original = savedProjects.find(p => p.id === projectId);
    if (!original) return;

    const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const clonedGraph: EngineeringGraph = JSON.parse(JSON.stringify(original.graph));
    clonedGraph.designId = newId;
    clonedGraph.name = `${original.name} (Copy)`;

    const duplicatedProj: SavedProject = {
      ...original,
      id: newId,
      name: `${original.name} (Copy)`,
      graph: clonedGraph,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [duplicatedProj, ...savedProjects];
    persistProjects(updated);
    set({ savedProjects: updated });
  },

  renameProject: (projectId, newName) => {
    const { savedProjects, currentProjectId } = get();
    const updated = savedProjects.map(p => {
      if (p.id === projectId) {
        return { ...p, name: newName, updatedAt: new Date().toISOString() };
      }
      return p;
    });

    persistProjects(updated);
    set((state) => ({
      savedProjects: updated,
      currentProjectName: currentProjectId === projectId ? newName : state.currentProjectName,
      graph: currentProjectId === projectId ? { ...state.graph, name: newName } : state.graph
    }));
  },

  createNewBlankProject: (name) => {
    const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const projName = name || 'Untitled Engineering Design';
    const now = new Date().toISOString();

    const blankGraph: EngineeringGraph = {
      schemaVersion: '1.0',
      designId: newId,
      name: projName,
      domain: 'NETWORK',
      nodes: {},
      connections: {},
      metadata: {
        createdAt: now,
        updatedAt: now,
        version: '1.0.0',
        author: 'Lead Network Engineer'
      }
    };

    const newProj: SavedProject = {
      id: newId,
      name: projName,
      description: 'Blank project canvas',
      domain: 'NETWORK',
      graph: blankGraph,
      deviceCount: 0,
      connectionCount: 0,
      estimatedCost: 0,
      createdAt: now,
      updatedAt: now
    };

    const { savedProjects } = get();
    const updated = [newProj, ...savedProjects];
    persistProjects(updated);

    set((state) => ({
      graph: blankGraph,
      currentProjectId: newId,
      currentProjectName: projName,
      savedProjects: updated,
      selectedNodeId: null,
      selectedConnectionId: null,
      pendingPort: null,
      activePackets: [],
      validationIssues: [],
      isProjectsModalOpen: false,
      isProjectDirty: false,
      viewport: { x: 100, y: 100, zoom: 1.0 },
      ...pushSnapshot({ ...state, graph: blankGraph })
    }));
  },

  importProjectFromFile: (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, message: 'Invalid JSON format' };
      }

      // Check if it's a SavedProject or an EngineeringGraph
      let graph: EngineeringGraph;
      let name = 'Imported Project';
      let description = 'Imported from JSON file';

      if (parsed.nodes && parsed.connections) {
        graph = parsed as EngineeringGraph;
        name = parsed.name || 'Imported Design';
      } else if (parsed.graph && parsed.graph.nodes) {
        graph = parsed.graph as EngineeringGraph;
        name = parsed.name || parsed.graph.name || 'Imported Design';
        description = parsed.description || description;
      } else {
        return { success: false, message: 'JSON does not contain a valid OmniFlow topology' };
      }

      const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const newProj: SavedProject = {
        id: newId,
        name,
        description,
        domain: graph.domain || 'NETWORK',
        graph,
        deviceCount: Object.keys(graph.nodes).length,
        connectionCount: Object.keys(graph.connections).length,
        estimatedCost: Object.values(graph.nodes).reduce((s, n) => s + (n.costData?.unitCost || 0), 0),
        createdAt: now,
        updatedAt: now
      };

      const { savedProjects } = get();
      const updated = [newProj, ...savedProjects];
      persistProjects(updated);

      set((state) => ({
        graph,
        currentProjectId: newId,
        currentProjectName: name,
        savedProjects: updated,
        isProjectsModalOpen: false,
        isProjectDirty: false,
        selectedNodeId: null,
        selectedConnectionId: null,
        ...pushSnapshot({ ...state, graph })
      }));

      get().validate();
      return { success: true, message: `Successfully imported "${name}" with ${newProj.deviceCount} devices.` };
    } catch (err) {
      return { success: false, message: `Failed to parse project JSON: ${(err as Error).message}` };
    }
  },

  exportProjectToFile: (projectId) => {
    const { savedProjects } = get();
    const proj = savedProjects.find(p => p.id === projectId);
    if (!proj) return;

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(proj, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${proj.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_v1.0.json`);
    dlAnchor.click();
  }
}));
