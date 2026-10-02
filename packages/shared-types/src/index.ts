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

export interface SimulationPacket {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  currentEdgeId: string;
  progressPercent: number; // 0 to 100
  protocol: 'ICMP' | 'HTTP' | 'DNS' | 'TCP' | 'UDP';
  sizeBytes: number;
  status: 'ACTIVE' | 'CONGESTED' | 'FAILED' | 'DELIVERED';
  color?: string;
}

export interface SimulationTelemetry {
  tick: number;
  activePackets: number;
  deliveredPackets: number;
  droppedPackets: number;
  averageLatencyMs: number;
  throughputMbps: number;
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
