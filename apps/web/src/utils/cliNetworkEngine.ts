import { EngineeringGraph, EngineeringComponent } from '@omniflow/shared-types';
import { checkNodeNetworkConfig, isValidIPv4, findShortestPath } from '@omniflow/network-engine';

export interface CliCommandStep {
  text: string;
  delayMs: number;
  isReply?: boolean;
}

export interface CliCommandResult {
  command: string;
  outputLines: string[];
  steps?: CliCommandStep[];
  success: boolean;
  targetNodeId?: string;
}

/**
 * Generate a deterministic synthetic MAC address from node ID
 */
export function generateMacAddress(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `00-1B-44-${hex.slice(0, 2).toUpperCase()}-${hex.slice(2, 4).toUpperCase()}-${hex.slice(4, 6).toUpperCase()}`;
}

/**
 * Resolve target node by IP address or Tag/Name
 */
export function resolveTarget(
  graph: EngineeringGraph,
  query: string,
  excludeNodeId?: string
): EngineeringComponent | null {
  const clean = query.trim().toLowerCase();
  if (!clean) return null;

  for (const node of Object.values(graph.nodes)) {
    if (excludeNodeId && node.id === excludeNodeId) continue;
    const ip = (node.properties.ipAddress || node.properties.lanIp || node.properties.managementIp) as string;
    if (ip && ip.trim().toLowerCase() === clean) {
      return node;
    }
    if (node.tag.toLowerCase() === clean || node.name.toLowerCase() === clean) {
      return node;
    }
    if (node.id.toLowerCase() === clean) {
      return node;
    }
  }
  return null;
}

/**
 * Execute or simulate CMD commands on a given node
 */
export function executeCliCommand(
  graph: EngineeringGraph,
  sourceNodeId: string,
  rawCommandLine: string
): CliCommandResult {
  const trimmed = rawCommandLine.trim();
  if (!trimmed) {
    return { command: '', outputLines: [], success: true };
  }

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  const sourceNode = graph.nodes[sourceNodeId];
  if (!sourceNode) {
    return {
      command: rawCommandLine,
      outputLines: ['Error: Source host device not found in network topology.'],
      success: false
    };
  }

  switch (cmd) {
    case 'ping':
      return handlePingCommand(graph, sourceNode, args);
    case 'ipconfig':
      return handleIpconfigCommand(graph, sourceNode, args);
    case 'ifconfig':
      return handleIfconfigCommand(graph, sourceNode, args);
    case 'tracert':
    case 'traceroute':
      return handleTracertCommand(graph, sourceNode, args);
    case 'arp':
      return handleArpCommand(graph, sourceNode, args);
    case 'netstat':
      return handleNetstatCommand(graph, sourceNode, args);
    case 'hostname':
      return {
        command: rawCommandLine,
        outputLines: [sourceNode.tag || sourceNode.name.replace(/\s+/g, '-').toUpperCase()],
        success: true
      };
    case 'route':
      return handleRouteCommand(graph, sourceNode, args);
    case 'cls':
    case 'clear':
      return {
        command: rawCommandLine,
        outputLines: [],
        success: true
      };
    case 'help':
      return handleHelpCommand();
    default:
      return {
        command: rawCommandLine,
        outputLines: [
          `'${cmd}' is not recognized as an internal or external command,`,
          'operable program or batch file.',
          '',
          'Type HELP for a list of available network diagnostics commands.'
        ],
        success: false
      };
  }
}

/**
 * Ping command handler with packet simulation
 */
