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
  ComponentPort,
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
  NETWORK_COMPONENT_CATALOG,
  FailoverTelemetry,
  FailoverScenarioId,
  createInitialFailoverTelemetry,
  stepFailoverSimulation
} from '@omniflow/network-engine';
import { createDemoSmallOfficeGraph } from '../seed/demoTopology';

export interface DesignRevision {
  id: string;
  version: string;
  timestamp: string;
  author: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'LOCKED';
  summary: string;
  nodeCount: number;
  connectionCount: number;
  totalCost: number;
  graphSnapshot: EngineeringGraph;
}

/**
 * Domain membership predicate — checks if an engineering component belongs to the given domain.
 *
 * Strategy:
 *  1. MULTI_DOMAIN mode → show everything
 *  2. MULTI_DOMAIN nodes (racks, shared infrastructure) → always visible in any domain view
 *  3. node.domain field is set by the factory from category — trust it first
 *  4. Fall back to type-keyword matching for legacy / user-created nodes without a proper domain tag
 */
export function isComponentInDomain(node: EngineeringComponent, domain: EngineeringDomain): boolean {
  // ── 1. Showing all domains: always visible ───────────────────────────────
  if (domain === 'MULTI_DOMAIN') return true;

  // ── 2. Shared infrastructure nodes are always visible in any domain view ──
  if (node.domain === 'MULTI_DOMAIN' || node.type === 'RACK_HYPERSCALE_42U') return true;

  // ── 3. Trust the domain field from the factory (set via category) ─────────
  //    Only fall through to keyword matching if node.domain is unexpected
  if (domain === 'NETWORK') {
    if (node.domain === 'NETWORK') return true;
    // Nodes from non-network domains must never bleed into network view
    if (node.domain === 'ELECTRICAL' || node.domain === 'SOLAR' || node.domain === 'PLUMBING' || node.domain === 'CCTV') return false;
    // Keyword fallback for any node lacking a proper domain tag
    const t = node.type.toUpperCase();
    const isElec = t.includes('TRANSFORMER') || t.includes('GENERATOR') || t.includes('UPS') || t.includes('PDU') || t.includes('ATS') || t.includes('SOLAR') || t.includes('INVERTER');
    const isPlumb = t.includes('CHILLER') || t.includes('PUMP') || t.includes('CRAH') || t.includes('WATER_') || t.includes('TANK') || t.includes('TOWER') || t.includes('VALVE');
    const isCctv = t.includes('_CAM') || t.includes('_NVR') || t.includes('CAMERA') || t.startsWith('NVR') || t.startsWith('DVR');
    return !isElec && !isPlumb && !isCctv;
  }

  if (domain === 'ELECTRICAL') {
    if (node.domain === 'ELECTRICAL') return true;
    if (node.domain === 'SOLAR') return true; // Solar is often wired alongside electrical
    if (node.domain === 'NETWORK' || node.domain === 'PLUMBING' || node.domain === 'CCTV') return false;
    const t = node.type.toUpperCase();
    return t.includes('TRANSFORMER') || t.includes('GENERATOR') || t.includes('UPS') || t.includes('PDU') || t.includes('ATS') || t.includes('SOLAR') || t.includes('INVERTER') || t.includes('BATTERY') || t.includes('GRID');
  }

  if (domain === 'SOLAR') {
    if (node.domain === 'SOLAR') return true;
    if (node.domain === 'NETWORK' || node.domain === 'PLUMBING' || node.domain === 'CCTV') return false;
    const t = node.type.toUpperCase();
    return t.includes('SOLAR') || t.includes('PV') || t.includes('INVERTER') || t.includes('BATTERY');
  }

  if (domain === 'PLUMBING') {
    if (node.domain === 'PLUMBING') return true;
    if (node.domain === 'NETWORK' || node.domain === 'ELECTRICAL' || node.domain === 'SOLAR' || node.domain === 'CCTV') return false;
    const t = node.type.toUpperCase();
    return t.includes('CHILLER') || t.includes('PUMP') || t.includes('CRAH') || t.includes('WATER_') || t.includes('TANK') || t.includes('COOLING') || t.includes('VALVE') || t.includes('TOWER');
  }

  if (domain === 'CCTV') {
    if (node.domain === 'CCTV') return true;
    if (node.domain === 'NETWORK' || node.domain === 'ELECTRICAL' || node.domain === 'SOLAR' || node.domain === 'PLUMBING') return false;
    const t = node.type.toUpperCase();
    // Use specific CCTV keywords — avoid matching ACCESS_POINT (network WiFi)
    return t.startsWith('CAM') || t.startsWith('NVR') || t.startsWith('DVR') || t.includes('_CAM') || t.includes('CAMERA') || t.includes('ACCESS_CTRL') || t.includes('ALARM') || t.includes('MOTION');
  }

  // Fallback: strict domain field match
  return node.domain === domain;
}

export interface GraphState {
  graph: EngineeringGraph;
  activeDomain: EngineeringDomain;
  domainFilterMode: 'ACTIVE_ONLY' | 'ALL_DOMAINS';
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  copiedNodeIds: string[];
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
  isQuickEditModalOpen: boolean;
  quickEditNodeId: string | null;
  isCliModalOpen: boolean;
  cliNodeId: string | null;

