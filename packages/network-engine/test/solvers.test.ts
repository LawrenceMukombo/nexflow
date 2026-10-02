import { 
  solveElectricalNetwork, 
  calculateVoltageDrop, 
  CONDUCTOR_CATALOG,
  solveHydraulicNetwork,
  calculatePipeFlowLoss,
  PIPE_SIZES,
  PIPE_MATERIALS,
  FLUID_PROPERTIES,
  solveSolarNetwork,
  calculatePvStringYield,
  PV_MODULE_CATALOG,
  INVERTER_CATALOG,
  validateNetworkGraph
} from '../src/index';
import { EngineeringGraph } from '@omniflow/shared-types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${msg}`);
}

console.log('=== RUNNING OMNIFLOW MULTI-DOMAIN PHYSICS SOLVER TEST SUITE ===');

// ─────────────────────────────────────────────────────────────
// 1. ELECTRICAL VOLTAGE DROP & LOAD FLOW PHYSICS
// ─────────────────────────────────────────────────────────────
console.log('\n--- 1. Testing Electrical Physics Solver (IEEE 141 / NEC 210/215) ---');

// Test 1.1: 3-Phase 400V 70mm² copper cable over 50 meters with 60A load at 0.92 PF
const drop3Phase = calculateVoltageDrop(
  50, // 50m
  CONDUCTOR_CATALOG['70.0mm2'],
  60, // 60A
  '3PHASE_400V',
  400,
  0.92
);
assert(drop3Phase.voltageDropVolts > 0, `3-Phase voltage drop is positive: ${drop3Phase.voltageDropVolts}V`);
assert(drop3Phase.voltageDropPercent < 3.0, `Voltage drop ${drop3Phase.voltageDropPercent}% complies with NEC 3% branch limit`);
assert(drop3Phase.receivingVoltage === Number((400 - drop3Phase.voltageDropVolts).toFixed(2)), 'Receiving voltage equals Source minus Vdrop');

// Test 1.2: Long branch circuit violation (4.0mm² cable, 120 meters, 20A load at 230V 1-phase)
const dropLongBranch = calculateVoltageDrop(
  120, // 120m run
  CONDUCTOR_CATALOG['4.0mm2'],
  20,  // 20A load
  '1PHASE_230V',
  230,
  0.90
);
assert(dropLongBranch.voltageDropPercent > 5.0, `Long branch produces ${dropLongBranch.voltageDropPercent}% drop exceeding 5% NEC total threshold`);

// Test 1.3: Electrical Network Load Flow Solver on Graph
const testElecGraph: EngineeringGraph = {
  schemaVersion: '1.0.0',
  designId: 'test_elec_design',
  name: 'Electrical Test Substation',
  domain: 'ELECTRICAL',
  nodes: {
    'trans_01': {
      id: 'trans_01',
      designId: 'test_elec_design',
      domain: 'ELECTRICAL',
      type: 'TRANSFORMER_DRY_500KVA',
      name: 'Main Substation Transformer 500kVA',
      tag: 'XFMR-01',
      position: { x: 100, y: 100 },
      ports: [
        { id: 'p_xfmr_out', nodeId: 'trans_01', name: 'OUT_400V', portIndex: 0, type: 'AC_TERMINAL', direction: 'output', compatiblePortTypes: ['AC_TERMINAL'], properties: {}, occupiedByConnectionId: 'cable_main' }
      ],
      properties: { isPowerSource: true, outputVoltage: 400 },
      simulationState: { status: 'ONLINE', telemetry: {} }
    },
    'pdu_01': {
      id: 'pdu_01',
      designId: 'test_elec_design',
      domain: 'ELECTRICAL',
      type: 'POWER_DISTRIBUTION_UNIT_PDU',
      name: 'Server Room Main PDU 100kW',
      tag: 'PDU-01',
      position: { x: 400, y: 100 },
      ports: [
        { id: 'p_pdu_in', nodeId: 'pdu_01', name: 'IN_400V', portIndex: 0, type: 'AC_TERMINAL', direction: 'input', compatiblePortTypes: ['AC_TERMINAL'], properties: {}, occupiedByConnectionId: 'cable_main' }
      ],
      properties: { ratedPowerWatts: 45000, demandFactor: 0.85, powerFactor: 0.92, breakerRatingAmps: 100 },
      simulationState: { status: 'ONLINE', telemetry: {} }
    }
  },
  connections: {
    'cable_main': {
      id: 'cable_main',
      designId: 'test_elec_design',
      domain: 'ELECTRICAL',
      sourceComponentId: 'trans_01',
      sourcePortId: 'p_xfmr_out',
      targetComponentId: 'pdu_01',
      targetPortId: 'p_pdu_in',
      connectionType: 'FEEDER_MAIN_70MM',
      lengthMeters: 45,
      properties: { conductorSize: '70.0mm2' },
      simulationState: {}
    }
  },
  metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: '1.0' }
};