function handlePingCommand(
  graph: EngineeringGraph,
  sourceNode: EngineeringComponent,
  args: string[]
): CliCommandResult {
  if (args.length === 0) {
    return {
      command: 'ping',
      outputLines: [
        'Usage: ping [-t] [-n count] [-l size] target_name',
        '',
        'Options:',
        '    -t             Ping the specified host until stopped.',
        '    -n count       Number of echo requests to send (default 4).',
        '    -l size        Send buffer size (default 32 bytes).'
      ],
      success: false
    };
  }

  let count = 4;
  let bufferSize = 32;
  let targetQuery = '';

  for (let i = 0; i < args.length; i++) {
    const a = args[i].toLowerCase();
    if (a === '-n' && args[i + 1]) {
      count = Math.max(1, Math.min(20, parseInt(args[i + 1], 10) || 4));
      i++;
    } else if (a === '-l' && args[i + 1]) {
      bufferSize = Math.max(8, Math.min(65500, parseInt(args[i + 1], 10) || 32));
      i++;
    } else if (a === '-t') {
      count = 8; // Simulated burst for continuous
    } else if (!a.startsWith('-')) {
      targetQuery = args[i];
    }
  }

  if (!targetQuery) {
    return {
      command: `ping ${args.join(' ')}`,
      outputLines: ['IP address must be specified.'],
      success: false
    };
  }

  const sourceIp = (sourceNode.properties.ipAddress || sourceNode.properties.lanIp || sourceNode.properties.managementIp || '0.0.0.0') as string;
  const targetNode = resolveTarget(graph, targetQuery, sourceNode.id);
  const targetIp = targetNode 
    ? ((targetNode.properties.ipAddress || targetNode.properties.lanIp || targetNode.properties.managementIp || targetQuery) as string)
    : targetQuery;

  // Validate if query is IP or host
  const isTargetValidIp = isValidIPv4(targetIp);
  if (!targetNode && !isTargetValidIp) {
    return {
      command: `ping ${args.join(' ')}`,
      outputLines: [
        `Ping request could not find host ${targetQuery}. Please check the name and try again.`
      ],
      success: false
    };
  }

  // 1. Check Source Node Network Config
  const sourceNet = checkNodeNetworkConfig(sourceNode, graph);
  const isSourceDown = sourceNode.simulationState.isFailed || !sourceNet.canConnect;

  // 2. Check Target Node
  const isTargetDown = !targetNode || targetNode.simulationState.isFailed;
  const targetNet = targetNode ? checkNodeNetworkConfig(targetNode, graph) : null;
  const isTargetMisconfigured = targetNet ? !targetNet.canConnect : false;

  // 3. Check topology path
  const path = targetNode ? findShortestPath(graph, sourceNode.id, targetNode.id) : null;
  const isReachable = !isSourceDown && !isTargetDown && !isTargetMisconfigured && path !== null;

  const header = `Pinging ${targetIp} with ${bufferSize} bytes of data:`;
  const steps: CliCommandStep[] = [{ text: header, delayMs: 80 }];
  const outputLines: string[] = [header];

  let received = 0;
  const rtts: number[] = [];

  for (let seq = 1; seq <= count; seq++) {
    if (isSourceDown) {
      // Source node cannot transmit because of wrong IP or link failure
      const line = seq === 1
        ? `Reply from ${sourceIp}: Destination host unreachable.`
        : 'Request timed out.';
      outputLines.push(line);
      steps.push({ text: line, delayMs: 320, isReply: true });
    } else if (!isReachable) {
      // Target unreachable or no route
      const line = 'Request timed out.';
      outputLines.push(line);
      steps.push({ text: line, delayMs: 320, isReply: true });
    } else {
      // Successful packet reply
      received++;
      // Calculate realistic latency: hop count * 0.4ms + base
      const hopCount = path.length;
      const jitter = ((seq * 17 + hopCount * 3) % 4) * 0.5;
      const rttMs = Math.max(1, Math.round(hopCount * 0.8 + jitter));
      rtts.push(rttMs);

      const timeStr = rttMs <= 1 ? '<1ms' : `=${rttMs}ms`;
      const line = `Reply from ${targetIp}: bytes=${bufferSize} time${timeStr} TTL=64`;
      outputLines.push(line);
      steps.push({ text: line, delayMs: 280, isReply: true });
    }
  }

  // Statistics block
  const lost = count - received;
  const lossPercent = Math.round((lost / count) * 100);

  const statHeader = '';
  const stat1 = `Ping statistics for ${targetIp}:`;
  const stat2 = `    Packets: Sent = ${count}, Received = ${received}, Lost = ${lost} (${lossPercent}% loss),`;

  outputLines.push(statHeader, stat1, stat2);
  steps.push({ text: statHeader, delayMs: 80 });
  steps.push({ text: stat1, delayMs: 80 });
  steps.push({ text: stat2, delayMs: 80 });

  if (received > 0 && rtts.length > 0) {
    const min = Math.min(...rtts);
    const max = Math.max(...rtts);
    const avg = Math.round(rtts.reduce((a, b) => a + b, 0) / rtts.length);
    const stat3 = 'Approximate round trip times in milli-seconds:';
    const stat4 = `    Minimum = ${min}ms, Maximum = ${max}ms, Average = ${avg}ms`;
    outputLines.push(stat3, stat4);
    steps.push({ text: stat3, delayMs: 80 });
    steps.push({ text: stat4, delayMs: 80 });
  }

  return {
    command: `ping ${args.join(' ')}`,
    outputLines,
    steps,
    success: received > 0,
    targetNodeId: targetNode?.id
  };
}

