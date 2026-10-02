import { EngineeringGraph } from '@omniflow/shared-types';
import { generateMacAddress } from '@omniflow/network-engine';
import { CliCommandResult } from './cliNetworkEngine';

export type CiscoIosMode = 'USER_EXEC' | 'PRIVILEGED_EXEC' | 'GLOBAL_CONFIG' | 'INTERFACE_CONFIG';

export interface CiscoIosState {
  mode: CiscoIosMode;
  currentInterface?: string;
}

/**
 * Checks if a network node is a Cisco infrastructure device (Router, Switch, Firewall)
 */
export function isCiscoDevice(node: { type: string } | null | undefined): boolean {
  if (!node) return false;
  const t = node.type.toUpperCase();
  return t.includes('ROUTER') || t.includes('SWITCH') || t.includes('FIREWALL');
}

/**
 * Format prompt based on Cisco IOS mode
 */
export function getCiscoPrompt(hostname: string, mode: CiscoIosMode): string {
  switch (mode) {
    case 'USER_EXEC':
      return `${hostname}>`;
    case 'PRIVILEGED_EXEC':
      return `${hostname}#`;
    case 'GLOBAL_CONFIG':
      return `${hostname}(config)#`;
    case 'INTERFACE_CONFIG':
      return `${hostname}(config-if)#`;
    default:
      return `${hostname}>`;
  }
}

/**
 * Parses and executes authentic Cisco IOS commands
 */
