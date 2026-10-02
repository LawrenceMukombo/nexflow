/**
 * Solar Photovoltaic (PV) & Battery Energy Storage (BESS) Physics Solver
 * Mathematical modeling of PV string sizing, cell temperature correction,
 * solar irradiance yield, inverter MPPT window matching, and battery autonomy.
 */

import { EngineeringGraph } from '@omniflow/shared-types';

export interface PvModuleSpec {
  modelName: string;
  manufacturer: string;
  pMpWatts: number;          // Maximum Power at STC (W)
  vMpVolts: number;          // Voltage at Maximum Power (V)
  iMpAmps: number;           // Current at Maximum Power (A)
  vOcVolts: number;          // Open Circuit Voltage (V)
  iScAmps: number;           // Short Circuit Current (A)
  tempCoeffVocPctPerC: number;// β Voc (%/°C, negative)
  tempCoeffPmpPctPerC: number;// γ Pmp (%/°C, negative)
  tempCoeffIscPctPerC: number;// α Isc (%/°C, positive)
  noctC: number;             // Nominal Operating Cell Temperature (°C)
  efficiencyPct: number;
}

export const PV_MODULE_CATALOG: Record<string, PvModuleSpec> = {
  TIER1_MONO_550W: {
    modelName: 'Hi-MO 5 550W Bifacial Dual-Glass',
    manufacturer: 'LONGi Solar',
    pMpWatts: 550,
    vMpVolts: 41.95,
    iMpAmps: 13.12,
    vOcVolts: 49.80,
    iScAmps: 13.98,
    tempCoeffVocPctPerC: -0.27,
    tempCoeffPmpPctPerC: -0.35,
    tempCoeffIscPctPerC: 0.048,
    noctC: 45.0,
    efficiencyPct: 21.5
  },
  COMMERCIAL_660W: {
    modelName: 'Vertex 660W Ultra-High Power Monocrystalline',
    manufacturer: 'Trina Solar',
    pMpWatts: 660,
    vMpVolts: 38.30,
    iMpAmps: 17.24,
    vOcVolts: 46.10,
    iScAmps: 18.28,
    tempCoeffVocPctPerC: -0.25,
    tempCoeffPmpPctPerC: -0.34,
    tempCoeffIscPctPerC: 0.045,
    noctC: 43.0,
    efficiencyPct: 21.6
  }
};

export interface InverterSpec {
  modelName: string;
  maxDcInputVoltage: number;    // Vmax (e.g. 1000V or 1500V)
  mpptVoltageRangeMin: number;  // Vmppt_min (e.g. 200V or 500V)
  mpptVoltageRangeMax: number;  // Vmppt_max (e.g. 850V or 1300V)
  maxInputCurrentPerMpptAmps: number;
  ratedAcOutputKw: number;
  euroEfficiencyPct: number;
}

export const INVERTER_CATALOG: Record<string, InverterSpec> = {
  COMMERCIAL_STRING_50KW: {
    modelName: 'SolarEdge SE50K Three-Phase Inverter',
    maxDcInputVoltage: 1000,
    mpptVoltageRangeMin: 350,
    mpptVoltageRangeMax: 850,
    maxInputCurrentPerMpptAmps: 60,
    ratedAcOutputKw: 50,
    euroEfficiencyPct: 98.3
  },
  UTILITY_CENTRAL_100KW: {
    modelName: 'SMA Sunny Highpower PEAK3 100kW',
    maxDcInputVoltage: 1500,
    mpptVoltageRangeMin: 590,
    mpptVoltageRangeMax: 1350,
    maxInputCurrentPerMpptAmps: 150,
    ratedAcOutputKw: 100,
    euroEfficiencyPct: 98.8
  }
};

export interface BessBatterySpec {
  modelName: string;
  nominalCapacityKwh: number;
  usableCapacityKwh: number;
  maxContinuousDischargeKw: number;
  roundTripEfficiencyPct: number;
  depthOfDischargePct: number;
  chemistry: 'LiFePO4' | 'NMC';
}

