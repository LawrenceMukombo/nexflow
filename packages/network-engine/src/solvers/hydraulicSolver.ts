/**
 * Hydraulic Pipe Flow & Hydronic Chilled Water Physics Solver
 * Formulated with Darcy-Weisbach friction loss, Swamee-Jain Colebrook approximation,
 * minor fitting losses, and ASHRAE Fundamentals chilled water thermal equations.
 */

import { EngineeringGraph, EngineeringConnection } from '@omniflow/shared-types';

export interface PipeMaterialSpec {
  material: 'PVC' | 'COPPER' | 'STEEL_CARBON' | 'STEEL_GALVANIZED' | 'CAST_IRON';
  roughnessMeters: number; // Absolute roughness ε in meters
  name: string;
}

export const PIPE_MATERIALS: Record<string, PipeMaterialSpec> = {
  PVC: {
    material: 'PVC',
    roughnessMeters: 0.0000015, // 0.0015 mm
    name: 'Polyvinyl Chloride (PVC / CPVC)'
  },
  COPPER: {
    material: 'COPPER',
    roughnessMeters: 0.0000015, // 0.0015 mm
    name: 'Drawn Copper Tubing (Type L/K)'
  },
  STEEL_CARBON: {
    material: 'STEEL_CARBON',
    roughnessMeters: 0.000045,  // 0.045 mm
    name: 'Commercial Welded Carbon Steel (Schedule 40)'
  },
  STEEL_GALVANIZED: {
    material: 'STEEL_GALVANIZED',
    roughnessMeters: 0.00015,   // 0.15 mm
    name: 'Galvanized Steel Pipe'
  },
  CAST_IRON: {
    material: 'CAST_IRON',
    roughnessMeters: 0.00026,   // 0.26 mm
    name: 'Ductile Cast Iron'
  }
};

export interface PipeSizeSpec {
  nominalDn: number;          // Nominal Diameter in mm (e.g. DN50)
  insideDiameterMeters: number; // Inside diameter in meters (e.g. 0.0525 m)
  imperialNominal: string;    // e.g. '2 inch'
}

export const PIPE_SIZES: Record<string, PipeSizeSpec> = {
  DN15:  { nominalDn: 15,  insideDiameterMeters: 0.016, imperialNominal: '1/2"' },
  DN20:  { nominalDn: 20,  insideDiameterMeters: 0.021, imperialNominal: '3/4"' },
  DN25:  { nominalDn: 25,  insideDiameterMeters: 0.027, imperialNominal: '1"' },
  DN32:  { nominalDn: 32,  insideDiameterMeters: 0.035, imperialNominal: '1-1/4"' },
  DN40:  { nominalDn: 40,  insideDiameterMeters: 0.041, imperialNominal: '1-1/2"' },
  DN50:  { nominalDn: 50,  insideDiameterMeters: 0.0525, imperialNominal: '2"' },
  DN65:  { nominalDn: 65,  insideDiameterMeters: 0.066, imperialNominal: '2-1/2"' },
  DN80:  { nominalDn: 80,  insideDiameterMeters: 0.078, imperialNominal: '3"' },
  DN100: { nominalDn: 100, insideDiameterMeters: 0.102, imperialNominal: '4"' },
  DN125: { nominalDn: 125, insideDiameterMeters: 0.127, imperialNominal: '5"' },
  DN150: { nominalDn: 150, insideDiameterMeters: 0.154, imperialNominal: '6"' },
  DN200: { nominalDn: 200, insideDiameterMeters: 0.203, imperialNominal: '8"' },
  DN250: { nominalDn: 250, insideDiameterMeters: 0.254, imperialNominal: '10"' },
  DN300: { nominalDn: 300, insideDiameterMeters: 0.305, imperialNominal: '12"' }
};

export type FluidMediumType = 'POTABLE_WATER_20C' | 'CHILLED_WATER_7C' | 'CONDENSER_WATER_32C' | 'HOT_WATER_60C';

export interface FluidProperties {
  type: FluidMediumType;
  densityKgPerM3: number;     // ρ in kg/m³
  dynamicViscosityPaS: number;// μ in Pa·s
  specificHeatKJPerKgK: number;// Cp in kJ/(kg·K)
}