export function executeCiscoIosCommand(
  graph: EngineeringGraph,
  nodeId: string,
  commandLine: string,
  state: CiscoIosState,
  onUpdateState: (newState: CiscoIosState) => void
): CliCommandResult {
  const node = graph.nodes[nodeId];
  if (!node) {
    return { command: commandLine, outputLines: ['% Device not found.'], success: false };
  }

  const hostname = node.tag || node.name.replace(/\s+/g, '-');
  const trimmed = commandLine.trim();
  if (!trimmed) {
    return { command: '', outputLines: [], success: true };
  }

  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  // 1. Navigation / Mode transitions
  if (cmd === 'enable' || cmd === 'en') {
    onUpdateState({ ...state, mode: 'PRIVILEGED_EXEC' });
    return { command: commandLine, outputLines: [], success: true };
  }

  if (cmd === 'disable') {
    onUpdateState({ ...state, mode: 'USER_EXEC' });
    return { command: commandLine, outputLines: [], success: true };
  }

  if ((cmd === 'configure' && args[0]?.toLowerCase() === 'terminal') || cmd === 'conf' || cmd === 'conft' || (cmd === 'conf' && args[0]?.toLowerCase() === 't')) {
    if (state.mode === 'USER_EXEC') {
      return { command: commandLine, outputLines: ['% Ambiguous or unauthorized command in user exec mode. Type "enable" first.'], success: false };
    }
    onUpdateState({ ...state, mode: 'GLOBAL_CONFIG' });
    return { 
      command: commandLine, 
      outputLines: [
        'Enter configuration commands, one per line. End with CNTL/Z.'
      ], 
      success: true 
    };
  }

  if (cmd === 'exit') {
    if (state.mode === 'INTERFACE_CONFIG') {
      onUpdateState({ ...state, mode: 'GLOBAL_CONFIG', currentInterface: undefined });
      return { command: commandLine, outputLines: [], success: true };
    }
    if (state.mode === 'GLOBAL_CONFIG') {
      onUpdateState({ ...state, mode: 'PRIVILEGED_EXEC' });
      return { command: commandLine, outputLines: [], success: true };
    }
    if (state.mode === 'PRIVILEGED_EXEC') {
      onUpdateState({ ...state, mode: 'USER_EXEC' });
      return { command: commandLine, outputLines: [], success: true };
    }
    return { command: commandLine, outputLines: [], success: true };
  }

  if (cmd === 'end') {
    onUpdateState({ ...state, mode: 'PRIVILEGED_EXEC', currentInterface: undefined });
    return { command: commandLine, outputLines: [], success: true };
  }

  // 2. Global Config Commands
  if (state.mode === 'GLOBAL_CONFIG') {
    if (cmd === 'hostname' && args[0]) {
      node.tag = args[0].toUpperCase();
      return { command: commandLine, outputLines: [], success: true };
    }

    if (cmd === 'interface' || cmd === 'int') {
      const ifaceName = args.join(' ');
      if (!ifaceName) {
        return { command: commandLine, outputLines: ['% Incomplete command: specify interface (e.g. GigabitEthernet0/0)'], success: false };
      }
      onUpdateState({ ...state, mode: 'INTERFACE_CONFIG', currentInterface: ifaceName });
      return { command: commandLine, outputLines: [], success: true };
    }
  }

  // 3. Interface Config Commands
  if (state.mode === 'INTERFACE_CONFIG') {
    if (cmd === 'ip' && args[0]?.toLowerCase() === 'address') {
      const ip = args[1];
      const mask = args[2] || '255.255.255.0';
      if (!ip) {
        return { command: commandLine, outputLines: ['% Incomplete command: ip address <IP> <SUBNET_MASK>'], success: false };
      }
      node.properties.ipAddress = ip;
      node.properties.lanIp = ip;
      node.properties.subnetMask = mask;
      return { command: commandLine, outputLines: [], success: true };
    }

    if (cmd === 'no' && (args[0]?.toLowerCase() === 'shutdown' || args[0]?.toLowerCase() === 'shut')) {
      node.simulationState.isFailed = false;
      node.simulationState.status = 'ONLINE';
      return {
        command: commandLine,
        outputLines: [
          `%LINK-5-CHANGED: Interface ${state.currentInterface || 'GigabitEthernet0/0'}, changed state to up`,
          `%LINEPROTO-5-UPDOWN: Line protocol on Interface ${state.currentInterface || 'GigabitEthernet0/0'}, changed state to up`
        ],
        success: true
      };
    }

    if (cmd === 'shutdown' || cmd === 'shut') {
      node.simulationState.isFailed = true;
      node.simulationState.status = 'OFFLINE';
      return {
        command: commandLine,
        outputLines: [
          `%LINK-5-CHANGED: Interface ${state.currentInterface || 'GigabitEthernet0/0'}, changed state to administratively down`,
          `%LINEPROTO-5-UPDOWN: Line protocol on Interface ${state.currentInterface || 'GigabitEthernet0/0'}, changed state to down`
        ],
        success: true
      };
    }
  }

  // 4. Cisco "show" commands (Available in Privileged Exec and Global Config with "do show")
  const isDoShow = cmd === 'do' && args[0]?.toLowerCase() === 'show';
  const showArgs = isDoShow ? args.slice(1) : (cmd === 'show' || cmd === 'sh') ? args : null;

  if (showArgs) {
    const showCmd = showArgs[0]?.toLowerCase();
    const subCmd = showArgs[1]?.toLowerCase();

    // show ip interface brief
    if (showCmd === 'ip' && (subCmd === 'interface' || subCmd === 'int') && (showArgs[2]?.toLowerCase() === 'brief' || showArgs[2]?.toLowerCase() === 'br')) {
      const lines = [
        'Interface              IP-Address      OK? Method Status                Protocol',
        '================================================================================'
      ];
      node.ports.forEach((port, idx) => {
        const ip = idx === 0 
          ? ((node.properties.ipAddress || node.properties.lanIp || 'unassigned') as string)
          : 'unassigned';
        const isUp = !node.simulationState.isFailed;
        const portName = port.name.length > 20 ? port.name.slice(0, 20) : port.name.padEnd(22);
        lines.push(`${portName} ${ip.padEnd(15)} YES manual ${isUp ? 'up'.padEnd(21) : 'administratively down '} ${isUp ? 'up' : 'down'}`);
      });
      return { command: commandLine, outputLines: lines, success: true };
    }

    // show ip route
    if (showCmd === 'ip' && (subCmd === 'route' || subCmd === 'ro')) {
      const ip = (node.properties.ipAddress || node.properties.lanIp || '192.168.1.1') as string;
      const gateway = (node.properties.defaultGateway || node.properties.gateway || '0.0.0.0') as string;
      const subnetBase = ip.split('.').slice(0, 3).join('.') + '.0';

      const lines = [
        'Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP',
        '       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area',
        '',
        `Gateway of last resort is ${gateway} to network 0.0.0.0`,
        '',
        `      ${subnetBase}/24 is variably subnetted, 2 subnets, 2 masks`,
        `C        ${subnetBase}/24 is directly connected, GigabitEthernet0/0`,
        `L        ${ip}/32 is directly connected, GigabitEthernet0/0`
      ];
      if (gateway && gateway !== '0.0.0.0') {
        lines.push(`S*       0.0.0.0/0 [1/0] via ${gateway}`);
      }
      return { command: commandLine, outputLines: lines, success: true };
    }

    // show mac address-table
    if (showCmd === 'mac' || showCmd === 'mac-address-table') {
      const lines = [
        '          Mac Address Table',
        '-------------------------------------------',
        'Vlan    Mac Address       Type        Ports',
        '----    -----------       --------    -----'
      ];
      const vlan = node.properties.vlanId || 1;
      // List all neighbor nodes connected to this switch
      for (const conn of Object.values(graph.connections)) {
        if (conn.sourceComponentId === node.id || conn.targetComponentId === node.id) {
          const remoteId = conn.sourceComponentId === node.id ? conn.targetComponentId : conn.sourceComponentId;
          const remoteNode = graph.nodes[remoteId];
          const localPortId = conn.sourceComponentId === node.id ? conn.sourcePortId : conn.targetPortId;
          const localPort = node.ports.find(p => p.id === localPortId);
          if (remoteNode && localPort) {
            const remoteMac = generateMacAddress(remoteNode, 0).toLowerCase().replace(/-/g, '.');
            lines.push(` ${String(vlan).padEnd(6)} ${remoteMac.padEnd(17)} DYNAMIC     ${localPort.name}`);
          }
        }
      }
      lines.push('Total Mac Addresses for this criterion: ' + (lines.length - 4));
      return { command: commandLine, outputLines: lines, success: true };
    }

    // show version
    if (showCmd === 'version' || showCmd === 'ver') {
      return {
        command: commandLine,
        outputLines: [
          'Cisco IOS Software, C2900 Software (C2900-UNIVERSALK9-M), Version 15.7(3)M2, RELEASE SOFTWARE',
          'Technical Support: http://www.cisco.com/techsupport',
          'Copyright (c) 1986-2026 by Cisco Systems, Inc.',
          'Compiled Thu 26-Feb-26 12:44 by prod_rel_team',
          '',
          'ROM: System Bootstrap, Version 15.0(1r)M16, RELEASE SOFTWARE (fc1)',
          '',
          `${hostname} uptime is 3 weeks, 4 days, 12 hours, 18 minutes`,
          'System returned to ROM by reload',
          'System image file is "flash0:c2900-universalk9-mz.SPA.157-3.M2.bin"',
          'Last reload reason: Normal Reload',
          '',
          'Cisco 2911 (revision 1.0) with 491520K/32768K bytes of memory.',
          'Processor board ID FHK1612001W',
          '3 Gigabit Ethernet interfaces',
          'DRAM configuration is 64 bits wide with parity disabled.',
          '255K bytes of non-volatile configuration memory.',
          '249856K bytes of ATA System CompactFlash 0 (Read/Write)',
          '',
          'Configuration register is 0x2102'
        ],
        success: true
      };
    }

    // show running-config
    if (showCmd === 'running-config' || showCmd === 'run') {
      const ip = (node.properties.ipAddress || node.properties.lanIp || 'unassigned') as string;
      const mask = (node.properties.subnetMask || '255.255.255.0') as string;
      return {
        command: commandLine,
        outputLines: [
          'Building configuration...',
          '',
          'Current configuration : 1842 bytes',
          '!',
          'version 15.7',
          'service timestamps debug datetime msec',
          'service timestamps log datetime msec',
          'no service password-encryption',
          '!',
          `hostname ${hostname}`,
          '!',
          'ip cef',
          'no ipv6 cef',
          '!',
          'interface GigabitEthernet0/0',
          ip !== 'unassigned' ? ` ip address ${ip} ${mask}` : ' no ip address',
          ' duplex auto',
          ' speed auto',
          '!',
          'ip forward-protocol nd',
          '!',
          'line con 0',
          'line aux 0',
          'line vty 0 4',
          ' login',
          '!',
          'end'
        ],
        success: true
      };
    }
  }

  // 5. Cisco Ping
  if (cmd === 'ping') {
    const targetIp = args[0];
    if (!targetIp) {
      return { command: commandLine, outputLines: ['% Incomplete command: ping <IP_ADDRESS>'], success: false };
    }

    // Find target node in graph
    const targetNode = Object.values(graph.nodes).find(n => {
      const ip = (n.properties.ipAddress || n.properties.lanIp) as string;
      return ip === targetIp;
    });

    if (!targetNode || targetNode.simulationState.isFailed || node.simulationState.isFailed) {
      return {
        command: commandLine,
        outputLines: [
          `Type escape sequence to abort.`,
          `Sending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:`,
          `.....`,
          `Success rate is 0 percent (0/5)`
        ],
        success: false
      };
    }

    return {
      command: commandLine,
      targetNodeId: targetNode.id,
      outputLines: [
        `Type escape sequence to abort.`,
        `Sending 5, 100-byte ICMP Echos to ${targetIp}, timeout is 2 seconds:`,
        `!!!!!`,
        `Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`
      ],
      success: true
    };
  }

  // 6. Write memory / Copy run start
  if (cmd === 'write' || (cmd === 'copy' && args[0] === 'running-config' && args[1] === 'startup-config') || cmd === 'wr') {
    return {
      command: commandLine,
      outputLines: [
        'Building configuration...',
        '[OK]'
      ],
      success: true
    };
  }

  return {
    command: commandLine,
    outputLines: [
      `% Invalid input detected at '^' marker.`,
      `Type '?' or 'help' for available Cisco IOS commands.`
    ],
    success: false
  };
}