/**
 * Windows IP Configuration handler
 */
function handleIpconfigCommand(
  graph: EngineeringGraph,
  sourceNode: EngineeringComponent,
  args: string[]
): CliCommandResult {
  const showAll = args.includes('/all') || args.includes('-all');
  const lines: string[] = [];

  const hostName = sourceNode.tag || sourceNode.name.replace(/[^a-zA-Z0-9_-]/g, '-').toUpperCase();
  const ip = (sourceNode.properties.ipAddress || sourceNode.properties.lanIp || sourceNode.properties.managementIp || '0.0.0.0') as string;
  const mask = (sourceNode.properties.subnetMask || '255.255.255.0') as string;
  const gateway = (sourceNode.properties.defaultGateway || sourceNode.properties.gateway || '0.0.0.0') as string;
  const dnsServers = (sourceNode.properties.dnsServers as string[]) || ['8.8.8.8', '1.1.1.1'];
  const mac = generateMacAddress(sourceNode.id);

  lines.push('Windows IP Configuration');
  lines.push('');

  if (showAll) {
    lines.push(`   Host Name . . . . . . . . . . . . : ${hostName}`);
    lines.push('   Primary Dns Suffix  . . . . . . . : corp.local');
    lines.push('   Node Type . . . . . . . . . . . . : Hybrid');
    const isRouter = sourceNode.domain === 'NETWORK' && (sourceNode.type.includes('ROUTER') || sourceNode.type.includes('FIREWALL') || sourceNode.type.includes('GATEWAY'));
    lines.push(`   IP Routing Enabled. . . . . . . . : ${isRouter ? 'Yes' : 'No'}`);
    lines.push('   WINS Proxy Enabled. . . . . . . . : No');
    lines.push('   DNS Suffix Search List. . . . . . : corp.local');
    lines.push('');
  }

  // Primary network adapter
  const adapterName = sourceNode.ports[0]?.name || 'Ethernet 1';
  lines.push(`Ethernet adapter ${adapterName}:`);
  lines.push('');

  if (showAll) {
    lines.push('   Connection-specific DNS Suffix  . : corp.local');
    lines.push(`   Description . . . . . . . . . . . : Gigabit PCIe Ethernet Controller (${sourceNode.costData?.manufacturer || 'Intel'})`);
    lines.push(`   Physical Address. . . . . . . . . : ${mac}`);
    lines.push('   DHCP Enabled. . . . . . . . . . . : No');
    lines.push('   Autoconfiguration Enabled . . . . : Yes');
    lines.push(`   Link-local IPv6 Address . . . . . : fe80::${mac.replace(/-/g, '').slice(0, 4)}:${mac.replace(/-/g, '').slice(4, 8)}%12(Preferred)`);
  } else {
    lines.push('   Connection-specific DNS Suffix  . : corp.local');
    lines.push(`   Link-local IPv6 Address . . . . . : fe80::${mac.replace(/-/g, '').slice(0, 4)}:${mac.replace(/-/g, '').slice(4, 8)}%12`);
  }

  lines.push(`   IPv4 Address. . . . . . . . . . . : ${ip}${showAll ? '(Preferred)' : ''}`);
  lines.push(`   Subnet Mask . . . . . . . . . . . : ${mask}`);
  lines.push(`   Default Gateway . . . . . . . . . : ${gateway}`);

  if (showAll) {
    lines.push(`   DNS Servers . . . . . . . . . . . : ${dnsServers[0] || '8.8.8.8'}`);
    if (dnsServers.length > 1) {
      for (let i = 1; i < dnsServers.length; i++) {
        lines.push(`                                       ${dnsServers[i]}`);
      }
    }
    lines.push('   NetBIOS over Tcpip. . . . . . . . : Enabled');
  }

  // Check if device has subnet mismatch
  const netStatus = checkNodeNetworkConfig(sourceNode, graph);
  if (!netStatus.canConnect) {
    lines.push('');
    lines.push(`   * WARNING: Network Interface State: DISCONNECTED (${netStatus.statusText})`);
    lines.push(`   * Details: ${netStatus.reason}`);
  }

  return {
    command: `ipconfig ${args.join(' ')}`.trim(),
    outputLines: lines,
    success: true
  };
}

