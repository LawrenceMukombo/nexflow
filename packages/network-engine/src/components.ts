import { EngineeringComponent, ComponentPort, CostData } from '@omniflow/shared-types';

export interface PortBlueprint {
  name: string;
  type: string;
  direction: 'input' | 'output' | 'bidirectional';
  capacity: number;
  unit: string;
  compatiblePortTypes: string[];
  properties?: Record<string, unknown>;
}

export interface ComponentTemplate {
  type: string;
  category: 'CORE' | 'SWITCHING' | 'SECURITY' | 'ENDPOINTS' | 'INFRASTRUCTURE' | 'WIRELESS';
  name: string;
  defaultTagPrefix: string;
  description: string;
  icon: string;
  defaultCost: CostData;
  defaultProperties: Record<string, unknown>;
  portsTemplate: PortBlueprint[];
}

export const NETWORK_COMPONENT_CATALOG: Record<string, ComponentTemplate> = {
  ISP_FEED: {
    type: 'ISP_FEED',
    category: 'CORE',
    name: 'ISP Uplink / Fiber Gateway',
    defaultTagPrefix: 'ISP',
    description: 'Tier-1 Internet Service Provider Fiber Demarcation',
    icon: 'CloudServerOutlined',
    defaultCost: {
      partNumber: 'ISP-FIBER-1G',
      manufacturer: 'MetroFiber',
      unitCost: 350,
      labourCost: 150,
      currency: 'USD'
    },
    defaultProperties: {
      publicIp: '198.51.100.1',
      subnetMask: '255.255.255.252',
      bandwidthDownMbps: 1000,
      bandwidthUpMbps: 1000,
      slaAvailability: 99.99
    },
    portsTemplate: [
      {
        name: 'WAN_OUT',
        type: 'FIBER_LC',
        direction: 'output',
        capacity: 1000,
        unit: 'Mbps',
        compatiblePortTypes: ['FIBER_LC', 'RJ45'],
        properties: { mode: 'SingleMode' }
      }
    ]
  },

  ROUTER_ENTERPRISE: {
    type: 'ROUTER_ENTERPRISE',
    category: 'CORE',
    name: 'Enterprise Router (L3)',
    defaultTagPrefix: 'RTR',
    description: 'High-Throughput Edge Router with NAT & DHCP',
    icon: 'PartitionOutlined',
    defaultCost: {
      partNumber: 'RTR-ENT-4X',
      manufacturer: 'Cisco-Compat',
      unitCost: 1200,
      labourCost: 200,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'RTR-CORE-01',
      lanIp: '192.168.1.1',
      subnetMask: '255.255.255.0',
      dhcpEnabled: true,
      dhcpPoolStart: '192.168.1.100',
      dhcpPoolEnd: '192.168.1.250',
      natEnabled: true,
      firewallThroughputGbps: 5
    },
    portsTemplate: [
      { name: 'WAN1', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45', 'FIBER_LC'] },
      { name: 'LAN1', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'LAN2', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'CONSOLE', type: 'CONSOLE_RJ45', direction: 'bidirectional', capacity: 0.1152, unit: 'Mbps', compatiblePortTypes: ['CONSOLE_RJ45'] }
    ]
  },

  FIREWALL_UTM: {
    type: 'FIREWALL_UTM',
    category: 'SECURITY',
    name: 'Next-Gen Firewall / UTM',
    defaultTagPrefix: 'FW',
    description: 'Stateful packet inspection, VPN & IPS appliance',
    icon: 'SafetyCertificateOutlined',
    defaultCost: {
      partNumber: 'FW-UTM-G1',
      manufacturer: 'FortiSec',
      unitCost: 1450,
      labourCost: 250,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'FW-PERIMETER',
      ipAddress: '192.168.1.2',
      inspectionMode: 'Proxy-Deep',
      vpnTunnelsMax: 50,
      ipsActive: true
    },
    portsTemplate: [
      { name: 'WAN_IN', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'LAN_OUT', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'DMZ', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  SWITCH_CORE_L3: {
    type: 'SWITCH_CORE_L3',
    category: 'SWITCHING',
    name: 'Core Distribution Switch (L3)',
    defaultTagPrefix: 'SW-CORE',
    description: '24-Port Gigabit + 4-Port 10G SFP+ Uplink L3 Switch',
    icon: 'ApartmentOutlined',
    defaultCost: {
      partNumber: 'SW-L3-24G4X',
      manufacturer: 'Aruba-Compat',
      unitCost: 1800,
      labourCost: 300,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'SW-CORE-01',
      managementIp: '192.168.1.10',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      vlanId: 1,
      switchingCapacityGbps: 128,
      stpEnabled: true
    },
    portsTemplate: [
      ...Array.from({ length: 8 }, (_, i): PortBlueprint => ({
        name: `GigabitEthernet0/${i + 1}`,
        type: 'RJ45',
        direction: 'bidirectional',
        capacity: 1000,
        unit: 'Mbps',
        compatiblePortTypes: ['RJ45']
      })),
      { name: 'TenGigabit0/25', type: 'FIBER_LC', direction: 'bidirectional', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
      { name: 'TenGigabit0/26', type: 'FIBER_LC', direction: 'bidirectional', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] }
    ]
  },

  SWITCH_POE_24: {
    type: 'SWITCH_POE_24',
    category: 'SWITCHING',
    name: '24-Port Gigabit PoE+ Access Switch',
    defaultTagPrefix: 'SW-ACC',
    description: 'Layer 2 Managed PoE+ Switch with 370W Power Budget',
    icon: 'BranchesOutlined',
    defaultCost: {
      partNumber: 'SW-POE-24P',
      manufacturer: 'UniFi-Compat',
      unitCost: 850,
      labourCost: 180,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'SW-POE-ACCESS',
      managementIp: '192.168.1.11',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      poeTotalBudgetWatts: 370,
      poeAllocatedWatts: 0,
      vlanId: 1
    },
    portsTemplate: [
      ...Array.from({ length: 12 }, (_, i): PortBlueprint => ({
        name: `Port ${i + 1} (PoE+)`,
        type: 'RJ45',
        direction: 'bidirectional',
        capacity: 1000,
        unit: 'Mbps',
        compatiblePortTypes: ['RJ45'],
        properties: { poe: true, maxWatts: 30 }
      })),
      { name: 'Uplink 1', type: 'RJ45', direction: 'bidirectional', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45', 'FIBER_LC'] }
    ]
  },

  ACCESS_POINT_WIFI6: {
    type: 'ACCESS_POINT_WIFI6',
    category: 'ENDPOINTS',
    name: 'Enterprise WiFi 6 AP',
    defaultTagPrefix: 'AP',
    description: 'Dual-band 4x4 MIMO WiFi 6 Access Point with 802.3at PoE',
    icon: 'WifiOutlined',
    defaultCost: {
      partNumber: 'AP-WIFI6-PRO',
      manufacturer: 'Ruckus-Compat',
      unitCost: 380,
      labourCost: 90,
      currency: 'USD'
    },
    defaultProperties: {
      ipAddress: '192.168.1.20',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      ssid: 'Corp-Secure-Net',
      channel24: 6,
      channel50: 36,
      poeDrawWatts: 15.4,
      maxClients: 150
    },
    portsTemplate: [
      { name: 'ETH0_POE', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'], properties: { requiresPoe: true } }
    ]
  },

  SERVER_APP: {
    type: 'SERVER_APP',
    category: 'CORE',
    name: 'Application / DB Server',
    defaultTagPrefix: 'SRV',
    description: 'Enterprise 1U Rackmount Server with dual redundant NICs',
    icon: 'DatabaseOutlined',
    defaultCost: {
      partNumber: 'SRV-RACK-1U',
      manufacturer: 'Dell-Compat',
      unitCost: 2800,
      labourCost: 350,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'SRV-PROD-DB01',
      ipAddress: '192.168.1.50',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      services: ['HTTP', 'DNS', 'SQL'],
      portSpeed: 1000
    },
    portsTemplate: [
      { name: 'NIC1', type: 'RJ45', direction: 'bidirectional', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'NIC2', type: 'RJ45', direction: 'bidirectional', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  WORKSTATION_PC: {
    type: 'WORKSTATION_PC',
    category: 'ENDPOINTS',
    name: 'Workstation Desktop PC',
    defaultTagPrefix: 'PC',
    description: 'Enterprise Client Workstation with Gigabit NIC',
    icon: 'DesktopOutlined',
    defaultCost: {
      partNumber: 'PC-ENT-CORE',
      manufacturer: 'HP-Compat',
      unitCost: 850,
      labourCost: 60,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'WS-CLIENT',
      ipAddress: '192.168.1.101',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      dhcpClient: true,
      vlanId: 1
    },
    portsTemplate: [
      { name: 'ETH0', type: 'RJ45', direction: 'bidirectional', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  IP_PHONE_VOIP: {
    type: 'IP_PHONE_VOIP',
    category: 'ENDPOINTS',
    name: 'VoIP IP Telephone',
    defaultTagPrefix: 'VOIP',
    description: 'Gigabit PoE VoIP Desktop Phone with Passthrough PC Port',
    icon: 'PhoneOutlined',
    defaultCost: {
      partNumber: 'VOIP-PHONE-G2',
      manufacturer: 'Poly-Compat',
      unitCost: 190,
      labourCost: 40,
      currency: 'USD'
    },
    defaultProperties: {
      ipAddress: '192.168.1.160',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      poeDrawWatts: 6.5,
      voiceVlan: 10
    },
    portsTemplate: [
      { name: 'SW_PORT (PoE)', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'], properties: { requiresPoe: true } },
      { name: 'PC_PASSTHROUGH', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  NETWORK_PRINTER: {
    type: 'NETWORK_PRINTER',
    category: 'ENDPOINTS',
    name: 'Enterprise Network MFP Printer',
    defaultTagPrefix: 'PRN',
    description: 'High-Volume Color Laser Multifunction Printer',
    icon: 'PrinterOutlined',
    defaultCost: {
      partNumber: 'MFP-ENT-CLR',
      manufacturer: 'Canon-Compat',
      unitCost: 1650,
      labourCost: 100,
      currency: 'USD'
    },
    defaultProperties: {
      ipAddress: '192.168.1.200',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      vlanId: 1
    },
    portsTemplate: [
      { name: 'LAN', type: 'RJ45', direction: 'bidirectional', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  // === EXTENDED ROUTERS ===
  ROUTER_CORE_BGP: {
    type: 'ROUTER_CORE_BGP',
    category: 'CORE',
    name: 'Carrier BGP Border Router',
    defaultTagPrefix: 'BGP-RTR',
    description: 'High-Capacity Core Border Router with Dual 100G QSFP28 & 8x 10G SFP+',
    icon: 'PartitionOutlined',
    defaultCost: {
      partNumber: 'RTR-BGP-100G',
      manufacturer: 'Juniper-Compat',
      unitCost: 6500,
      labourCost: 800,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'BGP-GW-01',
      bgpAsn: 64512,
      routerId: '10.0.0.1',
      fibCapacityRoutes: 2000000,
      throughputGbps: 200
    },
    portsTemplate: [
      { name: 'QSFP28_0', type: 'FIBER_LC', direction: 'bidirectional', capacity: 100000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
      { name: 'QSFP28_1', type: 'FIBER_LC', direction: 'bidirectional', capacity: 100000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
      { name: 'TenGig0/1', type: 'FIBER_LC', direction: 'bidirectional', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
      { name: 'TenGig0/2', type: 'FIBER_LC', direction: 'bidirectional', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
      { name: 'MgmtEth', type: 'RJ45', direction: 'bidirectional', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  ROUTER_BRANCH: {
    type: 'ROUTER_BRANCH',
    category: 'CORE',
    name: 'Branch Office Dual-WAN Router',
    defaultTagPrefix: 'BR-RTR',
    description: 'Compact SD-WAN Router with Dual-WAN Failover and 4G/LTE Backup',
    icon: 'PartitionOutlined',
    defaultCost: {
      partNumber: 'RTR-SDWAN-BR',
      manufacturer: 'Cisco-Compat',
      unitCost: 650,
      labourCost: 120,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'BR-RTR-01',
      lanIp: '10.10.1.1',
      subnetMask: '255.255.255.0',
      dhcpEnabled: true,
      sdwanTunnelActive: true
    },
    portsTemplate: [
      { name: 'WAN1 (Primary)', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45', 'FIBER_LC'] },
      { name: 'WAN2 (Backup)', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'LAN1', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'LAN2', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'LAN3', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  ROUTER_INDUSTRIAL: {
    type: 'ROUTER_INDUSTRIAL',
    category: 'CORE',
    name: 'Industrial DIN-Rail Gateway',
    defaultTagPrefix: 'IND-GW',
    description: 'Hardened -40C to 75C Industrial Cellular & IoT Gateway with Serial RS485',
    icon: 'PartitionOutlined',
    defaultCost: {
      partNumber: 'IND-GW-DIN',
      manufacturer: 'Moxa-Compat',
      unitCost: 890,
      labourCost: 150,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'IND-IOT-GW',
      ipAddress: '192.168.99.1',
      modbusGateway: true,
      operatingTemp: '-40C to 75C'
    },
    portsTemplate: [
      { name: 'ETH1 (WAN)', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'ETH2 (LAN)', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  // === EXTENDED FIREWALLS ===
  FIREWALL_HA_CLUSTER: {
    type: 'FIREWALL_HA_CLUSTER',
    category: 'SECURITY',
    name: 'High-Availability Firewall Cluster (HA)',
    defaultTagPrefix: 'FW-HA',
    description: 'Clustered Active/Passive Enterprise Firewalls with State-Sync Heartbeat',
    icon: 'SafetyCertificateOutlined',
    defaultCost: {
      partNumber: 'FW-HA-PAIR-10G',
      manufacturer: 'PaloAlto-Compat',
      unitCost: 4800,
      labourCost: 650,
      currency: 'USD'
    },
    defaultProperties: {
      clusterId: 'HA-CLUST-01',
      virtualIp: '192.168.1.254',
      haSyncActive: true,
      failoverTimeMs: 250,
      throughputGbps: 20
    },
    portsTemplate: [
      { name: 'WAN_A (Fiber)', type: 'FIBER_LC', direction: 'input', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
      { name: 'WAN_B (Fiber)', type: 'FIBER_LC', direction: 'input', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
      { name: 'LAN_AGG1', type: 'RJ45', direction: 'output', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['RJ45', 'FIBER_LC'] },
      { name: 'LAN_AGG2', type: 'RJ45', direction: 'output', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['RJ45', 'FIBER_LC'] },
      { name: 'DMZ', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'HA_HEARTBEAT', type: 'FIBER_LC', direction: 'bidirectional', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] }
    ]
  },

  FIREWALL_EDGE: {
    type: 'FIREWALL_EDGE',
    category: 'SECURITY',
    name: 'Branch Edge Micro-Firewall',
    defaultTagPrefix: 'FW-EDGE',
    description: 'Fanless Desktop Form-Factor Next-Gen Firewall for Small Offices',
    icon: 'SafetyCertificateOutlined',
    defaultCost: {
      partNumber: 'FW-EDGE-S4',
      manufacturer: 'Sonic-Compat',
      unitCost: 750,
      labourCost: 100,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'FW-BRANCH-01',
      ipAddress: '192.168.5.1',
      maxVpnClients: 25,
      contentFiltering: true
    },
    portsTemplate: [
      { name: 'WAN', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'LAN1', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'LAN2', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  // === EXTENDED SWITCHES ===
  SWITCH_AGGREGATION_10G: {
    type: 'SWITCH_AGGREGATION_10G',
    category: 'SWITCHING',
    name: '16-Port 10G SFP+ Aggregation Switch',
    defaultTagPrefix: 'SW-AGG',
    description: 'High-Density 10G SFP+ Fiber Aggregation Core Switch with 320Gbps Backplane',
    icon: 'ApartmentOutlined',
    defaultCost: {
      partNumber: 'SW-AGG-16X',
      manufacturer: 'Aruba-Compat',
      unitCost: 2600,
      labourCost: 350,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'SW-AGG-01',
      managementIp: '192.168.1.9',
      backplaneCapacityGbps: 320,
      mtuSize: 9216
    },
    portsTemplate: Array.from({ length: 16 }, (_, i): PortBlueprint => ({
      name: `SFP+ 10G Port ${i + 1}`,
      type: 'FIBER_LC',
      direction: 'bidirectional',
      capacity: 10000,
      unit: 'Mbps',
      compatiblePortTypes: ['FIBER_LC', 'SFP_PLUS']
    }))
  },

  SWITCH_POE_48: {
    type: 'SWITCH_POE_48',
    category: 'SWITCHING',
    name: '48-Port Enterprise PoE+ L3 Switch',
    defaultTagPrefix: 'SW-POE48',
    description: '48-Port Gigabit PoE+ Managed Switch with 740W Power Budget & 4x 10G SFP+ Uplinks',
    icon: 'BranchesOutlined',
    defaultCost: {
      partNumber: 'SW-POE-48P-740W',
      manufacturer: 'Cisco-Compat',
      unitCost: 1950,
      labourCost: 280,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'SW-ACC-48P',
      managementIp: '192.168.1.12',
      poeTotalBudgetWatts: 740,
      poeAllocatedWatts: 0,
      vlanId: 1
    },
    portsTemplate: [
      ...Array.from({ length: 24 }, (_, i): PortBlueprint => ({
        name: `Port ${i + 1} (PoE+)`,
        type: 'RJ45',
        direction: 'bidirectional',
        capacity: 1000,
        unit: 'Mbps',
        compatiblePortTypes: ['RJ45'],
        properties: { poe: true, maxWatts: 30 }
      })),
      { name: 'Uplink 10G SFP+ 1', type: 'FIBER_LC', direction: 'bidirectional', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
      { name: 'Uplink 10G SFP+ 2', type: 'FIBER_LC', direction: 'bidirectional', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] }
    ]
  },

  SWITCH_MULTIGIG_24: {
    type: 'SWITCH_MULTIGIG_24',
    category: 'SWITCHING',
    name: '24-Port 2.5GbE Multi-Gig Switch',
    defaultTagPrefix: 'SW-MGIG',
    description: 'High-Performance 2.5GbE PoE++ Switch for WiFi 6/7 APs and Fast Workstations',
    icon: 'BranchesOutlined',
    defaultCost: {
      partNumber: 'SW-2.5G-24P-BT',
      manufacturer: 'Netgear-Compat',
      unitCost: 1450,
      labourCost: 220,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'SW-MGIG-01',
      managementIp: '192.168.1.13',
      poeTotalBudgetWatts: 480,
      poeAllocatedWatts: 0
    },
    portsTemplate: [
      ...Array.from({ length: 12 }, (_, i): PortBlueprint => ({
        name: `2.5G Port ${i + 1} (PoE++)`,
        type: 'RJ45',
        direction: 'bidirectional',
        capacity: 2500,
        unit: 'Mbps',
        compatiblePortTypes: ['RJ45'],
        properties: { poe: true, maxWatts: 60 }
      })),
      { name: '10G Uplink 1', type: 'FIBER_LC', direction: 'bidirectional', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] }
    ]
  },

  SWITCH_DESKTOP_8P: {
    type: 'SWITCH_DESKTOP_8P',
    category: 'SWITCHING',
    name: '8-Port Compact Desktop PoE Switch',
    defaultTagPrefix: 'SW-DSK',
    description: 'Unmanaged/Smart 8-Port Gigabit Desktop Switch with 60W PoE Budget',
    icon: 'BranchesOutlined',
    defaultCost: {
      partNumber: 'SW-8P-DESK',
      manufacturer: 'TP-Compat',
      unitCost: 120,
      labourCost: 35,
      currency: 'USD'
    },
    defaultProperties: {
      poeTotalBudgetWatts: 60
    },
    portsTemplate: Array.from({ length: 8 }, (_, i): PortBlueprint => ({
      name: `Port ${i + 1}`,
      type: 'RJ45',
      direction: 'bidirectional',
      capacity: 1000,
      unit: 'Mbps',
      compatiblePortTypes: ['RJ45'],
      properties: { poe: i < 4, maxWatts: 15.4 }
    }))
  },

  // === WIRELESS & WIFI ===
  ACCESS_POINT_OUTDOOR: {
    type: 'ACCESS_POINT_OUTDOOR',
    category: 'WIRELESS',
    name: 'Outdoor Rugged WiFi 6 AP (IP67)',
    defaultTagPrefix: 'AP-OUT',
    description: 'Weatherproof IP67 High-Power Outdoor AP with External Omnidirectional Antennas',
    icon: 'WifiOutlined',
    defaultCost: {
      partNumber: 'AP-OUT-IP67',
      manufacturer: 'UniFi-Compat',
      unitCost: 480,
      labourCost: 140,
      currency: 'USD'
    },
    defaultProperties: {
      ipAddress: '192.168.1.25',
      defaultGateway: '192.168.1.1',
      weatherRating: 'IP67',
      rangeMeters: 250,
      poeDrawWatts: 18.5
    },
    portsTemplate: [
      { name: 'ETH0 (PoE+ In)', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'], properties: { requiresPoe: true } }
    ]
  },

  ACCESS_POINT_INWALL: {
    type: 'ACCESS_POINT_INWALL',
    category: 'WIRELESS',
    name: 'In-Wall Hospitality WiFi 6 AP',
    defaultTagPrefix: 'AP-IW',
    description: 'Wall-Plate Access Point with Built-in 4-Port Gigabit Switch & PoE Out',
    icon: 'WifiOutlined',
    defaultCost: {
      partNumber: 'AP-IW-G6',
      manufacturer: 'Aruba-Compat',
      unitCost: 240,
      labourCost: 65,
      currency: 'USD'
    },
    defaultProperties: {
      ipAddress: '192.168.1.28',
      defaultGateway: '192.168.1.1',
      poeDrawWatts: 12
    },
    portsTemplate: [
      { name: 'Rear Uplink (PoE In)', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'], properties: { requiresPoe: true } },
      { name: 'Front Port 1 (PoE Out)', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'Front Port 2', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  WIRELESS_PTP_BRIDGE: {
    type: 'WIRELESS_PTP_BRIDGE',
    category: 'WIRELESS',
    name: '60GHz Long-Range PTP Bridge',
    defaultTagPrefix: 'PTP',
    description: 'Gigabit Point-to-Point Wireless Bridge for Building-to-Building Links (up to 12km)',
    icon: 'WifiOutlined',
    defaultCost: {
      partNumber: 'PTP-60G-10K',
      manufacturer: 'MikroTik-Compat',
      unitCost: 690,
      labourCost: 200,
      currency: 'USD'
    },
    defaultProperties: {
      frequencyGhz: 60,
      backupFrequencyGhz: 5,
      maxThroughputMbps: 2000,
      linkDistanceKm: 5
    },
    portsTemplate: [
      { name: 'ETH_POE', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'], properties: { requiresPoe: true } }
    ]
  },

  WLC_CONTROLLER: {
    type: 'WLC_CONTROLLER',
    category: 'WIRELESS',
    name: 'Hardware Wireless Controller (WLC)',
    defaultTagPrefix: 'WLC',
    description: 'Centralized Wireless LAN Controller Appliance managing up to 500 APs with Seamless Roaming',
    icon: 'WifiOutlined',
    defaultCost: {
      partNumber: 'WLC-500AP-1U',
      manufacturer: 'Cisco-Compat',
      unitCost: 3200,
      labourCost: 400,
      currency: 'USD'
    },
    defaultProperties: {
      ipAddress: '192.168.1.15',
      defaultGateway: '192.168.1.1',
      maxManagedAps: 500,
      rfOptimization: true
    },
    portsTemplate: [
      { name: 'SFP+ 10G 1', type: 'FIBER_LC', direction: 'bidirectional', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
      { name: 'SFP+ 10G 2', type: 'FIBER_LC', direction: 'bidirectional', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
      { name: 'Mgmt', type: 'RJ45', direction: 'bidirectional', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  // === RACKS, CABINETS & INFRASTRUCTURE ===
  RACK_CABINET_42U: {
    type: 'RACK_CABINET_42U',
    category: 'INFRASTRUCTURE',
    name: '42U Server Rack Cabinet',
    defaultTagPrefix: 'RCK-42U',
    description: 'Heavy-Duty 42U 19-inch Data Center Rack Enclosure with Perforated Doors & Cable Management',
    icon: 'InboxOutlined',
    defaultCost: {
      partNumber: 'RCK-42U-1070',
      manufacturer: 'APC-Compat',
      unitCost: 1400,
      labourCost: 300,
      currency: 'USD'
    },
    defaultProperties: {
      rackUnits: 42,
      depthMm: 1070,
      widthMm: 600,
      maxLoadKg: 1360
    },
    portsTemplate: []
  },

  RACK_WALLMOUNT_12U: {
    type: 'RACK_WALLMOUNT_12U',
    category: 'INFRASTRUCTURE',
    name: '12U Wall-Mount Network Cabinet',
    defaultTagPrefix: 'RCK-12U',
    description: 'Compact 12U Hinged Wall-Mount Network Enclosure with Tempered Glass Door for Intermediate Distribution Frames',
    icon: 'InboxOutlined',
    defaultCost: {
      partNumber: 'RCK-12U-WALL',
      manufacturer: 'TrippLite-Compat',
      unitCost: 320,
      labourCost: 120,
      currency: 'USD'
    },
    defaultProperties: {
      rackUnits: 12,
      depthMm: 550,
      maxLoadKg: 90
    },
    portsTemplate: []
  },

  PATCH_PANEL_24P: {
    type: 'PATCH_PANEL_24P',
    category: 'INFRASTRUCTURE',
    name: '24-Port Cat6A Keystone Patch Panel',
    defaultTagPrefix: 'PP-24',
    description: '1U 24-Port Shielded Keystone Patch Panel with Cable Management Bar',
    icon: 'TableOutlined',
    defaultCost: {
      partNumber: 'PP-CAT6A-24',
      manufacturer: 'Leviton-Compat',
      unitCost: 140,
      labourCost: 180,
      currency: 'USD'
    },
    defaultProperties: {
      standard: 'Cat6A TIA-568',
      portsCount: 24
    },
    portsTemplate: Array.from({ length: 8 }, (_, i): PortBlueprint => ({
      name: `Jack ${i + 1}`,
      type: 'RJ45',
      direction: 'bidirectional',
      capacity: 10000,
      unit: 'Mbps',
      compatiblePortTypes: ['RJ45']
    }))
  },

  FIBER_PATCH_PANEL: {
    type: 'FIBER_PATCH_PANEL',
    category: 'INFRASTRUCTURE',
    name: '24-Port LC Duplex Fiber ODF',
    defaultTagPrefix: 'ODF-24',
    description: '1U Optical Distribution Frame with 24x Duplex LC Singlemode / Multimode Couplers',
    icon: 'TableOutlined',
    defaultCost: {
      partNumber: 'ODF-LC-24D',
      manufacturer: 'Corning-Compat',
      unitCost: 280,
      labourCost: 240,
      currency: 'USD'
    },
    defaultProperties: {
      couplerType: 'LC Duplex',
      capacityFibers: 48
    },
    portsTemplate: Array.from({ length: 6 }, (_, i): PortBlueprint => ({
      name: `Fiber Pair ${i + 1}`,
      type: 'FIBER_LC',
      direction: 'bidirectional',
      capacity: 100000,
      unit: 'Mbps',
      compatiblePortTypes: ['FIBER_LC']
    }))
  },

  UPS_ONLINE_3KVA: {
    type: 'UPS_ONLINE_3KVA',
    category: 'INFRASTRUCTURE',
    name: '3kVA Online Rackmount UPS',
    defaultTagPrefix: 'UPS-3K',
    description: '2U Online Double-Conversion Uninterruptible Power Supply with Pure Sine Wave & Network Management Card',
    icon: 'ThunderboltOutlined',
    defaultCost: {
      partNumber: 'UPS-3000RT-2U',
      manufacturer: 'Eaton-Compat',
      unitCost: 1650,
      labourCost: 180,
      currency: 'USD'
    },
    defaultProperties: {
      capacityVa: 3000,
      capacityWatts: 2700,
      batteryRuntimeMins: 15,
      snmpCardIp: '192.168.1.250'
    },
    portsTemplate: [
      { name: 'NMC_SNMP', type: 'RJ45', direction: 'bidirectional', capacity: 100, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  SMART_PDU_RACK: {
    type: 'SMART_PDU_RACK',
    category: 'INFRASTRUCTURE',
    name: 'Smart Zero-U Metered PDU',
    defaultTagPrefix: 'PDU-RACK',
    description: 'Vertical 30A 24-Outlet Metered & Switched PDU with Per-Outlet Power Monitoring & Remote Reboot',
    icon: 'ThunderboltOutlined',
    defaultCost: {
      partNumber: 'PDU-SW-24O',
      manufacturer: 'ServerTech-Compat',
      unitCost: 850,
      labourCost: 90,
      currency: 'USD'
    },
    defaultProperties: {
      inputVoltage: '208V / 240V',
      ratedCurrentAmps: 30,
      outletsCount: 24,
      networkIp: '192.168.1.251'
    },
    portsTemplate: [
      { name: 'ETH_MGMT', type: 'RJ45', direction: 'bidirectional', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  // === SECURITY, IOT & COLLABORATION ENDPOINTS ===
  CCTV_CAMERA_PTZ: {
    type: 'CCTV_CAMERA_PTZ',
    category: 'ENDPOINTS',
    name: '4K Ultra-HD PTZ IP Camera (PoE+)',
    defaultTagPrefix: 'CAM-PTZ',
    description: '30x Optical Zoom 4K Pan-Tilt-Zoom Outdoor Surveillance Camera with IR Night Vision',
    icon: 'VideoCameraOutlined',
    defaultCost: {
      partNumber: 'CAM-4K-PTZ30',
      manufacturer: 'Axis-Compat',
      unitCost: 1250,
      labourCost: 180,
      currency: 'USD'
    },
    defaultProperties: {
      ipAddress: '192.168.1.180',
      defaultGateway: '192.168.1.1',
      streamBitrateMbps: 8,
      poeDrawWatts: 25.5
    },
    portsTemplate: [
      { name: 'ETH_POE', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'], properties: { requiresPoe: true } }
    ]
  },

  ACCESS_CONTROL_PANEL: {
    type: 'ACCESS_CONTROL_PANEL',
    category: 'ENDPOINTS',
    name: 'IP Access Control Door Controller',
    defaultTagPrefix: 'AC-DOOR',
    description: 'Networked 2-Door Controller with OSDP RFID Reader Interfaces & Magnetic Lock Relays',
    icon: 'LockOutlined',
    defaultCost: {
      partNumber: 'AC-CTRL-2D',
      manufacturer: 'HID-Compat',
      unitCost: 950,
      labourCost: 220,
      currency: 'USD'
    },
    defaultProperties: {
      ipAddress: '192.168.1.190',
      defaultGateway: '192.168.1.1',
      doorsControlled: 2,
      poeDrawWatts: 15.4
    },
    portsTemplate: [
      { name: 'LAN (PoE)', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'], properties: { requiresPoe: true } }
    ]
  },

  STORAGE_NAS_SAN: {
    type: 'STORAGE_NAS_SAN',
    category: 'CORE',
    name: 'Enterprise SAN / NAS Storage Array',
    defaultTagPrefix: 'SAN',
    description: '24-Bay All-Flash NVMe Storage Array with Dual 10G SFP+ iSCSI / NFS Controllers',
    icon: 'DatabaseOutlined',
    defaultCost: {
      partNumber: 'SAN-NVME-24B',
      manufacturer: 'NetApp-Compat',
      unitCost: 8500,
      labourCost: 600,
      currency: 'USD'
    },
    defaultProperties: {
      ipAddress: '192.168.1.60',
      defaultGateway: '192.168.1.1',
      rawCapacityTb: 120,
      iops: 500000
    },
    portsTemplate: [
      { name: 'SFP+ 10G A', type: 'FIBER_LC', direction: 'bidirectional', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
      { name: 'SFP+ 10G B', type: 'FIBER_LC', direction: 'bidirectional', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
      { name: 'Mgmt', type: 'RJ45', direction: 'bidirectional', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  CONFERENCE_BAR: {
    type: 'CONFERENCE_BAR',
    category: 'ENDPOINTS',
    name: 'Smart 4K Video Conference Bar',
    defaultTagPrefix: 'CONF-BAR',
    description: 'Integrated All-in-One 4K Meeting Bar with 6-Beamforming Mic Array and Dual Display Outputs',
    icon: 'VideoCameraOutlined',
    defaultCost: {
      partNumber: 'CONF-4K-BAR',
      manufacturer: 'Logi-Compat',
      unitCost: 2200,
      labourCost: 150,
      currency: 'USD'
    },
    defaultProperties: {
      ipAddress: '192.168.1.210',
      defaultGateway: '192.168.1.1',
      poeDrawWatts: 20
    },
    portsTemplate: [
      { name: 'LAN (PoE)', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'], properties: { requiresPoe: true } }
    ]
  }
};

let tagCounter: Record<string, number> = {};

export function createComponentInstance(
  templateType: string,
  designId: string,
  position: { x: number; y: number },
  overrideTag?: string
): EngineeringComponent {
  const template = NETWORK_COMPONENT_CATALOG[templateType];
  if (!template) {
    throw new Error(`Unknown component template type: ${templateType}`);
  }

  const prefix = template.defaultTagPrefix;
  tagCounter[prefix] = (tagCounter[prefix] || 0) + 1;
  const tag = overrideTag || `${prefix}-${String(tagCounter[prefix]).padStart(2, '0')}`;
  const nodeId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const ports: ComponentPort[] = template.portsTemplate.map((pt, idx) => ({
    id: `port_${nodeId}_${idx}`,
    nodeId,
    name: pt.name,
    portIndex: idx,
    type: pt.type,
    direction: pt.direction,
    capacity: pt.capacity,
    unit: pt.unit,
    compatiblePortTypes: [...pt.compatiblePortTypes],
    occupiedByConnectionId: null,
    properties: { ...(pt.properties || {}) }
  }));

  return {
    id: nodeId,
    designId,
    domain: 'NETWORK',
    type: template.type,
    name: `${template.name} (${tag})`,
    tag,
    description: template.description,
    position,
    dimensions: { width: 180, height: 110 },
    ports,
    properties: JSON.parse(JSON.stringify(template.defaultProperties)),
    costData: { ...template.defaultCost },
    simulationState: {
      status: 'ONLINE',
      isFailed: false,
      loadPercent: 5,
      telemetry: {}
    }
  };
}