export const BESS_CATALOG: Record<string, BessBatterySpec> = {
  TESLA_MEGAPACK_2XL: {
    modelName: 'Tesla Megapack 2XL Grid BESS',
    nominalCapacityKwh: 3916,
    usableCapacityKwh: 3524,
    maxContinuousDischargeKw: 1958,
    roundTripEfficiencyPct: 92.5,
    depthOfDischargePct: 90,
    chemistry: 'LiFePO4'
  },
  COMMERCIAL_BESS_100KWH: {
    modelName: 'BYD Commercial Chess LiFePO4 Energy Cube',
    nominalCapacityKwh: 120,
    usableCapacityKwh: 108,
    maxContinuousDischargeKw: 60,
    roundTripEfficiencyPct: 94.0,
    depthOfDischargePct: 90,
    chemistry: 'LiFePO4'
  }
};

export interface PvStringCalculationResult {
  stringId: string;
  modulesInSeries: number;
  parallelStrings: number;
  totalModules: number;
  totalPeakDcPowerKw: number;
  stcVocVolts: number;
  stcVmpVolts: number;
  stcIscAmps: number;
  stcImpAmps: number;
  coldVocMaxVolts: number;     // at T_cold (-10°C)
  hotVmpMinVolts: number;      // at T_hot (cell 70°C)
  operatingCellTempC: number;
  instantaneousPowerKw: number;
  dailyYieldKwh: number;
  annualYieldMwh: number;
  avoidedCo2TonsPerYear: number;
  inverterMatching: {
    isColdVocSafe: boolean;      // <= Inverter Vmax
    isHotVmpInMpptRange: boolean;// >= Inverter Vmppt_min
    status: 'OPTIMAL_DESIGN' | 'VOLTAGE_WARNING' | 'OVERVOLTAGE_DESTRUCTION_RISK';
    message: string;
  };
}

export interface BessCalculationResult {
  nodeId: string;
  batteryModel: string;
  nominalCapacityKwh: number;
  usableCapacityKwh: number;
  currentSocPct: number;
  storedEnergyKwh: number;
  connectedLoadKw: number;
  autonomyHours: number;
  currentCRate: number;
  isSufficientAutonomy: boolean;
  statusText: string;
}

export interface SolarSystemSolution {
  solvedAt: string;
  totalArrayDcCapacityKw: number;
  totalDailyGenerationKwh: number;
  totalAnnualGenerationMwh: number;
  totalCo2AvoidedTonsPerYear: number;
  totalBessCapacityKwh: number;
  totalBessAutonomyHours: number;
  strings: Record<string, PvStringCalculationResult>;
  batteries: Record<string, BessCalculationResult>;
  violations: Array<{
    code: 'SOLAR_INVERTER_OVERVOLTAGE' | 'SOLAR_STRING_UNDERVOLTAGE' | 'SOLAR_BESS_AUTONOMY_LOW';
    severity: 'WARNING' | 'ERROR' | 'CRITICAL';
    title: string;
    message: string;
    affectedNodeIds: string[];
    affectedConnectionIds: string[];
    suggestedFix: string;
  }>;
}

/**
 * Calculates PV String Electrical Parameters & Yield
 */