/**
 * Linux/Unix ifconfig handler
 */
function handleIfconfigCommand(
  graph: EngineeringGraph,
  sourceNode: EngineeringComponent,
  args: string[]
): CliCommandResult {
  const ip = (sourceNode.properties.ipAddress || sourceNode.properties.lanIp || sourceNode.properties.managementIp || '0.0.0.0') as string;
  const mask = (sourceNode.properties.subnetMask || '255.255.255.0') as string;
  const mac = generateMacAddress(sourceNode.id).toLowerCase().replace(/-/g, ':');
  const netStatus = checkNodeNetworkConfig(sourceNode, graph);

  const lines: string[] = [
    `eth0: flags=4163<UP,BROADCAST,${netStatus.canConnect ? 'RUNNING' : 'NO-CARRIER'},MULTICAST>  mtu 1500`,
    `        inet ${ip}  netmask ${mask}  broadcast ${ip.split('.').slice(0, 3).join('.')}.255`,
    `        inet6 fe80::${mac.replace(/:/g, '').slice(0, 4)}:ff:fe${mac.replace(/:/g, '').slice(4, 8)}  prefixlen 64  scopeid 0x20<link>`,
    `        ether ${mac}  txqueuelen 1000  (Ethernet)`,
    `        RX packets 24192  bytes 18921820 (18.9 MB)`,
    `        RX errors ${netStatus.canConnect ? 0 : 42}  dropped 0  overruns 0  frame 0`,
    `        TX packets 19842  bytes 14210340 (14.2 MB)`,
    `        TX errors ${netStatus.canConnect ? 0 : 19}  dropped 0 overruns 0  carrier 0  collisions 0`,
    '',
    'lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536',
    '        inet 127.0.0.1  netmask 255.0.0.0',
    '        inet6 ::1  prefixlen 128  scopeid 0x10<host>',
    '        loop  txqueuelen 1000  (Local Loopback)',
    '        RX packets 512  bytes 42100 (42.1 KB)',
    '        TX packets 512  bytes 42100 (42.1 KB)'
  ];

  return {
    command: `ifconfig ${args.join(' ')}`.trim(),
    outputLines: lines,
    success: true
  };
}

/**
 * Trace Route (tracert) handler
 */
function handleTracertCommand(
  graph: EngineeringGraph,
  sourceNode: EngineeringComponent,
  args: string[]
): CliCommandResult {
  if (args.length === 0) {
    return {
      command: 'tracert',
      outputLines: ['Usage: tracert [-d] [-h maximum_hops] target_name'],
      success: false
    };
  }

  const targetQuery = args[args.length - 1];
  const targetNode = resolveTarget(graph, targetQuery, sourceNode.id);
  const targetIp = targetNode 
    ? ((targetNode.properties.ipAddress || targetNode.properties.lanIp || targetQuery) as string)
    : targetQuery;

  const header = `Tracing route to ${targetIp} over a maximum of 30 hops:`;
  const lines: string[] = [header, ''];
  const steps: CliCommandStep[] = [{ text: header, delayMs: 80 }, { text: '', delayMs: 50 }];

  const sourceNet = checkNodeNetworkConfig(sourceNode, graph);
  if (!sourceNet.canConnect) {
    const errLine = `  1  ${sourceNode.properties.ipAddress || '127.0.0.1'}  reports: Destination host unreachable.`;
    lines.push(errLine, '', 'Trace complete.');
    steps.push({ text: errLine, delayMs: 300 });
    steps.push({ text: '', delayMs: 50 });
    steps.push({ text: 'Trace complete.', delayMs: 80 });
    return {
      command: `tracert ${targetQuery}`,
      outputLines: lines,
      steps,
      success: false
    };
  }

  if (!targetNode) {
    lines.push(`Unable to resolve target system name ${targetQuery}.`);
    return { command: `tracert ${targetQuery}`, outputLines: lines, success: false };
  }

  const path = findShortestPath(graph, sourceNode.id, targetNode.id);
  if (!path || path.length === 0) {
    lines.push('  1     *        *        *     Request timed out.');
    lines.push('  2     *        *        *     Request timed out.');
    lines.push('', 'Trace complete.');
    return { command: `tracert ${targetQuery}`, outputLines: lines, success: false };
  }

  for (let i = 0; i < path.length; i++) {
    const hopNodeId = path[i].nodeId;
    const hopNode = graph.nodes[hopNodeId];
    const hopIp = (hopNode?.properties.ipAddress || hopNode?.properties.lanIp || `192.168.1.${10 + i}`) as string;
    const hopName = hopNode?.tag || hopNode?.name || `hop-${i + 1}`;
    const rtt1 = Math.max(1, i * 1);
    const rtt2 = Math.max(1, i * 1);
    const rtt3 = Math.max(1, i * 1 + 1);

    const hopLine = `  ${i + 1}    <${rtt1} ms    <${rtt2} ms    <${rtt3} ms  ${hopIp} [${hopName}]`;
    lines.push(hopLine);
    steps.push({ text: hopLine, delayMs: 350 });
  }

  lines.push('', 'Trace complete.');
  steps.push({ text: '', delayMs: 50 });
  steps.push({ text: 'Trace complete.', delayMs: 100 });

  return {
    command: `tracert ${targetQuery}`,
    outputLines: lines,
    steps,
    success: true,
    targetNodeId: targetNode.id
  };
}