export const FLUID_PROPERTIES: Record<FluidMediumType, FluidProperties> = {
  POTABLE_WATER_20C: {
    type: 'POTABLE_WATER_20C',
    densityKgPerM3: 998.2,
    dynamicViscosityPaS: 0.001002,
    specificHeatKJPerKgK: 4.184
  },
  CHILLED_WATER_7C: {
    type: 'CHILLED_WATER_7C',
    densityKgPerM3: 1000.0,
    dynamicViscosityPaS: 0.001428,
    specificHeatKJPerKgK: 4.195
  },
  CONDENSER_WATER_32C: {
    type: 'CONDENSER_WATER_32C',
    densityKgPerM3: 995.0,
    dynamicViscosityPaS: 0.000769,
    specificHeatKJPerKgK: 4.179
  },
  HOT_WATER_60C: {
    type: 'HOT_WATER_60C',
    densityKgPerM3: 983.2,
    dynamicViscosityPaS: 0.000466,
    specificHeatKJPerKgK: 4.185
  }
};

export interface PipeFrictionResult {
  connectionId: string;
  pipeLengthMeters: number;
  nominalSize: string;
  insideDiameterMeters: number;
  material: string;
  flowRateLps: number;       // Litres per second
  flowRateM3PerS: number;    // m³/s
  flowRateGpm: number;       // US Gallons per minute
  velocityMPerS: number;     // Fluid velocity v (m/s)
  reynoldsNumber: number;    // Re
  flowRegime: 'LAMINAR' | 'TRANSITIONAL' | 'TURBULENT';
  frictionFactor: number;    // Darcy friction factor f
  frictionHeadLossMeters: number; // hf (meters head)
  minorLossHeadMeters: number;    // hm (meters head from valves/elbows)
  totalHeadLossMeters: number;    // h_total (meters)
  pressureDropKPa: number;   // ΔP in kPa
  pressureDropBar: number;   // ΔP in bar
  pressureDropPsi: number;   // ΔP in PSI
  pressureDropPer100mPsi: number;
  thermalCapacityKw?: number;// Q = ṁ * Cp * ΔT
  coolingTonsRefrigeration?: number; // TR
  ashraeVelocityCompliance: {
    status: 'OPTIMAL' | 'ACCEPTABLE' | 'WARNING_HIGH_VELOCITY' | 'WARNING_LOW_VELOCITY' | 'CRITICAL_EROSION_RISK';
    recommendedMinMPerS: number;
    recommendedMaxMPerS: number;
    message: string;
  };
}

export interface NodeHydraulicPressureResult {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  incomingPressurePsi: number;
  incomingPressureBar: number;
  elevationMeters: number;
  flowRateDemandLps: number;
  chilledWaterThermalLoadKw?: number;
  chilledWaterTonsRefrig?: number;
}

export interface HydraulicNetworkSolution {
  solvedAt: string;
  pumpSourceNodeIds: string[];
  totalCirculationFlowLps: number;
  totalCirculationFlowGpm: number;
  maxPressureDropPsi: number;
  totalThermalCoolingCapacityKw: number;
  totalCoolingTonsRefrigeration: number;
  pipeResults: Record<string, PipeFrictionResult>;
  nodeResults: Record<string, NodeHydraulicPressureResult>;
  violations: Array<{
    code: 'PLUMB_PRESSURE_DROP_HIGH' | 'PLUMB_EROSION_VELOCITY' | 'PLUMB_LOW_VELOCITY_SILTING' | 'PLUMB_CAVITATION_RISK';
    severity: 'WARNING' | 'ERROR' | 'CRITICAL';
    title: string;
    message: string;
    affectedNodeIds: string[];
    affectedConnectionIds: string[];
    suggestedFix: string;
  }>;
}

/**
 * Resolves pipe size from connection properties or naming conventions
 */
