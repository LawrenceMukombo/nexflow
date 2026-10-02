export type EngineeringDomain = 
  | 'NETWORK' 
  | 'ELECTRICAL' 
  | 'PLUMBING' 
  | 'SOLAR' 
  | 'CCTV' 
  | 'MULTI_DOMAIN';

export type PortDirection = 'input' | 'output' | 'bidirectional';

export interface ComponentPort {
  id: string;
  nodeId: string;
  name: string;
  portIndex: number;
  type: string;                  // 'RJ45' | 'FIBER_LC' | 'AC_TERMINAL' | 'PIPE_THREAD' | 'DC_POLE'
  direction: PortDirection;
  capacity?: number;             // Bandwidth in Mbps, current limit in A, flow in L/s
  unit?: string;                 // 'Mbps', 'Gbps', 'A', 'V', 'PSI', 'L/s'
  compatiblePortTypes: string[];
  occupiedByConnectionId?: string | null;
  properties: Record<string, unknown>; // Subnet, IP, PoE budget, Pressure rating, etc.
}

export interface CostData {
  partNumber?: string;
  manufacturer?: string;
  supplier?: string;
  unitCost: number;
  labourCost: number;
  currency: string;
}

export interface ComponentSimulationState {
  status: 'ONLINE' | 'DEGRADED' | 'FAILED' | 'OFFLINE';
  isFailed?: boolean;
  loadPercent?: number;
  telemetry: Record<string, number | string | boolean>;
}

export interface EngineeringComponent {
  id: string;
  designId: string;
  domain: EngineeringDomain;
  type: string;                  // e.g. 'ISP_FEED', 'ROUTER_L3', 'SWITCH_POE_24', 'SERVER_APP'
  name: string;
  tag: string;                   // 'ISP-01', 'RTR-CORE', 'SW-ACC-01', 'PC-24'
  description?: string;
  position: { x: number; y: number };
  dimensions?: { width: number; height: number };
  ports: ComponentPort[];
  properties: Record<string, unknown>;
  costData?: CostData;
  simulationState: ComponentSimulationState;
  metadata?: Record<string, unknown>;
}

export interface ConnectionSimulationState {
  flowRate?: number;             // Current active data rate (Mbps) or fluid flow or current
  saturationPercent?: number;    // 0 - 100%
  packetLossPercent?: number;    // 0 - 100%
  latencyMs?: number;
  voltageDrop?: number;
  headLossMeters?: number;
  isCongested?: boolean;
  isFailed?: boolean;
}

export interface EngineeringConnection {
  id: string;
  designId: string;
  domain: EngineeringDomain;
  sourceComponentId: string;
  sourcePortId: string;
  targetComponentId: string;
  targetPortId: string;
  connectionType: string;        // 'CAT6', 'CAT6A', 'FIBER_SM', 'FIBER_MM', 'COPPER_AWG12'
  lengthMeters: number;
  properties: Record<string, unknown>;
  simulationState: ConnectionSimulationState;
}

export interface EngineeringGraph {
  schemaVersion: string;
  designId: string;
  name: string;
  domain: EngineeringDomain;
  nodes: Record<string, EngineeringComponent>;
  connections: Record<string, EngineeringConnection>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    author?: string;
  };
}

export type ValidationSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  ruleCode: string;
  title: string;
  message: string;
  affectedNodeIds: string[];
  affectedConnectionIds: string[];
  suggestedFix?: string;
}

export type FlowMedium = 'DATA' | 'ELECTRICITY' | 'FLUID' | 'VIDEO' | 'SOLAR';

export interface SimulationPacket {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  currentEdgeId: string;
  progressPercent: number; // 0 to 100
  medium?: FlowMedium;
  protocol?: 'ICMP' | 'HTTP' | 'DNS' | 'TCP' | 'UDP' | 'AC_400V' | 'AC_230V' | 'DC_48V' | 'CHILLED_WATER' | 'WATER' | 'RTSP' | 'SOLAR_DC' | string;
  sizeBytes?: number;
  value?: number;          // e.g. Watts (3500W), Amps (15.2A), Flow (4.5 L/s), PSI (55 PSI)
  unit?: string;           // 'W', 'kW', 'A', 'V', 'L/s', 'GPM', 'PSI', 'KB'
  label?: string;          // Human-readable flow label e.g. "230V • 14.2A", "3.8 L/s • 7°C", "TCP 1500B"
  status: 'ACTIVE' | 'CONGESTED' | 'FAILED' | 'DELIVERED';
  color?: string;
  pdu?: PduDetails;
  isEnvelope?: boolean;
}

export interface PduLayerDetail {
  layer: number; // 1 to 7
  layerName: string; // e.g. "Physical", "Data Link", "Network", "Transport", "Application"
  description: string;
}

