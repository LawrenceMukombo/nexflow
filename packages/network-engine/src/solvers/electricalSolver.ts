/**
 * Electrical Load Flow, Conductor Impedance & Voltage Drop Physics Solver
 * Compliant with IEEE 141 (Red Book), NEC Article 210/215, and IEC 60364-5-52.
 */

import { EngineeringGraph, EngineeringComponent, EngineeringConnection } from '@omniflow/shared-types';

export interface ConductorSpec {
  material: 'COPPER' | 'ALUMINUM';
  crossSectionMm2: number;
  awgEquivalent: string;
  maxAmpacity75C: number;  // NEC Table 310.16 rated ampacity (75°C insulation)
  resistanceOhmPerKm: number; // AC resistance at 75°C (Ω/km)
  reactanceOhmPerKm: number;  // Reactance at 50/60Hz in steel/PVC conduit (Ω/km)
}

/**
 * Standard Conductor Catalog (Annealed Copper & EC Grade Aluminum)
 * DC & AC Resistance at 75°C per NEC Chapter 9, Table 8 & 9
 */
export const CONDUCTOR_CATALOG: Record<string, ConductorSpec> = {
  '1.5mm2': {
    material: 'COPPER',
    crossSectionMm2: 1.5,
    awgEquivalent: '16 AWG',
    maxAmpacity75C: 15,
    resistanceOhmPerKm: 14.8,
    reactanceOhmPerKm: 0.115
  },
  '2.5mm2': {
    material: 'COPPER',
    crossSectionMm2: 2.5,
    awgEquivalent: '14 AWG',
    maxAmpacity75C: 20,
    resistanceOhmPerKm: 8.92,
    reactanceOhmPerKm: 0.108
  },
  '4.0mm2': {
    material: 'COPPER',
    crossSectionMm2: 4.0,
    awgEquivalent: '12 AWG',
    maxAmpacity75C: 25,
    resistanceOhmPerKm: 5.56,
    reactanceOhmPerKm: 0.102
  },
  '6.0mm2': {
    material: 'COPPER',
    crossSectionMm2: 6.0,
    awgEquivalent: '10 AWG',
    maxAmpacity75C: 35,
    resistanceOhmPerKm: 3.71,
    reactanceOhmPerKm: 0.098
  },
  '10.0mm2': {
    material: 'COPPER',
    crossSectionMm2: 10.0,
    awgEquivalent: '8 AWG',
    maxAmpacity75C: 50,
    resistanceOhmPerKm: 2.24,
    reactanceOhmPerKm: 0.092
  },
  '16.0mm2': {
    material: 'COPPER',
    crossSectionMm2: 16.0,
    awgEquivalent: '6 AWG',
    maxAmpacity75C: 65,
    resistanceOhmPerKm: 1.40,
    reactanceOhmPerKm: 0.088
  },
  '25.0mm2': {
    material: 'COPPER',
    crossSectionMm2: 25.0,
    awgEquivalent: '4 AWG',
    maxAmpacity75C: 85,
    resistanceOhmPerKm: 0.893,
    reactanceOhmPerKm: 0.084
  },
  '35.0mm2': {
    material: 'COPPER',
    crossSectionMm2: 35.0,
    awgEquivalent: '2 AWG',
    maxAmpacity75C: 115,
    resistanceOhmPerKm: 0.638,
    reactanceOhmPerKm: 0.082
  },
  '50.0mm2': {
    material: 'COPPER',
    crossSectionMm2: 50.0,
    awgEquivalent: '1/0 AWG',
    maxAmpacity75C: 150,
    resistanceOhmPerKm: 0.458,
    reactanceOhmPerKm: 0.080
  },
  '70.0mm2': {
    material: 'COPPER',
    crossSectionMm2: 70.0,
    awgEquivalent: '2/0 AWG',
    maxAmpacity75C: 175,
    resistanceOhmPerKm: 0.323,
    reactanceOhmPerKm: 0.078
  },
  '95.0mm2': {
    material: 'COPPER',
    crossSectionMm2: 95.0,
    awgEquivalent: '3/0 AWG',
    maxAmpacity75C: 200,
    resistanceOhmPerKm: 0.237,
    reactanceOhmPerKm: 0.076
  },
  '120.0mm2': {
    material: 'COPPER',
    crossSectionMm2: 120.0,
    awgEquivalent: '4/0 AWG',
    maxAmpacity75C: 230,
    resistanceOhmPerKm: 0.188,
    reactanceOhmPerKm: 0.075
  },
  '150.0mm2': {
    material: 'COPPER',
    crossSectionMm2: 150.0,
    awgEquivalent: '300 kcmil',
    maxAmpacity75C: 285,
    resistanceOhmPerKm: 0.153,
    reactanceOhmPerKm: 0.074
  },
  '185.0mm2': {
    material: 'COPPER',
    crossSectionMm2: 185.0,
    awgEquivalent: '350 kcmil',
    maxAmpacity75C: 310,
    resistanceOhmPerKm: 0.123,
    reactanceOhmPerKm: 0.073
  },
  '240.0mm2': {
    material: 'COPPER',
    crossSectionMm2: 240.0,
    awgEquivalent: '500 kcmil',
    maxAmpacity75C: 380,
    resistanceOhmPerKm: 0.094,
    reactanceOhmPerKm: 0.072
  }
};

