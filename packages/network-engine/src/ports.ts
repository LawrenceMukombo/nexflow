import { ComponentPort, EngineeringConnection } from '@omniflow/shared-types';

export interface CableSpecification {
  type: string;
  name: string;
  category: 'TWISTED_PAIR' | 'FIBER_OPTIC' | 'SERIAL' | 'COAXIAL' | 'ELECTRICAL_FEEDER' | 'HYDRAULIC_PIPE';
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
  },
  // Electrical Conductors
  POWER_3PHASE_400V: {
    type: 'POWER_3PHASE_400V',
    name: '3-Phase 400V AC Feeder Cable (XLPE)',
    category: 'ELECTRICAL_FEEDER',
    maxBandwidthMbps: 45000, // Watts (45 kW)
    maxDistanceMeters: 250,
    costPerMeter: 14.5,
    labourPerMeter: 7.5,
    supportedPortTypes: ['AC_3PHASE', 'AC_TERMINAL']
  },
  POWER_1PHASE_230V: {
    type: 'POWER_1PHASE_230V',
    name: 'Single-Phase 230V 16A Power Cable',
    category: 'ELECTRICAL_FEEDER',
    maxBandwidthMbps: 3680, // Watts (3.68 kW)
    maxDistanceMeters: 60,
    costPerMeter: 3.8,
    labourPerMeter: 1.8,
    supportedPortTypes: ['AC_1PHASE', 'IEC_C13', 'IEC_C19', 'AC_TERMINAL']
  },
  POWER_DC_48V: {
    type: 'POWER_DC_48V',
    name: '-48V DC Telecom Power Bus Cable',
    category: 'ELECTRICAL_FEEDER',
    maxBandwidthMbps: 2400, // Watts (2.4 kW)
    maxDistanceMeters: 40,
    costPerMeter: 6.5,
    labourPerMeter: 2.5,
    supportedPortTypes: ['DC_48V', 'DC_POLE']
  },
  SOLAR_DC_STRING: {
    type: 'SOLAR_DC_STRING',
    name: 'Solar PV 600V DC String Cable',
    category: 'ELECTRICAL_FEEDER',
    maxBandwidthMbps: 15000, // Watts (15 kW)
    maxDistanceMeters: 120,
    costPerMeter: 4.5,
    labourPerMeter: 2.2,
    supportedPortTypes: ['MC4_DC', 'DC_POLE']
  },
  // Hydraulic & Plumbing Pipes
  PIPE_CHILLED_SUPPLY: {
    type: 'PIPE_CHILLED_SUPPLY',
    name: 'Chilled Water Supply 7°C Pipe (6" Steel)',
    category: 'HYDRAULIC_PIPE',
    maxBandwidthMbps: 100, // L/s flow rate
    maxDistanceMeters: 500,
    costPerMeter: 48.0,
    labourPerMeter: 28.0,
    supportedPortTypes: ['PIPE_FLANGE_6IN', 'PIPE_THREAD_2IN']
  },
  PIPE_CHILLED_RETURN: {
    type: 'PIPE_CHILLED_RETURN',
    name: 'Chilled Water Return 14°C Pipe (6" Steel)',
    category: 'HYDRAULIC_PIPE',
    maxBandwidthMbps: 100, // L/s flow rate
    maxDistanceMeters: 500,
    costPerMeter: 48.0,
    labourPerMeter: 28.0,
    supportedPortTypes: ['PIPE_FLANGE_6IN', 'PIPE_THREAD_2IN']
  },
  PIPE_WATER_SUPPLY: {
    type: 'PIPE_WATER_SUPPLY',
    name: 'Municipal Potable Cold Water Pipe (2" Copper)',
    category: 'HYDRAULIC_PIPE',
    maxBandwidthMbps: 25, // L/s
    maxDistanceMeters: 200,
    costPerMeter: 19.5,
    labourPerMeter: 12.0,
    supportedPortTypes: ['PIPE_THREAD_2IN', 'PIPE_NPT_1IN']
  },
  PIPE_CONDENSATE: {
    type: 'PIPE_CONDENSATE',
    name: 'Condensate Drainage Pipe (1.5" PVC)',
    category: 'HYDRAULIC_PIPE',
    maxBandwidthMbps: 10, // L/s
    maxDistanceMeters: 80,
    costPerMeter: 6.8,
    labourPerMeter: 4.5,
    supportedPortTypes: ['PIPE_PVC_1_5IN', 'PIPE_NPT_1IN']
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
      reason: `Source port '${sourcePort.name}' is already connected to another line.`
    };
  }
  if (targetPort.occupiedByConnectionId) {
    return {
      compatible: false,
      reason: `Target port '${targetPort.name}' is already connected to another line.`
    };
  }

  // Same node check
  if (sourcePort.nodeId === targetPort.nodeId) {
    return {
      compatible: false,
      reason: 'Cannot connect a port to another port on the exact same component directly.'
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
      reason: `Physical medium mismatch: '${sourcePort.type}' cannot directly connect to '${targetPort.type}'.`
    };
  }

  // Select suitable default cable/pipe/feeder
  let recommendedCable = 'CAT6';
  const sType = sourcePort.type.toUpperCase();
  const tType = targetPort.type.toUpperCase();

  if (sType.includes('AC_3PHASE') || tType.includes('AC_3PHASE')) {
    recommendedCable = 'POWER_3PHASE_400V';
  } else if (sType.includes('AC_1PHASE') || tType.includes('AC_1PHASE') || sType.includes('IEC_C') || tType.includes('IEC_C')) {
    recommendedCable = 'POWER_1PHASE_230V';
  } else if (sType.includes('DC_48V') || tType.includes('DC_48V')) {
    recommendedCable = 'POWER_DC_48V';
  } else if (sType.includes('MC4') || tType.includes('MC4')) {
    recommendedCable = 'SOLAR_DC_STRING';
  } else if (sType.includes('FLANGE_6IN') || tType.includes('FLANGE_6IN')) {
    recommendedCable = sourcePort.name.toLowerCase().includes('return') ? 'PIPE_CHILLED_RETURN' : 'PIPE_CHILLED_SUPPLY';
  } else if (sType.includes('PIPE_PVC') || tType.includes('PIPE_PVC')) {
    recommendedCable = 'PIPE_CONDENSATE';
  } else if (sType.includes('PIPE') || tType.includes('PIPE')) {
    recommendedCable = 'PIPE_WATER_SUPPLY';
  } else if (sType.includes('FIBER') || tType.includes('FIBER')) {
    recommendedCable = 'FIBER_SM';
  } else if (sType.includes('COAX') || tType.includes('COAX')) {
    recommendedCable = 'COAX_RG6';
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

  // Determine domain from cable/pipe category
  let domain: 'NETWORK' | 'ELECTRICAL' | 'PLUMBING' | 'SOLAR' | 'CCTV' = 'NETWORK';
  if (cableSpec.category === 'ELECTRICAL_FEEDER') {
    domain = cableType === 'SOLAR_DC_STRING' ? 'SOLAR' : 'ELECTRICAL';
  } else if (cableSpec.category === 'HYDRAULIC_PIPE') {
    domain = 'PLUMBING';
  } else if (cableSpec.type === 'COAX_RG6') {
    domain = 'CCTV';
  }

  return {
    id: connectionId,
    designId,
    domain,
    sourceComponentId: sourceNodeId,
    sourcePortId,
    targetComponentId: targetNodeId,
    targetPortId,
    connectionType: cableSpec.type,
    lengthMeters: estimatedLengthMeters,
    properties: {
      bandwidthLimitMbps: cableSpec.maxBandwidthMbps,
      maxDistanceMeters: cableSpec.maxDistanceMeters,
      cableName: cableSpec.name,
      category: cableSpec.category
    },
    simulationState: {
      flowRate: 0,
      saturationPercent: 0,
      packetLossPercent: 0,
      latencyMs: Number((estimatedLengthMeters * 0.005).toFixed(3)),
      isCongested: false,
      isFailed: false
    }
  };
}
