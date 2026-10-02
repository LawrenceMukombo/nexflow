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
  category: 'CORE' | 'SWITCHING' | 'SECURITY' | 'ENDPOINTS' | 'INFRASTRUCTURE';
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
