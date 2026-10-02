import {
  ComponentLibrary,
  LibraryAssembly,
  EngineeringComponent,
  EngineeringConnection
} from '@omniflow/shared-types';
import { 
  NETWORK_COMPONENT_CATALOG, 
  createComponentInstance 
} from './components';
import { createConnectionInstance } from './ports';

// -------------------------------------------------------------
// 1. CURATED BUILT-IN ENTERPRISE LIBRARIES
// -------------------------------------------------------------

export const CISCO_ENTERPRISE_LIBRARY: ComponentLibrary = {
  id: 'lib_cisco_enterprise',
  name: 'Cisco Enterprise Systems',
  category: 'Enterprise Networking',
  description: 'Production-grade Cisco Catalyst switching, ISR SD-WAN routers, and Catalyst WiFi 6E infrastructure.',
  version: '1.2.0',
  author: 'Cisco Systems / OmniFlow Curated',
  isBuiltIn: true,
  createdAt: '2026-01-15T08:00:00Z',
  updatedAt: '2026-03-20T12:00:00Z',
  components: [
    {
      type: 'CISCO_CATALYST_9300',
      category: 'SWITCHING',
      name: 'Cisco Catalyst 9300-48UXM Multi-Gig PoE+',
      defaultTagPrefix: 'C9300',
      description: '48-Port Multi-Gigabit (UPOE+ 90W) with 4x 25G SFP28 Modular Uplinks and StackWise-480.',
      icon: 'BranchesOutlined',
      defaultCost: {
        partNumber: 'C9300-48UXM-A',
        manufacturer: 'Cisco Systems',
        unitCost: 5850,
        labourCost: 250,
        currency: 'USD'
      },
      defaultProperties: {
        layer: 3,
        stackwiseEnabled: true,
        poeBudgetWatts: 1440,
        ipAddress: '192.168.1.10',
        subnetMask: '255.255.255.0'
      },
      portsTemplate: [
        ...Array.from({ length: 24 }).map((_, i) => ({
          name: `mGig1/0/${i + 1}`,
          type: 'RJ45',
          direction: 'bidirectional' as const,
          capacity: 2500,
          unit: 'Mbps',
          compatiblePortTypes: ['RJ45'],
          properties: { poeSuppliedWatts: 90 }
        })),
        {
          name: 'Te1/1/1 (Uplink)',
          type: 'FIBER_LC',
          direction: 'bidirectional' as const,
          capacity: 10000,
          unit: 'Mbps',
          compatiblePortTypes: ['FIBER_LC'],
          properties: { mode: 'MultiMode' }
        },
        {
          name: 'Te1/1/2 (Uplink)',
          type: 'FIBER_LC',
          direction: 'bidirectional' as const,
          capacity: 10000,
          unit: 'Mbps',
          compatiblePortTypes: ['FIBER_LC'],
          properties: { mode: 'MultiMode' }
        }
      ]
    },
    {
      type: 'CISCO_CATALYST_9500',
      category: 'SWITCHING',
      name: 'Cisco Catalyst 9500-32C 100G Core Switch',
      defaultTagPrefix: 'C9500',
      description: '32-Port 100G/40G QSFP28 enterprise core aggregation switch with StackWise Virtual.',
      icon: 'ApartmentOutlined',
      defaultCost: {
        partNumber: 'C9500-32C-A',
        manufacturer: 'Cisco Systems',
        unitCost: 18500,
        labourCost: 600,
        currency: 'USD'
      },
      defaultProperties: {
        layer: 3,
        stackwiseVirtual: true,
        routingProtocols: ['OSPF', 'BGP', 'EIGRP', 'IS-IS'],
        ipAddress: '10.0.0.1',
        subnetMask: '255.255.255.0'
      },
      portsTemplate: [
        { name: 'QSFP1 (100G)', type: 'FIBER_LC', direction: 'bidirectional' as const, capacity: 100000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
        { name: 'QSFP2 (100G)', type: 'FIBER_LC', direction: 'bidirectional' as const, capacity: 100000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
        { name: 'QSFP3 (100G)', type: 'FIBER_LC', direction: 'bidirectional' as const, capacity: 100000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
        { name: 'QSFP4 (100G)', type: 'FIBER_LC', direction: 'bidirectional' as const, capacity: 100000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] }
      ]
    },
    {
      type: 'CISCO_ISR_4451',
      category: 'CORE',
      name: 'Cisco ISR 4451-X Enterprise SD-WAN Router',
      defaultTagPrefix: 'ISR4451',
      description: 'Modular high-throughput branch/campus aggregation router with dual power supplies and hardware crypto accelerator.',
      icon: 'PartitionOutlined',
      defaultCost: {
        partNumber: 'ISR4451-X/K9',
        manufacturer: 'Cisco Systems',
        unitCost: 7200,
        labourCost: 350,
        currency: 'USD'
      },
      defaultProperties: {
        ipAddress: '198.51.100.2',
        defaultGateway: '198.51.100.1',
        sdWanEnabled: true,
        cryptoThroughputGbps: 2
      },
      portsTemplate: [
        { name: 'Gig0/0/0 (WAN1)', type: 'RJ45', direction: 'input' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
        { name: 'Gig0/0/1 (WAN2 SFP)', type: 'FIBER_LC', direction: 'input' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
        { name: 'Gig0/0/2 (LAN Core)', type: 'RJ45', direction: 'output' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
        { name: 'Gig0/0/3 (LAN DMZ)', type: 'RJ45', direction: 'output' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
      ]
    },
    {
      type: 'CISCO_CATALYST_9130AX',
      category: 'WIRELESS',
      name: 'Cisco Catalyst 9130AX Series WiFi 6E AP',
      defaultTagPrefix: 'AP9130',
      description: 'Enterprise 8x8:8 tri-band Wi-Fi 6 AP with 5Gbps multi-gig PoE uplink and integrated BLE/Zigbee IoT radio.',
      icon: 'WifiOutlined',
      defaultCost: {
        partNumber: 'C9130AXI-B',
        manufacturer: 'Cisco Systems',
        unitCost: 1450,
        labourCost: 100,
        currency: 'USD'
      },
      defaultProperties: {
        wifiStandard: 'Wi-Fi 6 (802.11ax)',
        ipAddress: '192.168.1.150',
        poeDrawWatts: 30,
        maxClients: 400
      },
      portsTemplate: [
        { name: '5GbE PoE In', type: 'RJ45', direction: 'input' as const, capacity: 5000, unit: 'Mbps', compatiblePortTypes: ['RJ45'], properties: { requiresPoe: true } }
      ]
    }
  ],
  assemblies: [
    {
      id: 'asm_cisco_campus_core',
      name: 'Cisco Resilient Collapsed Core POD',
      category: 'Enterprise Networking',
      description: 'Dual Catalyst 9500 100G Core Switches interconnected with redundant 10G links feeding a Catalyst 9300 Multi-Gig Access stack.',
      icon: 'ApartmentOutlined',
      author: 'Cisco Certified Architect',
      version: '1.0.0',
      tags: ['Cisco', 'Redundant Core', 'High Availability', 'StackWise'],
      estimatedCost: 48700,
      nodes: [
        {
          templateType: 'CISCO_CATALYST_9500',
          name: 'Cisco Cat9500-Core-01',
          tagPrefix: 'CORE-A',
          relativeX: 0,
          relativeY: 0,
          properties: { ipAddress: '10.0.0.1' }
        },
        {
          templateType: 'CISCO_CATALYST_9500',
          name: 'Cisco Cat9500-Core-02',
          tagPrefix: 'CORE-B',
          relativeX: 340,
          relativeY: 0,
          properties: { ipAddress: '10.0.0.2' }
        },
        {
          templateType: 'CISCO_CATALYST_9300',
          name: 'Cisco Cat9300-Access-01',
          tagPrefix: 'ACC-01',
          relativeX: 170,
          relativeY: 260,
          properties: { ipAddress: '192.168.10.1' }
        }
      ],
      connections: [
        {
          sourceNodeIndex: 0,
          sourcePortName: 'QSFP1 (100G)',
          targetNodeIndex: 1,
          targetPortName: 'QSFP1 (100G)',
          connectionType: 'FIBER_MM',
          lengthMeters: 5
        },
        {
          sourceNodeIndex: 0,
          sourcePortName: 'QSFP2 (100G)',
          targetNodeIndex: 2,
          targetPortName: 'Te1/1/1 (Uplink)',
          connectionType: 'FIBER_SM',
          lengthMeters: 45
        },
        {
          sourceNodeIndex: 1,
          sourcePortName: 'QSFP2 (100G)',
          targetNodeIndex: 2,
          targetPortName: 'Te1/1/2 (Uplink)',
          connectionType: 'FIBER_SM',
          lengthMeters: 45
        }
      ]
    },
    {
      id: 'asm_cisco_branch_office',
      name: 'Cisco Secure Branch Office',
      category: 'Enterprise Networking',
      description: 'Cisco ISR 4451 SD-WAN router connected to Cat9300 Multi-Gig PoE switch powering dual Catalyst 9130AX APs.',
      icon: 'PartitionOutlined',
      author: 'OmniFlow Team',
      version: '1.0.0',
      tags: ['Cisco', 'Branch', 'SD-WAN', 'WiFi 6'],
      estimatedCost: 15950,
      nodes: [
        {
          templateType: 'CISCO_ISR_4451',
          name: 'Cisco ISR 4451 SD-WAN Gateway',
          tagPrefix: 'RTR-BR',
          relativeX: 180,
          relativeY: 0,
          properties: { ipAddress: '192.168.1.1' }
        },
        {
          templateType: 'CISCO_CATALYST_9300',
          name: 'Cisco Cat9300 PoE Distribution',
          tagPrefix: 'SW-DIST',
          relativeX: 180,
          relativeY: 220,
          properties: { ipAddress: '192.168.1.2' }
        },
        {
          templateType: 'CISCO_CATALYST_9130AX',
          name: 'Cisco Cat9130AX AP West',
          tagPrefix: 'AP-01',
          relativeX: 0,
          relativeY: 420,
          properties: { ipAddress: '192.168.1.101' }
        },
        {
          templateType: 'CISCO_CATALYST_9130AX',
          name: 'Cisco Cat9130AX AP East',
          tagPrefix: 'AP-02',
          relativeX: 360,
          relativeY: 420,
          properties: { ipAddress: '192.168.1.102' }
        }
      ],
      connections: [
        {
          sourceNodeIndex: 0,
          sourcePortName: 'Gig0/0/2 (LAN Core)',
          targetNodeIndex: 1,
          targetPortName: 'mGig1/0/1',
          connectionType: 'CAT6A',
          lengthMeters: 5
        },
        {
          sourceNodeIndex: 1,
          sourcePortName: 'mGig1/0/2',
          targetNodeIndex: 2,
          targetPortName: '5GbE PoE In',
          connectionType: 'CAT6A',
          lengthMeters: 35
        },
        {
          sourceNodeIndex: 1,
          sourcePortName: 'mGig1/0/3',
          targetNodeIndex: 3,
          targetPortName: '5GbE PoE In',
          connectionType: 'CAT6A',
          lengthMeters: 40
        }
      ]
    }
  ]
};

// -------------------------------------------------------------
// 2. UBIQUITI UNIFI ECOSYSTEM LIBRARY
// -------------------------------------------------------------

export const UBIQUITI_UNIFI_LIBRARY: ComponentLibrary = {
  id: 'lib_ubiquiti_unifi',
  name: 'Ubiquiti UniFi Ecosystem',
  category: 'Commercial & Hospitality',
  description: 'Complete UniFi SDN ecosystem with Dream Machine Pro/SE, Pro PoE switches, Protect 4K surveillance, and WiFi 6 APs.',
  version: '2.0.1',
  author: 'Ubiquiti Community / OmniFlow',
  isBuiltIn: true,
  createdAt: '2026-02-01T10:00:00Z',
  updatedAt: '2026-03-25T14:30:00Z',
  components: [
    {
      type: 'UNIFI_UDM_SE',
      category: 'CORE',
      name: 'UniFi Dream Machine Special Edition (UDM-SE)',
      defaultTagPrefix: 'UDM-SE',
      description: 'All-in-one 2.5G router, security gateway, UniFi OS console with built-in 8-port PoE switch and 10G SFP+ WAN/LAN.',
      icon: 'CloudServerOutlined',
      defaultCost: {
        partNumber: 'UDM-SE',
        manufacturer: 'Ubiquiti Inc.',
        unitCost: 499,
        labourCost: 120,
        currency: 'USD'
      },
      defaultProperties: {
        ipAddress: '192.168.1.1',
        threatManagementThroughputGbps: 3.5,
        builtInPoeBudgetWatts: 130
      },
      portsTemplate: [
        { name: 'WAN 2.5GbE', type: 'RJ45', direction: 'input' as const, capacity: 2500, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
        { name: 'WAN2 10G SFP+', type: 'FIBER_LC', direction: 'input' as const, capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
        { name: 'LAN 10G SFP+', type: 'FIBER_LC', direction: 'output' as const, capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
        { name: 'Port 1 (PoE)', type: 'RJ45', direction: 'bidirectional' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'], properties: { poeSuppliedWatts: 15.4 } },
        { name: 'Port 2 (PoE)', type: 'RJ45', direction: 'bidirectional' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'], properties: { poeSuppliedWatts: 15.4 } },
        { name: 'Port 8 (PoE+)', type: 'RJ45', direction: 'bidirectional' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'], properties: { poeSuppliedWatts: 30 } }
      ]
    },
    {
      type: 'UNIFI_PRO_24_POE',
      category: 'SWITCHING',
      name: 'UniFi Switch Pro 24 PoE (USW-Pro-24-PoE)',
      defaultTagPrefix: 'USW-24P',
      description: 'Layer 3 managed PoE switch with 16x 802.3at PoE+, 8x 802.3bt PoE++, and 2x 10G SFP+ uplinks.',
      icon: 'BranchesOutlined',
      defaultCost: {
        partNumber: 'USW-Pro-24-PoE',
        manufacturer: 'Ubiquiti Inc.',
        unitCost: 699,
        labourCost: 150,
        currency: 'USD'
      },
      defaultProperties: {
        layer: 3,
        poeBudgetWatts: 400,
        ipAddress: '192.168.1.2'
      },
      portsTemplate: [
        ...Array.from({ length: 16 }).map((_, i) => ({
          name: `Port ${i + 1} (PoE+)`,
          type: 'RJ45',
          direction: 'bidirectional' as const,
          capacity: 1000,
          unit: 'Mbps',
          compatiblePortTypes: ['RJ45'],
          properties: { poeSuppliedWatts: 30 }
        })),
        { name: 'SFP+ 1 (10G)', type: 'FIBER_LC', direction: 'bidirectional' as const, capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
        { name: 'SFP+ 2 (10G)', type: 'FIBER_LC', direction: 'bidirectional' as const, capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] }
      ]
    },
    {
      type: 'UNIFI_U6_PRO',
      category: 'WIRELESS',
      name: 'UniFi Access Point WiFi 6 Pro (U6-Pro)',
      defaultTagPrefix: 'U6-PRO',
      description: 'High-performance ceiling-mounted Wi-Fi 6 AP with 5.3 Gbps aggregate throughput and 4x4 MU-MIMO.',
      icon: 'WifiOutlined',
      defaultCost: {
        partNumber: 'U6-Pro',
        manufacturer: 'Ubiquiti Inc.',
        unitCost: 159,
        labourCost: 80,
        currency: 'USD'
      },
      defaultProperties: {
        ipAddress: '192.168.1.120',
        poeDrawWatts: 13,
        maxClients: 350
      },
      portsTemplate: [
        { name: 'GbE PoE In', type: 'RJ45', direction: 'input' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'], properties: { requiresPoe: true } }
      ]
    },
    {
      type: 'UNIFI_PROTECT_G5_BULLET',
      category: 'SECURITY',
      name: 'UniFi Protect G5 Bullet 4K IP Camera',
      defaultTagPrefix: 'CAM-G5',
      description: 'Next-gen 2K/4K HDR indoor/outdoor surveillance camera with infrared night vision and AI smart detection.',
      icon: 'VideoCameraOutlined',
      defaultCost: {
        partNumber: 'UVC-G5-Bullet',
        manufacturer: 'Ubiquiti Inc.',
        unitCost: 129,
        labourCost: 65,
        currency: 'USD'
      },
      defaultProperties: {
        ipAddress: '192.168.1.201',
        poeDrawWatts: 5,
        resolution: '4MP HDR / 30fps'
      },
      portsTemplate: [
        { name: 'PoE Ethernet', type: 'RJ45', direction: 'input' as const, capacity: 100, unit: 'Mbps', compatiblePortTypes: ['RJ45'], properties: { requiresPoe: true } }
      ]
    }
  ],
  assemblies: [
    {
      id: 'asm_unifi_office_stack',
      name: 'UniFi Smart Commercial Office Kit',
      category: 'Commercial & Hospitality',
      description: 'UDM-SE 2.5G Gateway feeding USW-Pro-24-PoE switch via 10G SFP+ DAC, powering 2x U6-Pro WiFi 6 APs and 2x G5 Bullet Cameras.',
      icon: 'WifiOutlined',
      author: 'Ubiquiti Solutions Team',
      version: '1.1.0',
      tags: ['UniFi', 'Commercial', 'PoE', 'Surveillance', 'WiFi 6'],
      estimatedCost: 1890,
      nodes: [
        {
          templateType: 'UNIFI_UDM_SE',
          name: 'UniFi Dream Machine SE',
          tagPrefix: 'UDM-01',
          relativeX: 200,
          relativeY: 0,
          properties: { ipAddress: '192.168.1.1' }
        },
        {
          templateType: 'UNIFI_PRO_24_POE',
          name: 'UniFi Pro 24 PoE Switch',
          tagPrefix: 'USW-01',
          relativeX: 200,
          relativeY: 220,
          properties: { ipAddress: '192.168.1.2' }
        },
        {
          templateType: 'UNIFI_U6_PRO',
          name: 'UniFi U6-Pro AP Office',
          tagPrefix: 'AP-01',
          relativeX: 0,
          relativeY: 420,
          properties: { ipAddress: '192.168.1.101' }
        },
        {
          templateType: 'UNIFI_U6_PRO',
          name: 'UniFi U6-Pro AP Lobby',
          tagPrefix: 'AP-02',
          relativeX: 400,
          relativeY: 420,
          properties: { ipAddress: '192.168.1.102' }
        },
        {
          templateType: 'UNIFI_PROTECT_G5_BULLET',
          name: 'UniFi G5 Entrance Camera',
          tagPrefix: 'CAM-01',
          relativeX: 130,
          relativeY: 420,
          properties: { ipAddress: '192.168.1.201' }
        },
        {
          templateType: 'UNIFI_PROTECT_G5_BULLET',
          name: 'UniFi G5 Rear Camera',
          tagPrefix: 'CAM-02',
          relativeX: 270,
          relativeY: 420,
          properties: { ipAddress: '192.168.1.202' }
        }
      ],
      connections: [
        {
          sourceNodeIndex: 0,
          sourcePortName: 'LAN 10G SFP+',
          targetNodeIndex: 1,
          targetPortName: 'SFP+ 1 (10G)',
          connectionType: 'DAC_10G',
          lengthMeters: 2
        },
        {
          sourceNodeIndex: 1,
          sourcePortName: 'Port 1 (PoE+)',
          targetNodeIndex: 2,
          targetPortName: 'GbE PoE In',
          connectionType: 'CAT6A',
          lengthMeters: 25
        },
        {
          sourceNodeIndex: 1,
          sourcePortName: 'Port 2 (PoE+)',
          targetNodeIndex: 3,
          targetPortName: 'GbE PoE In',
          connectionType: 'CAT6A',
          lengthMeters: 30
        },
        {
          sourceNodeIndex: 1,
          sourcePortName: 'Port 3 (PoE+)',
          targetNodeIndex: 4,
          targetPortName: 'PoE Ethernet',
          connectionType: 'CAT6',
          lengthMeters: 15
        },
        {
          sourceNodeIndex: 1,
          sourcePortName: 'Port 4 (PoE+)',
          targetNodeIndex: 5,
          targetPortName: 'PoE Ethernet',
          connectionType: 'CAT6',
          lengthMeters: 20
        }
      ]
    }
  ]
};

// -------------------------------------------------------------
// 3. FORTINET SECURITY FABRIC LIBRARY
// -------------------------------------------------------------

export const FORTINET_SECURITY_LIBRARY: ComponentLibrary = {
  id: 'lib_fortinet_security',
  name: 'Fortinet Security Fabric',
  category: 'Network Security',
  description: 'Enterprise threat protection with FortiGate Next-Gen Firewalls, FortiSwitch PoE, and FortiAP secure wireless.',
  version: '1.4.0',
  author: 'Fortinet Certified Architect / OmniFlow',
  isBuiltIn: true,
  createdAt: '2026-02-10T11:00:00Z',
  updatedAt: '2026-03-22T09:15:00Z',
  components: [
    {
      type: 'FORTIGATE_100F',
      category: 'SECURITY',
      name: 'Fortinet FortiGate 100F NGFW',
      defaultTagPrefix: 'FG100F',
      description: 'Enterprise Next-Generation Firewall with 1 Gbps Threat Protection, dual SFP+ 10GE ports, and FortiLink switch controller.',
      icon: 'SafetyCertificateOutlined',
      defaultCost: {
        partNumber: 'FG-100F-BDL-950-12',
        manufacturer: 'Fortinet Inc.',
        unitCost: 3800,
        labourCost: 300,
        currency: 'USD'
      },
      defaultProperties: {
        firewallThroughputGbps: 20,
        ipsThroughputGbps: 2.6,
        ngfwThroughputGbps: 1.6,
        ipAddress: '192.168.1.1'
      },
      portsTemplate: [
        { name: 'WAN1 (1GbE)', type: 'RJ45', direction: 'input' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
        { name: 'WAN2 (1GbE)', type: 'RJ45', direction: 'input' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
        { name: 'HA Heartbeat', type: 'RJ45', direction: 'bidirectional' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
        { name: 'FortiLink 1 (10G SFP+)', type: 'FIBER_LC', direction: 'output' as const, capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
        { name: 'FortiLink 2 (10G SFP+)', type: 'FIBER_LC', direction: 'output' as const, capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
        { name: 'DMZ (1GbE)', type: 'RJ45', direction: 'bidirectional' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
      ]
    },
    {
      type: 'FORTISWITCH_248F_FPOE',
      category: 'SWITCHING',
      name: 'FortiSwitch 248F-FPOE Managed Switch',
      defaultTagPrefix: 'FS248F',
      description: '48-Port Gigabit Full-PoE+ (740W budget) with 4x 10G SFP+ uplinks, managed seamlessly via FortiGate FortiLink.',
      icon: 'BranchesOutlined',
      defaultCost: {
        partNumber: 'FS-248F-FPOE',
        manufacturer: 'Fortinet Inc.',
        unitCost: 2600,
        labourCost: 180,
        currency: 'USD'
      },
      defaultProperties: {
        poeBudgetWatts: 740,
        layer: 2,
        ipAddress: '192.168.1.3'
      },
      portsTemplate: [
        ...Array.from({ length: 24 }).map((_, i) => ({
          name: `Port ${i + 1} (PoE+)`,
          type: 'RJ45',
          direction: 'bidirectional' as const,
          capacity: 1000,
          unit: 'Mbps',
          compatiblePortTypes: ['RJ45'],
          properties: { poeSuppliedWatts: 30 }
        })),
        { name: 'FortiLink Uplink 1', type: 'FIBER_LC', direction: 'bidirectional' as const, capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
        { name: 'FortiLink Uplink 2', type: 'FIBER_LC', direction: 'bidirectional' as const, capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] }
      ]
    },
    {
      type: 'FORTIAP_431F',
      category: 'WIRELESS',
      name: 'FortiAP 431F Enterprise WiFi 6 AP',
      defaultTagPrefix: 'FAP431',
      description: 'High-density 4x4:4 tri-radio indoor Wi-Fi 6 access point with dedicated RF scanning and BLE sensor.',
      icon: 'WifiOutlined',
      defaultCost: {
        partNumber: 'FAP-431F-A',
        manufacturer: 'Fortinet Inc.',
        unitCost: 890,
        labourCost: 90,
        currency: 'USD'
      },
      defaultProperties: {
        ipAddress: '192.168.1.130',
        poeDrawWatts: 24.5,
        maxClients: 512
      },
      portsTemplate: [
        { name: '2.5GbE PoE In', type: 'RJ45', direction: 'input' as const, capacity: 2500, unit: 'Mbps', compatiblePortTypes: ['RJ45'], properties: { requiresPoe: true } }
      ]
    }
  ],
  assemblies: [
    {
      id: 'asm_fortinet_ha_security_fabric',
      name: 'Fortinet High-Availability Security Fabric',
      category: 'Network Security',
      description: 'Dual FortiGate 100F firewalls configured in Active/Passive HA cluster controlling a FortiSwitch 248F-FPOE via redundant FortiLink.',
      icon: 'SafetyCertificateOutlined',
      author: 'Fortinet Security Consultant',
      version: '1.0.0',
      tags: ['Fortinet', 'NGFW', 'HA Cluster', 'Security Fabric'],
      estimatedCost: 11800,
      nodes: [
        {
          templateType: 'FORTIGATE_100F',
          name: 'FortiGate 100F (Primary Master)',
          tagPrefix: 'FG-PRI',
          relativeX: 0,
          relativeY: 0,
          properties: { ipAddress: '192.168.1.1' }
        },
        {
          templateType: 'FORTIGATE_100F',
          name: 'FortiGate 100F (Secondary Slave)',
          tagPrefix: 'FG-SEC',
          relativeX: 380,
          relativeY: 0,
          properties: { ipAddress: '192.168.1.2' }
        },
        {
          templateType: 'FORTISWITCH_248F_FPOE',
          name: 'FortiSwitch 248F Distribution',
          tagPrefix: 'FS-CORE',
          relativeX: 190,
          relativeY: 240,
          properties: { ipAddress: '192.168.1.10' }
        },
        {
          templateType: 'FORTIAP_431F',
          name: 'FortiAP 431F Secure Wireless',
          tagPrefix: 'FAP-01',
          relativeX: 190,
          relativeY: 440,
          properties: { ipAddress: '192.168.1.101' }
        }
      ],
      connections: [
        {
          sourceNodeIndex: 0,
          sourcePortName: 'HA Heartbeat',
          targetNodeIndex: 1,
          targetPortName: 'HA Heartbeat',
          connectionType: 'CAT6A',
          lengthMeters: 2
        },
        {
          sourceNodeIndex: 0,
          sourcePortName: 'FortiLink 1 (10G SFP+)',
          targetNodeIndex: 2,
          targetPortName: 'FortiLink Uplink 1',
          connectionType: 'DAC_10G',
          lengthMeters: 3
        },
        {
          sourceNodeIndex: 1,
          sourcePortName: 'FortiLink 1 (10G SFP+)',
          targetNodeIndex: 2,
          targetPortName: 'FortiLink Uplink 2',
          connectionType: 'DAC_10G',
          lengthMeters: 3
        },
        {
          sourceNodeIndex: 2,
          sourcePortName: 'Port 1 (PoE+)',
          targetNodeIndex: 3,
          targetPortName: '2.5GbE PoE In',
          connectionType: 'CAT6A',
          lengthMeters: 35
        }
      ]
    }
  ]
};

// -------------------------------------------------------------
// 4. CCTV & PHYSICAL ACCESS CONTROL LIBRARY
// -------------------------------------------------------------

export const CCTV_SURVEILLANCE_LIBRARY: ComponentLibrary = {
  id: 'lib_cctv_surveillance',
  name: 'IP Surveillance & Access Control',
  category: 'Physical Security',
  description: 'Industrial and commercial CCTV video surveillance kits, NVR appliances, and electronic access control stations.',
  version: '1.1.0',
  author: 'Security Systems Engineer',
  isBuiltIn: true,
  createdAt: '2026-02-15T09:00:00Z',
  updatedAt: '2026-03-24T16:00:00Z',
  components: [
    {
      type: 'NVR_ENTERPRISE_32CH',
      category: 'SECURITY',
      name: '32-Channel 4K AI Enterprise NVR',
      defaultTagPrefix: 'NVR32',
      description: 'Rackmount Network Video Recorder with 8x SATA bays (up to 128TB storage), RAID 5/6, and dual gigabit uplinks.',
      icon: 'DatabaseOutlined',
      defaultCost: {
        partNumber: 'NVR-ENT-32CH-8B',
        manufacturer: 'Hikvision / Axis OEM',
        unitCost: 1850,
        labourCost: 180,
        currency: 'USD'
      },
      defaultProperties: {
        maxCameras: 32,
        storageCapacityTb: 64,
        raidLevel: 'RAID 5',
        ipAddress: '192.168.20.10'
      },
      portsTemplate: [
        { name: 'LAN1 (Client / Stream)', type: 'RJ45', direction: 'bidirectional' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
        { name: 'LAN2 (Isolated Cam Net)', type: 'RJ45', direction: 'bidirectional' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
      ]
    },
    {
      type: 'CAMERA_FISHEYE_360',
      category: 'SECURITY',
      name: '12MP 360-Degree Panoramic Fisheye Camera',
      defaultTagPrefix: 'CAM-FISH',
      description: 'Single-sensor panoramic camera with hardware dewarping, edge AI heat-mapping, and PoE power.',
      icon: 'VideoCameraOutlined',
      defaultCost: {
        partNumber: 'CAM-FISH-12MP',
        manufacturer: 'Axis Communications',
        unitCost: 650,
        labourCost: 85,
        currency: 'USD'
      },
      defaultProperties: {
        resolution: '12 Megapixel 360°',
        poeDrawWatts: 12,
        ipAddress: '192.168.20.101'
      },
      portsTemplate: [
        { name: 'PoE LAN', type: 'RJ45', direction: 'input' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'], properties: { requiresPoe: true } }
      ]
    },
    {
      type: 'ACCESS_CONTROLLER_4DOOR',
      category: 'SECURITY',
      name: '4-Door PoE Network Access Controller',
      defaultTagPrefix: 'ACC-4D',
      description: 'TCP/IP biometric and RFID smart access control panel with battery backup and tamper sensors.',
      icon: 'LockOutlined',
      defaultCost: {
        partNumber: 'AC-CTRL-4D-NET',
        manufacturer: 'HID Global',
        unitCost: 1100,
        labourCost: 200,
        currency: 'USD'
      },
      defaultProperties: {
        supportedDoors: 4,
        cardCapacity: 50000,
        ipAddress: '192.168.20.50'
      },
      portsTemplate: [
        { name: 'Ethernet Uplink', type: 'RJ45', direction: 'input' as const, capacity: 100, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
      ]
    }
  ],
  assemblies: [
    {
      id: 'asm_cctv_access_station',
      name: 'Complete 4-Zone Surveillance & Access Station',
      category: 'Physical Security',
      description: 'PoE+ Security Switch powering 32CH NVR, 2x Fisheye 360 Cameras, 1x PTZ 4K Camera, and 4-Door Access Controller.',
      icon: 'VideoCameraOutlined',
      author: 'Perimeter Security Architect',
      version: '1.0.0',
      tags: ['CCTV', 'NVR', 'Access Control', 'PoE', 'Surveillance'],
      estimatedCost: 6950,
      nodes: [
        {
          templateType: 'SWITCH_POE_24',
          name: 'CCTV Dedicated PoE Switch',
          tagPrefix: 'SW-SEC',
          relativeX: 200,
          relativeY: 0,
          properties: { ipAddress: '192.168.20.2' }
        },
        {
          templateType: 'NVR_ENTERPRISE_32CH',
          name: 'Enterprise 32CH 4K NVR',
          tagPrefix: 'NVR-01',
          relativeX: 0,
          relativeY: 200,
          properties: { ipAddress: '192.168.20.10' }
        },
        {
          templateType: 'CAMERA_FISHEYE_360',
          name: 'Main Atrium 360° Fisheye',
          tagPrefix: 'CAM-01',
          relativeX: 200,
          relativeY: 200,
          properties: { ipAddress: '192.168.20.101' }
        },
        {
          templateType: 'CCTV_CAMERA_PTZ',
          name: 'Perimeter 4K PTZ Camera',
          tagPrefix: 'CAM-02',
          relativeX: 380,
          relativeY: 200,
          properties: { ipAddress: '192.168.20.102' }
        },
        {
          templateType: 'ACCESS_CONTROLLER_4DOOR',
          name: '4-Door Access Panel',
          tagPrefix: 'AC-01',
          relativeX: 100,
          relativeY: 380,
          properties: { ipAddress: '192.168.20.50' }
        }
      ],
      connections: [
        {
          sourceNodeIndex: 0,
          sourcePortName: 'Port 1 (PoE)',
          targetNodeIndex: 1,
          targetPortName: 'LAN1 (Client / Stream)',
          connectionType: 'CAT6',
          lengthMeters: 3
        },
        {
          sourceNodeIndex: 0,
          sourcePortName: 'Port 2 (PoE)',
          targetNodeIndex: 2,
          targetPortName: 'PoE LAN',
          connectionType: 'CAT6A',
          lengthMeters: 30
        },
        {
          sourceNodeIndex: 0,
          sourcePortName: 'Port 3 (PoE)',
          targetNodeIndex: 3,
          targetPortName: 'PoE LAN',
          connectionType: 'CAT6A',
          lengthMeters: 60
        },
        {
          sourceNodeIndex: 0,
          sourcePortName: 'Port 4 (PoE)',
          targetNodeIndex: 4,
          targetPortName: 'Ethernet Uplink',
          connectionType: 'CAT6',
          lengthMeters: 25
        }
      ]
    }
  ]
};

// -------------------------------------------------------------
// 5. INDUSTRIAL IOT & SCADA AUTOMATION LIBRARY
// -------------------------------------------------------------

export const INDUSTRIAL_SCADA_LIBRARY: ComponentLibrary = {
  id: 'lib_industrial_scada',
  name: 'Industrial IoT & SCADA Automation',
  category: 'Industrial & Utilities',
  description: 'Rugged DIN-rail industrial Ethernet switches, Modbus gateways, and substation SCADA ring topologies.',
  version: '1.0.0',
  author: 'Industrial Automation Specialist',
  isBuiltIn: true,
  createdAt: '2026-02-20T08:00:00Z',
  updatedAt: '2026-03-26T11:00:00Z',
  components: [
    {
      type: 'MOXA_EDS_510E',
      category: 'SWITCHING',
      name: 'Moxa EDS-510E Industrial Managed Switch',
      defaultTagPrefix: 'MOXA-SW',
      description: '10-port industrial Gigabit DIN-rail switch with Turbo Ring / Turbo Chain fast recovery (<20ms).',
      icon: 'ThunderboltOutlined',
      defaultCost: {
        partNumber: 'EDS-510E-3GTD',
        manufacturer: 'Moxa Technologies',
        unitCost: 1450,
        labourCost: 180,
        currency: 'USD'
      },
      defaultProperties: {
        operatingTempRange: '-40 to 75°C',
        redundancyProtocol: 'Turbo Ring v2',
        ipAddress: '192.168.100.10'
      },
      portsTemplate: [
        { name: 'Port 1 (DIN)', type: 'RJ45', direction: 'bidirectional' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
        { name: 'Port 2 (DIN)', type: 'RJ45', direction: 'bidirectional' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
        { name: 'Port 3 (Ring In)', type: 'FIBER_LC', direction: 'bidirectional' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
        { name: 'Port 4 (Ring Out)', type: 'FIBER_LC', direction: 'bidirectional' as const, capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] }
      ]
    },
    {
      type: 'MODBUS_GATEWAY_DIN',
      category: 'ENDPOINTS',
      name: 'Modbus TCP / RTU Industrial Gateway',
      defaultTagPrefix: 'MB-GW',
      description: '2-port RS-485 serial to Modbus TCP industrial converter with optical isolation.',
      icon: 'PartitionOutlined',
      defaultCost: {
        partNumber: 'MB-GW-485-TCP',
        manufacturer: 'Advantech',
        unitCost: 450,
        labourCost: 90,
        currency: 'USD'
      },
      defaultProperties: {
        ipAddress: '192.168.100.50',
        baudRate: 115200
      },
      portsTemplate: [
        { name: 'LAN (TCP)', type: 'RJ45', direction: 'input' as const, capacity: 100, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
      ]
    }
  ],
  assemblies: [
    {
      id: 'asm_scada_ring_node',
      name: 'Substation SCADA Redundant Ring',
      category: 'Industrial & Utilities',
      description: 'Industrial DIN-rail gateway and dual Moxa managed switches forming a sub-20ms fiber ring network with Modbus PLC endpoints.',
      icon: 'ThunderboltOutlined',
      author: 'Industrial Automation Specialist',
      version: '1.0.0',
      tags: ['SCADA', 'Industrial', 'Ring Redundancy', 'Modbus'],
      estimatedCost: 5900,
      nodes: [
        {
          templateType: 'ROUTER_INDUSTRIAL',
          name: 'Industrial Substation Gateway',
          tagPrefix: 'GW-IND',
          relativeX: 200,
          relativeY: 0,
          properties: { ipAddress: '192.168.100.1' }
        },
        {
          templateType: 'MOXA_EDS_510E',
          name: 'Moxa Ring Switch West',
          tagPrefix: 'SW-W',
          relativeX: 0,
          relativeY: 220,
          properties: { ipAddress: '192.168.100.11' }
        },
        {
          templateType: 'MOXA_EDS_510E',
          name: 'Moxa Ring Switch East',
          tagPrefix: 'SW-E',
          relativeX: 400,
          relativeY: 220,
          properties: { ipAddress: '192.168.100.12' }
        },
        {
          templateType: 'MODBUS_GATEWAY_DIN',
          name: 'PLC Modbus TCP Converter',
          tagPrefix: 'PLC-GW',
          relativeX: 0,
          relativeY: 420,
          properties: { ipAddress: '192.168.100.51' }
        }
      ],
      connections: [
        {
          sourceNodeIndex: 0,
          sourcePortName: 'ETH1 (LAN)',
          targetNodeIndex: 1,
          targetPortName: 'Port 1 (DIN)',
          connectionType: 'CAT6A',
          lengthMeters: 5
        },
        {
          sourceNodeIndex: 0,
          sourcePortName: 'ETH2 (LAN)',
          targetNodeIndex: 2,
          targetPortName: 'Port 1 (DIN)',
          connectionType: 'CAT6A',
          lengthMeters: 5
        },
        {
          sourceNodeIndex: 1,
          sourcePortName: 'Port 4 (Ring Out)',
          targetNodeIndex: 2,
          targetPortName: 'Port 3 (Ring In)',
          connectionType: 'FIBER_SM',
          lengthMeters: 120
        },
        {
          sourceNodeIndex: 1,
          sourcePortName: 'Port 2 (DIN)',
          targetNodeIndex: 3,
          targetPortName: 'LAN (TCP)',
          connectionType: 'CAT6',
          lengthMeters: 8
        }
      ]
    }
  ]
};

// -------------------------------------------------------------
// 6. MASTER LIST OF BUILTIN LIBRARIES
// -------------------------------------------------------------

export const BUILTIN_LIBRARIES: ComponentLibrary[] = [
  CISCO_ENTERPRISE_LIBRARY,
  UBIQUITI_UNIFI_LIBRARY,
  FORTINET_SECURITY_LIBRARY,
  CCTV_SURVEILLANCE_LIBRARY,
  INDUSTRIAL_SCADA_LIBRARY
];

// Automatically register all library component templates into global catalog
export function registerLibraryComponents(library: ComponentLibrary): void {
  for (const comp of library.components) {
    if (!NETWORK_COMPONENT_CATALOG[comp.type]) {
      NETWORK_COMPONENT_CATALOG[comp.type] = comp;
    }
  }
}

// Pre-register all builtin components
for (const lib of BUILTIN_LIBRARIES) {
  registerLibraryComponents(lib);
}

// -------------------------------------------------------------
// 7. ASSEMBLY INSTANTIATION ENGINE
// -------------------------------------------------------------

export function instantiateAssembly(
  assembly: LibraryAssembly,
  basePosition: { x: number; y: number },
  designId: string
): { nodes: EngineeringComponent[]; connections: EngineeringConnection[] } {
  const createdNodes: EngineeringComponent[] = [];
  const createdConnections: EngineeringConnection[] = [];

  // 1. Instantiate each node at basePosition + relative offset
  for (const asmNode of assembly.nodes) {
    const template = NETWORK_COMPONENT_CATALOG[asmNode.templateType];
    if (!template) {
      console.warn(`Template ${asmNode.templateType} not found in catalog, using generic`);
    }

    const nodePos = {
      x: basePosition.x + asmNode.relativeX,
      y: basePosition.y + asmNode.relativeY
    };

    let node: EngineeringComponent;
    try {
      node = createComponentInstance(asmNode.templateType, designId, nodePos, asmNode.tagPrefix);
    } catch {
      // Fallback if template wasn't in catalog
      node = createComponentInstance('SWITCH_POE_24', designId, nodePos, asmNode.tagPrefix);
    }

    node.name = asmNode.name;
    if (asmNode.properties) {
      node.properties = { ...node.properties, ...asmNode.properties };
    }
    if (asmNode.costData) {
      node.costData = { ...asmNode.costData };
    }

    createdNodes.push(node);
  }

  // 2. Instantiate connections based on node indexes and port names
  for (const connDef of assembly.connections) {
    const sourceNode = createdNodes[connDef.sourceNodeIndex];
    const targetNode = createdNodes[connDef.targetNodeIndex];

    if (!sourceNode || !targetNode) continue;

    // Find matching ports by name or first available compatible port
    let sourcePort = sourceNode.ports.find(p => p.name === connDef.sourcePortName && !p.occupiedByConnectionId);
    if (!sourcePort) {
      sourcePort = sourceNode.ports.find(p => !p.occupiedByConnectionId);
    }

    let targetPort = targetNode.ports.find(p => p.name === connDef.targetPortName && !p.occupiedByConnectionId);
    if (!targetPort) {
      targetPort = targetNode.ports.find(p => !p.occupiedByConnectionId);
    }

    if (!sourcePort || !targetPort) continue;

    const connection = createConnectionInstance(
      designId,
      sourceNode.id,
      sourcePort.id,
      targetNode.id,
      targetPort.id,
      connDef.connectionType,
      connDef.lengthMeters
    );

    sourcePort.occupiedByConnectionId = connection.id;
    targetPort.occupiedByConnectionId = connection.id;

    createdConnections.push(connection);
  }

  return {
    nodes: createdNodes,
    connections: createdConnections
  };
}

// -------------------------------------------------------------
// 8. CREATE ASSEMBLY FROM CANVAS SELECTION
// -------------------------------------------------------------

export function createAssemblyFromSelection(
  name: string,
  category: string,
  description: string,
  selectedNodes: EngineeringComponent[],
  selectedConnections: EngineeringConnection[]
): LibraryAssembly {
  if (selectedNodes.length === 0) {
    throw new Error('Cannot create assembly from empty selection');
  }

  // Find min X and min Y to normalize relative positions
  let minX = Infinity;
  let minY = Infinity;
  for (const n of selectedNodes) {
    if (n.position.x < minX) minX = n.position.x;
    if (n.position.y < minY) minY = n.position.y;
  }

  const idMap = new Map<string, number>();
  const assemblyNodes = selectedNodes.map((n, idx) => {
    idMap.set(n.id, idx);
    return {
      templateType: n.type,
      name: n.name.split(' (')[0] || n.name,
      tagPrefix: n.tag.split('-')[0] || 'DEV',
      relativeX: n.position.x - minX,
      relativeY: n.position.y - minY,
      properties: { ...n.properties },
      costData: n.costData ? { ...n.costData } : undefined
    };
  });

  const assemblyConnections = selectedConnections
    .filter(c => idMap.has(c.sourceComponentId) && idMap.has(c.targetComponentId))
    .map(c => {
      const srcNode = selectedNodes.find(n => n.id === c.sourceComponentId)!;
      const tgtNode = selectedNodes.find(n => n.id === c.targetComponentId)!;
      const srcPort = srcNode.ports.find(p => p.id === c.sourcePortId);
      const tgtPort = tgtNode.ports.find(p => p.id === c.targetPortId);

      return {
        sourceNodeIndex: idMap.get(c.sourceComponentId)!,
        sourcePortName: srcPort?.name || 'Port 1',
        targetNodeIndex: idMap.get(c.targetComponentId)!,
        targetPortName: tgtPort?.name || 'Port 1',
        connectionType: c.connectionType,
        lengthMeters: c.lengthMeters
      };
    });

  const estimatedCost = selectedNodes.reduce((sum, n) => sum + (n.costData?.unitCost || 0), 0);

  return {
    id: `asm_custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    category,
    description,
    author: 'User Created',
    version: '1.0.0',
    nodes: assemblyNodes,
    connections: assemblyConnections,
    tags: ['Custom', category],
    estimatedCost
  };
}

// -------------------------------------------------------------
// 9. JSON IMPORT / EXPORT VALIDATOR
// -------------------------------------------------------------

export function validateLibraryJson(jsonString: string): { 
  valid: boolean; 
  error?: string; 
  library?: ComponentLibrary 
} {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'JSON root must be an object' };
    }

    if (!parsed.name || typeof parsed.name !== 'string') {
      return { valid: false, error: 'Missing or invalid library "name"' };
    }

    if (!Array.isArray(parsed.components) && !Array.isArray(parsed.assemblies)) {
      return { valid: false, error: 'Library must contain either "components" or "assemblies" array' };
    }

    const library: ComponentLibrary = {
      id: parsed.id || `lib_custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: parsed.name,
      category: parsed.category || 'User Libraries',
      description: parsed.description || 'Imported user component library',
      version: parsed.version || '1.0.0',
      author: parsed.author || 'Imported User',
      isBuiltIn: false,
      components: Array.isArray(parsed.components) ? parsed.components : [],
      assemblies: Array.isArray(parsed.assemblies) ? parsed.assemblies : [],
      createdAt: parsed.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return { valid: true, library };
  } catch (err) {
    return { valid: false, error: `Invalid JSON syntax: ${(err as Error).message}` };
  }
}

export function exportLibraryToJson(library: ComponentLibrary): string {
  return JSON.stringify(library, null, 2);
}
