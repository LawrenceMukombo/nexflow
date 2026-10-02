import { EngineeringGraph } from '@omniflow/shared-types';

export type FailoverScenarioId = 
  | 'GRID_OUTAGE_ATS_FAILOVER'
  | 'PRIMARY_CHILLER_TRIP'
  | 'NETWORK_CORE_LINK_CUT'
  | 'CASCADING_BLACKOUT_STRESS';

export interface FailoverEventLog {
  timestampSec: number;
  subsystem: 'ELECTRICAL' | 'COOLING' | 'NETWORK' | 'AUTOMATION';
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  message: string;
  sourceComponentTag?: string;
}

export interface FailoverTelemetry {
  simulationTimeSec: number;
  scenarioId: FailoverScenarioId;
  isRunning: boolean;
  status: 'NORMAL' | 'FAULT_DETECTED' | 'TRANSFERRING' | 'FAILOVER_STABLE' | 'RECOVERING';
  
  // Electrical metrics
  gridUtilityAvailable: boolean;
  generatorRunning: boolean;
  generatorRpmPercent: number;
  atsActiveSource: 'UTILITY_NORMAL' | 'EMERGENCY_GENERATOR' | 'ISOLATED';
  upsMode: 'ONLINE_NORMAL' | 'BATTERY_DISCHARGE' | 'GENERATOR_FLOAT';
  upsBatterySocPercent: number;
  upsMinutesRemaining: number;
  criticalLoadPowered: boolean;

  // Hydronic / Thermal metrics
  primaryChillerOnline: boolean;
  backupChillerOnline: boolean;
  chilledWaterSupplyTempC: number;
  dataHallTempC: number;
  thermalRunawayWarning: boolean;
  bufferTankReserveMinutes: number;

  // Network metrics
  primaryLinkOnline: boolean;
  backupLinkOnline: boolean;
  networkTopologyState: 'OPTIMAL_FORWARDING' | 'CONVERGING_TCN' | 'REDUNDANT_FORWARDING' | 'ISOLATED';
  convergenceTimeMs: number;
  packetLossPercent: number;

  // Timeline logs
  eventLogs: FailoverEventLog[];
}

export interface FailoverScenarioConfig {
  id: FailoverScenarioId;
  name: string;
  subsystem: string;
  standardReference: string;
  description: string;
  durationSec: number;
}

export const FAILOVER_SCENARIOS: Record<FailoverScenarioId, FailoverScenarioConfig> = {
  GRID_OUTAGE_ATS_FAILOVER: {
    id: 'GRID_OUTAGE_ATS_FAILOVER',
    name: 'Utility Grid Outage & ATS Generator Failover',
    subsystem: 'Electrical Power Infrastructure',
    standardReference: 'IEEE 446 / NFPA 110 Level 1',
    description: 'Simulates instantaneous loss of municipal 400V feed, UPS battery ride-through, diesel generator 10s auto-crank, and ATS closed-transition transfer.',
    durationSec: 60
  },
  PRIMARY_CHILLER_TRIP: {
    id: 'PRIMARY_CHILLER_TRIP',
    name: 'Central Chiller Trip & N+1 Thermal Ride-Through',
    subsystem: 'Hydronic & Precision Cooling',
    standardReference: 'ASHRAE TC 9.9 / Uptime Tier III',
    description: 'Simulates central magnetic liquid chiller mechanical trip, buffer storage tank thermal buffering, and secondary CRAH/chiller unit ramp-up.',
    durationSec: 90
  },
  NETWORK_CORE_LINK_CUT: {
    id: 'NETWORK_CORE_LINK_CUT',
    name: 'Dual-Homed Core Trunk Fiber Cut & STP Failover',
    subsystem: 'Data Network Infrastructure',
    standardReference: 'IEEE 802.1w Rapid Spanning Tree / RFC 2328',
    description: 'Simulates physical severance of 100G primary backbone conduit and millisecond route convergence onto redundant path.',
    durationSec: 45
  },
  CASCADING_BLACKOUT_STRESS: {
    id: 'CASCADING_BLACKOUT_STRESS',
    name: 'Cascading Blackout & Generator Crank Failure',
    subsystem: 'Multi-Domain Disaster Recovery',
    standardReference: 'NFPA 70 Article 700 / Critical Facilities',
    description: 'Worst-case disaster scenario: Grid outage with simultaneous generator fail-to-start, demonstrating automated load shedding and battery exhaustion curves.',
    durationSec: 120
  }
};