export function resolvePipeSize(connection: EngineeringConnection): PipeSizeSpec {
  const connType = (connection.connectionType || '').toUpperCase();
  const explicitSize = connection.properties.pipeSize as string;

  if (explicitSize && PIPE_SIZES[explicitSize]) {
    return PIPE_SIZES[explicitSize];
  }

  // Parse by standard pipe keywords
  if (connType.includes('DN300') || connType.includes('12INCH')) return PIPE_SIZES.DN300;
  if (connType.includes('DN250') || connType.includes('10INCH')) return PIPE_SIZES.DN250;
  if (connType.includes('DN200') || connType.includes('8INCH') || connType.includes('CHILLED_MAIN')) return PIPE_SIZES.DN200;
  if (connType.includes('DN150') || connType.includes('6INCH') || connType.includes('CHILLED_RISER')) return PIPE_SIZES.DN150;
  if (connType.includes('DN100') || connType.includes('4INCH')) return PIPE_SIZES.DN100;
  if (connType.includes('DN80') || connType.includes('3INCH')) return PIPE_SIZES.DN80;
  if (connType.includes('DN65') || connType.includes('2.5INCH')) return PIPE_SIZES.DN65;
  if (connType.includes('DN50') || connType.includes('2INCH')) return PIPE_SIZES.DN50;
  if (connType.includes('DN40') || connType.includes('1.5INCH')) return PIPE_SIZES.DN40;
  if (connType.includes('DN32') || connType.includes('1.25INCH')) return PIPE_SIZES.DN32;
  if (connType.includes('DN25') || connType.includes('1INCH')) return PIPE_SIZES.DN25;
  if (connType.includes('DN20') || connType.includes('0.75INCH')) return PIPE_SIZES.DN20;

  // Default for chilled water loops: DN100 (4")
  if (connType.includes('CHILLED') || connType.includes('COOLING')) return PIPE_SIZES.DN100;

  // Default for building plumbing water: DN50 (2")
  return PIPE_SIZES.DN50;
}

/**
 * Resolves pipe material
 */
export function resolvePipeMaterial(connection: EngineeringConnection): PipeMaterialSpec {
  const connType = (connection.connectionType || '').toUpperCase();
  if (connType.includes('COPPER')) return PIPE_MATERIALS.COPPER;
  if (connType.includes('PVC') || connType.includes('CPVC')) return PIPE_MATERIALS.PVC;
  if (connType.includes('GALVANIZED')) return PIPE_MATERIALS.STEEL_GALVANIZED;
  if (connType.includes('CAST_IRON')) return PIPE_MATERIALS.CAST_IRON;

  // Default commercial chilled water and heating pipe is welded carbon steel Sch 40
  return PIPE_MATERIALS.STEEL_CARBON;
}

/**
 * Calculates Darcy-Weisbach Pipe Flow & Friction Pressure Drop
 */