export function calculatePvStringYield(
  modulesInSeries: number = 18,
  parallelStrings: number = 2,
  module: PvModuleSpec = PV_MODULE_CATALOG.TIER1_MONO_550W,
  inverter: InverterSpec = INVERTER_CATALOG.COMMERCIAL_STRING_50KW,
  ambientTempC: number = 30.0,
  solarIrradianceWPerM2: number = 1000,
  peakSunHoursPerDay: number = 5.2,
  performanceRatio: number = 0.82
): PvStringCalculationResult {
  const totalModules = modulesInSeries * parallelStrings;
  const totalDcKw = (totalModules * module.pMpWatts) / 1000;

  // Operating Cell Temperature: T_cell = T_ambient + ((NOCT - 20) / 800) * G
  const cellTempC = ambientTempC + ((module.noctC - 20) / 800) * solarIrradianceWPerM2;

  // Cold Design Temperature (-10°C) Voc calculation
  const tColdC = -10;
  const deltaTCold = tColdC - 25;
  const coldVocPerMod = module.vOcVolts * (1 + (module.tempCoeffVocPctPerC / 100) * deltaTCold);
  const stringColdVocMax = modulesInSeries * coldVocPerMod;

  // Hot Design Temperature (70°C cell temp on hot sunny summer day) Vmp calculation
  const tHotC = 70;
  const deltaTHot = tHotC - 25;
  const hotVmpPerMod = module.vMpVolts * (1 + (module.tempCoeffPmpPctPerC / 100) * deltaTHot);
  const stringHotVmpMin = modulesInSeries * hotVmpPerMod;

  // Instantaneous power derated by temperature and irradiance
  const deltaTNow = cellTempC - 25;
  const tempDeratingFactor = 1 + (module.tempCoeffPmpPctPerC / 100) * deltaTNow;
  const irradianceFactor = solarIrradianceWPerM2 / 1000;
  const instantKw = totalDcKw * irradianceFactor * tempDeratingFactor * (inverter.euroEfficiencyPct / 100);

  // Daily and annual energy yield
  const dailyKwh = totalDcKw * peakSunHoursPerDay * performanceRatio;
  const annualMwh = (dailyKwh * 365) / 1000;
  const co2AvoidedTons = (annualMwh * 1000 * 0.72) / 1000; // 0.72 kg CO2 / kWh

  // Inverter voltage window verification
  const isColdVocSafe = stringColdVocMax <= inverter.maxDcInputVoltage;
  const isHotVmpInMpptRange = stringHotVmpMin >= inverter.mpptVoltageRangeMin && stringHotVmpMin <= inverter.mpptVoltageRangeMax;

  let status: PvStringCalculationResult['inverterMatching']['status'] = 'OPTIMAL_DESIGN';
  let matchMsg = `String open-circuit voltage (${stringColdVocMax.toFixed(1)}V) and MPPT voltage (${stringHotVmpMin.toFixed(1)}V) are securely within inverter operating window (${inverter.mpptVoltageRangeMin}V - ${inverter.maxDcInputVoltage}V).`;

  if (!isColdVocSafe) {
    status = 'OVERVOLTAGE_DESTRUCTION_RISK';
    matchMsg = `CRITICAL HAZARD: Max cold string voltage ${stringColdVocMax.toFixed(1)}V exceeds inverter maximum input rating of ${inverter.maxDcInputVoltage}V. Inverter input IGBTs will suffer permanent catastrophic breakdown!`;
  } else if (!isHotVmpInMpptRange) {
    status = 'VOLTAGE_WARNING';
    matchMsg = `WARNING: Hot summer MPPT voltage ${stringHotVmpMin.toFixed(1)}V falls below inverter minimum tracking threshold of ${inverter.mpptVoltageRangeMin}V. Inverter will decouple and harvest zero power during peak solar noon!`;
  }

  return {
    stringId: '',
    modulesInSeries,
    parallelStrings,
    totalModules,
    totalPeakDcPowerKw: Number(totalDcKw.toFixed(2)),
    stcVocVolts: Number((modulesInSeries * module.vOcVolts).toFixed(1)),
    stcVmpVolts: Number((modulesInSeries * module.vMpVolts).toFixed(1)),
    stcIscAmps: Number((parallelStrings * module.iScAmps).toFixed(2)),
    stcImpAmps: Number((parallelStrings * module.iMpAmps).toFixed(2)),
    coldVocMaxVolts: Number(stringColdVocMax.toFixed(1)),
    hotVmpMinVolts: Number(stringHotVmpMin.toFixed(1)),
    operatingCellTempC: Number(cellTempC.toFixed(1)),
    instantaneousPowerKw: Number(Math.max(0, instantKw).toFixed(2)),
    dailyYieldKwh: Number(dailyKwh.toFixed(1)),
    annualYieldMwh: Number(annualMwh.toFixed(1)),
    avoidedCo2TonsPerYear: Number(co2AvoidedTons.toFixed(1)),
    inverterMatching: {
      isColdVocSafe,
      isHotVmpInMpptRange,
      status,
      message: matchMsg
    }
  };
}