export type ElectricalSystemPhase = '3PHASE_400V' | '1PHASE_230V' | '1PHASE_120V' | 'DC_48V' | 'DC_600V' | 'DC_1000V';

export interface CableVoltageDropResult {
  connectionId: string;
  sourceNodeId: string;
  targetNodeId: string;
  cableLengthMeters: number;
  conductorSize: string;
  conductorSpec: ConductorSpec;
  phaseSystem: ElectricalSystemPhase;
  nominalVoltage: number;
  loadCurrentAmps: number;
  powerFactor: number;
  resistanceOhm: number;
  reactanceOhm: number;
  impedanceOhm: number;
  voltageDropVolts: number;
  voltageDropPercent: number;
  receivingVoltage: number;
  activePowerWatts: number;
  reactivePowerVar: number;
  apparentPowerVa: number;
  isAmpacityExceeded: boolean;
  necCompliance: {
    isBranchCompliant: boolean; // <= 3.0%
    isFeederCompliant: boolean; // <= 3.0%
    isTotalCompliant: boolean;  // <= 5.0%
    status: 'EXCELLENT' | 'COMPLIANT' | 'WARNING_HIGH_DROP' | 'VIOLATION_CRITICAL';
    message: string;
  };
}

export interface NodeElectricalLoadResult {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  nominalVoltage: number;
  phaseSystem: ElectricalSystemPhase;
  incomingVoltage: number;
  totalVoltageDropFromSource: number;
  totalVoltageDropPercent: number;
  connectedLoadWatts: number;
  demandFactor: number;
  operatingLoadWatts: number;
  operatingCurrentAmps: number;
  powerFactor: number;
  ratedBreakerAmps?: number;
  breakerLoadingPercent?: number;
  isBreakerTripped: boolean;
  upstreamConnectionId?: string;
}

export interface ElectricalNetworkSolution {
  solvedAt: string;
  sourceNodes: string[];
  totalConnectedLoadWatts: number;
  totalOperatingLoadWatts: number;
  totalOperatingCurrentAmps: number;
  maxVoltageDropPercent: number;
  worstDropConnectionId?: string;
  hasAmpacityViolation: boolean;
  hasVoltageDropViolation: boolean;
  hasBreakerOverload: boolean;
  cableResults: Record<string, CableVoltageDropResult>;
  nodeResults: Record<string, NodeElectricalLoadResult>;
  violations: Array<{
    code: 'ELEC_VOLTAGE_DROP_EXCEEDED' | 'ELEC_AMPACITY_EXCEEDED' | 'ELEC_BREAKER_OVERLOAD';
    severity: 'WARNING' | 'ERROR' | 'CRITICAL';
    title: string;
    message: string;
    affectedNodeIds: string[];
    affectedConnectionIds: string[];
    suggestedFix: string;
  }>;
}

/**
 * Derives the optimal or assigned conductor cross-section based on cable type and length
 */