export function calculatePipeFlowLoss(
  pipeLengthMeters: number,
  flowRateLps: number,
  pipeSize: PipeSizeSpec,
  pipeMaterial: PipeMaterialSpec,
  fluid: FluidProperties = FLUID_PROPERTIES.CHILLED_WATER_7C,
  minorLossCoeffK: number = 2.5, // Equivalent to a couple elbows and isolation valves
  deltaTChilledWaterC: number = 7.0 // Standard 7°C supply, 14°C return
): PipeFrictionResult {
  const g = 9.80665; // m/s²
  const D = pipeSize.insideDiameterMeters;
  const L = Math.max(0.5, pipeLengthMeters);
  const eps = pipeMaterial.roughnessMeters;

  // Volumetric flow rate in m³/s (1 L/s = 0.001 m³/s)
  const Q = (flowRateLps / 1000);
  const GPM = flowRateLps * 15.8503;

  // Pipe Cross-Sectional Area A = π * D² / 4
  const A = (Math.PI * D * D) / 4;

  // Velocity v = Q / A (m/s)
  const v = Q / A;

  // Reynolds Number: Re = (ρ * v * D) / μ
  const Re = (fluid.densityKgPerM3 * v * D) / fluid.dynamicViscosityPaS;

  let flowRegime: PipeFrictionResult['flowRegime'] = 'TURBULENT';
  let f = 0.02; // initial estimate

  if (Re < 2300) {
    flowRegime = 'LAMINAR';
    // Hagen-Poiseuille laminar friction factor
    f = Re > 0 ? 64 / Re : 0.02;
  } else if (Re < 4000) {
    flowRegime = 'TRANSITIONAL';
    // Interpolate between laminar and turbulent
    f = 0.035;
  } else {
    flowRegime = 'TURBULENT';
    // Swamee-Jain formula (explicit approximation of implicit Colebrook-White equation):
    // f = 0.25 / [log10( (ε / (3.7 * D)) + (5.74 / (Re^0.9)) )]²
    const term1 = eps / (3.7 * D);
    const term2 = 5.74 / Math.pow(Re, 0.9);
    const logTerm = Math.log10(term1 + term2);
    f = 0.25 / (logTerm * logTerm);
  }

  // Darcy-Weisbach head loss: hf = f * (L / D) * (v² / (2 * g))
  const velocityHead = (v * v) / (2 * g);
  const hf = f * (L / D) * velocityHead;

  // Minor losses: hm = K * (v² / (2 * g))
  const hm = minorLossCoeffK * velocityHead;

  // Total head loss
  const totalHeadLoss = hf + hm;

  // Pressure drop ΔP = ρ * g * h_total (Pascals)
  const deltaPPa = fluid.densityKgPerM3 * g * totalHeadLoss;
  const deltaPKPa = deltaPPa / 1000;
  const deltaPBar = deltaPKPa / 100;
  const deltaPPsi = deltaPKPa * 0.145038;
  const deltaPPsiPer100m = (deltaPPsi / L) * 100;

  // Thermal capacity for HVAC chilled/hot water: Q = ṁ * Cp * ΔT
  // ṁ = ρ * Q (kg/s)
  const massFlowKgPerS = fluid.densityKgPerM3 * Q;
  const thermalKw = massFlowKgPerS * fluid.specificHeatKJPerKgK * deltaTChilledWaterC;
  const coolingTR = thermalKw / 3.51685;

  // ASHRAE 90.1 Velocity criteria check
  let velStatus: PipeFrictionResult['ashraeVelocityCompliance']['status'] = 'OPTIMAL';
  let velMsg = `Velocity ${v.toFixed(2)} m/s is within optimal hydronic limits (1.2 - 2.4 m/s). Minimal pumping power and erosion.`;

  if (v > 3.0) {
    velStatus = 'CRITICAL_EROSION_RISK';
    velMsg = `CRITICAL: Velocity ${v.toFixed(2)} m/s exceeds 3.0 m/s erosion threshold. High risk of pipe wall erosion, acoustic cavitation noise, and hydraulic hammer.`;
  } else if (v > 2.4) {
    velStatus = 'WARNING_HIGH_VELOCITY';
    velMsg = `WARNING: Velocity ${v.toFixed(2)} m/s exceeds recommended ASHRAE 2.4 m/s limit. Pumping head loss will be elevated.`;
  } else if (v < 0.6 && flowRateLps > 0.5) {
    velStatus = 'WARNING_LOW_VELOCITY';
    velMsg = `WARNING: Low velocity (${v.toFixed(2)} m/s < 0.6 m/s). Risk of particulate silting, sediment deposit, and trapped air pockets in piping.`;
  } else if (v >= 0.6 && v <= 2.4) {
    velStatus = 'ACCEPTABLE';
  }

  return {
    connectionId: '',
    pipeLengthMeters: L,
    nominalSize: pipeSize.imperialNominal,
    insideDiameterMeters: D,
    material: pipeMaterial.name,
    flowRateLps: Number(flowRateLps.toFixed(2)),
    flowRateM3PerS: Number(Q.toFixed(6)),
    flowRateGpm: Number(GPM.toFixed(1)),
    velocityMPerS: Number(v.toFixed(2)),
    reynoldsNumber: Math.round(Re),
    flowRegime,
    frictionFactor: Number(f.toFixed(4)),
    frictionHeadLossMeters: Number(hf.toFixed(3)),
    minorLossHeadMeters: Number(hm.toFixed(3)),
    totalHeadLossMeters: Number(totalHeadLoss.toFixed(3)),
    pressureDropKPa: Number(deltaPKPa.toFixed(2)),
    pressureDropBar: Number(deltaPBar.toFixed(3)),
    pressureDropPsi: Number(deltaPPsi.toFixed(2)),
    pressureDropPer100mPsi: Number(deltaPPsiPer100m.toFixed(2)),
    thermalCapacityKw: Number(thermalKw.toFixed(1)),
    coolingTonsRefrigeration: Number(coolingTR.toFixed(1)),
    ashraeVelocityCompliance: {
      status: velStatus,
      recommendedMinMPerS: 1.2,
      recommendedMaxMPerS: 2.4,
      message: velMsg
    }
  };
}

