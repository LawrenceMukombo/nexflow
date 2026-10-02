import React from 'react';
import { 
  CloudServerOutlined, 
  PartitionOutlined, 
  SafetyCertificateOutlined, 
  ApartmentOutlined, 
  BranchesOutlined, 
  WifiOutlined, 
  DatabaseOutlined, 
  DesktopOutlined, 
  PhoneOutlined, 
  PrinterOutlined, 
  VideoCameraOutlined, 
  LockOutlined, 
  ThunderboltOutlined, 
  TableOutlined, 
  InboxOutlined, 
  AppstoreOutlined,
  AlertOutlined,
  DashboardOutlined,
  ApiOutlined,
  ControlOutlined
} from '@ant-design/icons';

interface ComponentIconProps {
  type: string;
  domain?: string;
  size?: number;
  style?: React.CSSProperties;
}

export const ComponentIcon: React.FC<ComponentIconProps> = ({ type, domain, size = 16, style = {} }) => {
  const s = { fontSize: size, ...style };

  // 1. Core ISP & Demarcation
  if (type === 'ISP_FEED' || type.includes('ISP') || type.includes('DEMARC')) {
    return <CloudServerOutlined style={{ color: '#06b6d4', ...s }} />;
  }

  // 2. Routers
  if (type.includes('ROUTER') || type.includes('RTR') || type.includes('ISR')) {
    if (type.includes('CORE') || type.includes('BGP')) {
      return <PartitionOutlined style={{ color: '#0284c7', ...s }} />;
    }
    if (type.includes('INDUSTRIAL')) {
      return <PartitionOutlined style={{ color: '#f59e0b', ...s }} />;
    }
    return <PartitionOutlined style={{ color: '#38bdf8', ...s }} />;
  }

  // 3. Firewalls & Security
  if (type.includes('FIREWALL') || type.includes('FORTIGATE') || type.includes('UTM') || type.includes('NGFW')) {
    if (type.includes('HA') || type.includes('CLUSTER')) {
      return <SafetyCertificateOutlined style={{ color: '#f43f5e', ...s }} />;
    }
    return <SafetyCertificateOutlined style={{ color: '#ef4444', ...s }} />;
  }

  // 4. Core & Distribution Switches
  if (type.includes('SWITCH_CORE') || type.includes('SWITCH_AGGREGATION') || type.includes('CATALYST_9500')) {
    return <ApartmentOutlined style={{ color: '#818cf8', ...s }} />;
  }

  // 5. Access & PoE Switches
  if (type.includes('SWITCH') || type.includes('FORTISWITCH') || type.includes('EDS')) {
    if (type.includes('POE') || type.includes('48') || type.includes('24')) {
      return <BranchesOutlined style={{ color: '#10b981', ...s }} />;
    }
    if (type.includes('INDUSTRIAL') || type.includes('DIN')) {
      return <BranchesOutlined style={{ color: '#eab308', ...s }} />;
    }
    return <BranchesOutlined style={{ color: '#34d399', ...s }} />;
  }

  // 6. Wireless APs & Bridges
  if (type.includes('ACCESS_POINT') || type.includes('WIFI') || type.includes('WLC') || type.includes('BRIDGE')) {
    if (type.includes('OUTDOOR') || type.includes('BRIDGE')) {
      return <WifiOutlined style={{ color: '#f97316', ...s }} />;
    }
    if (type.includes('WLC')) {
      return <ControlOutlined style={{ color: '#a855f7', ...s }} />;
    }
    return <WifiOutlined style={{ color: '#f59e0b', ...s }} />;
  }

  // 7. Servers, Compute & Storage
  if (type.includes('SERVER') || type.includes('STORAGE') || type.includes('NAS') || type.includes('SAN') || type.includes('NVR')) {
    if (type.includes('STORAGE') || type.includes('NAS')) {
      return <DatabaseOutlined style={{ color: '#a855f7', ...s }} />;
    }
    if (type.includes('NVR')) {
      return <DatabaseOutlined style={{ color: '#ec4899', ...s }} />;
    }
    return <DatabaseOutlined style={{ color: '#6366f1', ...s }} />;
  }

  // 8. Endpoints
  if (type === 'WORKSTATION_PC' || type.includes('PC') || type.includes('LAPTOP')) {
    return <DesktopOutlined style={{ color: '#94a3b8', ...s }} />;
  }
  if (type === 'IP_PHONE_VOIP' || type.includes('PHONE') || type.includes('VOIP')) {
    return <PhoneOutlined style={{ color: '#ec4899', ...s }} />;
  }
  if (type === 'NETWORK_PRINTER' || type.includes('PRINTER') || type.includes('MFP')) {
    return <PrinterOutlined style={{ color: '#14b8a6', ...s }} />;
  }
  if (type.includes('CONFERENCE') || type.includes('BAR')) {
    return <VideoCameraOutlined style={{ color: '#38bdf8', ...s }} />;
  }

  // 9. Structured Cabling & Enclosures
  if (type.includes('RACK') || type.includes('CABINET')) {
    if (type.includes('HYPERSCALE')) {
      return <InboxOutlined style={{ color: '#38bdf8', ...s }} />;
    }
    return <InboxOutlined style={{ color: '#94a3b8', ...s }} />;
  }
  if (type.includes('PATCH_PANEL')) {
    if (type.includes('FIBER')) {
      return <TableOutlined style={{ color: '#f59e0b', ...s }} />;
    }
    return <TableOutlined style={{ color: '#0284c7', ...s }} />;
  }

  // 10. Electrical Domain
  if (type.includes('TRANSFORMER') || type.includes('GRID')) {
    return <ThunderboltOutlined style={{ color: '#eab308', ...s }} />;
  }
  if (type.includes('GENERATOR') || type.includes('DIESEL')) {
    return <ThunderboltOutlined style={{ color: '#f97316', ...s }} />;
  }
  if (type.includes('ATS') || type.includes('TRANSFER')) {
    return <ApiOutlined style={{ color: '#f59e0b', ...s }} />;
  }
  if (type.includes('UPS')) {
    return <ThunderboltOutlined style={{ color: '#10b981', ...s }} />;
  }
  if (type.includes('PDU')) {
    return <DashboardOutlined style={{ color: '#eab308', ...s }} />;
  }
  if (type.includes('SOLAR') || type.includes('INVERTER')) {
    return <ThunderboltOutlined style={{ color: '#10b981', ...s }} />;
  }
  if (type.includes('BESS') || type.includes('BATTERY')) {
    return <ThunderboltOutlined style={{ color: '#06b6d4', ...s }} />;
  }

  // 11. Plumbing & Cooling Domain
  if (type.includes('CHILLER')) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, color: '#0284c7', ...s }}>
        ❄️
      </span>
    );
  }
  if (type.includes('PUMP')) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, color: '#06b6d4', ...s }}>
        ⚙️
      </span>
    );
  }
  if (type.includes('TANK') || type.includes('BUFFER')) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, color: '#38bdf8', ...s }}>
        🛢️
      </span>
    );
  }
  if (type.includes('TOWER') || type.includes('COOLING_TOWER')) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, color: '#14b8a6', ...s }}>
        🏭
      </span>
    );
  }
  if (type.includes('CRAC') || type.includes('CRAH') || type.includes('CRV')) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, color: '#0284c7', ...s }}>
        💨
      </span>
    );
  }
  if (type.includes('WATER') || type.includes('METER')) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, color: '#38bdf8', ...s }}>
        💧
      </span>
    );
  }

  // 12. CCTV & Access Control
  if (type.includes('CCTV') || type.includes('CAMERA')) {
    return <VideoCameraOutlined style={{ color: '#d946ef', ...s }} />;
  }
  if (type.includes('ACCESS') || type.includes('DOOR') || type.includes('LOCK')) {
    return <LockOutlined style={{ color: '#ef4444', ...s }} />;
  }
  if (type.includes('FIRE') || type.includes('SMOKE') || type.includes('ALARM')) {
    return <AlertOutlined style={{ color: '#f43f5e', ...s }} />;
  }

  // Domain Fallback
  if (domain === 'ELECTRICAL' || domain === 'SOLAR') {
    return <ThunderboltOutlined style={{ color: '#eab308', ...s }} />;
  }
  if (domain === 'PLUMBING') {
    return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>💧</span>;
  }
  if (domain === 'CCTV') {
    return <VideoCameraOutlined style={{ color: '#d946ef', ...s }} />;
  }

  return <AppstoreOutlined style={{ color: '#94a3b8', ...s }} />;
};

/**
 * NexFlow Master Brand App Icon Component
 */
export const NexFlowBrandIcon: React.FC<{ size?: number; glow?: boolean; style?: React.CSSProperties }> = ({
  size = 32,
  glow = true,
  style = {}
}) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        overflow: 'hidden',
        boxShadow: glow ? '0 0 14px rgba(56, 189, 248, 0.45)' : undefined,
        border: '1px solid rgba(56, 189, 248, 0.4)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#090d16',
        ...style
      }}
    >
      <img
        src="/nexflow_app_icon.png"
        alt="NexFlow"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block'
        }}
        onError={(e) => {
          // Fallback if image path is resolving
          e.currentTarget.style.display = 'none';
          if (e.currentTarget.parentElement) {
            e.currentTarget.parentElement.innerHTML = '⚡';
            e.currentTarget.parentElement.style.fontSize = `${Math.round(size * 0.55)}px`;
            e.currentTarget.parentElement.style.color = '#38bdf8';
          }
        }}
      />
    </div>
  );
};