/**
 * Initializes telemetry state for a selected failover scenario
 */
export function createInitialFailoverTelemetry(scenarioId: FailoverScenarioId): FailoverTelemetry {
  return {
    simulationTimeSec: 0,
    scenarioId,
    isRunning: false,
    status: 'NORMAL',

    // Electrical
    gridUtilityAvailable: true,
    generatorRunning: false,
    generatorRpmPercent: 0,
    atsActiveSource: 'UTILITY_NORMAL',
    upsMode: 'ONLINE_NORMAL',
    upsBatterySocPercent: 100,
    upsMinutesRemaining: 45,
    criticalLoadPowered: true,

    // Thermal
    primaryChillerOnline: true,
    backupChillerOnline: false,
    chilledWaterSupplyTempC: 7.2,
    dataHallTempC: 21.5,
    thermalRunawayWarning: false,
    bufferTankReserveMinutes: 14.5,

    // Network
    primaryLinkOnline: true,
    backupLinkOnline: true,
    networkTopologyState: 'OPTIMAL_FORWARDING',
    convergenceTimeMs: 0,
    packetLossPercent: 0,

    eventLogs: [
      {
        timestampSec: 0,
        subsystem: 'AUTOMATION',
        severity: 'INFO',
        message: `Initialized ${FAILOVER_SCENARIOS[scenarioId].name} baseline monitoring.`
      }
    ]
  };
}

/**
 * Step the failover simulation forward in time (dt in seconds)
 * Updates physical graph states (failing/recovering nodes & links) and telemetry curves.
 */