/**
 * Solves Hydraulic & Plumbing Network across the engineering graph
 */
export function solveHydraulicNetwork(graph: EngineeringGraph): HydraulicNetworkSolution {
  const nodes = Object.values(graph.nodes);
  const connections = Object.values(graph.connections);

  const plumbingNodes = nodes.filter(n =>
    n.domain === 'PLUMBING' ||
    n.type.includes('PUMP') ||
    n.type.includes('CHILLER') ||
    n.type.includes('COOLING_TOWER') ||
    n.type.includes('AHU') ||
    n.type.includes('CRAC') ||
    n.type.includes('BOILER') ||
    n.type.includes('TANK')
  );

  const plumbingConns = connections.filter(c =>
    c.domain === 'PLUMBING' ||
    c.connectionType.toUpperCase().includes('PIPE') ||
    c.connectionType.toUpperCase().includes('CHILLED') ||
    c.connectionType.toUpperCase().includes('WATER')
  );

  const pumpSources = plumbingNodes.filter(n =>
    n.type.includes('PUMP') ||
    n.type.includes('SUPPLY') ||
    n.properties.isPressureSource === true
  ).map(n => n.id);

  const activePumps = pumpSources.length > 0 ? pumpSources : (plumbingNodes.length > 0 ? [plumbingNodes[0].id] : []);

  const pipeResults: Record<string, PipeFrictionResult> = {};
  const nodeResults: Record<string, NodeHydraulicPressureResult> = {};
  const violations: HydraulicNetworkSolution['violations'] = [];

  let totalCircFlowLps = 0;
  let maxPressureDropPsi = 0;
  let totalThermalKw = 0;

  // Initialize node pressure profiles
  for (const node of plumbingNodes) {
    const props = node.properties;
    const demandLps = Number(props.flowRateDemandLps || props.coolingFlowLps || 25);
    const pressurePsi = Number(props.operatingPressurePsi || 65);

    nodeResults[node.id] = {
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      incomingPressurePsi: pressurePsi,
      incomingPressureBar: Number((pressurePsi / 14.5038).toFixed(2)),
      elevationMeters: Number(props.elevationMeters || 0),
      flowRateDemandLps: demandLps
    };
  }

  // Solve pipe runs
  for (const conn of plumbingConns) {
    const srcNode = graph.nodes[conn.sourceComponentId];
    const tgtNode = graph.nodes[conn.targetComponentId];
    if (!srcNode || !tgtNode) continue;

    const pipeSize = resolvePipeSize(conn);
    const pipeMaterial = resolvePipeMaterial(conn);

    // Determine flow rate from properties or target demand
    const assignedFlow = conn.properties.flowRateLps 
      ? Number(conn.properties.flowRateLps)
      : (nodeResults[tgtNode.id]?.flowRateDemandLps || 35);

    const fluid = conn.connectionType.toUpperCase().includes('CONDENSER') 
      ? FLUID_PROPERTIES.CONDENSER_WATER_32C 
      : FLUID_PROPERTIES.CHILLED_WATER_7C;

    const result = calculatePipeFlowLoss(
      conn.lengthMeters,
      assignedFlow,
      pipeSize,
      pipeMaterial,
      fluid
    );
    result.connectionId = conn.id;

    pipeResults[conn.id] = result;
    totalCircFlowLps += assignedFlow;
    if (result.thermalCapacityKw) {
      totalThermalKw += result.thermalCapacityKw;
    }

    // Update connection simulation state telemetry
    conn.simulationState.headLossMeters = result.totalHeadLossMeters;
    conn.simulationState.flowRate = assignedFlow;
    conn.simulationState.saturationPercent = Math.min(100, (result.velocityMPerS / 3.0) * 100);

    if (result.pressureDropPsi > maxPressureDropPsi) {
      maxPressureDropPsi = result.pressureDropPsi;
    }

    // Check high pressure drop
    if (result.pressureDropPsi > 15) {
      violations.push({
        code: 'PLUMB_PRESSURE_DROP_HIGH',
        severity: result.pressureDropPsi > 25 ? 'CRITICAL' : 'WARNING',
        title: `High Hydraulic Friction Loss: ${result.pressureDropPsi} PSI on ${conn.id}`,
        message: `Pipe length ${conn.lengthMeters}m with DN${pipeSize.nominalDn} diameter suffers ${result.pressureDropPsi} PSI head loss at ${assignedFlow} L/s flow. Primary circulation pumps will experience severe head restriction.`,
        affectedNodeIds: [conn.sourceComponentId, conn.targetComponentId],
        affectedConnectionIds: [conn.id],
        suggestedFix: `Upsize pipe diameter from DN${pipeSize.nominalDn} (${pipeSize.imperialNominal}) to DN${pipeSize.nominalDn * 1.5} or shorten run.`
      });
    }

    // Check velocity erosion
    if (result.ashraeVelocityCompliance.status === 'CRITICAL_EROSION_RISK') {
      violations.push({
        code: 'PLUMB_EROSION_VELOCITY',
        severity: 'CRITICAL',
        title: `Erosion Velocity Hazard: ${result.velocityMPerS} m/s on ${conn.id}`,
        message: result.ashraeVelocityCompliance.message,
        affectedNodeIds: [conn.sourceComponentId, conn.targetComponentId],
        affectedConnectionIds: [conn.id],
        suggestedFix: `Increase pipe diameter immediately to reduce fluid velocity below 2.4 m/s.`
      });
    } else if (result.ashraeVelocityCompliance.status === 'WARNING_LOW_VELOCITY') {
      violations.push({
        code: 'PLUMB_LOW_VELOCITY_SILTING',
        severity: 'WARNING',
        title: `Low Fluid Velocity (${result.velocityMPerS} m/s): Silting Hazard`,
        message: result.ashraeVelocityCompliance.message,
        affectedNodeIds: [conn.sourceComponentId, conn.targetComponentId],
        affectedConnectionIds: [conn.id],
        suggestedFix: `Downsize oversized pipe run or increase balancing valve design flow to avoid sediment dropout.`
      });
    }

    // Update target node pressure
    if (nodeResults[tgtNode.id]) {
      const srcPres = nodeResults[srcNode.id]?.incomingPressurePsi || 65;
      const netPres = Math.max(0, srcPres - result.pressureDropPsi);
      nodeResults[tgtNode.id].incomingPressurePsi = Number(netPres.toFixed(1));
      nodeResults[tgtNode.id].incomingPressureBar = Number((netPres / 14.5038).toFixed(2));
      nodeResults[tgtNode.id].chilledWaterThermalLoadKw = result.thermalCapacityKw;
      nodeResults[tgtNode.id].chilledWaterTonsRefrig = result.coolingTonsRefrigeration;
    }
  }

  const totalGpm = totalCircFlowLps * 15.8503;
  const totalTR = totalThermalKw / 3.51685;

  return {
    solvedAt: new Date().toISOString(),
    pumpSourceNodeIds: activePumps,
    totalCirculationFlowLps: Number(totalCircFlowLps.toFixed(1)),
    totalCirculationFlowGpm: Number(totalGpm.toFixed(1)),
    maxPressureDropPsi: Number(maxPressureDropPsi.toFixed(2)),
    totalThermalCoolingCapacityKw: Number(totalThermalKw.toFixed(1)),
    totalCoolingTonsRefrigeration: Number(totalTR.toFixed(1)),
    pipeResults,
    nodeResults,
    violations
  };
}
