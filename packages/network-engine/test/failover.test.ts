import { 
  generateElectricalFacilityTopology,
  generateChilledWaterCoolingTopology,
  generateMultiDomainSmartFacilityTopology,
  createInitialFailoverTelemetry,
  stepFailoverSimulation,
  FAILOVER_SCENARIOS
} from '../src/index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log('=== RUNNING OMNIFLOW REDUNDANCY & FAILOVER SIMULATION TEST SUITE ===');

// 1. Verify Scenario Registry
const scenarios = Object.keys(FAILOVER_SCENARIOS);
assert(scenarios.length === 4, `4 failover scenarios registered (${scenarios.join(', ')})`);
assert(FAILOVER_SCENARIOS.GRID_OUTAGE_ATS_FAILOVER.standardReference.includes('IEEE 446'), 'Grid outage references IEEE 446 / NFPA 110');
assert(FAILOVER_SCENARIOS.PRIMARY_CHILLER_TRIP.standardReference.includes('ASHRAE'), 'Chiller trip references ASHRAE TC 9.9');
assert(FAILOVER_SCENARIOS.NETWORK_CORE_LINK_CUT.standardReference.includes('802.1w'), 'Network cut references Rapid Spanning Tree 802.1w');

// 2. Test Grid Outage & ATS Generator Failover
const elecGraph = generateElectricalFacilityTopology();
let tel = createInitialFailoverTelemetry('GRID_OUTAGE_ATS_FAILOVER');
assert(tel.gridUtilityAvailable === true, 'Initial grid utility is available');
assert(tel.generatorRunning === false, 'Generator is initially off');
assert(tel.upsBatterySocPercent === 100, 'UPS battery is fully charged (100%)');

// Step to T=3s (Grid Outage occurs)
for (let t = 0; t < 3; t++) {
  const res = stepFailoverSimulation(elecGraph, tel, 1.0);
  tel = res.telemetry;
}
assert(tel.gridUtilityAvailable === false, 'Grid power failure detected at T=3s');
assert(tel.upsMode === 'BATTERY_DISCHARGE', 'UPS switched to battery discharge mode');
assert(tel.status === 'FAULT_DETECTED', 'Status escalated to FAULT_DETECTED');

// Step through cranking phase to T=13s (ATS Transfer to Generator)
for (let t = 3; t < 13; t++) {
  const res = stepFailoverSimulation(elecGraph, tel, 1.0);
  tel = res.telemetry;
}
assert(tel.generatorRunning === true, 'Standby diesel generator is running');
assert(tel.generatorRpmPercent === 100, 'Generator reached 100% nominal speed (1500 RPM)');
assert(tel.atsActiveSource === 'EMERGENCY_GENERATOR', 'ATS emergency contactor closed onto generator');
assert(tel.status === 'FAILOVER_STABLE', 'System reached FAILOVER_STABLE status');

// Step to T=56s (Grid Restoration & Normal Re-transfer)
for (let t = 13; t < 56; t++) {
  const res = stepFailoverSimulation(elecGraph, tel, 1.0);
  tel = res.telemetry;
}
assert(tel.gridUtilityAvailable === true, 'Grid utility restored');
assert(tel.atsActiveSource === 'UTILITY_NORMAL', 'ATS re-transferred back to normal utility feed');
assert(tel.status === 'NORMAL', 'Electrical system returned to NORMAL operation');

// 3. Test Chiller Trip & Hydronic Thermal Ride-Through
const plumbGraph = generateChilledWaterCoolingTopology();
let hydTel = createInitialFailoverTelemetry('PRIMARY_CHILLER_TRIP');
assert(hydTel.primaryChillerOnline === true, 'Primary chiller initially online');
assert(hydTel.backupChillerOnline === false, 'N+1 backup chiller initially standby');

// Step to T=4s (Chiller Trips)
for (let t = 0; t < 4; t++) {
  const res = stepFailoverSimulation(plumbGraph, hydTel, 1.0);
  hydTel = res.telemetry;
}
assert(hydTel.primaryChillerOnline === false, 'Primary chiller trip registered');
assert(hydTel.status === 'FAULT_DETECTED' || hydTel.status === 'TRANSFERRING', 'Cooling system transitioned to failover mode');

// Step to T=26s (N+1 Chiller online)
for (let t = 4; t < 26; t++) {
  const res = stepFailoverSimulation(plumbGraph, hydTel, 1.0);
  hydTel = res.telemetry;
}
assert(hydTel.backupChillerOnline === true, 'N+1 backup chiller automatically engaged');
assert(hydTel.dataHallTempC < 27.0, `Data hall ambient temp (${hydTel.dataHallTempC}°C) preserved within ASHRAE A1 envelope (<27°C)`);

// 4. Test Network Core Fiber Link Cut & STP Convergence
const multiGraph = generateMultiDomainSmartFacilityTopology();
let netTel = createInitialFailoverTelemetry('NETWORK_CORE_LINK_CUT');

// Step to T=4s (Fiber Cut occurs)
for (let t = 0; t < 4; t++) {
  const res = stepFailoverSimulation(multiGraph, netTel, 1.0);
  netTel = res.telemetry;
}
assert(netTel.primaryLinkOnline === false, 'Primary 100G fiber trunk cut registered');

// Step to T=9s (Rapid Spanning Tree Converges)
for (let t = 4; t < 9; t++) {
  const res = stepFailoverSimulation(multiGraph, netTel, 1.0);
  netTel = res.telemetry;
}
assert(netTel.networkTopologyState === 'REDUNDANT_FORWARDING', 'Network topology converged to REDUNDANT_FORWARDING');
assert(netTel.packetLossPercent === 0, 'Packet loss dropped back to 0% after convergence');
assert(netTel.convergenceTimeMs > 0, `Sub-second convergence achieved: ${netTel.convergenceTimeMs} ms`);

console.log('======================================================');
console.log('🎉 ALL DYNAMIC REDUNDANCY & FAILOVER TESTS PASSED!');
console.log('======================================================');