/**
 * Solves Solar PV and BESS network parameters across the graph
 */
export function solveSolarNetwork(graph: EngineeringGraph): SolarSystemSolution {
  const nodes = Object.values(graph.nodes);
  const connections = Object.values(graph.connections);

  const solarNodes = nodes.filter(n =>
    n.domain === 'SOLAR' ||
    n.type.includes('SOLAR') ||
    n.type.includes('INVERTER') ||
    n.type.includes('BESS') ||
    n.type.includes('BATTERY')
  );

  const solarConns = connections.filter(c =>
    c.domain === 'SOLAR' ||
    c.connectionType.toUpperCase().includes('SOLAR') ||
    c.connectionType.toUpperCase().includes('DC')
  );

  const strings: Record<string, PvStringCalculationResult> = {};
  const batteries: Record<string, BessCalculationResult> = {};
  const violations: SolarSystemSolution['violations'] = [];

  let totalDcCapKw = 0;
  let totalDailyKwh = 0;
  let totalAnnualMwh = 0;
  let totalCo2Tons = 0;
  let totalBessKwh = 0;
  let totalAutonomyHours = 0;

  // 1. Process PV Panels & Strings
  for (const node of solarNodes) {
    if (node.type.includes('PANEL') || node.type.includes('ARRAY') || node.type.includes('SOLAR')) {
      const series = Number(node.properties.modulesInSeries || 18);
      const parallel = Number(node.properties.parallelStrings || 2);
      const irradiance = Number(node.properties.solarIrradianceWPerM2 || 1000);
      const ambient = Number(node.properties.ambientTempC || 30);

      const strResult = calculatePvStringYield(
        series,
        parallel,
        PV_MODULE_CATALOG.TIER1_MONO_550W,
        INVERTER_CATALOG.COMMERCIAL_STRING_50KW,
        ambient,
        irradiance
      );
      strResult.stringId = node.id;

      strings[node.id] = strResult;
      totalDcCapKw += strResult.totalPeakDcPowerKw;
      totalDailyKwh += strResult.dailyYieldKwh;
      totalAnnualMwh += strResult.annualYieldMwh;
      totalCo2Tons += strResult.avoidedCo2TonsPerYear;

      // Update node telemetry
      node.simulationState.telemetry = {
        totalPeakDcPowerKw: strResult.totalPeakDcPowerKw,
        instantaneousPowerKw: strResult.instantaneousPowerKw,
        coldVocMaxVolts: strResult.coldVocMaxVolts,
        hotVmpMinVolts: strResult.hotVmpMinVolts,
        dailyYieldKwh: strResult.dailyYieldKwh,
        annualYieldMwh: strResult.annualYieldMwh,
        cellTempC: strResult.operatingCellTempC
      };

      // Check inverter safety violations
      if (strResult.inverterMatching.status === 'OVERVOLTAGE_DESTRUCTION_RISK') {
        violations.push({
          code: 'SOLAR_INVERTER_OVERVOLTAGE',
          severity: 'CRITICAL',
          title: `Inverter DC Overvoltage Hazard: ${strResult.coldVocMaxVolts}V`,
          message: strResult.inverterMatching.message,
          affectedNodeIds: [node.id],
          affectedConnectionIds: [],
          suggestedFix: `Reduce number of series modules from ${series} to ${Math.floor(series * 0.85)} to lower string open-circuit voltage below 1000V.`
        });
      } else if (strResult.inverterMatching.status === 'VOLTAGE_WARNING') {
        violations.push({
          code: 'SOLAR_STRING_UNDERVOLTAGE',
          severity: 'WARNING',
          title: `Low MPPT Voltage (${strResult.hotVmpMinVolts}V) on ${node.name}`,
          message: strResult.inverterMatching.message,
          affectedNodeIds: [node.id],
          affectedConnectionIds: [],
          suggestedFix: `Increase modules in series from ${series} to ensure hot MPPT voltage remains within the inverter tracking window.`
        });
      }
    }

    // 2. Process BESS Battery Storage
    if (node.type.includes('BESS') || node.type.includes('BATTERY')) {
      const nomKwh = Number(node.properties.capacityKwh || 120);
      const soc = Number(node.properties.stateOfChargePct || 85);
      const loadKw = Number(node.properties.connectedLoadKw || 20);
      const dod = 0.90;
      const usableKwh = nomKwh * dod;
      const storedKwh = usableKwh * (soc / 100);
      const autonomy = loadKw > 0 ? storedKwh / loadKw : 24;
      const cRate = loadKw > 0 ? loadKw / nomKwh : 0;

      const isSufficient = autonomy >= 4.0; // Standard 4-hour commercial backup reserve

      batteries[node.id] = {
        nodeId: node.id,
        batteryModel: (node.properties.model as string) || 'Industrial LiFePO4 Energy Cube',
        nominalCapacityKwh: nomKwh,
        usableCapacityKwh: usableKwh,
        currentSocPct: soc,
        storedEnergyKwh: Number(storedKwh.toFixed(1)),
        connectedLoadKw: loadKw,
        autonomyHours: Number(autonomy.toFixed(1)),
        currentCRate: Number(cRate.toFixed(2)),
        isSufficientAutonomy: isSufficient,
        statusText: isSufficient ? 'BACKUP_HEALTHY' : 'CRITICAL_RESERVE_LOW'
      };

      totalBessKwh += nomKwh;
      totalAutonomyHours = Math.max(totalAutonomyHours, autonomy);

      // Update node telemetry
      node.simulationState.telemetry = {
        stateOfChargePct: soc,
        usableCapacityKwh: usableKwh,
        storedEnergyKwh: Number(storedKwh.toFixed(1)),
        autonomyHours: Number(autonomy.toFixed(1)),
        currentCRate: Number(cRate.toFixed(2))
      };

      if (!isSufficient) {
        violations.push({
          code: 'SOLAR_BESS_AUTONOMY_LOW',
          severity: 'WARNING',
          title: `Low Battery Autonomy: ${autonomy.toFixed(1)} Hours on ${node.name}`,
          message: `Current stored energy (${storedKwh.toFixed(0)} kWh at ${soc}% SoC) provides only ${autonomy.toFixed(1)} hours of autonomy for a ${loadKw} kW critical facility load. 4.0 hours minimum recommended for facility resiliency.`,
          affectedNodeIds: [node.id],
          affectedConnectionIds: [],
          suggestedFix: `Increase battery storage capacity to at least ${Math.ceil((loadKw * 4) / dod)} kWh or reduce non-essential shed loads.`
        });
      }
    }
  }

  // Update solar connections telemetry
  for (const conn of solarConns) {
    const srcNode = graph.nodes[conn.sourceComponentId];
    if (srcNode && strings[srcNode.id]) {
      const str = strings[srcNode.id];
      conn.simulationState.voltageDrop = 1.2; // typical 1.2V DC drop
      conn.simulationState.flowRate = str.stcImpAmps;
      conn.simulationState.saturationPercent = Math.min(100, (str.instantaneousPowerKw / str.totalPeakDcPowerKw) * 100);
    }
  }

  return {
    solvedAt: new Date().toISOString(),
    totalArrayDcCapacityKw: Number(totalDcCapKw.toFixed(1)),
    totalDailyGenerationKwh: Number(totalDailyKwh.toFixed(1)),
    totalAnnualGenerationMwh: Number(totalAnnualMwh.toFixed(1)),
    totalCo2AvoidedTonsPerYear: Number(totalCo2Tons.toFixed(1)),
    totalBessCapacityKwh: Number(totalBessKwh.toFixed(1)),
    totalBessAutonomyHours: Number(totalAutonomyHours.toFixed(1)),
    strings,
    batteries,
    violations
  };
}