  // Milestone 3: Engineering Delivery & Governance Modals
  isDesignReportModalOpen: boolean;
  isVersionDiffModalOpen: boolean;
  isExportCenterModalOpen: boolean;
  isAnalyticsModalOpen: boolean;
  isFailoverModalOpen: boolean;
  isDigitalTwinModalOpen: boolean;
  failoverTelemetry: FailoverTelemetry;
  engineeringStatus: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'LOCKED';
  designRevisions: DesignRevision[];

  // Flow Visualisation & Pacing Tuning
  showPacketLabels: boolean;
  flowDensity: 'CALM' | 'BALANCED' | 'HIGH';

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
  simulationSpeed: number; // 0.25, 0.5, 1, 2
  simulationTick: number;
  activePackets: SimulationPacket[];
  telemetry: SimulationTelemetry;

  // History for Undo/Redo
  history: string[]; // JSON snapshot array
  historyIndex: number;

  // Actions
  setActiveDomain: (domain: EngineeringDomain) => void;
  setDomainFilterMode: (mode: 'ACTIVE_ONLY' | 'ALL_DOMAINS') => void;
  toggleDomainFilterMode: () => void;
  clearDomainComponents: (domain?: EngineeringDomain) => void;
  bulkSetComponentStatus: (status: 'ONLINE' | 'OFFLINE' | 'FAILED', targetIds?: string[]) => void;
  selectNodesByCondition: (condition: 'ALL' | 'DOMAIN' | 'OFFLINE' | 'FAILED' | 'ROUTERS' | 'SWITCHES' | 'POWER' | 'COOLING') => void;
  invertSelection: () => void;
  zoomToFitVisible: () => void;
  selectNode: (id: string | null, additive?: boolean) => void;
  selectConnection: (id: string | null) => void;
  selectNodes: (ids: string[], additive?: boolean) => void;
  selectAllNodes: () => void;
  clearSelection: () => void;
  addComponent: (type: string, position: { x: number; y: number }) => void;
  addComponentsBatch: (types: string[], basePosition: { x: number; y: number }, autoConnectMode?: 'none' | 'star' | 'daisy') => string[];
  moveComponent: (id: string, position: { x: number; y: number }) => void;
  moveComponentsBatch: (delta: { x: number; y: number }) => void;
  removeComponent: (id: string) => void;
  deleteSelectedComponents: () => void;
  duplicateComponent: (id: string, offset?: { x: number; y: number }) => string;
  duplicateSelectedComponents: (offset?: { x: number; y: number }) => void;
  connectSelectedNodes: (topology: 'star' | 'daisy' | 'mesh', cableType?: string) => void;
  alignSelectedNodes: (alignment: 'horizontal' | 'vertical' | 'grid' | 'alignLeft' | 'alignRight' | 'alignTop' | 'alignBottom' | 'distributeH' | 'distributeV' | 'pipeline') => void;
  copySelectedNodes: () => void;
  pasteCopiedNodes: (position?: { x: number; y: number }) => void;
  openQuickEditModal: (nodeId: string) => void;
  closeQuickEditModal: () => void;
  openCliModal: (nodeId?: string) => void;
  closeCliModal: () => void;
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

  // Milestone 3: Engineering Delivery Actions
  openDesignReportModal: () => void;
  closeDesignReportModal: () => void;
  openVersionDiffModal: () => void;
  closeVersionDiffModal: () => void;
  openExportCenterModal: () => void;
  closeExportCenterModal: () => void;
  openAnalyticsModal: () => void;
  closeAnalyticsModal: () => void;
  toggleAnalyticsModal: (open?: boolean) => void;
  openFailoverModal: () => void;
  closeFailoverModal: () => void;
  openDigitalTwinModal: () => void;
  closeDigitalTwinModal: () => void;
  toggleDigitalTwinModal: (open?: boolean) => void;
  selectFailoverScenario: (scenarioId: FailoverScenarioId) => void;
  toggleFailoverSimulation: (running?: boolean) => void;
  stepFailoverTick: (dtSec?: number) => void;
  resetFailoverSimulation: () => void;
  setEngineeringStatus: (status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'LOCKED') => void;
  createDesignRevision: (version: string, summary: string, author?: string) => void;
  revertToRevision: (revisionId: string) => void;

  // Flow Tuning Actions
  setShowPacketLabels: (show: boolean) => void;
  setFlowDensity: (density: 'CALM' | 'BALANCED' | 'HIGH') => void;

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
  domainFilterMode: 'ACTIVE_ONLY',
  selectedNodeId: null,
  selectedNodeIds: [],
  copiedNodeIds: [],
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
  isQuickEditModalOpen: false,
  quickEditNodeId: null,
  isCliModalOpen: false,
  cliNodeId: null,