export interface PduDetails {
  packetId: string;
  sourceTag: string;
  targetTag: string;
  currentDeviceTag: string;
  protocol: 'ICMP' | 'ARP' | 'HTTP' | 'DNS' | 'TCP' | 'DHCP' | 'UDP' | string;
  inLayers: PduLayerDetail[];
  outLayers: PduLayerDetail[];
  ethernetHeader: {
    preamble: string;
    destMac: string;
    srcMac: string;
    typeHex: string;
  };
  ipHeader: {
    version: number;
    ihl: number;
    tos: string;
    totalLengthBytes: number;
    id: number;
    flags: string;
    ttl: number;
    protocolNum: number;
    checksum: string;
    srcIp: string;
    destIp: string;
  };
  payloadHeader?: {
    type: string;
    srcPort?: number;
    destPort?: number;
    seqNum?: number;
    ackNum?: number;
    flags?: string;
    icmpType?: number;
    icmpCode?: number;
    info: string;
  };
}

export interface SimulationEvent {
  id: string;
  timeSec: number;
  lastDeviceTag: string;
  atDeviceTag: string;
  type: 'ICMP' | 'ARP' | 'HTTP' | 'DNS' | 'TCP' | 'DHCP' | 'UDP' | string;
  info: string;
  status: 'SENT' | 'FORWARDED' | 'RECEIVED' | 'DROPPED' | 'REPLY';
  color: string;
  pdu: PduDetails;
}

export interface PacketTracerScenario {
  id: string;
  sourceTag: string;
  destTag: string;
  type: string;
  status: 'In Progress' | 'Successful' | 'Failed';
  timeSec: number;
  color: string;
}

export interface SimulationTelemetry {
  tick: number;
  activePackets: number;
  deliveredPackets: number;
  droppedPackets: number;
  averageLatencyMs: number;
  throughputMbps: number;
  totalPowerWatts?: number;
  totalCurrentAmps?: number;
  totalFluidFlowRate?: number; // L/s
  averagePressurePsi?: number;
  nodeLoads: Record<string, number>; // nodeId -> % load
  linkSaturations: Record<string, number>; // connectionId -> % saturation
}

export interface BOQItem {
  id: string;
  itemType: 'COMPONENT' | 'CABLE' | 'LABOUR' | 'ACCESSORY';
  description: string;
  partNumber?: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  unitLabour: number;
  totalMaterialCost: number;
  totalLabourCost: number;
  totalCost: number;
}

export interface BOQSummary {
  items: BOQItem[];
  currency: string;
  totalMaterials: number;
  totalLabour: number;
  subtotal: number;
  taxRatePercent: number;
  taxAmount: number;
  contingencyPercent: number;
  contingencyAmount: number;
  grandTotal: number;
}

export interface PortBlueprint {
  name: string;
  type: string;
  direction: 'input' | 'output' | 'bidirectional';
  capacity: number;
  unit: string;
  compatiblePortTypes: string[];
  properties?: Record<string, unknown>;
}

export interface ComponentTemplate {
  type: string;
  category: 'CORE' | 'SWITCHING' | 'SECURITY' | 'ENDPOINTS' | 'INFRASTRUCTURE' | 'WIRELESS' | 'ELECTRICAL' | 'PLUMBING' | 'COOLING' | 'CCTV' | 'SOLAR' | 'FACILITY' | string;
  name: string;
  defaultTagPrefix: string;
  description: string;
  icon: string;
  defaultCost: CostData;
  defaultProperties: Record<string, unknown>;
  portsTemplate: PortBlueprint[];
}

export interface LibraryAssemblyNode {
  templateType: string;
  name: string;
  tagPrefix: string;
  relativeX: number;
  relativeY: number;
  properties?: Record<string, unknown>;
  costData?: CostData;
}

export interface LibraryAssemblyConnection {
  sourceNodeIndex: number;
  sourcePortName: string;
  targetNodeIndex: number;
  targetPortName: string;
  connectionType: string;
  lengthMeters: number;
}

export interface LibraryAssembly {
  id: string;
  name: string;
  category: string;
  description: string;
  icon?: string;
  author?: string;
  version?: string;
  nodes: LibraryAssemblyNode[];
  connections: LibraryAssemblyConnection[];
  tags?: string[];
  estimatedCost?: number;
}

export interface ComponentLibrary {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  author: string;
  isBuiltIn: boolean;
  components: ComponentTemplate[];
  assemblies: LibraryAssembly[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedProject {
  id: string;
  name: string;
  description: string;
  domain: EngineeringDomain;
  graph: EngineeringGraph;
  deviceCount: number;
  connectionCount: number;
  estimatedCost: number;
  createdAt: string;
  updatedAt: string;
}