export function resolveConductorSpec(connection: EngineeringConnection): ConductorSpec {
  const connType = (connection.connectionType || '').toUpperCase();
  const explicitSize = connection.properties.conductorSize as string;

  if (explicitSize && CONDUCTOR_CATALOG[explicitSize]) {
    return CONDUCTOR_CATALOG[explicitSize];
  }

  // Parse by connection type name
  if (connType.includes('240MM') || connType.includes('FEEDER_MAIN')) return CONDUCTOR_CATALOG['240.0mm2'];
  if (connType.includes('185MM') || connType.includes('FEEDER_SUB')) return CONDUCTOR_CATALOG['185.0mm2'];
  if (connType.includes('120MM')) return CONDUCTOR_CATALOG['120.0mm2'];
  if (connType.includes('70MM')) return CONDUCTOR_CATALOG['70.0mm2'];
  if (connType.includes('50MM')) return CONDUCTOR_CATALOG['50.0mm2'];
  if (connType.includes('35MM')) return CONDUCTOR_CATALOG['35.0mm2'];
  if (connType.includes('16MM')) return CONDUCTOR_CATALOG['16.0mm2'];
  if (connType.includes('10MM')) return CONDUCTOR_CATALOG['10.0mm2'];
  if (connType.includes('6MM')) return CONDUCTOR_CATALOG['6.0mm2'];
  if (connType.includes('4MM')) return CONDUCTOR_CATALOG['4.0mm2'];
  if (connType.includes('2.5MM') || connType.includes('POWER_AC_16A')) return CONDUCTOR_CATALOG['2.5mm2'];

  // Default for heavy 400V 3-phase mains
  if (connType.includes('3PHASE') || connType.includes('400V')) {
    return CONDUCTOR_CATALOG['70.0mm2'];
  }
  // Default for DC runs
  if (connType.includes('DC')) {
    return CONDUCTOR_CATALOG['16.0mm2'];
  }

  // Standard 230V AC branch circuits
  return CONDUCTOR_CATALOG['4.0mm2'];
}

/**
 * Resolves electrical system phase and nominal voltage for a link
 */
export function resolvePhaseSystem(
  conn: EngineeringConnection,
  srcNode?: EngineeringComponent,
  tgtNode?: EngineeringComponent
): { phase: ElectricalSystemPhase; nominalVoltage: number } {
  const type = (conn.connectionType || '').toUpperCase();
  const srcProp = srcNode?.properties || {};
  const tgtProp = tgtNode?.properties || {};

  if (type.includes('3PHASE') || type.includes('400V') || srcProp.outputVoltage === 400 || tgtProp.inputVoltage === 400) {
    return { phase: '3PHASE_400V', nominalVoltage: 400 };
  }
  if (type.includes('DC_48V') || srcProp.outputVoltage === 48 || tgtProp.inputVoltage === 48) {
    return { phase: 'DC_48V', nominalVoltage: 48 };
  }
  if (type.includes('DC_1000V') || srcProp.outputVoltage === 1000) {
    return { phase: 'DC_1000V', nominalVoltage: 1000 };
  }
  if (type.includes('DC_600V') || srcProp.outputVoltage === 600) {
    return { phase: 'DC_600V', nominalVoltage: 600 };
  }
  if (type.includes('120V') || srcProp.outputVoltage === 120 || tgtProp.inputVoltage === 120) {
    return { phase: '1PHASE_120V', nominalVoltage: 120 };
  }

  return { phase: '1PHASE_230V', nominalVoltage: 230 };
}

/**
 * Calculates genuine engineering voltage drop for an AC or DC branch
 * Formula:
 * 3-Phase AC: Vdrop = √3 * I * L * (R*cosθ + X*sinθ)
 * 1-Phase AC: Vdrop = 2 * I * L * (R*cosθ + X*sinθ)
 * DC:         Vdrop = 2 * I * L * R
 */
export function calculateVoltageDrop(
  cableLengthMeters: number,
  conductor: ConductorSpec,
  currentAmps: number,
  phaseSystem: ElectricalSystemPhase,
  nominalVoltage: number,
  powerFactor: number = 0.92
): {
  resistanceOhm: number;
  reactanceOhm: number;
  impedanceOhm: number;
  voltageDropVolts: number;
  voltageDropPercent: number;
  receivingVoltage: number;
} {
  const lengthKm = Math.max(0.1, cableLengthMeters) / 1000;
  const R = conductor.resistanceOhmPerKm * lengthKm;
  const X = conductor.reactanceOhmPerKm * lengthKm;
  const Z = Math.sqrt(R * R + X * X);

  // Clamp power factor
  const cosTheta = Math.max(0.5, Math.min(1.0, powerFactor));
  const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);

  let voltageDropVolts = 0;

  if (phaseSystem === '3PHASE_400V') {
    // 3-Phase line-to-line drop
    voltageDropVolts = Math.sqrt(3) * currentAmps * (R * cosTheta + X * sinTheta);
  } else if (phaseSystem === '1PHASE_230V' || phaseSystem === '1PHASE_120V') {
    // 1-Phase line-to-neutral (2-wire loop)
    voltageDropVolts = 2 * currentAmps * (R * cosTheta + X * sinTheta);
  } else {
    // DC circuits (pure resistance loop)
    voltageDropVolts = 2 * currentAmps * R;
  }

  // Prevent unrealistic negative or exceeding source
  voltageDropVolts = Math.min(voltageDropVolts, nominalVoltage);
  const voltageDropPercent = (voltageDropVolts / nominalVoltage) * 100;
  const receivingVoltage = Math.max(0, nominalVoltage - voltageDropVolts);

  return {
    resistanceOhm: Number(R.toFixed(5)),
    reactanceOhm: Number(X.toFixed(5)),
    impedanceOhm: Number(Z.toFixed(5)),
    voltageDropVolts: Number(voltageDropVolts.toFixed(2)),
    voltageDropPercent: Number(voltageDropPercent.toFixed(2)),
    receivingVoltage: Number(receivingVoltage.toFixed(2))
  };
}

