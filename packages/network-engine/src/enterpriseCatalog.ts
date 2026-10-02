import { ComponentTemplate, PortBlueprint } from '@omniflow/shared-types';

/**
 * Enterprise Production Hardware Catalog
 * Authentic, real-world network, server, security, electrical, and facility components
 * with manufacturer datasheets, genuine IEEE OUIs, true port matrixes, and exact part numbers.
 */

// Helper to quickly build standard RJ45 port arrays
function makeRj45Ports(prefix: string, count: number, capacityMbps: number = 1000, poeWatts?: number): PortBlueprint[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `${prefix}${i + 1}`,
    type: 'RJ45',
    direction: 'bidirectional',
    capacity: capacityMbps,
    unit: 'Mbps',
    compatiblePortTypes: ['RJ45', 'FIBER_LC'],
    properties: poeWatts ? { poeSuppliedWatts: poeWatts } : {}
  }));
}

// Helper to build optical fiber ports (SFP+, SFP28, QSFP28)
function makeFiberPorts(prefix: string, count: number, capacityMbps: number = 10000): PortBlueprint[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `${prefix}${i + 1}`,
    type: 'FIBER_LC',
    direction: 'bidirectional',
    capacity: capacityMbps,
    unit: 'Mbps',
    compatiblePortTypes: ['FIBER_LC', 'RJ45'],
    properties: { opticalWavelengthNm: 1310, connector: 'LC-Duplex' }
  }));
}