/**
 * ARP table handler
 */
function handleArpCommand(
  graph: EngineeringGraph,
  sourceNode: EngineeringComponent,
  args: string[]
): CliCommandResult {
  const ip = (sourceNode.properties.ipAddress || sourceNode.properties.lanIp || '192.168.1.100') as string;
  const lines: string[] = [
    `Interface: ${ip} --- 0x3`,
    '  Internet Address      Physical Address      Type'
  ];

  // List neighbors connected in the topology
  const neighbors: EngineeringComponent[] = [];
  for (const conn of Object.values(graph.connections)) {
    if (conn.sourceComponentId === sourceNode.id) {
      const target = graph.nodes[conn.targetComponentId];
      if (target) neighbors.push(target);
    } else if (conn.targetComponentId === sourceNode.id) {
      const src = graph.nodes[conn.sourceComponentId];
      if (src) neighbors.push(src);
    }
  }

  for (const n of neighbors) {
    const nIp = (n.properties.ipAddress || n.properties.lanIp) as string;
    if (nIp) {
      const mac = generateMacAddress(n.id).toLowerCase();
      lines.push(`  ${nIp.padEnd(22, ' ')}${mac.padEnd(22, ' ')}dynamic`);
    }
  }

  const gateway = (sourceNode.properties.defaultGateway || sourceNode.properties.gateway) as string;
  if (gateway && gateway !== '0.0.0.0') {
    lines.push(`  ${gateway.padEnd(22, ' ')}00-1b-44-00-00-01     dynamic`);
  }

  // Standard broadcast/multicast ARP entries
  const subnetBase = ip.split('.').slice(0, 3).join('.');
  lines.push(`  ${(subnetBase + '.255').padEnd(22, ' ')}ff-ff-ff-ff-ff-ff     static`);
  lines.push('  224.0.0.22            01-00-5e-00-00-16     static');
  lines.push('  239.255.255.250       01-00-5e-7f-ff-fa     static');

  return {
    command: `arp ${args.join(' ')}`.trim(),
    outputLines: lines,
    success: true
  };
}

/**
 * Netstat handler
 */