/**
 * Solves Electrical Load Flow across the engineering graph
 */
export function solveElectricalNetwork(graph: EngineeringGraph): ElectricalNetworkSolution {
  const nodes = Object.values(graph.nodes);
  const connections = Object.values(graph.connections);

  const electricalNodes = nodes.filter(n => 
    n.domain === 'ELECTRICAL' || 
    n.domain === 'SOLAR' ||
    n.type.includes('TRANSFORMER') ||
    n.type.includes('GENERATOR') ||
    n.type.includes('UPS') ||
    n.type.includes('PDU') ||
    n.type.includes('CHILLER') ||
    n.type.includes('INVERTER') ||
    n.type.includes('PANEL')
  );

  const electricalConns = connections.filter(c => 
    c.domain === 'ELECTRICAL' || 
    c.domain === 'SOLAR' ||
    c.connectionType.toUpperCase().includes('POWER') ||
    c.connectionType.toUpperCase().includes('AC_') ||
    c.connectionType.toUpperCase().includes('DC_')
  );

  const cableResults: Record<string, CableVoltageDropResult> = {};
  const nodeResults: Record<string, NodeElectricalLoadResult> = {};
  const violations: ElectricalNetworkSolution['violations'] = [];

  // Identify power sources (Grid Incomer, Generator, Main Substation Transformer)
  const sourceNodes = electricalNodes.filter(n => 
    n.type.includes('FEED') || 
    n.type.includes('GENERATOR') || 
    n.type.includes('TRANSFORMER') || 
    n.type.includes('GRID') ||
    n.properties.isPowerSource === true
  ).map(n => n.id);

  // If no source nodes identified explicitly, pick the first upstream node or highest capacity node
  const activeSources = sourceNodes.length > 0 ? sourceNodes : (electricalNodes.length > 0 ? [electricalNodes[0].id] : []);

  let totalConnectedWatts = 0;
  let totalOperatingWatts = 0;
  let maxVoltageDropPercent = 0;
  let worstDropConnId: string | undefined;

  // First pass: extract loads for each node
  for (const node of electricalNodes) {
    const isSource = activeSources.includes(node.id);
    const props = node.properties;
    const connectedWatts = isSource ? Number(props.powerDrawWatts || 0) : Number(props.ratedPowerWatts || props.activePowerWatts || props.powerDrawWatts || 2500);
    const demandFactor = Number(props.demandFactor || 0.85);
    const operatingWatts = connectedWatts * demandFactor;
    const pf = Number(props.powerFactor || 0.92);
    const ratedBreaker = props.breakerRatingAmps ? Number(props.breakerRatingAmps) : undefined;

    totalConnectedWatts += connectedWatts;
    totalOperatingWatts += operatingWatts;

    nodeResults[node.id] = {
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      nominalVoltage: 230,
      phaseSystem: '1PHASE_230V',
      incomingVoltage: 230,
      totalVoltageDropFromSource: 0,
      totalVoltageDropPercent: 0,
      connectedLoadWatts: connectedWatts,
      demandFactor,
      operatingLoadWatts: operatingWatts,
      operatingCurrentAmps: 0,
      powerFactor: pf,
      ratedBreakerAmps: ratedBreaker,
      isBreakerTripped: false
    };
  }

  // Second pass: Solve branch flows along connections
  for (const conn of electricalConns) {
    const srcNode = graph.nodes[conn.sourceComponentId];
    const tgtNode = graph.nodes[conn.targetComponentId];
    if (!srcNode || !tgtNode) continue;

    const { phase, nominalVoltage } = resolvePhaseSystem(conn, srcNode, tgtNode);
    const conductor = resolveConductorSpec(conn);
    const tgtLoadWatts = nodeResults[tgtNode.id]?.operatingLoadWatts || 3500;
    const pf = nodeResults[tgtNode.id]?.powerFactor || 0.92;

    // Current based on active power & phase:
    // 3-Phase: I = P / (√3 * V * cosθ)
    // 1-Phase: I = P / (V * cosθ)
    // DC:      I = P / V
    let currentAmps = 0;
    if (phase === '3PHASE_400V') {
      currentAmps = tgtLoadWatts / (Math.sqrt(3) * nominalVoltage * pf);
    } else if (phase === '1PHASE_230V' || phase === '1PHASE_120V') {
      currentAmps = tgtLoadWatts / (nominalVoltage * pf);
    } else {
      currentAmps = tgtLoadWatts / nominalVoltage;
    }
    currentAmps = Number(currentAmps.toFixed(2));

    // Calculate voltage drop
    const drop = calculateVoltageDrop(conn.lengthMeters, conductor, currentAmps, phase, nominalVoltage, pf);
    const activeWatts = tgtLoadWatts;
    const apparentVa = phase === '3PHASE_400V' 
      ? Math.sqrt(3) * nominalVoltage * currentAmps 
      : nominalVoltage * currentAmps;
    const reactiveVar = Math.sqrt(Math.max(0, apparentVa * apparentVa - activeWatts * activeWatts));

    const isAmpacityExceeded = currentAmps > conductor.maxAmpacity75C;

    // NEC 210.19 & 215.2 Compliance checks
    let status: CableVoltageDropResult['necCompliance']['status'] = 'EXCELLENT';
    let complianceMsg = `Voltage drop ${drop.voltageDropPercent}% is within optimal NEC & IEC 60364 limits (<=3%).`;

    if (drop.voltageDropPercent > 5.0) {
      status = 'VIOLATION_CRITICAL';
      complianceMsg = `CRITICAL VIOLATION: Voltage drop ${drop.voltageDropPercent}% exceeds 5% NEC maximum total threshold. Equipment malfunction, brownout, and excessive I²R thermal heating will occur.`;
    } else if (drop.voltageDropPercent > 3.0) {
      status = 'WARNING_HIGH_DROP';
      complianceMsg = `WARNING: Voltage drop ${drop.voltageDropPercent}% exceeds 3% branch circuit standard. Consider increasing conductor gauge.`;
    } else if (drop.voltageDropPercent > 2.0) {
      status = 'COMPLIANT';
    }

    const cableResult: CableVoltageDropResult = {
      connectionId: conn.id,
      sourceNodeId: conn.sourceComponentId,
      targetNodeId: conn.targetComponentId,
      cableLengthMeters: conn.lengthMeters,
      conductorSize: conductor.awgEquivalent,
      conductorSpec: conductor,
      phaseSystem: phase,
      nominalVoltage,
      loadCurrentAmps: currentAmps,
      powerFactor: pf,
      resistanceOhm: drop.resistanceOhm,
      reactanceOhm: drop.reactanceOhm,
      impedanceOhm: drop.impedanceOhm,
      voltageDropVolts: drop.voltageDropVolts,
      voltageDropPercent: drop.voltageDropPercent,
      receivingVoltage: drop.receivingVoltage,
      activePowerWatts: Number(activeWatts.toFixed(0)),
      reactivePowerVar: Number(reactiveVar.toFixed(0)),
      apparentPowerVa: Number(apparentVa.toFixed(0)),
      isAmpacityExceeded,
      necCompliance: {
        isBranchCompliant: drop.voltageDropPercent <= 3.0,
        isFeederCompliant: drop.voltageDropPercent <= 3.0,
        isTotalCompliant: drop.voltageDropPercent <= 5.0,
        status,
        message: complianceMsg
      }
    };

    cableResults[conn.id] = cableResult;

    // Update connection simulation state telemetry
    conn.simulationState.voltageDrop = drop.voltageDropVolts;
    conn.simulationState.flowRate = currentAmps;
    conn.simulationState.saturationPercent = Math.min(100, (currentAmps / conductor.maxAmpacity75C) * 100);

    // Track max drop
    if (drop.voltageDropPercent > maxVoltageDropPercent) {
      maxVoltageDropPercent = drop.voltageDropPercent;
      worstDropConnId = conn.id;
    }

    // Update target node receiving telemetry
    if (nodeResults[tgtNode.id]) {
      nodeResults[tgtNode.id].nominalVoltage = nominalVoltage;
      nodeResults[tgtNode.id].phaseSystem = phase;
      nodeResults[tgtNode.id].incomingVoltage = drop.receivingVoltage;
      nodeResults[tgtNode.id].totalVoltageDropFromSource = drop.voltageDropVolts;
      nodeResults[tgtNode.id].totalVoltageDropPercent = drop.voltageDropPercent;
      nodeResults[tgtNode.id].operatingCurrentAmps = currentAmps;
      nodeResults[tgtNode.id].upstreamConnectionId = conn.id;

      // Breaker trip check
      const ratedBrk = nodeResults[tgtNode.id].ratedBreakerAmps;
      if (ratedBrk) {
        nodeResults[tgtNode.id].breakerLoadingPercent = Number(((currentAmps / ratedBrk) * 100).toFixed(1));
        if (currentAmps > ratedBrk) {
          nodeResults[tgtNode.id].isBreakerTripped = true;
          violations.push({
            code: 'ELEC_BREAKER_OVERLOAD',
            severity: 'CRITICAL',
            title: `Breaker Overload: ${tgtNode.name}`,
            message: `Operating current ${currentAmps}A exceeds rated breaker trip threshold of ${ratedBrk}A (100% capacity). Breaker will thermally trip.`,
            affectedNodeIds: [tgtNode.id],
            affectedConnectionIds: [conn.id],
            suggestedFix: `Upgrade circuit breaker or redistribute electrical load across adjacent sub-panels.`
          });
        }
      }
    }

    // Flag Ampacity Violations
    if (isAmpacityExceeded) {
      violations.push({
        code: 'ELEC_AMPACITY_EXCEEDED',
        severity: 'CRITICAL',
        title: `Conductor Ampacity Exceeded: ${conn.id}`,
        message: `Cable carrying ${currentAmps}A exceeds conductor thermal ampacity limit of ${conductor.maxAmpacity75C}A (${conductor.crossSectionMm2}mm² / ${conductor.awgEquivalent}). Fire hazard per NEC Article 310!`,
        affectedNodeIds: [conn.sourceComponentId, conn.targetComponentId],
        affectedConnectionIds: [conn.id],
        suggestedFix: `Upsize cable cross-section to at least ${conductor.crossSectionMm2 >= 16 ? '50mm²' : '16mm²'} or install parallel conductor runs.`
      });
    }

    // Flag Voltage Drop Violations
    if (drop.voltageDropPercent > 3.0) {
      violations.push({
        code: 'ELEC_VOLTAGE_DROP_EXCEEDED',
        severity: drop.voltageDropPercent > 5.0 ? 'CRITICAL' : 'WARNING',
        title: `Voltage Drop ${drop.voltageDropPercent}% on ${conn.id}`,
        message: `Cable length of ${conn.lengthMeters}m produces ${drop.voltageDropVolts}V drop (${drop.voltageDropPercent}% of ${nominalVoltage}V). Violates NEC 210.19 branch circuit 3% limit.`,
        affectedNodeIds: [conn.sourceComponentId, conn.targetComponentId],
        affectedConnectionIds: [conn.id],
        suggestedFix: `Upsize conductor gauge from ${conductor.crossSectionMm2}mm² to next standard size or relocate transformer/PDU closer to load.`
      });
    }
  }

  const totalCurrent = Object.values(cableResults).reduce((sum, c) => sum + c.loadCurrentAmps, 0);

  return {
    solvedAt: new Date().toISOString(),
    sourceNodes: activeSources,
    totalConnectedLoadWatts: Number(totalConnectedWatts.toFixed(0)),
    totalOperatingLoadWatts: Number(totalOperatingWatts.toFixed(0)),
    totalOperatingCurrentAmps: Number(totalCurrent.toFixed(1)),
    maxVoltageDropPercent: Number(maxVoltageDropPercent.toFixed(2)),
    worstDropConnectionId: worstDropConnId,
    hasAmpacityViolation: violations.some(v => v.code === 'ELEC_AMPACITY_EXCEEDED'),
    hasVoltageDropViolation: violations.some(v => v.code === 'ELEC_VOLTAGE_DROP_EXCEEDED'),
    hasBreakerOverload: violations.some(v => v.code === 'ELEC_BREAKER_OVERLOAD'),
    cableResults,
    nodeResults,
    violations
  };
}