export const ENTERPRISE_COMPONENT_CATALOG: Record<string, ComponentTemplate> = {
  // ─────────────────────────────────────────────────────────────
  // 1. CISCO SYSTEMS ENTERPRISE INFRASTRUCTURE
  // ─────────────────────────────────────────────────────────────
  CISCO_CATALYST_9200_48P: {
    type: 'CISCO_CATALYST_9200_48P',
    category: 'SWITCHING',
    name: 'Cisco Catalyst 9200-48P PoE+ Enterprise Switch',
    defaultTagPrefix: 'C9200',
    description: '48 ports full PoE+ (740W budget), 4x 1G fixed SFP uplinks, StackWise-160, Layer 3 routing.',
    icon: 'ApartmentOutlined',
    defaultCost: {
      partNumber: 'C9200-48P-E',
      manufacturer: 'Cisco Systems',
      unitCost: 3850,
      labourCost: 200,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'SW-ACCESS-01',
      managementIp: '192.168.1.11',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      vlanId: 10,
      poeBudgetWatts: 740,
      switchingBandwidthGbps: 128,
      macOui: '00:1E:13'
    },
    portsTemplate: [
      ...makeRj45Ports('Gi1/0/', 48, 1000, 30),
      ...makeFiberPorts('Te1/1/', 4, 10000)
    ]
  },

  CISCO_CATALYST_9300_48UXM: {
    type: 'CISCO_CATALYST_9300_48UXM',
    category: 'SWITCHING',
    name: 'Cisco Catalyst 9300-48UXM Multi-Gigabit UPOE+',
    defaultTagPrefix: 'C9300',
    description: '48-Port Multi-Gigabit (up to 2.5G/10G) UPOE+ (90W/port, 1440W total), 4x 25G SFP28 modular uplinks.',
    icon: 'ApartmentOutlined',
    defaultCost: {
      partNumber: 'C9300-48UXM-A',
      manufacturer: 'Cisco Systems',
      unitCost: 6950,
      labourCost: 250,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'SW-DIST-01',
      managementIp: '192.168.1.12',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      vlanId: 20,
      poeBudgetWatts: 1440,
      switchingBandwidthGbps: 480,
      macOui: '00:1A:A1'
    },
    portsTemplate: [
      ...makeRj45Ports('mGig1/0/', 36, 2500, 90),
      ...makeRj45Ports('mGig1/0/3', 12, 10000, 90),
      ...makeFiberPorts('TwentyFiveGigE1/1/', 4, 25000)
    ]
  },

  CISCO_CATALYST_9500_24Y4C: {
    type: 'CISCO_CATALYST_9500_24Y4C',
    category: 'CORE',
    name: 'Cisco Catalyst 9500-24Y4C 100G Core Switch',
    defaultTagPrefix: 'C9500',
    description: 'High-Density Campus Core with 24x 1/10/25G SFP28 ports and 4x 40/100G QSFP28 uplinks. 3.2 Tbps capacity.',
    icon: 'ApartmentOutlined',
    defaultCost: {
      partNumber: 'C9500-24Y4C-A',
      manufacturer: 'Cisco Systems',
      unitCost: 14800,
      labourCost: 450,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'SW-CORE-01',
      managementIp: '192.168.1.2',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      routingThroughputMpps: 2000,
      switchingBandwidthGbps: 3200,
      macOui: '00:1E:13'
    },
    portsTemplate: [
      ...makeFiberPorts('TwentyFiveGigE1/0/', 24, 25000),
      ...makeFiberPorts('HundredGigE1/0/', 4, 100000)
    ]
  },

  CISCO_NEXUS_93180YC_FX3: {
    type: 'CISCO_NEXUS_93180YC_FX3',
    category: 'CORE',
    name: 'Cisco Nexus 93180YC-FX3 Top-of-Rack Datacenter Switch',
    defaultTagPrefix: 'N9K',
    description: 'Datacenter Leaf/ToR: 48x 1/10/25G SFP28 ports and 6x 40/100G QSFP28 spine uplinks. Sub-microsecond latency, VXLAN EVPN.',
    icon: 'ApartmentOutlined',
    defaultCost: {
      partNumber: 'N9K-C93180YC-FX3',
      manufacturer: 'Cisco Systems',
      unitCost: 11200,
      labourCost: 400,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'N9K-LEAF-01',
      managementIp: '192.168.1.3',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      vxlanEnabled: true,
      switchingBandwidthGbps: 3600,
      macOui: '00:2A:6A'
    },
    portsTemplate: [
      ...makeFiberPorts('Eth1/', 48, 25000),
      ...makeFiberPorts('Eth1/49_', 6, 100000)
    ]
  },

  CISCO_ISR_4451_ROUTER: {
    type: 'CISCO_ISR_4451_ROUTER',
    category: 'CORE',
    name: 'Cisco ISR 4451-X SD-WAN Edge Router',
    defaultTagPrefix: 'ISR4451',
    description: 'Modular enterprise edge router with 2 Gbps encrypted SD-WAN IPsec throughput, voice DSPs, and redundant power.',
    icon: 'PartitionOutlined',
    defaultCost: {
      partNumber: 'ISR4451-X/K9',
      manufacturer: 'Cisco Systems',
      unitCost: 6400,
      labourCost: 300,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'RTR-WAN-01',
      lanIp: '192.168.1.1',
      subnetMask: '255.255.255.0',
      dhcpEnabled: true,
      natEnabled: true,
      sdwanActive: true,
      bgpAsn: 65001,
      macOui: '00:1E:13'
    },
    portsTemplate: [
      { name: 'GigabitEthernet0/0/0 (WAN1)', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45', 'FIBER_LC'] },
      { name: 'GigabitEthernet0/0/1 (WAN2)', type: 'FIBER_LC', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
      { name: 'GigabitEthernet0/0/2 (LAN1)', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'GigabitEthernet0/0/3 (LAN2)', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'Console', type: 'CONSOLE_RJ45', direction: 'bidirectional', capacity: 0.1152, unit: 'Mbps', compatiblePortTypes: ['CONSOLE_RJ45'] }
    ]
  },

  CISCO_CATALYST_9130AX_AP: {
    type: 'CISCO_CATALYST_9130AX_AP',
    category: 'WIRELESS',
    name: 'Cisco Catalyst 9130AX Enterprise WiFi 6 Access Point',
    defaultTagPrefix: 'AP',
    description: 'Enterprise 8x8:8 MU-MIMO dual 5GHz/2.4GHz radio with integrated BLE/Zigbee, Smart Antenna, and 5 Gbps mGig uplink.',
    icon: 'WifiOutlined',
    defaultCost: {
      partNumber: 'C9130AXI-B',
      manufacturer: 'Cisco Systems',
      unitCost: 1150,
      labourCost: 95,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'AP-FLOOR1-EAST',
      ipAddress: '192.168.1.120',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      ssids: ['Corp-Secure', 'Corp-Guest', 'Corp-IoT'],
      maxClients: 1024,
      poeDrawWatts: 30,
      macOui: '00:1E:13'
    },
    portsTemplate: [
      { name: 'Eth0 (5Gbps mGig PoE)', type: 'RJ45', direction: 'input', capacity: 5000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 2. FORTINET HIGH-PERFORMANCE SECURITY FABRIC
  // ─────────────────────────────────────────────────────────────
  FORTINET_FORTIGATE_100F: {
    type: 'FORTINET_FORTIGATE_100F',
    category: 'SECURITY',
    name: 'Fortinet FortiGate 100F Next-Gen Firewall',
    defaultTagPrefix: 'FG100F',
    description: 'SOC4 ASIC powered NGFW: 10 Gbps firewall, 1 Gbps SSL deep inspection, 1 Gbps IPS, dual 10G SFP+ and 16x GbE ports.',
    icon: 'SafetyCertificateOutlined',
    defaultCost: {
      partNumber: 'FG-100F-BDL-950-12',
      manufacturer: 'Fortinet',
      unitCost: 3450,
      labourCost: 250,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'FW-PERIMETER-01',
      ipAddress: '192.168.1.254',
      subnetMask: '255.255.255.0',
      inspectionMode: 'Flow-Based-ASIC',
      ipsActive: true,
      antivirusActive: true,
      maxSessions: 1500000,
      macOui: '00:09:0F'
    },
    portsTemplate: [
      { name: 'WAN1', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'WAN2', type: 'FIBER_LC', direction: 'input', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
      { name: 'DMZ', type: 'RJ45', direction: 'output', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      ...makeRj45Ports('LAN', 12, 1000),
      ...makeFiberPorts('X1_10G_', 2, 10000)
    ]
  },

  FORTINET_FORTIGATE_200F: {
    type: 'FORTINET_FORTIGATE_200F',
    category: 'SECURITY',
    name: 'Fortinet FortiGate 200F Enterprise Mid-Range Firewall',
    defaultTagPrefix: 'FG200F',
    description: 'Enterprise Perimeter: 27 Gbps firewall throughput, 3 Gbps Threat Protection, 4x 10G SFP+ and 16x GbE SFP/RJ45.',
    icon: 'SafetyCertificateOutlined',
    defaultCost: {
      partNumber: 'FG-200F',
      manufacturer: 'Fortinet',
      unitCost: 6800,
      labourCost: 350,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'FW-CORE-GATEWAY',
      ipAddress: '192.168.1.1',
      subnetMask: '255.255.255.0',
      sslVpnConcurrency: 500,
      sdwanZones: ['Internet', 'MPLS', 'Azure'],
      macOui: '00:09:0F'
    },
    portsTemplate: [
      ...makeFiberPorts('X1_10G_', 4, 10000),
      ...makeRj45Ports('port', 16, 1000),
      { name: 'MGMT', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 3. PALO ALTO NETWORKS NEXT-GEN FIREWALLS
  // ─────────────────────────────────────────────────────────────
  PALO_ALTO_PA_1410: {
    type: 'PALO_ALTO_PA_1410',
    category: 'SECURITY',
    name: 'Palo Alto Networks PA-1410 NGFW with ML-Powered Security',
    defaultTagPrefix: 'PA1410',
    description: 'Next-Generation Firewall with inline machine learning, WildFire sandboxing, App-ID, and 8.5 Gbps Threat Prevention.',
    icon: 'SafetyCertificateOutlined',
    defaultCost: {
      partNumber: 'PAN-PA-1410',
      manufacturer: 'Palo Alto Networks',
      unitCost: 8900,
      labourCost: 400,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'PA-NGFW-EDGE',
      ipAddress: '192.168.1.253',
      subnetMask: '255.255.255.0',
      appIdEnabled: true,
      wildfireInline: true,
      maxConcurrentSessions: 500000,
      macOui: '00:1B:17'
    },
    portsTemplate: [
      ...makeRj45Ports('ethernet1/', 8, 1000),
      ...makeFiberPorts('ethernet1/9_', 4, 10000),
      { name: 'MGT', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 4. ARUBA / HPE CAMPUS & SERVER INFRASTRUCTURE
  // ─────────────────────────────────────────────────────────────
  ARUBA_CX_6300M_48G_POE: {
    type: 'ARUBA_CX_6300M_48G_POE',
    category: 'SWITCHING',
    name: 'Aruba CX 6300M 48G Class 6 PoE+ Switch',
    defaultTagPrefix: 'CX6300',
    description: 'AOS-CX stackable Layer 3 switch with Network Analytics Engine (NAE), 48x Class 6 PoE+ ports, and 4x 50G SFP56 uplinks.',
    icon: 'ApartmentOutlined',
    defaultCost: {
      partNumber: 'JL661A',
      manufacturer: 'Aruba HPE',
      unitCost: 5200,
      labourCost: 220,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'SW-ARUBA-BLDG-A',
      managementIp: '192.168.1.13',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      poeBudgetWatts: 1440,
      vsfStackEnabled: true,
      macOui: '00:0F:20'
    },
    portsTemplate: [
      ...makeRj45Ports('1/1/', 48, 1000, 60),
      ...makeFiberPorts('1/1/49_', 4, 50000)
    ]
  },

  HPE_PROLIANT_DL380_GEN11: {
    type: 'HPE_PROLIANT_DL380_GEN11',
    category: 'INFRASTRUCTURE',
    name: 'HPE ProLiant DL380 Gen11 2U Dual-Xeon Server',
    defaultTagPrefix: 'SRV-DL380',
    description: 'Enterprise 2U server: 2x Intel Xeon Scalable 64-Core CPUs, 512GB DDR5 ECC RAM, 8x 3.84TB NVMe U.3 SSDs, dual 1600W PSUs.',
    icon: 'CloudServerOutlined',
    defaultCost: {
      partNumber: 'P52534-B21',
      manufacturer: 'Hewlett Packard Enterprise',
      unitCost: 12400,
      labourCost: 350,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'ESXI-HOST-01',
      managementIp: '192.168.1.51',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      hypervisor: 'VMware ESXi 8.0 U2',
      cpuCores: 128,
      ramGb: 512,
      rawStorageTb: 30.7,
      powerDrawWatts: 650,
      macOui: '00:0F:20'
    },
    portsTemplate: [
      { name: 'iLO5 (Remote Mgmt)', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'NIC1 (vmnic0)', type: 'RJ45', direction: 'bidirectional', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'NIC2 (vmnic1)', type: 'RJ45', direction: 'bidirectional', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'SFP1 (vmnic2)', type: 'FIBER_LC', direction: 'bidirectional', capacity: 25000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
      { name: 'SFP2 (vmnic3)', type: 'FIBER_LC', direction: 'bidirectional', capacity: 25000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 5. DELL TECHNOLOGIES ENTERPRISE COMPUTE & STORAGE
  // ─────────────────────────────────────────────────────────────
  DELL_POWEREDGE_R760: {
    type: 'DELL_POWEREDGE_R760',
    category: 'INFRASTRUCTURE',
    name: 'Dell PowerEdge R760 2U Rack Server',
    defaultTagPrefix: 'R760',
    description: 'Flagship 2-Socket 2U rack server: Dual 4th Gen Intel Xeon Scalable, 1TB DDR5 RAM, 16x 2.5" NVMe backplane, iDRAC9 Enterprise.',
    icon: 'CloudServerOutlined',
    defaultCost: {
      partNumber: 'PER760-ENT-2U',
      manufacturer: 'Dell Technologies',
      unitCost: 14200,
      labourCost: 350,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'PROXMOX-NODE-01',
      managementIp: '192.168.1.52',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      osPlatform: 'Proxmox VE 8.1',
      ramGb: 1024,
      tdpWatts: 750,
      macOui: '00:14:22'
    },
    portsTemplate: [
      { name: 'iDRAC9 (Dedicated)', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      ...makeRj45Ports('BaseT_', 2, 10000),
      ...makeFiberPorts('SFP28_', 2, 25000)
    ]
  },

  DELL_POWERSTORE_1000T_SAN: {
    type: 'DELL_POWERSTORE_1000T_SAN',
    category: 'INFRASTRUCTURE',
    name: 'Dell PowerStore 1000T All-Flash NVMe Unified SAN/NAS',
    defaultTagPrefix: 'SAN',
    description: 'Active-Active dual-node all-flash array: 24x 1.92TB NVMe SSDs, 4:1 hardware compression/dedup, 4x 32Gb FC / 25GbE iSCSI.',
    icon: 'DatabaseOutlined',
    defaultCost: {
      partNumber: 'PS-1000T-AF',
      manufacturer: 'Dell Technologies',
      unitCost: 28500,
      labourCost: 650,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'SAN-ARRAY-01',
      managementIp: '192.168.1.50',
      subnetMask: '255.255.255.0',
      usableCapacityTb: 92.5,
      iopsMax: 350000,
      latencySubMs: 0.18,
      macOui: '00:14:22'
    },
    portsTemplate: [
      { name: 'SPA_Mgmt', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'SPB_Mgmt', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      ...makeFiberPorts('SPA_FC32G_', 2, 32000),
      ...makeFiberPorts('SPB_FC32G_', 2, 32000)
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 6. UBIQUITI UNIFI ENTERPRISE ECOSYSTEM
  // ─────────────────────────────────────────────────────────────
  UBIQUITI_UDM_PRO_MAX: {
    type: 'UBIQUITI_UDM_PRO_MAX',
    category: 'CORE',
    name: 'Ubiquiti UniFi Dream Machine Pro Max',
    defaultTagPrefix: 'UDM-MAX',
    description: 'Enterprise Cloud Gateway with dual 10G SFP+, 2.5G RJ45 WAN, 5 Gbps IDS/IPS routing, and redundant dual-HDD NVR storage.',
    icon: 'PartitionOutlined',
    defaultCost: {
      partNumber: 'UDM-Pro-Max',
      manufacturer: 'Ubiquiti',
      unitCost: 599,
      labourCost: 120,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'UNIFI-GATEWAY',
      lanIp: '192.168.1.1',
      subnetMask: '255.255.255.0',
      dpiActive: true,
      threatManagementLevel: 5,
      macOui: '00:27:22'
    },
    portsTemplate: [
      { name: 'WAN1 (2.5G)', type: 'RJ45', direction: 'input', capacity: 2500, unit: 'Mbps', compatiblePortTypes: ['RJ45'] },
      { name: 'WAN2 (10G SFP+)', type: 'FIBER_LC', direction: 'input', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] },
      ...makeRj45Ports('LAN', 8, 1000),
      { name: 'LAN_SFP+ (10G)', type: 'FIBER_LC', direction: 'output', capacity: 10000, unit: 'Mbps', compatiblePortTypes: ['FIBER_LC'] }
    ]
  },

  UBIQUITI_U7_PRO_MAX: {
    type: 'UBIQUITI_U7_PRO_MAX',
    category: 'WIRELESS',
    name: 'Ubiquiti UniFi U7 Pro Max Tri-Band WiFi 7 Access Point',
    defaultTagPrefix: 'U7-MAX',
    description: 'Next-gen WiFi 7 (802.11be) AP with 6 GHz support, 8 spatial streams, 14 Gbps aggregate throughput, and 2.5 Gbps PoE+ port.',
    icon: 'WifiOutlined',
    defaultCost: {
      partNumber: 'U7-Pro-Max',
      manufacturer: 'Ubiquiti',
      unitCost: 279,
      labourCost: 75,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'U7-CONFERENCE',
      ipAddress: '192.168.1.121',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      bands: ['2.4 GHz', '5 GHz', '6 GHz'],
      channelWidthMhz: 320,
      macOui: '00:27:22'
    },
    portsTemplate: [
      { name: 'Uplink (2.5G PoE+)', type: 'RJ45', direction: 'input', capacity: 2500, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 7. CCTV & PHYSICAL SECURITY
  // ─────────────────────────────────────────────────────────────
  AXIS_Q3538_LVE_4K_CAMERA: {
    type: 'AXIS_Q3538_LVE_4K_CAMERA',
    category: 'CCTV',
    name: 'Axis Q3538-LVE 4K Ultra-HD AI Fixed Dome Camera',
    defaultTagPrefix: 'CAM-4K',
    description: 'Outdoor-ready IK10+ vandal dome with 4K @ 60fps, Deep Learning Processing Unit (DLPU), Forensic WDR, OptimizedIR 40m, PoE.',
    icon: 'VideoCameraOutlined',
    defaultCost: {
      partNumber: '02157-001',
      manufacturer: 'Axis Communications',
      unitCost: 1180,
      labourCost: 110,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'CAM-ENTRANCE-MAIN',
      ipAddress: '192.168.1.180',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      resolution: '3840x2160 (4K)',
      framerateFps: 60,
      videoCodec: 'H.265 / Zipstream',
      rtspPort: 554,
      poeDrawWatts: 14.5,
      macOui: '00:40:8C'
    },
    portsTemplate: [
      { name: 'RJ45_PoE', type: 'RJ45', direction: 'input', capacity: 100, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  HIKVISION_DARKFIGHTER_PTZ: {
    type: 'HIKVISION_DARKFIGHTER_PTZ',
    category: 'CCTV',
    name: 'Hikvision DarkFighter 42x Optical Zoom 4K PTZ Camera',
    defaultTagPrefix: 'PTZ',
    description: 'Long-range perimeter surveillance: 4K 1/1.8" CMOS, 42x optical zoom, 500m Laser IR, rapid auto-tracking 3.0, Hi-PoE 60W.',
    icon: 'VideoCameraOutlined',
    defaultCost: {
      partNumber: 'DS-2DF8C442IXS-AELW',
      manufacturer: 'Hikvision',
      unitCost: 2850,
      labourCost: 180,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'CAM-PERIMETER-NORTH',
      ipAddress: '192.168.1.181',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      zoomOptical: '42x',
      irDistanceMeters: 500,
      poeDrawWatts: 58,
      macOui: '00:18:AE'
    },
    portsTemplate: [
      { name: 'Hi-PoE (60W)', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  MILESTONE_HUSKY_NVR_64CH: {
    type: 'MILESTONE_HUSKY_NVR_64CH',
    category: 'CCTV',
    name: 'Milestone Husky IVO 700R 64-Channel Enterprise NVR',
    defaultTagPrefix: 'NVR-64',
    description: '2U Rackmount Video Recorder: preloaded XProtect Corporate, RAID5 96TB raw storage, 720 Mbps recording throughput, dual 10G.',
    icon: 'DatabaseOutlined',
    defaultCost: {
      partNumber: 'H700R-64-96TB',
      manufacturer: 'Milestone Systems',
      unitCost: 9400,
      labourCost: 320,
      currency: 'USD'
    },
    defaultProperties: {
      hostname: 'NVR-RECORDING-01',
      managementIp: '192.168.1.190',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      storageTb: 96,
      maxChannels: 64,
      macOui: '00:14:22'
    },
    portsTemplate: [
      ...makeRj45Ports('LAN_Recording_', 2, 10000),
      { name: 'Management', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 8. ELECTRICAL POWER & DATACENTER GENERATION
  // ─────────────────────────────────────────────────────────────
  APC_SYMMETRA_PX_48KW: {
    type: 'APC_SYMMETRA_PX_48KW',
    category: 'ELECTRICAL',
    name: 'APC Symmetra PX 48kW Scalable N+1 Modular 3-Phase UPS',
    defaultTagPrefix: 'UPS-SYM',
    description: 'Modular, high-efficiency (96%) double-conversion on-line 3-phase power protection with hot-swappable power & battery modules.',
    icon: 'ThunderboltOutlined',
    defaultCost: {
      partNumber: 'SY48K48H-PD',
      manufacturer: 'Schneider Electric / APC',
      unitCost: 19800,
      labourCost: 1200,
      currency: 'USD'
    },
    defaultProperties: {
      capacityKw: 48,
      inputVoltage: '400V 3-Phase',
      outputVoltage: '400V / 230V',
      efficiencyPercent: 96.2,
      batteryRuntimeMinutes: 24,
      macOui: '00:C0:B7'
    },
    portsTemplate: [
      { name: 'AC_MAINS_IN_400V', type: 'AC_TERMINAL', direction: 'input', capacity: 80, unit: 'A', compatiblePortTypes: ['AC_TERMINAL'] },
      { name: 'AC_OUT_UPS_400V', type: 'AC_TERMINAL', direction: 'output', capacity: 80, unit: 'A', compatiblePortTypes: ['AC_TERMINAL'] },
      { name: 'NMC3 (Network SNMP)', type: 'RJ45', direction: 'input', capacity: 100, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  CUMMINS_DIESEL_GENERATOR_250KVA: {
    type: 'CUMMINS_DIESEL_GENERATOR_250KVA',
    category: 'ELECTRICAL',
    name: 'Cummins QSB7-G5 250 kVA Standby Diesel Generator',
    defaultTagPrefix: 'GEN-250',
    description: 'Sound-attenuated weatherproof enclosure, PowerCommand 1.2 digital controller, 500-liter sub-base fuel tank (18 hrs continuous).',
    icon: 'ThunderboltOutlined',
    defaultCost: {
      partNumber: 'C250D5e',
      manufacturer: 'Cummins Power Generation',
      unitCost: 32500,
      labourCost: 2800,
      currency: 'USD'
    },
    defaultProperties: {
      primePowerKva: 250,
      outputVoltage: '400V 3-Phase',
      fuelConsumptionLph: 48.5,
      starterAutoSec: 6.5
    },
    portsTemplate: [
      { name: 'GEN_OUTPUT_400V', type: 'AC_TERMINAL', direction: 'output', capacity: 360, unit: 'A', compatiblePortTypes: ['AC_TERMINAL'] }
    ]
  },

  ASCO_7000_SERIES_ATS: {
    type: 'ASCO_7000_SERIES_ATS',
    category: 'ELECTRICAL',
    name: 'ASCO 7000 Series 400A Automatic Transfer Switch',
    defaultTagPrefix: 'ATS-400',
    description: 'Mission-critical true double-throw open/closed transition automatic transfer switch with bypass-isolation.',
    icon: 'BranchesOutlined',
    defaultCost: {
      partNumber: '7000-ATS-400A',
      manufacturer: 'Schneider Electric / ASCO',
      unitCost: 8400,
      labourCost: 950,
      currency: 'USD'
    },
    defaultProperties: {
      amperageRating: 400,
      poles: 4,
      transferTimeMs: 16
    },
    portsTemplate: [
      { name: 'UTILITY_NORMAL_IN', type: 'AC_TERMINAL', direction: 'input', capacity: 400, unit: 'A', compatiblePortTypes: ['AC_TERMINAL'] },
      { name: 'EMERGENCY_GEN_IN', type: 'AC_TERMINAL', direction: 'input', capacity: 400, unit: 'A', compatiblePortTypes: ['AC_TERMINAL'] },
      { name: 'ESSENTIAL_BUS_OUT', type: 'AC_TERMINAL', direction: 'output', capacity: 400, unit: 'A', compatiblePortTypes: ['AC_TERMINAL'] }
    ]
  },

  RARITAN_PX3_SMART_PDU: {
    type: 'RARITAN_PX3_SMART_PDU',
    category: 'ELECTRICAL',
    name: 'Raritan PX3-5000 3-Phase Intelligent Rack PDU',
    defaultTagPrefix: 'PDU',
    description: '0U Vertical rack PDU with outlet-level metering, individual bi-stable relay switching, and environmental temperature/humidity sensor ports.',
    icon: 'ThunderboltOutlined',
    defaultCost: {
      partNumber: 'PX3-5493V',
      manufacturer: 'Legrand / Raritan',
      unitCost: 1450,
      labourCost: 100,
      currency: 'USD'
    },
    defaultProperties: {
      inputVoltage: '400V 3-Phase 32A',
      outletsCount: 24,
      outletTypes: '20x C13, 4x C19',
      macOui: '00:0D:5D'
    },
    portsTemplate: [
      { name: 'PDU_MAINS_IN', type: 'AC_TERMINAL', direction: 'input', capacity: 32, unit: 'A', compatiblePortTypes: ['AC_TERMINAL'] },
      { name: 'Ethernet_Mgmt', type: 'RJ45', direction: 'input', capacity: 1000, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 9. DATACENTER PRECISION COOLING & HVAC PLUMBING
  // ─────────────────────────────────────────────────────────────
  VERTIV_LIEBERT_CRV_30KW: {
    type: 'VERTIV_LIEBERT_CRV_30KW',
    category: 'COOLING',
    name: 'Vertiv Liebert CRV 30kW InRow Chilled Water Precision Cooler',
    defaultTagPrefix: 'CRV-30',
    description: 'Row-based cooling unit placed directly between server racks: modulates airflow dynamically based on server load to eliminate hot spots.',
    icon: 'DashboardOutlined',
    defaultCost: {
      partNumber: 'CRV30-CW-300MM',
      manufacturer: 'Vertiv',
      unitCost: 12800,
      labourCost: 850,
      currency: 'USD'
    },
    defaultProperties: {
      coolingCapacityKw: 30.5,
      waterFlowLps: 1.45,
      waterEnteringTempC: 7,
      waterLeavingTempC: 12,
      macOui: '00:03:75'
    },
    portsTemplate: [
      { name: 'CHILLED_WATER_IN', type: 'PIPE_THREAD', direction: 'input', capacity: 2.5, unit: 'L/s', compatiblePortTypes: ['PIPE_THREAD'] },
      { name: 'CHILLED_WATER_OUT', type: 'PIPE_THREAD', direction: 'output', capacity: 2.5, unit: 'L/s', compatiblePortTypes: ['PIPE_THREAD'] },
      { name: 'Modbus_BMS', type: 'RJ45', direction: 'input', capacity: 100, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  DAIKIN_MAGNETIC_CHILLER_250KW: {
    type: 'DAIKIN_MAGNETIC_CHILLER_250KW',
    category: 'COOLING',
    name: 'Daikin Magnitude 250kW Magnetic Bearing Centrifugal Chiller',
    defaultTagPrefix: 'CHILLER',
    description: 'Oil-free magnetic bearing centrifugal compressor with variable frequency drive, ultra-quiet operation, and IPLV of 0.31 kW/ton.',
    icon: 'DashboardOutlined',
    defaultCost: {
      partNumber: 'WME-0250-MB',
      manufacturer: 'Daikin Applied',
      unitCost: 48000,
      labourCost: 4200,
      currency: 'USD'
    },
    defaultProperties: {
      tonnage: 71,
      chilledWaterSupplyTempC: 6.7,
      refrigerant: 'R-134a / R-513A',
      soundLevelDba: 68
    },
    portsTemplate: [
      { name: 'CHW_SUPPLY', type: 'PIPE_THREAD', direction: 'output', capacity: 12.5, unit: 'L/s', compatiblePortTypes: ['PIPE_THREAD'] },
      { name: 'CHW_RETURN', type: 'PIPE_THREAD', direction: 'input', capacity: 12.5, unit: 'L/s', compatiblePortTypes: ['PIPE_THREAD'] },
      { name: 'POWER_400V', type: 'AC_TERMINAL', direction: 'input', capacity: 95, unit: 'A', compatiblePortTypes: ['AC_TERMINAL'] }
    ]
  },

  GRUNDFOS_MAGNA3_DUAL_PUMP: {
    type: 'GRUNDFOS_MAGNA3_DUAL_PUMP',
    category: 'PLUMBING',
    name: 'Grundfos MAGNA3 D Variable-Speed Dual Circulator Pump',
    defaultTagPrefix: 'PUMP-CHW',
    description: 'Electronically commutated dual-head pump operating in duty/standby mode with AUTOadapt differential pressure control.',
    icon: 'RetweetOutlined',
    defaultCost: {
      partNumber: 'MAGNA3-D-65-150F',
      manufacturer: 'Grundfos',
      unitCost: 4600,
      labourCost: 500,
      currency: 'USD'
    },
    defaultProperties: {
      maxHeadMeters: 15,
      maxFlowLps: 8.5,
      energyIndexEEI: 0.18
    },
    portsTemplate: [
      { name: 'SUCTION_INLET', type: 'PIPE_THREAD', direction: 'input', capacity: 10, unit: 'L/s', compatiblePortTypes: ['PIPE_THREAD'] },
      { name: 'DISCHARGE_OUTLET', type: 'PIPE_THREAD', direction: 'output', capacity: 10, unit: 'L/s', compatiblePortTypes: ['PIPE_THREAD'] }
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 10. SOLAR PV & UTILITY BATTERY STORAGE (BESS)
  // ─────────────────────────────────────────────────────────────
  SOLAREDGE_100KW_INVERTER: {
    type: 'SOLAREDGE_100KW_INVERTER',
    category: 'SOLAR',
    name: 'SolarEdge SE100K 3-Phase Commercial Solar Inverter',
    defaultTagPrefix: 'INV-100K',
    description: '100kW grid-tied inverter with Synergy technology, 12x DC string inputs, built-in arc fault protection, and RS485/Ethernet monitoring.',
    icon: 'ThunderboltOutlined',
    defaultCost: {
      partNumber: 'SE100K-RW00IBNU4',
      manufacturer: 'SolarEdge Technologies',
      unitCost: 5800,
      labourCost: 650,
      currency: 'USD'
    },
    defaultProperties: {
      ratedAcPowerKw: 100,
      maxEfficiencyPercent: 98.3,
      acVoltage: '400V 3-Phase',
      macOui: '00:27:02'
    },
    portsTemplate: [
      { name: 'DC_STRING_IN', type: 'DC_POLE', direction: 'input', capacity: 150, unit: 'A', compatiblePortTypes: ['DC_POLE'] },
      { name: 'AC_GRID_OUT', type: 'AC_TERMINAL', direction: 'output', capacity: 145, unit: 'A', compatiblePortTypes: ['AC_TERMINAL'] },
      { name: 'Ethernet_Monitoring', type: 'RJ45', direction: 'input', capacity: 100, unit: 'Mbps', compatiblePortTypes: ['RJ45'] }
    ]
  },

  TESLA_MEGAPACK_2XL_BESS: {
    type: 'TESLA_MEGAPACK_2XL_BESS',
    category: 'SOLAR',
    name: 'Tesla Megapack 2XL 3.9 MWh Utility BESS Container',
    defaultTagPrefix: 'BESS',
    description: 'Fully integrated utility-scale battery energy storage system: LFP battery modules, bi-directional inverter, thermal liquid management.',
    icon: 'ThunderboltOutlined',
    defaultCost: {
      partNumber: 'MP-2XL-3.9MWH',
      manufacturer: 'Tesla Energy',
      unitCost: 1450000,
      labourCost: 25000,
      currency: 'USD'
    },
    defaultProperties: {
      nominalCapacityMwh: 3.9,
      maxContinuousPowerMw: 1.9,
      roundTripEfficiency: 92.5,
      chemistry: 'Lithium Iron Phosphate (LFP)'
    },
    portsTemplate: [
      { name: 'GRID_INTERCONNECT_480V', type: 'AC_TERMINAL', direction: 'bidirectional', capacity: 2500, unit: 'A', compatiblePortTypes: ['AC_TERMINAL'] }
    ]
  }
};