  // Milestone 3: Engineering Delivery & Governance Modals
  isDesignReportModalOpen: false,
  isVersionDiffModalOpen: false,
  isExportCenterModalOpen: false,
  isAnalyticsModalOpen: false,
  isFailoverModalOpen: false,
  isDigitalTwinModalOpen: false,
  failoverTelemetry: createInitialFailoverTelemetry('GRID_OUTAGE_ATS_FAILOVER'),
  engineeringStatus: 'DRAFT',
  designRevisions: [
    {
      id: 'rev_v1_0',
      version: 'v1.0',
      timestamp: '2026-09-28 09:30:00',
      author: 'Lead Architect M. Chen',
      status: 'APPROVED',
      summary: 'Initial core backbone routing & perimeter firewall baseline.',
      nodeCount: 6,
      connectionCount: 5,
      totalCost: 18450,
      graphSnapshot: createDemoSmallOfficeGraph()
    },
    {
      id: 'rev_v1_1',
      version: 'v1.1',
      timestamp: '2026-10-01 14:15:00',
      author: 'Senior Systems Engineer D. Ross',
      status: 'IN_REVIEW',
      summary: 'Added PoE edge access switches, wireless access points & VoIP endpoints.',
      nodeCount: 11,
      connectionCount: 10,
      totalCost: 32680,
      graphSnapshot: initialProjects[0]?.graph || initialGraph
    }
  ],

  // Flow Visualisation & Pacing Tuning
  showPacketLabels: false,
  flowDensity: 'CALM',

  currentProjectId: initialProjects[0]?.id || 'proj_default',
  currentProjectName: initialProjects[0]?.name || 'Corporate HQ Network Blueprint',
  savedProjects: initialProjects,
  isProjectDirty: false,

  libraries: BUILTIN_LIBRARIES,
  activeLibraryId: 'lib_cisco_enterprise',

  isSimulating: true, // Default to true so flowing packets, electrical current, and fluids are immediately visible!
  simulationSpeed: 0.5, // Calm, smooth default visual flow speed
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

  setActiveDomain: (domain) => {
    const { graph, selectedNodeIds } = get();
    // Filter selection so we don't retain hidden selected nodes
    const validSelectedIds = selectedNodeIds.filter(id => {
      const node = graph.nodes[id];
      return node && isComponentInDomain(node, domain);
    });

    set({
      activeDomain: domain,
      selectedNodeIds: validSelectedIds,
      selectedNodeId: validSelectedIds.length === 1 ? validSelectedIds[0] : null
    });
  },

  setDomainFilterMode: (mode) => set({ domainFilterMode: mode }),
  toggleDomainFilterMode: () => set((state) => ({
    domainFilterMode: state.domainFilterMode === 'ACTIVE_ONLY' ? 'ALL_DOMAINS' : 'ACTIVE_ONLY'
  })),

  clearDomainComponents: (domain) => {
    const targetDomain = domain || get().activeDomain;
    const { graph } = get();
    const remainingNodes: Record<string, EngineeringComponent> = {};
    const removedNodeIds = new Set<string>();

    Object.values(graph.nodes).forEach(node => {
      if (isComponentInDomain(node, targetDomain)) {
        removedNodeIds.add(node.id);
      } else {
        remainingNodes[node.id] = node;
      }
    });

    const remainingConns: Record<string, EngineeringConnection> = {};
    Object.values(graph.connections).forEach(c => {
      if (!removedNodeIds.has(c.sourceComponentId) && !removedNodeIds.has(c.targetComponentId)) {
        remainingConns[c.id] = c;
      }
    });

    const updatedGraph: EngineeringGraph = {
      ...graph,
      nodes: remainingNodes,
      connections: remainingConns,
      metadata: { ...graph.metadata, updatedAt: new Date().toISOString() }
    };

    set((state) => ({
      graph: updatedGraph,
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedConnectionId: null,
      activePackets: [],
      ...pushSnapshot({ ...state, graph: updatedGraph })
    }));
    get().validate();
  },