const elecSolution = solveElectricalNetwork(testElecGraph);
assert(elecSolution.totalConnectedLoadWatts === 45000, 'Total connected electrical load is 45,000 Watts');
assert(elecSolution.totalOperatingLoadWatts === 38250, 'Operating load (85% demand factor) is 38,250 Watts');
assert(elecSolution.cableResults['cable_main'] !== undefined, 'Cable main flow solved');
assert(elecSolution.cableResults['cable_main'].necCompliance.status === 'EXCELLENT', 'Main feeder complies with NEC 3% drop limit');

// ─────────────────────────────────────────────────────────────
// 2. HYDRAULIC DARCY-WEISBACH & CHILLED WATER PHYSICS
// ─────────────────────────────────────────────────────────────
console.log('\n--- 2. Testing Hydraulic & Chilled Water Solver (Darcy-Weisbach / Swamee-Jain) ---');

// Test 2.1: Chilled Water 40 L/s through DN150 (6") Sch 40 Steel pipe over 80 meters
const pipeLoss = calculatePipeFlowLoss(
  80, // 80m
  40, // 40 L/s (~634 GPM)
  PIPE_SIZES.DN150,
  PIPE_MATERIALS.STEEL_CARBON,
  FLUID_PROPERTIES.CHILLED_WATER_7C
);

assert(pipeLoss.velocityMPerS > 1.2 && pipeLoss.velocityMPerS < 2.5, `Chilled water velocity (${pipeLoss.velocityMPerS} m/s) is within ASHRAE optimal hydronic range`);
assert(pipeLoss.flowRegime === 'TURBULENT', 'Pipe flow is fully turbulent (Re >> 4000)');
assert(pipeLoss.reynoldsNumber > 100000, `High Reynolds number: ${pipeLoss.reynoldsNumber}`);
assert(pipeLoss.frictionFactor > 0.015 && pipeLoss.frictionFactor < 0.035, `Darcy friction factor ${pipeLoss.frictionFactor} calculated accurately via Swamee-Jain`);
assert(pipeLoss.thermalCapacityKw !== undefined && pipeLoss.thermalCapacityKw > 1000, `Thermal cooling capacity is ${pipeLoss.thermalCapacityKw} kW`);
assert(pipeLoss.coolingTonsRefrigeration !== undefined && pipeLoss.coolingTonsRefrigeration > 300, `Equivalent to ${pipeLoss.coolingTonsRefrigeration} Tons of Refrigeration (TR)`);

// Test 2.2: Pipe Sizing Erosion Hazard (undersized DN40 pipe for 30 L/s flow)
const undersizedPipe = calculatePipeFlowLoss(
  50,
  30, // 30 L/s in 1.5" pipe
  PIPE_SIZES.DN40,
  PIPE_MATERIALS.COPPER,
  FLUID_PROPERTIES.POTABLE_WATER_20C
);
assert(undersizedPipe.ashraeVelocityCompliance.status === 'CRITICAL_EROSION_RISK', 'Detects critical pipe wall erosion risk when v > 3.0 m/s');

// ─────────────────────────────────────────────────────────────
// 3. SOLAR PV YIELD & BESS BATTERY STORAGE PHYSICS
// ─────────────────────────────────────────────────────────────
console.log('\n--- 3. Testing Solar PV String & BESS Solver ---');

// Test 3.1: 18 Modules in series, 2 parallel strings (550W bifacial)
const pvYield = calculatePvStringYield(
  18,
  2,
  PV_MODULE_CATALOG.TIER1_MONO_550W,
  INVERTER_CATALOG.COMMERCIAL_STRING_50KW,
  32,  // 32°C ambient
  1000 // 1000 W/m² irradiance
);

assert(pvYield.totalModules === 36, 'Total modules equals 36 (18 series x 2 parallel)');
assert(pvYield.totalPeakDcPowerKw === 19.8, 'Total peak DC capacity equals 19.80 kWp');
assert(pvYield.coldVocMaxVolts < 1000, `Extreme cold string Voc (${pvYield.coldVocMaxVolts}V) is below 1000V inverter maximum limit`);
assert(pvYield.inverterMatching.isColdVocSafe === true, 'Inverter cold open-circuit voltage check is safe');
assert(pvYield.dailyYieldKwh > 70, `Daily energy generation is ${pvYield.dailyYieldKwh} kWh/day`);
assert(pvYield.avoidedCo2TonsPerYear > 20, `Avoided CO2 emissions calculated at ${pvYield.avoidedCo2TonsPerYear} tons/year`);

// ─────────────────────────────────────────────────────────────
// 4. MULTI-DOMAIN GRAPH VALIDATION & COMPLIANCE RULES
// ─────────────────────────────────────────────────────────────
console.log('\n--- 4. Testing Multi-Domain Automated Graph Validation ---');

const issues = validateNetworkGraph(testElecGraph);
assert(Array.isArray(issues), 'Validation issues returned as array');
console.log(`Validation generated ${issues.length} audit issues.`);

console.log('\n======================================================');
console.log('🎉 ALL MULTI-DOMAIN ENGINEERING PHYSICS TESTS PASSED!');
console.log('======================================================\n');