export function stepFailoverSimulation(
  graph: EngineeringGraph,
  current: FailoverTelemetry,
  dtSec: number = 1.0
): { telemetry: FailoverTelemetry; graphUpdated: boolean } {
  const t = Number((current.simulationTimeSec + dtSec).toFixed(1));
  const logs = [...current.eventLogs];
  let graphUpdated = false;

  const next: FailoverTelemetry = {
    ...current,
    simulationTimeSec: t
  };

  const addLog = (subsystem: FailoverEventLog['subsystem'], severity: FailoverEventLog['severity'], message: string) => {
    logs.push({ timestampSec: t, subsystem, severity, message });
  };

  // Find candidate devices in graph
  const xfmr = Object.values(graph.nodes).find(n => n.type.includes('TRANSFORMER') || n.tag.includes('XFMR'));
  const gen = Object.values(graph.nodes).find(n => n.type.includes('GENERATOR') || n.tag.includes('GEN'));
  const ats = Object.values(graph.nodes).find(n => n.type.includes('ATS'));
  const ups = Object.values(graph.nodes).find(n => n.type.includes('UPS'));
  const chiller = Object.values(graph.nodes).find(n => n.type.includes('CHILLER') || n.tag.includes('CHLR'));
  const primaryConn = Object.values(graph.connections)[0];

  switch (current.scenarioId) {
    // -------------------------------------------------------------
    // SCENARIO 1: Utility Grid Outage & ATS Generator Failover
    // -------------------------------------------------------------
    case 'GRID_OUTAGE_ATS_FAILOVER': {
      if (t >= 3 && t < 4 && next.gridUtilityAvailable) {
        // T=3s: Grid power trips
        next.gridUtilityAvailable = false;
        next.status = 'FAULT_DETECTED';
        next.upsMode = 'BATTERY_DISCHARGE';
        addLog('ELECTRICAL', 'CRITICAL', 'GRID FAULT: 400V Substation Feeder Voltage Dropped to 0V. ATS initiating emergency sequence.');
        if (xfmr) { xfmr.simulationState.isFailed = true; graphUpdated = true; }
      }

      if (t >= 4 && t < 12) {
        // T=4-12s: Generator cranking
        next.status = 'TRANSFERRING';
        const crankProgress = Math.min(100, (t - 4) * 12.5);
        next.generatorRpmPercent = Math.round(crankProgress);
        next.generatorRunning = crankProgress > 20;

        // UPS discharges slightly
        next.upsBatterySocPercent = Math.max(88, Number((100 - (t - 4) * 0.4).toFixed(1)));
        next.upsMinutesRemaining = Number((38 - (t - 4) * 0.1).toFixed(1));

        if (t === 5) {
          addLog('ELECTRICAL', 'WARNING', 'Standby Diesel Generator Starter Engaged. Engine accelerating to 1500 RPM (50Hz).');
        }
      }

      if (t >= 12 && next.atsActiveSource !== 'EMERGENCY_GENERATOR') {
        // T=12s: Generator at 100% capacity; ATS transfers
        next.generatorRpmPercent = 100;
        next.generatorRunning = true;
        next.atsActiveSource = 'EMERGENCY_GENERATOR';
        next.upsMode = 'GENERATOR_FLOAT';
        next.status = 'FAILOVER_STABLE';
        addLog('ELECTRICAL', 'SUCCESS', 'ATS TRANSFER COMPLETE: Emergency Contactor closed. Critical facility powered via Standby Generator.');
        if (gen) { gen.simulationState.isFailed = false; graphUpdated = true; }
        if (ats) { ats.simulationState.isFailed = false; }
      }

      if (t >= 45 && !next.gridUtilityAvailable) {
        // T=45s: Utility Grid Restored
        next.gridUtilityAvailable = true;
        next.status = 'RECOVERING';
        addLog('ELECTRICAL', 'INFO', 'GRID RESTORED: Utility voltage stable for 10s. Initiating re-transfer sequence.');
        if (xfmr) { xfmr.simulationState.isFailed = false; graphUpdated = true; }
      }

      if (t >= 55 && next.atsActiveSource === 'EMERGENCY_GENERATOR') {
        // T=55s: Re-transfer back to normal utility
        next.atsActiveSource = 'UTILITY_NORMAL';
        next.status = 'NORMAL';
        next.generatorRunning = false;
        next.generatorRpmPercent = 0;
        next.upsMode = 'ONLINE_NORMAL';
        next.upsBatterySocPercent = 100;
        addLog('ELECTRICAL', 'SUCCESS', 'SYSTEM NORMALIZED: ATS switched to Normal Utility. Generator entering 5-minute cool-down.');
      }
      break;
    }

    // -------------------------------------------------------------
    // SCENARIO 2: Central Chiller Trip & N+1 Thermal Ride-Through
    // -------------------------------------------------------------
    case 'PRIMARY_CHILLER_TRIP': {
      if (t >= 3 && t < 4 && next.primaryChillerOnline) {
        // T=3s: Primary chiller trips
        next.primaryChillerOnline = false;
        next.status = 'FAULT_DETECTED';
        addLog('COOLING', 'CRITICAL', 'CHILLER TRIP: Central Chiller Compressor 1 High-Pressure Lockout. Loss of active refrigeration.');
        if (chiller) { chiller.simulationState.isFailed = true; graphUpdated = true; }
      }

      if (t >= 4 && t < 25) {
        // Buffer tank discharging cold water reserve
        next.status = 'TRANSFERRING';
        const elapsed = t - 4;
        next.bufferTankReserveMinutes = Math.max(2, Number((14.5 - (elapsed * 0.15)).toFixed(1)));
        next.chilledWaterSupplyTempC = Number((7.2 + (elapsed * 0.08)).toFixed(2));
        next.dataHallTempC = Number((21.5 + (elapsed * 0.04)).toFixed(2));

        if (t === 10) {
          addLog('COOLING', 'WARNING', 'N+1 Redundant CRAH & Standby Chiller Auto-Start Signal Triggered via BACnet/IP.');
        }
      }

      if (t >= 25 && !next.backupChillerOnline) {
        // Backup chiller online
        next.backupChillerOnline = true;
        next.status = 'FAILOVER_STABLE';
        addLog('COOLING', 'SUCCESS', 'N+1 CHILLER ENGAGED: Magnetic bearing compressor up to speed. Chilled water supply returning to 7.0°C.');
      }

      if (t >= 25 && t < 70) {
        // Temperature stabilizing
        next.chilledWaterSupplyTempC = Math.max(7.0, Number((next.chilledWaterSupplyTempC - 0.05).toFixed(2)));
        next.dataHallTempC = Math.max(21.0, Number((next.dataHallTempC - 0.03).toFixed(2)));
        next.thermalRunawayWarning = false;
      }

      if (t >= 70 && !next.primaryChillerOnline) {
        // Primary chiller reset
        next.primaryChillerOnline = true;
        next.status = 'NORMAL';
        addLog('COOLING', 'INFO', 'Primary Chiller Fault Cleared. Both primary and secondary units operating in balanced dual-lead mode.');
        if (chiller) { chiller.simulationState.isFailed = false; graphUpdated = true; }
      }
      break;
    }

    // -------------------------------------------------------------
    // SCENARIO 3: Dual-Homed Core Trunk Fiber Cut & STP Failover
    // -------------------------------------------------------------
    case 'NETWORK_CORE_LINK_CUT': {
      if (t >= 3 && t < 4 && next.primaryLinkOnline) {
        next.primaryLinkOnline = false;
        next.status = 'FAULT_DETECTED';
        next.networkTopologyState = 'CONVERGING_TCN';
        next.packetLossPercent = 100;
        addLog('NETWORK', 'CRITICAL', 'CARRIER LOSS: Physical 100G MPO-12 Backbone Trunk fiber cut detected. Loss of Light (LOL) alarm.');
        if (primaryConn) { primaryConn.simulationState.isFailed = true; graphUpdated = true; }
      }

      if (t >= 4 && t < 8) {
        next.status = 'TRANSFERRING';
        next.convergenceTimeMs = Math.round((t - 3) * 32);
        next.packetLossPercent = Math.max(0, Math.round(100 - (t - 3) * 22));
      }

      if (t >= 8 && next.networkTopologyState !== 'REDUNDANT_FORWARDING') {
        next.networkTopologyState = 'REDUNDANT_FORWARDING';
        next.status = 'FAILOVER_STABLE';
        next.packetLossPercent = 0;
        next.convergenceTimeMs = 142; // Fast sub-second convergence
        addLog('NETWORK', 'SUCCESS', 'RAPID STP CONVERGED: Alternate secondary link unblocked in 142ms. 0 dropped packets on active sessions.');
      }

      if (t >= 35 && !next.primaryLinkOnline) {
        next.primaryLinkOnline = true;
        next.networkTopologyState = 'OPTIMAL_FORWARDING';
        next.status = 'NORMAL';
        addLog('NETWORK', 'INFO', 'Primary Fiber Link Spliced & Restored. Hitless fallback to primary 100G path completed.');
        if (primaryConn) { primaryConn.simulationState.isFailed = false; graphUpdated = true; }
      }
      break;
    }

    // -------------------------------------------------------------
    // SCENARIO 4: Cascading Blackout & Generator Crank Failure
    // -------------------------------------------------------------
    case 'CASCADING_BLACKOUT_STRESS': {
      if (t >= 3 && next.gridUtilityAvailable) {
        next.gridUtilityAvailable = false;
        next.status = 'FAULT_DETECTED';
        next.upsMode = 'BATTERY_DISCHARGE';
        addLog('ELECTRICAL', 'CRITICAL', 'GRID BLACKOUT: Complete regional grid failure.');
        if (xfmr) { xfmr.simulationState.isFailed = true; graphUpdated = true; }
      }

      if (t >= 8 && t < 15 && !next.generatorRunning) {
        next.status = 'TRANSFERRING';
        if (t === 10) {
          addLog('ELECTRICAL', 'CRITICAL', 'GENERATOR CRANK FAILURE: Over-crank lockout alarm. Fuel solenoid failed to open.');
        }
      }

      if (t >= 15 && t < 80) {
        // Battery discharging rapidly under full load
        const elapsed = t - 15;
        next.upsBatterySocPercent = Math.max(0, Number((96 - elapsed * 1.3).toFixed(1)));
        next.upsMinutesRemaining = Math.max(0, Number((32 - elapsed * 0.45).toFixed(1)));

        if (next.upsBatterySocPercent <= 50 && t === 50) {
          addLog('AUTOMATION', 'WARNING', 'LOAD SHEDDING: Low-priority HVAC and lighting circuits shed to conserve UPS runtime.');
        }
        if (next.upsBatterySocPercent <= 20 && t === 75) {
          addLog('AUTOMATION', 'CRITICAL', 'CRITICAL RUNTIME WARNING: UPS battery reserve at 20%. Initiating graceful server OS shutdowns.');
        }
        if (next.upsBatterySocPercent <= 0 && ups) {
          ups.simulationState.isFailed = true;
          graphUpdated = true;
        }
      }

      if (t >= 90) {
        // Emergency utility recovery
        next.gridUtilityAvailable = true;
        next.generatorRunning = false;
        next.upsMode = 'ONLINE_NORMAL';
        next.upsBatterySocPercent = 100;
        next.status = 'NORMAL';
        addLog('ELECTRICAL', 'SUCCESS', 'Auxiliary Grid Feed Energized. Disaster recovery sequence terminated successfully.');
        if (xfmr) { xfmr.simulationState.isFailed = false; graphUpdated = true; }
      }
      break;
    }
  }

  next.eventLogs = logs;
  return { telemetry: next, graphUpdated };
}
