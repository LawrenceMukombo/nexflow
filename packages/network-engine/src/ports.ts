import { ComponentPort, EngineeringConnection } from '@omniflow/shared-types';

export interface CableSpecification {
  type: string;
  name: string;
  category: 'TWISTED_PAIR' | 'FIBER_OPTIC' | 'SERIAL' | 'COAXIAL';
  maxBandwidthMbps: number;
  maxDistanceMeters: number;
  costPerMeter: number;
  labourPerMeter: number;
  supportedPortTypes: string[];
}

export const CABLE_CATALOG: Record<string, CableSpecification> = {
  CAT5E: {
    type: 'CAT5E',
    name: 'Category 5e UTP Cable',
    category: 'TWISTED_PAIR',
    maxBandwidthMbps: 1000,
    maxDistanceMeters: 100,
    costPerMeter: 0.85,
    labourPerMeter: 0.65,
    supportedPortTypes: ['RJ45']
  },
  CAT6: {
    type: 'CAT6',
    name: 'Category 6 UTP Cable',
    category: 'TWISTED_PAIR',
    maxBandwidthMbps: 1000,
    maxDistanceMeters: 100,
    costPerMeter: 1.2,
    labourPerMeter: 0.8,
    supportedPortTypes: ['RJ45']
  },
  CAT6A: {
    type: 'CAT6A',
    name: 'Category 6A STP 10G Shielded',
    category: 'TWISTED_PAIR',
    maxBandwidthMbps: 10000,
    maxDistanceMeters: 100,
    costPerMeter: 2.1,
    labourPerMeter: 1.2,
    supportedPortTypes: ['RJ45']
  },
  CAT7: {
    type: 'CAT7',
    name: 'Category 7 S/FTP Industrial 10G',
    category: 'TWISTED_PAIR',
    maxBandwidthMbps: 10000,
    maxDistanceMeters: 100,
    costPerMeter: 3.2,
    labourPerMeter: 1.5,
    supportedPortTypes: ['RJ45']
  },
  CAT8: {
    type: 'CAT8',
    name: 'Category 8 40G Data Center Copper',
    category: 'TWISTED_PAIR',
    maxBandwidthMbps: 40000,
    maxDistanceMeters: 30,
    costPerMeter: 4.8,
    labourPerMeter: 1.8,
    supportedPortTypes: ['RJ45']
  },
  FIBER_SM: {
    type: 'FIBER_SM',
    name: 'Single-Mode OS2 Fiber Optic',
    category: 'FIBER_OPTIC',
    maxBandwidthMbps: 100000,
    maxDistanceMeters: 10000,
    costPerMeter: 3.5,
    labourPerMeter: 2.5,
    supportedPortTypes: ['FIBER_LC']
  },
  FIBER_MM: {
    type: 'FIBER_MM',
    name: 'Multi-Mode OM4 Fiber Optic',
    category: 'FIBER_OPTIC',
    maxBandwidthMbps: 40000,
    maxDistanceMeters: 400,
    costPerMeter: 2.8,
    labourPerMeter: 2.0,
    supportedPortTypes: ['FIBER_LC']
  },
  FIBER_MM_OM5: {
    type: 'FIBER_MM_OM5',
    name: 'Multi-Mode OM5 Wideband Fiber',
    category: 'FIBER_OPTIC',
    maxBandwidthMbps: 100000,
    maxDistanceMeters: 440,
    costPerMeter: 4.2,
    labourPerMeter: 2.8,
    supportedPortTypes: ['FIBER_LC']
  },
  DAC_10G: {
    type: 'DAC_10G',
    name: '10G SFP+ Direct Attach Copper (DAC)',
    category: 'TWISTED_PAIR',
    maxBandwidthMbps: 10000,
    maxDistanceMeters: 7,
    costPerMeter: 8.5,
    labourPerMeter: 1.0,
    supportedPortTypes: ['FIBER_LC', 'SFP_PLUS']
  },
  DAC_25G: {
    type: 'DAC_25G',
    name: '25G SFP28 Direct Attach Copper (DAC)',
    category: 'TWISTED_PAIR',
    maxBandwidthMbps: 25000,
    maxDistanceMeters: 5,
    costPerMeter: 14.0,
    labourPerMeter: 1.2,
    supportedPortTypes: ['FIBER_LC', 'SFP_PLUS']
  },
  COAX_RG6: {
    type: 'COAX_RG6',
    name: 'Coaxial RG6 Quad-Shield Cable',
    category: 'COAXIAL',
    maxBandwidthMbps: 1000,
    maxDistanceMeters: 150,
    costPerMeter: 1.1,
    labourPerMeter: 0.9,
    supportedPortTypes: ['COAX_BNC', 'F_TYPE']
  }
};

