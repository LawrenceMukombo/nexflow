import React, { useState } from 'react';
import { Input, Collapse, Button, Tooltip, Typography } from 'antd';
import { 
  SearchOutlined, 
  CloudServerOutlined, 
  PartitionOutlined, 
  ApartmentOutlined, 
  BranchesOutlined, 
  SafetyCertificateOutlined, 
  DesktopOutlined, 
  WifiOutlined, 
  DatabaseOutlined, 
  PrinterOutlined, 
  PhoneOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { NETWORK_COMPONENT_CATALOG } from '@omniflow/network-engine';
import { useGraphStore } from '../store/graphStore';

const { Text } = Typography;

export const Palette: React.FC = () => {
  const [search, setSearch] = useState('');
  const addComponent = useGraphStore((s) => s.addComponent);

  const getIcon = (type: string) => {
    switch (type) {
      case 'ISP_FEED': return <CloudServerOutlined style={{ color: '#06b6d4', fontSize: 18 }} />;
      case 'ROUTER_ENTERPRISE': return <PartitionOutlined style={{ color: '#38bdf8', fontSize: 18 }} />;
      case 'FIREWALL_UTM': return <SafetyCertificateOutlined style={{ color: '#ef4444', fontSize: 18 }} />;
      case 'SWITCH_CORE_L3': return <ApartmentOutlined style={{ color: '#818cf8', fontSize: 18 }} />;
      case 'SWITCH_POE_24': return <BranchesOutlined style={{ color: '#10b981', fontSize: 18 }} />;
      case 'ACCESS_POINT_WIFI6': return <WifiOutlined style={{ color: '#f59e0b', fontSize: 18 }} />;
      case 'SERVER_APP': return <DatabaseOutlined style={{ color: '#6366f1', fontSize: 18 }} />;
      case 'WORKSTATION_PC': return <DesktopOutlined style={{ color: '#94a3b8', fontSize: 18 }} />;
      case 'IP_PHONE_VOIP': return <PhoneOutlined style={{ color: '#ec4899', fontSize: 18 }} />;
      case 'NETWORK_PRINTER': return <PrinterOutlined style={{ color: '#14b8a6', fontSize: 18 }} />;
      default: return <ApartmentOutlined style={{ color: '#94a3b8', fontSize: 18 }} />;
    }
  };

  const allItems = Object.values(NETWORK_COMPONENT_CATALOG);
  const filteredItems = allItems.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.description.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [
    { key: 'CORE', label: 'Core Infrastructure', items: filteredItems.filter(i => i.category === 'CORE') },
    { key: 'SWITCHING', label: 'Switching & Routing', items: filteredItems.filter(i => i.category === 'SWITCHING') },
    { key: 'SECURITY', label: 'Perimeter & Security', items: filteredItems.filter(i => i.category === 'SECURITY') },
    { key: 'ENDPOINTS', label: 'Endpoints & Clients', items: filteredItems.filter(i => i.category === 'ENDPOINTS') }
  ];

  return (
    <div
      style={{
        width: 280,
        height: '100%',
        backgroundColor: '#0f172a',
        borderRight: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20
      }}
    >
      {/* Palette Header & Search */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text strong style={{ color: '#f8fafc', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Component Library
          </Text>
          <span style={{ fontSize: 11, color: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.1)', padding: '2px 6px', borderRadius: 4 }}>
            NETWORK
          </span>
        </div>

        <Input
          prefix={<SearchOutlined style={{ color: '#64748b' }} />}
          placeholder="Filter devices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          size="middle"
        />
      </div>

      {/* Palette Categorized Accordions */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        <Collapse
          defaultActiveKey={['CORE', 'SWITCHING', 'ENDPOINTS']}
          ghost
          style={{ color: '#f8fafc' }}
          items={categories.map(cat => ({
            key: cat.key,
            label: (
              <span style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 600 }}>
                {cat.label} ({cat.items.length})
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cat.items.map(item => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/omniflow-component', item.type);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      cursor: 'grab',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#38bdf8';
                      e.currentTarget.style.backgroundColor = '#243248';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#334155';
                      e.currentTarget.style.backgroundColor = '#1e293b';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {getIcon(item.type)}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#f8fafc' }}>
                          {item.name}
                        </span>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>
                          {item.portsTemplate.length} ports • {item.defaultCost.currency} ${item.defaultCost.unitCost}
                        </span>
                      </div>
                    </div>

                    <Tooltip title="Click to add to center">
                      <Button
                        type="text"
                        size="small"
                        icon={<PlusOutlined style={{ color: '#38bdf8' }} />}
                        onClick={() => addComponent(item.type, { x: 300, y: 250 })}
                      />
                    </Tooltip>
                  </div>
                ))}
              </div>
            )
          }))}
        />
      </div>
    </div>
  );
};