  bulkSetComponentStatus: (status, targetIds) => {
    const { graph, selectedNodeIds, activeDomain, domainFilterMode } = get();
    const ids = targetIds && targetIds.length > 0 
      ? targetIds 
      : selectedNodeIds.length > 0 
        ? selectedNodeIds 
        : Object.values(graph.nodes)
            .filter(node => domainFilterMode === 'ALL_DOMAINS' || isComponentInDomain(node, activeDomain))
            .map(n => n.id);

    if (ids.length === 0) return;

    const updatedNodes = { ...graph.nodes };
    ids.forEach(id => {
      const node = updatedNodes[id];
      if (node) {
        updatedNodes[id] = {
          ...node,
          simulationState: {
            ...node.simulationState,
            status,
            isFailed: status === 'FAILED' || status === 'OFFLINE'
          }
        };
      }
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
    get().validate();
  },

  selectNodesByCondition: (condition) => {
    const { graph, activeDomain, domainFilterMode } = get();
    const visibleNodes = Object.values(graph.nodes).filter(node => 
      domainFilterMode === 'ALL_DOMAINS' || isComponentInDomain(node, activeDomain)
    );

    let matched: EngineeringComponent[] = [];
    if (condition === 'ALL') {
      matched = visibleNodes;
    } else if (condition === 'DOMAIN') {
      matched = Object.values(graph.nodes).filter(n => isComponentInDomain(n, activeDomain));
    } else if (condition === 'OFFLINE' || condition === 'FAILED') {
      matched = visibleNodes.filter(n => n.simulationState.isFailed || n.simulationState.status === 'FAILED' || n.simulationState.status === 'OFFLINE');
    } else if (condition === 'ROUTERS') {
      matched = visibleNodes.filter(n => n.type.includes('ROUTER') || n.type.includes('GATEWAY') || n.type.includes('FIREWALL'));
    } else if (condition === 'SWITCHES') {
      matched = visibleNodes.filter(n => n.type.includes('SWITCH') || n.type.includes('HUB') || n.type.includes('PDU'));
    } else if (condition === 'POWER') {
      matched = visibleNodes.filter(n => isComponentInDomain(n, 'ELECTRICAL') || isComponentInDomain(n, 'SOLAR'));
    } else if (condition === 'COOLING') {
      matched = visibleNodes.filter(n => isComponentInDomain(n, 'PLUMBING'));
    }

    const ids = matched.map(n => n.id);
    set({
      selectedNodeIds: ids,
      selectedNodeId: ids.length === 1 ? ids[0] : null
    });
  },

  invertSelection: () => {
    const { graph, selectedNodeIds, activeDomain, domainFilterMode } = get();
    const visibleNodes = Object.values(graph.nodes).filter(node => 
      domainFilterMode === 'ALL_DOMAINS' || isComponentInDomain(node, activeDomain)
    );
    const selectedSet = new Set(selectedNodeIds);
    const inverted = visibleNodes.filter(n => !selectedSet.has(n.id)).map(n => n.id);
    set({
      selectedNodeIds: inverted,
      selectedNodeId: inverted.length === 1 ? inverted[0] : null
    });
  },

  zoomToFitVisible: () => {
    const { graph, activeDomain, domainFilterMode } = get();
    const visibleNodes = Object.values(graph.nodes).filter(node => 
      domainFilterMode === 'ALL_DOMAINS' || isComponentInDomain(node, activeDomain)
    );
    if (visibleNodes.length === 0) {
      set({ viewport: { x: 50, y: 50, zoom: 0.9 } });
      return;
    }

    const minX = Math.min(...visibleNodes.map(n => n.position.x));
    const maxX = Math.max(...visibleNodes.map(n => n.position.x + (n.dimensions?.width || 180)));
    const minY = Math.min(...visibleNodes.map(n => n.position.y));
    const maxY = Math.max(...visibleNodes.map(n => n.position.y + (n.dimensions?.height || 110)));

    const width = maxX - minX + 160;
    const height = maxY - minY + 160;

    const vpW = typeof window !== 'undefined' ? window.innerWidth - 300 - 320 : 1000;
    const vpH = typeof window !== 'undefined' ? window.innerHeight - 52 - 28 : 700;

    const zoom = Math.min(1.2, Math.max(0.4, Math.min(vpW / width, vpH / height)));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const targetX = Math.round(vpW / 2 - centerX * zoom);
    const targetY = Math.round(vpH / 2 - centerY * zoom);

    set({ viewport: { x: targetX, y: targetY, zoom } });
  },

  selectNode: (id, additive = false) => {
    set((state) => {
      if (!id) {
        return { selectedNodeId: null, selectedNodeIds: [], selectedConnectionId: null };
      }
      if (additive) {
        const setIds = new Set(state.selectedNodeIds);
        if (setIds.has(id)) {
          setIds.delete(id);
        } else {
          setIds.add(id);
        }
        const updated = Array.from(setIds);
        return {
          selectedNodeIds: updated,
          selectedNodeId: updated[0] || null,
          selectedConnectionId: null
        };
      }
      return {
        selectedNodeId: id,
        selectedNodeIds: [id],
        selectedConnectionId: null
      };
    });
  },

  selectNodes: (ids, additive = false) => {
    set((state) => {
      const newIds = additive ? Array.from(new Set([...state.selectedNodeIds, ...ids])) : ids;
      return {
        selectedNodeIds: newIds,
        selectedNodeId: newIds[0] || null,
        selectedConnectionId: null
      };
    });
  },

  selectAllNodes: () => {
    set((state) => {
      const allIds = Object.keys(state.graph.nodes);
      return {
        selectedNodeIds: allIds,
        selectedNodeId: allIds[0] || null,
        selectedConnectionId: null
      };
    });
  },

  clearSelection: () => {
    set({
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedConnectionId: null
    });
  },

  openQuickEditModal: (nodeId) => set({ isQuickEditModalOpen: true, quickEditNodeId: nodeId }),
  closeQuickEditModal: () => set({ isQuickEditModalOpen: false, quickEditNodeId: null }),

  selectConnection: (id: string | null) => set({ selectedConnectionId: id, selectedNodeId: null, selectedNodeIds: [] }),

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
      selectedNodeIds: [newComponent.id],
      selectedConnectionId: null,
      ...pushSnapshot({ ...state, graph: updatedGraph })
    }));

    get().validate();
  },

  addComponentsBatch: (types, basePosition, autoConnectMode = 'none') => {
    const { graph } = get();
    const createdIds: string[] = [];
    const newNodes = { ...graph.nodes };
    const cols = Math.min(3, Math.max(2, Math.ceil(Math.sqrt(types.length))));
    const spacingX = 260;
    const spacingY = 160;

    types.forEach((type, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const pos = {
        x: basePosition.x + col * spacingX,
        y: basePosition.y + row * spacingY
      };
      const comp = createComponentInstance(type, graph.designId, pos);
      newNodes[comp.id] = comp;
      createdIds.push(comp.id);
    });

    const newConnections = { ...graph.connections };
    const isPortFree = (port: ComponentPort) => 
      !port.occupiedByConnectionId && !Object.values(newConnections).some(c => c.sourcePortId === port.id || c.targetPortId === port.id);

    if (autoConnectMode === 'star' && createdIds.length >= 2) {
      const coreNode = newNodes[createdIds[0]];
      for (let i = 1; i < createdIds.length; i++) {
        const targetNode = newNodes[createdIds[i]];
        const srcPort = coreNode.ports.find(isPortFree);
        const tgtPort = targetNode.ports.find(isPortFree);
        if (srcPort && tgtPort) {
          const comp = checkPortCompatibility(srcPort, tgtPort);
          if (comp.compatible) {
            const conn = createConnectionInstance(
              graph.designId,
              coreNode.id,
              srcPort.id,
              targetNode.id,
              tgtPort.id,
              comp.recommendedCable || 'CAT6',
              15
            );
            newConnections[conn.id] = conn;
          }
        }
      }
    } else if (autoConnectMode === 'daisy' && createdIds.length >= 2) {
      for (let i = 0; i < createdIds.length - 1; i++) {
        const srcNode = newNodes[createdIds[i]];
        const tgtNode = newNodes[createdIds[i + 1]];
        const srcPort = srcNode.ports.find(isPortFree);
        const tgtPort = tgtNode.ports.find(isPortFree);
        if (srcPort && tgtPort) {
          const comp = checkPortCompatibility(srcPort, tgtPort);
          if (comp.compatible) {
            const conn = createConnectionInstance(
              graph.designId,
              srcNode.id,
              srcPort.id,
              tgtNode.id,
              tgtPort.id,
              comp.recommendedCable || 'CAT6',
              15
            );
            newConnections[conn.id] = conn;
          }
        }
      }
    }

    const updatedGraph: EngineeringGraph = {
      ...graph,
      nodes: newNodes,
      connections: newConnections,
      metadata: { ...graph.metadata, updatedAt: new Date().toISOString() }
    };

    set((state) => ({
      graph: updatedGraph,
      selectedNodeIds: createdIds,
      selectedNodeId: createdIds[0] || null,
      selectedConnectionId: null,
      ...pushSnapshot({ ...state, graph: updatedGraph })
    }));

    get().validate();
    return createdIds;
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

  moveComponentsBatch: (delta) => {
    set((state) => {
      const updatedNodes = { ...state.graph.nodes };
      let changed = false;
      for (const id of state.selectedNodeIds) {
        const node = updatedNodes[id];
        if (node) {
          updatedNodes[id] = {
            ...node,
            position: {
              x: Math.max(20, node.position.x + delta.x),
              y: Math.max(20, node.position.y + delta.y)
            }
          };
          changed = true;
        }
      }
      if (!changed) return state;
      return {
        graph: {
          ...state.graph,
          nodes: updatedNodes
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
      selectedNodeIds: state.selectedNodeIds.filter(nid => nid !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      ...pushSnapshot({ ...state, graph: updatedGraph })
    }));

    get().validate();
  },

  deleteSelectedComponents: () => {
    const { graph, selectedNodeIds } = get();
    if (selectedNodeIds.length === 0) return;

    const targetIds = new Set(selectedNodeIds);
    const remainingNodes: Record<string, EngineeringComponent> = {};
    for (const [id, node] of Object.entries(graph.nodes)) {
      if (!targetIds.has(id)) {
        remainingNodes[id] = node;
      }
    }

    const remainingConnections: Record<string, EngineeringConnection> = {};
    for (const [id, conn] of Object.entries(graph.connections)) {
      if (!targetIds.has(conn.sourceComponentId) && !targetIds.has(conn.targetComponentId)) {
        remainingConnections[id] = conn;
      }
    }

    const updatedGraph: EngineeringGraph = {
      ...graph,
      nodes: remainingNodes,
      connections: remainingConnections,
      metadata: { ...graph.metadata, updatedAt: new Date().toISOString() }
    };

    set((state) => ({
      graph: updatedGraph,
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedConnectionId: null,
      ...pushSnapshot({ ...state, graph: updatedGraph })
    }));

    get().validate();
  },

  duplicateComponent: (id, offset = { x: 50, y: 50 }) => {
    const { graph } = get();
    const original = graph.nodes[id];
    if (!original) return '';

    const newPosition = {
      x: original.position.x + offset.x,
      y: original.position.y + offset.y
    };
    const cloned = createComponentInstance(
      original.type,
      graph.designId,
      newPosition,
      `${original.tag}_COPY`
    );
    cloned.properties = { ...original.properties };
    if (original.domain) cloned.domain = original.domain;

    const newNodes = {
      ...graph.nodes,
      [cloned.id]: cloned
    };

    const updatedGraph: EngineeringGraph = {
      ...graph,
      nodes: newNodes,
      metadata: { ...graph.metadata, updatedAt: new Date().toISOString() }
    };

    set((state) => ({
      graph: updatedGraph,
      selectedNodeId: cloned.id,
      selectedNodeIds: [cloned.id],
      ...pushSnapshot({ ...state, graph: updatedGraph })
    }));

    get().validate();
    return cloned.id;
  },

  duplicateSelectedComponents: (offset = { x: 60, y: 60 }) => {
    const { graph, selectedNodeIds } = get();
    if (selectedNodeIds.length === 0) return;

    const idMap: Record<string, string> = {};
    const newNodes: Record<string, EngineeringComponent> = { ...graph.nodes };
    const newlyCreatedIds: string[] = [];

    for (const id of selectedNodeIds) {
      const orig = graph.nodes[id];
      if (!orig) continue;
      const cloned = createComponentInstance(
        orig.type,
        graph.designId,
        { x: orig.position.x + offset.x, y: orig.position.y + offset.y },
        `${orig.tag}_COPY`
      );
      cloned.properties = { ...orig.properties };
      if (orig.domain) cloned.domain = orig.domain;
      idMap[id] = cloned.id;
      newNodes[cloned.id] = cloned;
      newlyCreatedIds.push(cloned.id);
    }

    const newConnections: Record<string, EngineeringConnection> = { ...graph.connections };
    for (const conn of Object.values(graph.connections)) {
      if (idMap[conn.sourceComponentId] && idMap[conn.targetComponentId]) {
        const srcNode = newNodes[idMap[conn.sourceComponentId]];
        const tgtNode = newNodes[idMap[conn.targetComponentId]];
        const origSrc = graph.nodes[conn.sourceComponentId];
        const origTgt = graph.nodes[conn.targetComponentId];
        const srcPortIdx = origSrc.ports.findIndex(p => p.id === conn.sourcePortId);
        const tgtPortIdx = origTgt.ports.findIndex(p => p.id === conn.targetPortId);
        if (srcPortIdx >= 0 && tgtPortIdx >= 0 && srcNode.ports[srcPortIdx] && tgtNode.ports[tgtPortIdx]) {
          const clonedConn = createConnectionInstance(
            graph.designId,
            srcNode.id,
            srcNode.ports[srcPortIdx].id,
            tgtNode.id,
            tgtNode.ports[tgtPortIdx].id,
            conn.connectionType,
            conn.lengthMeters
          );
          newConnections[clonedConn.id] = clonedConn;
        }
      }
    }

    const updatedGraph: EngineeringGraph = {
      ...graph,
      nodes: newNodes,
      connections: newConnections,
      metadata: { ...graph.metadata, updatedAt: new Date().toISOString() }
    };

    set((state) => ({
      graph: updatedGraph,
      selectedNodeIds: newlyCreatedIds,
      selectedNodeId: newlyCreatedIds[0] || null,
      ...pushSnapshot({ ...state, graph: updatedGraph })
    }));

    get().validate();
  },

  connectSelectedNodes: (topology, cableType) => {
    const { graph, selectedNodeIds } = get();
    if (selectedNodeIds.length < 2) return;
    const newConnections = { ...graph.connections };
    const nodes = selectedNodeIds.map(id => graph.nodes[id]).filter(Boolean);
    const isPortFree = (port: ComponentPort) => 
      !port.occupiedByConnectionId && !Object.values(newConnections).some(c => c.sourcePortId === port.id || c.targetPortId === port.id);

    if (topology === 'star') {
      const center = nodes[0];
      for (let i = 1; i < nodes.length; i++) {
        const target = nodes[i];
        const srcPort = center.ports.find(isPortFree);
        const tgtPort = target.ports.find(isPortFree);
        if (srcPort && tgtPort) {
          const comp = checkPortCompatibility(srcPort, tgtPort);
          if (comp.compatible) {
            const conn = createConnectionInstance(
              graph.designId,
              center.id,
              srcPort.id,
              target.id,
              tgtPort.id,
              cableType || comp.recommendedCable || 'CAT6',
              15
            );
            newConnections[conn.id] = conn;
          }
        }
      }
    } else if (topology === 'daisy') {
      for (let i = 0; i < nodes.length - 1; i++) {
        const src = nodes[i];
        const tgt = nodes[i + 1];
        const srcPort = src.ports.find(isPortFree);
        const tgtPort = tgt.ports.find(isPortFree);
        if (srcPort && tgtPort) {
          const comp = checkPortCompatibility(srcPort, tgtPort);
          if (comp.compatible) {
            const conn = createConnectionInstance(
              graph.designId,
              src.id,
              srcPort.id,
              tgt.id,
              tgtPort.id,
              cableType || comp.recommendedCable || 'CAT6',
              15
            );
            newConnections[conn.id] = conn;
          }
        }
      }
    } else if (topology === 'mesh') {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const src = nodes[i];
          const tgt = nodes[j];
          const srcPort = src.ports.find(isPortFree);
          const tgtPort = tgt.ports.find(isPortFree);
          if (srcPort && tgtPort) {
            const comp = checkPortCompatibility(srcPort, tgtPort);
            if (comp.compatible) {
              const conn = createConnectionInstance(
                graph.designId,
                src.id,
                srcPort.id,
                tgt.id,
                tgtPort.id,
                cableType || comp.recommendedCable || 'CAT6',
                15
              );
              newConnections[conn.id] = conn;
            }
          }
        }
      }
    }

    const updatedGraph: EngineeringGraph = {
      ...graph,
      connections: newConnections,
      metadata: { ...graph.metadata, updatedAt: new Date().toISOString() }
    };

    set((state) => ({
      graph: updatedGraph,
      ...pushSnapshot({ ...state, graph: updatedGraph })
    }));

    get().validate();
  },

  alignSelectedNodes: (alignment) => {
    const { graph, selectedNodeIds, activeDomain, domainFilterMode } = get();
    let nodesToAlign = selectedNodeIds.map(id => graph.nodes[id]).filter(Boolean);
    if (nodesToAlign.length < 2) {
      nodesToAlign = Object.values(graph.nodes).filter(node => 
        domainFilterMode === 'ALL_DOMAINS' || isComponentInDomain(node, activeDomain)
      );
    }
    if (nodesToAlign.length < 2) return;
    const updatedNodes = { ...graph.nodes };

    if (alignment === 'horizontal') {
      const avgY = Math.round(nodesToAlign.reduce((acc, n) => acc + n.position.y, 0) / nodesToAlign.length);
      nodesToAlign.forEach(n => {
        updatedNodes[n.id] = { ...n, position: { ...n.position, y: avgY } };
      });
    } else if (alignment === 'vertical') {
      const avgX = Math.round(nodesToAlign.reduce((acc, n) => acc + n.position.x, 0) / nodesToAlign.length);
      nodesToAlign.forEach(n => {
        updatedNodes[n.id] = { ...n, position: { ...n.position, x: avgX } };
      });
    } else if (alignment === 'alignLeft') {
      const minX = Math.min(...nodesToAlign.map(n => n.position.x));
      nodesToAlign.forEach(n => {
        updatedNodes[n.id] = { ...n, position: { ...n.position, x: minX } };
      });
    } else if (alignment === 'alignRight') {
      const maxX = Math.max(...nodesToAlign.map(n => n.position.x));
      nodesToAlign.forEach(n => {
        updatedNodes[n.id] = { ...n, position: { ...n.position, x: maxX } };
      });
    } else if (alignment === 'alignTop') {
      const minY = Math.min(...nodesToAlign.map(n => n.position.y));
      nodesToAlign.forEach(n => {
        updatedNodes[n.id] = { ...n, position: { ...n.position, y: minY } };
      });
    } else if (alignment === 'alignBottom') {
      const maxY = Math.max(...nodesToAlign.map(n => n.position.y));
      nodesToAlign.forEach(n => {
        updatedNodes[n.id] = { ...n, position: { ...n.position, y: maxY } };
      });
    } else if (alignment === 'distributeH') {
      const sorted = [...nodesToAlign].sort((a, b) => a.position.x - b.position.x);
      const minX = sorted[0].position.x;
      const maxX = sorted[sorted.length - 1].position.x;
      const step = (maxX - minX) / (sorted.length - 1 || 1);
      sorted.forEach((n, i) => {
        updatedNodes[n.id] = { ...n, position: { ...n.position, x: Math.round(minX + i * step) } };
      });
    } else if (alignment === 'distributeV') {
      const sorted = [...nodesToAlign].sort((a, b) => a.position.y - b.position.y);
      const minY = sorted[0].position.y;
      const maxY = sorted[sorted.length - 1].position.y;
      const step = (maxY - minY) / (sorted.length - 1 || 1);
      sorted.forEach((n, i) => {
        updatedNodes[n.id] = { ...n, position: { ...n.position, y: Math.round(minY + i * step) } };
      });
    } else if (alignment === 'pipeline') {
      const sorted = [...nodesToAlign].sort((a, b) => a.position.x - b.position.x);
      const startX = Math.min(...nodesToAlign.map(n => n.position.x));
      const centerY = Math.round(nodesToAlign.reduce((acc, n) => acc + n.position.y, 0) / nodesToAlign.length);
      sorted.forEach((n, i) => {
        updatedNodes[n.id] = {
          ...n,
          position: { x: startX + i * 260, y: centerY }
        };
      });
    } else if (alignment === 'grid') {
      const minX = Math.min(...nodesToAlign.map(n => n.position.x));
      const minY = Math.min(...nodesToAlign.map(n => n.position.y));
      const cols = Math.ceil(Math.sqrt(nodesToAlign.length));
      nodesToAlign.forEach((n, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        updatedNodes[n.id] = {
          ...n,
          position: { x: minX + col * 260, y: minY + row * 160 }
        };
      });
    }

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

  copySelectedNodes: () => {
    const { selectedNodeIds } = get();
    set({ copiedNodeIds: [...selectedNodeIds] });
  },

  pasteCopiedNodes: (position) => {
    const { copiedNodeIds } = get();
    if (copiedNodeIds.length === 0) return;
    get().duplicateSelectedComponents(position ? { x: 40, y: 40 } : { x: 50, y: 50 });
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
    const { graph, selectedNodeIds, selectedNodeId, libraries } = get();
    let selectedNodes: EngineeringComponent[] = [];
    let selectedConnections: EngineeringConnection[] = [];

    if (selectedNodeIds && selectedNodeIds.length > 0) {
      const idSet = new Set(selectedNodeIds);
      selectedNodes = selectedNodeIds.map(id => graph.nodes[id]).filter(Boolean);
      selectedConnections = Object.values(graph.connections).filter(
        c => idSet.has(c.sourceComponentId) && idSet.has(c.targetComponentId)
      );
    } else if (selectedNodeId && graph.nodes[selectedNodeId]) {
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

  openCliModal: (nodeId) => {
    const targetId = nodeId || get().selectedNodeId;
    set({ isCliModalOpen: true, cliNodeId: targetId });
  },

  closeCliModal: () => {
    set({ isCliModalOpen: false, cliNodeId: null });
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

  // Milestone 3: Engineering Delivery Actions
  openDesignReportModal: () => set({ isDesignReportModalOpen: true }),
  closeDesignReportModal: () => set({ isDesignReportModalOpen: false }),
  openVersionDiffModal: () => set({ isVersionDiffModalOpen: true }),
  closeVersionDiffModal: () => set({ isVersionDiffModalOpen: false }),
  openExportCenterModal: () => set({ isExportCenterModalOpen: true }),
  closeExportCenterModal: () => set({ isExportCenterModalOpen: false }),
  openAnalyticsModal: () => set({ isAnalyticsModalOpen: true }),
  closeAnalyticsModal: () => set({ isAnalyticsModalOpen: false }),
  toggleAnalyticsModal: (open) => set((state) => ({ isAnalyticsModalOpen: open !== undefined ? open : !state.isAnalyticsModalOpen })),
  openFailoverModal: () => set({ isFailoverModalOpen: true }),
  closeFailoverModal: () => set((state) => ({ 
    isFailoverModalOpen: false, 
    failoverTelemetry: { ...state.failoverTelemetry, isRunning: false } 
  })),
  openDigitalTwinModal: () => set({ isDigitalTwinModalOpen: true }),
  closeDigitalTwinModal: () => set({ isDigitalTwinModalOpen: false }),
  toggleDigitalTwinModal: (open) => set((state) => ({
    isDigitalTwinModalOpen: open !== undefined ? open : !state.isDigitalTwinModalOpen
  })),
  selectFailoverScenario: (scenarioId) => set({
    failoverTelemetry: createInitialFailoverTelemetry(scenarioId)
  }),
  toggleFailoverSimulation: (running) => set((state) => ({
    failoverTelemetry: {
      ...state.failoverTelemetry,
      isRunning: running !== undefined ? running : !state.failoverTelemetry.isRunning
    }
  })),
  stepFailoverTick: (dtSec = 1.0) => {
    const { graph, failoverTelemetry } = get();
    const { telemetry: nextTel, graphUpdated } = stepFailoverSimulation(graph, failoverTelemetry, dtSec);
    if (graphUpdated) {
      set({ failoverTelemetry: nextTel, graph: { ...graph } });
    } else {
      set({ failoverTelemetry: nextTel });
    }
  },
  resetFailoverSimulation: () => {
    const { graph, failoverTelemetry } = get();
    for (const node of Object.values(graph.nodes)) {
      node.simulationState.isFailed = false;
    }
    for (const conn of Object.values(graph.connections)) {
      conn.simulationState.isFailed = false;
    }
    set({
      graph: { ...graph },
      failoverTelemetry: createInitialFailoverTelemetry(failoverTelemetry.scenarioId)
    });
  },
  setEngineeringStatus: (status) => set({ engineeringStatus: status }),
  createDesignRevision: (version, summary, author = 'Design Engineer') => {
    const { graph, designRevisions } = get();
    const nodeCount = Object.keys(graph.nodes).length;
    const connectionCount = Object.keys(graph.connections).length;
    let totalCost = 0;
    for (const node of Object.values(graph.nodes)) {
      totalCost += Number(node.costData?.unitCost || 500);
    }
    for (const conn of Object.values(graph.connections)) {
      const cableCostPerMeter = CABLE_CATALOG[conn.connectionType]?.costPerMeter || 2.5;
      totalCost += Math.round(conn.lengthMeters * cableCostPerMeter);
    }
    const newRev: DesignRevision = {
      id: `rev_${Date.now()}`,
      version,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      author,
      status: 'IN_REVIEW',
      summary,
      nodeCount,
      connectionCount,
      totalCost,
      graphSnapshot: JSON.parse(JSON.stringify(graph))
    };
    set({ designRevisions: [newRev, ...designRevisions] });
  },
  revertToRevision: (revisionId) => {
    const { designRevisions } = get();
    const rev = designRevisions.find((r) => r.id === revisionId);
    if (rev) {
      set({
        graph: JSON.parse(JSON.stringify(rev.graphSnapshot)),
        selectedNodeId: null,
        selectedNodeIds: [],
        selectedConnectionId: null,
        engineeringStatus: rev.status
      });
    }
  },

  // Flow Tuning Actions
  setShowPacketLabels: (show) => set({ showPacketLabels: show }),
  setFlowDensity: (density) => set({ flowDensity: density }),

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