export interface PortCompatibilityResult {
  compatible: boolean;
  reason?: string;
  recommendedCable?: string;
}

export function checkPortCompatibility(
  sourcePort: ComponentPort,
  targetPort: ComponentPort
): PortCompatibilityResult {
  // Check if either port is already occupied
  if (sourcePort.occupiedByConnectionId) {
    return {
      compatible: false,
      reason: `Source port '${sourcePort.name}' is already connected to another cable.`
    };
  }
  if (targetPort.occupiedByConnectionId) {
    return {
      compatible: false,
      reason: `Target port '${targetPort.name}' is already connected to another cable.`
    };
  }

  // Same node check
  if (sourcePort.nodeId === targetPort.nodeId) {
    return {
      compatible: false,
      reason: 'Cannot connect a port to another port on the exact same device directly.'
    };
  }

  // Direction checks: output -> input, bidirectional -> bidirectional, or bidirectional -> any
  const canConnectDirection =
    (sourcePort.direction === 'bidirectional' || targetPort.direction === 'bidirectional') ||
    (sourcePort.direction === 'output' && targetPort.direction === 'input') ||
    (sourcePort.direction === 'input' && targetPort.direction === 'output');

  if (!canConnectDirection) {
    return {
      compatible: false,
      reason: `Incompatible direction: ${sourcePort.direction} cannot connect to ${targetPort.direction}.`
    };
  }

  // Type compatibility check
  const sourceMatchesTarget = sourcePort.compatiblePortTypes.includes(targetPort.type);
  const targetMatchesSource = targetPort.compatiblePortTypes.includes(sourcePort.type);

  if (!sourceMatchesTarget && !targetMatchesSource && sourcePort.type !== targetPort.type) {
    return {
      compatible: false,
      reason: `Port physical type mismatch: '${sourcePort.type}' cannot directly connect to '${targetPort.type}' without a media converter.`
    };
  }

  // Select suitable default cable
  let recommendedCable = 'CAT6';
  if (sourcePort.type === 'FIBER_LC' || targetPort.type === 'FIBER_LC') {
    recommendedCable = 'FIBER_SM';
  } else if (sourcePort.capacity && sourcePort.capacity > 1000) {
    recommendedCable = 'CAT6A';
  }

  return {
    compatible: true,
    recommendedCable
  };
}

export function createConnectionInstance(
  designId: string,
  sourceNodeId: string,
  sourcePortId: string,
  targetNodeId: string,
  targetPortId: string,
  cableType: string = 'CAT6',
  estimatedLengthMeters: number = 15
): EngineeringConnection {
  const cableSpec = CABLE_CATALOG[cableType] || CABLE_CATALOG.CAT6;
  const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  return {
    id: connectionId,
    designId,
    domain: 'NETWORK',
    sourceComponentId: sourceNodeId,
    sourcePortId,
    targetComponentId: targetNodeId,
    targetPortId,
    connectionType: cableSpec.type,
    lengthMeters: estimatedLengthMeters,
    properties: {
      bandwidthLimitMbps: cableSpec.maxBandwidthMbps,
      maxDistanceMeters: cableSpec.maxDistanceMeters,
      cableName: cableSpec.name
    },
    simulationState: {
      flowRate: 0,
      saturationPercent: 0,
      packetLossPercent: 0,
      latencyMs: Number((estimatedLengthMeters * 0.005).toFixed(3)), // ~5ns per meter propagation
      isCongested: false,
      isFailed: false
    }
  };
}
