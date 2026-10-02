import { EngineeringGraph, ValidationIssue, SimulationPacket, SimulationTelemetry, EngineeringDomain } from '@omniflow/shared-types';
export interface GraphState {
    graph: EngineeringGraph;
    activeDomain: EngineeringDomain;
    selectedNodeId: string | null;
    selectedConnectionId: string | null;
    pendingPort: {
        nodeId: string;
        portId: string;
    } | null;
    viewport: {
        x: number;
        y: number;
        zoom: number;
    };
    validationIssues: ValidationIssue[];
    isValidationDrawerOpen: boolean;
    isBOQModalOpen: boolean;
    isCableScheduleOpen: boolean;
    isSimulating: boolean;
    simulationSpeed: number;
    simulationTick: number;
    activePackets: SimulationPacket[];
    telemetry: SimulationTelemetry;
    history: string[];
    historyIndex: number;
    setActiveDomain: (domain: EngineeringDomain) => void;
    selectNode: (id: string | null) => void;
    selectConnection: (id: string | null) => void;
    addComponent: (type: string, position: {
        x: number;
        y: number;
    }) => void;
    moveComponent: (id: string, position: {
        x: number;
        y: number;
    }) => void;
    removeComponent: (id: string) => void;
    updateComponentProperties: (id: string, properties: Record<string, unknown>) => void;
    toggleComponentFault: (id: string) => void;
    startConnection: (nodeId: string, portId: string) => void;
    completeConnection: (targetNodeId: string, targetPortId: string) => {
        success: boolean;
        message?: string;
    };
    cancelConnection: () => void;
    removeConnection: (id: string) => void;
    toggleConnectionFault: (id: string) => void;
    updateConnectionLength: (id: string, lengthMeters: number) => void;
    validate: () => void;
    toggleValidationDrawer: (open?: boolean) => void;
    toggleBOQModal: (open?: boolean) => void;
    toggleCableScheduleModal: (open?: boolean) => void;
    toggleSimulation: (running?: boolean) => void;
    setSimulationSpeed: (speed: number) => void;
    triggerPacketBurst: () => void;
    tickSimulation: () => void;
    resetSimulation: () => void;
    setViewport: (vp: {
        x: number;
        y: number;
        zoom: number;
    }) => void;
    loadDemoTopology: () => void;
    clearCanvas: () => void;
    undo: () => void;
    redo: () => void;
}
export declare const useGraphStore: import("zustand").UseBoundStore<import("zustand").StoreApi<GraphState>>;
//# sourceMappingURL=graphStore.d.ts.map