function handleNetstatCommand(
  _graph: EngineeringGraph,
  sourceNode: EngineeringComponent,
  args: string[]
): CliCommandResult {
  const ip = (sourceNode.properties.ipAddress || sourceNode.properties.lanIp || '192.168.1.100') as string;
  const isRouter = sourceNode.domain === 'NETWORK' && (sourceNode.type.includes('ROUTER') || sourceNode.type.includes('FIREWALL'));
  const isCamera = sourceNode.type.includes('CCTV') || sourceNode.type.includes('CAMERA');

  const lines: string[] = [
    'Active Connections',
    '',
    '  Proto  Local Address          Foreign Address        State'
  ];

  if (isRouter) {
    lines.push(`  TCP    ${ip}:80              0.0.0.0:0              LISTENING`);
    lines.push(`  TCP    ${ip}:443             0.0.0.0:0              LISTENING`);
    lines.push(`  TCP    ${ip}:22              0.0.0.0:0              LISTENING`);
    lines.push(`  UDP    ${ip}:67              *:*`);
    lines.push(`  UDP    ${ip}:53              *:*`);
  } else if (isCamera) {
    lines.push(`  TCP    ${ip}:554             0.0.0.0:0              LISTENING (RTSP)`);
    lines.push(`  TCP    ${ip}:80              0.0.0.0:0              LISTENING (HTTP)`);
    lines.push(`  TCP    ${ip}:49152           192.168.1.50:554       ESTABLISHED (NVR Stream)`);
  } else {
    lines.push(`  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING`);
    lines.push(`  TCP    0.0.0.0:445            0.0.0.0:0              LISTENING`);
    lines.push(`  TCP    ${ip}:49668            192.168.1.1:443        ESTABLISHED`);
    lines.push(`  TCP    ${ip}:49670            192.168.1.200:80       TIME_WAIT`);
    lines.push(`  UDP    ${ip}:137              *:*`);
    lines.push(`  UDP    0.0.0.0:5353           *:*`);
  }

  return {
    command: `netstat ${args.join(' ')}`.trim(),
    outputLines: lines,
    success: true
  };
}

/**
 * Route print handler
 */
function handleRouteCommand(
  _graph: EngineeringGraph,
  sourceNode: EngineeringComponent,
  args: string[]
): CliCommandResult {
  const ip = (sourceNode.properties.ipAddress || sourceNode.properties.lanIp || '192.168.1.100') as string;
  const gateway = (sourceNode.properties.defaultGateway || sourceNode.properties.gateway || '192.168.1.1') as string;
  const subnetBase = ip.split('.').slice(0, 3).join('.');

  const lines: string[] = [
    '===========================================================================',
    'Interface List',
    ` 11...${generateMacAddress(sourceNode.id).replace(/-/g, ' ')} ......Gigabit Ethernet Adapter`,
    '  1...........................Software Loopback Interface 1',
    '===========================================================================',
    '',
    'IPv4 Route Table',
    '===========================================================================',
    'Active Routes:',
    'Network Destination        Netmask          Gateway       Interface  Metric',
    `          0.0.0.0          0.0.0.0      ${gateway.padEnd(15, ' ')}  ${ip.padEnd(10, ' ')}     25`,
    `        127.0.0.0        255.0.0.0         On-link         127.0.0.1    331`,
    `      ${(subnetBase + '.0').padEnd(15, ' ')}  255.255.255.0         On-link      ${ip.padEnd(10, ' ')}    281`,
    `    ${(subnetBase + '.255').padEnd(15, ' ')}255.255.255.255         On-link      ${ip.padEnd(10, ' ')}    281`,
    '  255.255.255.255  255.255.255.255         On-link         127.0.0.1    331',
    '==========================================================================='
  ];

  return {
    command: `route ${args.join(' ')}`.trim(),
    outputLines: lines,
    success: true
  };
}

/**
 * Help command handler
 */
function handleHelpCommand(): CliCommandResult {
  const lines: string[] = [
    'For more information on a specific command, type HELP command-name',
    'PING       Sends ICMP echo request packets to verify network connectivity & latency.',
    'IPCONFIG   Displays all current TCP/IP network configuration values (IPv4, mask, gateway).',
    'IPCONFIG /ALL  Displays full detailed configuration including MAC, DNS, DHCP status.',
    'IFCONFIG   Linux-style network interface status, packet counters, and MAC address.',
    'TRACERT    Determines the path taken to a destination by sending ICMP echo requests.',
    'ARP -A     Displays current ARP entries by interrogating the protocol data.',
    'NETSTAT    Displays active TCP connections, listening ports, and ethernet statistics.',
    'ROUTE PRINT Displays current IP routing table entries.',
    'HOSTNAME   Prints the name of the current host device.',
    'CLS        Clears the terminal screen.',
    'HELP       Provides help information for Windows Command Prompt network commands.'
  ];

  return {
    command: 'help',
    outputLines: lines,
    success: true
  };
}
