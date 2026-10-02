import React, { useState, useMemo } from 'react';
import { 
  Input, 
  Collapse, 
  Button, 
  Tooltip, 
  Typography, 
  Segmented, 
  Select, 
  Tag, 
  Checkbox, 
  message,
  Empty
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  BookOutlined, 
  AppstoreAddOutlined, 
  CheckSquareOutlined, 
  ClearOutlined 
} from '@ant-design/icons';
import { NETWORK_COMPONENT_CATALOG } from '@omniflow/network-engine';
import { useGraphStore } from '../store/graphStore';
import { ComponentIcon } from './ComponentIcon';
import { EngineeringDomain } from '@omniflow/shared-types';

const { Text } = Typography;

// Domain -> catalog category mapping
const DOMAIN_CATEGORY_MAP: Record<EngineeringDomain, string[]> = {
  NETWORK:      ['CORE', 'SWITCHING', 'SECURITY', 'WIRELESS', 'INFRASTRUCTURE', 'ENDPOINTS'],
  ELECTRICAL:   ['ELECTRICAL', 'SOLAR'],
  SOLAR:        ['SOLAR', 'ELECTRICAL'],
  PLUMBING:     ['PLUMBING', 'COOLING'],
  CCTV:         ['CCTV', 'SECURITY'],
  MULTI_DOMAIN: ['CORE', 'SWITCHING', 'SECURITY', 'WIRELESS', 'INFRASTRUCTURE', 'ENDPOINTS', 'ELECTRICAL', 'SOLAR', 'PLUMBING', 'COOLING', 'CCTV', 'FACILITY'],
};

const CATEGORY_LABELS: Record<string, string> = {
  CORE:           'Core & Routing',
  SWITCHING:      'Switching & Aggregation',
  SECURITY:       'Firewalls & Perimeter',
  WIRELESS:       'Wireless & WiFi',
  INFRASTRUCTURE: 'Racks & Infrastructure',
  ENDPOINTS:      'Endpoints & IoT',
  ELECTRICAL:     'Power & Electrical Distribution',
  SOLAR:          'Solar & Renewable Power',
  PLUMBING:       'Plumbing & Piping',
  COOLING:        'Cooling & HVAC',
  CCTV:           'CCTV & Surveillance',
  FACILITY:       'Integrated Facility Racks',
};

const DOMAIN_META: Record<EngineeringDomain, { label: string; color: string; emoji: string }> = {
  NETWORK:      { label: 'Network',           color: '#0284c7', emoji: '🌐' },
  ELECTRICAL:   { label: 'Electrical Power',  color: '#d97706', emoji: '⚡' },
  SOLAR:        { label: 'Solar Energy',      color: '#ca8a04', emoji: '☀️' },
  PLUMBING:     { label: 'Plumbing & Cooling',color: '#0284c7', emoji: '💧' },
  CCTV:         { label: 'CCTV & Security',   color: '#c026d3', emoji: '🛡️' },
  MULTI_DOMAIN: { label: 'All Domains',       color: '#7c3aed', emoji: '🏢' },
};

export const Palette: React.FC = () => {
  const [tabMode, setTabMode] = useState<'catalog' | 'libraries'>('catalog');
  const [search, setSearch] = useState('');
  const [batchMode, setBatchMode] = useState<boolean>(false);
  const [batchSelectedTypes, setBatchSelectedTypes] = useState<string[]>([]);
  
  const {
    activeDomain,
    addComponent,
    addComponentsBatch,
    insertAssembly,
    libraries,
    activeLibraryId,
    setActiveLibraryId,
    toggleLibraryModal,
    toggleCreateComponentModal
  } = useGraphStore();

  const domainMeta = DOMAIN_META[activeDomain] || DOMAIN_META.NETWORK;
  const allowedCategories = DOMAIN_CATEGORY_MAP[activeDomain] || DOMAIN_CATEGORY_MAP.NETWORK;

  const toggleBatchItem = (type: string) => {
    setBatchSelectedTypes(prev => {
      const idx = prev.indexOf(type);
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      } else {
        return [...prev, type];
      }
    });
  };

  const addBatchCount = (type: string) => {
    setBatchSelectedTypes(prev => [...prev, type]);
  };

  const getIcon = (type: string) => <ComponentIcon type={type} size={18} />;

  const allItems = Object.values(NETWORK_COMPONENT_CATALOG);
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // 1. Must belong to active domain unless in MULTI_DOMAIN
      if (activeDomain !== 'MULTI_DOMAIN' && !allowedCategories.includes(item.category)) {
        return false;
      }
      // 2. Search filter
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      );
    });
  }, [allItems, activeDomain, allowedCategories, search]);

  const categories = useMemo(() => {
    return allowedCategories
      .map(key => ({
        key,
        label: CATEGORY_LABELS[key] || key,
        items: filteredItems.filter(i => i.category === key),
      }))
      .filter(cat => cat.items.length > 0);
  }, [allowedCategories, filteredItems]);

  const currentLibrary = libraries.find(l => l.id === activeLibraryId) || libraries[0];

  return (
    <div
      style={{
        width: 300,
        height: '100%',
        backgroundColor: '#0f172a',
        borderRight: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20
      }}
    >
      {/* Palette Header with Mode Selector */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text strong style={{ color: '#f8fafc', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Equipment & Libraries
          </Text>
          <Button
            type="text"
            size="small"
            icon={<BookOutlined style={{ color: '#38bdf8' }} />}
            onClick={() => toggleLibraryModal(true)}
            style={{ fontSize: 11, color: '#38bdf8' }}
          >
            Manager
          </Button>
        </div>

        {/* Active Domain Indicator Banner */}
        <div 
          style={{ 
            marginBottom: 10, 
            padding: '5px 8px', 
            backgroundColor: `${domainMeta.color}18`, 
            border: `1px solid ${domainMeta.color}45`, 
            borderRadius: 6, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6 
          }}
        >
          <span style={{ fontSize: 14 }}>{domainMeta.emoji}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: domainMeta.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {domainMeta.label} Catalog
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>
            {filteredItems.length} items
          </span>
        </div>

        <Segmented
          block
          value={tabMode}
          onChange={(val) => setTabMode(val as any)}
          options={[
            { label: 'Catalog', value: 'catalog' },
            { label: 'Libraries & Assemblies', value: 'libraries' }
          ]}
          style={{ marginBottom: 10, backgroundColor: '#1e293b' }}
        />

        <Input
          prefix={<SearchOutlined style={{ color: '#64748b' }} />}
          placeholder={tabMode === 'catalog' ? `Filter ${domainMeta.label.toLowerCase()}...` : 'Filter library items...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          size="middle"
        />

        {/* Multi-Component Batch Mode Toggle & Summary */}
        {tabMode === 'catalog' && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Button
                size="small"
                type={batchMode ? 'primary' : 'default'}
                icon={<CheckSquareOutlined />}
                onClick={() => setBatchMode(!batchMode)}
                style={{
                  backgroundColor: batchMode ? '#0284c7' : '#1e293b',
                  borderColor: batchMode ? '#38bdf8' : '#334155',
                  color: '#f8fafc',
                  fontSize: 12
                }}
              >
                {batchMode ? 'Multi-Select Active' : 'Select Multiple'}
              </Button>
              {batchSelectedTypes.length > 0 && (
                <Button
                  size="small"
                  type="link"
                  danger
                  icon={<ClearOutlined />}
                  onClick={() => setBatchSelectedTypes([])}
                >
                  Clear ({batchSelectedTypes.length})
                </Button>
              )}
            </div>

            {/* Draggable Batch Deploy Card */}
            {batchSelectedTypes.length > 0 && (
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/omniflow-components-batch', JSON.stringify(batchSelectedTypes));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                style={{
                  marginTop: 8,
                  padding: '10px',
                  backgroundColor: '#0369a1',
                  border: '1px solid #38bdf8',
                  borderRadius: 8,
                  color: '#fff',
                  cursor: 'grab',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📦</span>
                    <span>{batchSelectedTypes.length} Components Selected</span>
                  </div>
                  <span style={{ fontSize: 10, backgroundColor: 'rgba(255,255,255,0.25)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                    Drag to Canvas
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#e0f2fe', marginBottom: 8 }}>
                  Drag this bundle onto canvas to drop and wire these {batchSelectedTypes.length} components together!
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button
                    size="small"
                    style={{ backgroundColor: '#fff', color: '#0369a1', fontWeight: 600, border: 'none', flex: 1 }}
                    onClick={() => {
                      addComponentsBatch(batchSelectedTypes, { x: 350, y: 250 }, 'star');
                      message.success(`Deployed ${batchSelectedTypes.length} components in Star Topology`);
                      setBatchSelectedTypes([]);
                    }}
                  >
                    Deploy (Star)
                  </Button>
                  <Button
                    size="small"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', flex: 1 }}
                    onClick={() => {
                      addComponentsBatch(batchSelectedTypes, { x: 350, y: 250 }, 'daisy');
                      message.success(`Deployed ${batchSelectedTypes.length} components in Daisy Chain`);
                      setBatchSelectedTypes([]);
                    }}
                  >
                    Deploy (Chain)
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab 1: Standard Equipment Catalog */}
      {tabMode === 'catalog' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {categories.length > 0 ? (
            <Collapse
              key={activeDomain}
              defaultActiveKey={categories.map(c => c.key)}
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {cat.items.map(item => {
                      const countInBatch = batchSelectedTypes.filter(t => t === item.type).length;
                      const isSelected = countInBatch > 0;

                      return (
                        <div
                          key={item.type}
                          draggable
                          onDragStart={(e) => {
                            if (isSelected && batchSelectedTypes.length > 1) {
                              e.dataTransfer.setData('application/omniflow-components-batch', JSON.stringify(batchSelectedTypes));
                              e.dataTransfer.effectAllowed = 'copy';
                            } else {
                              e.dataTransfer.setData('application/omniflow-component', item.type);
                              e.dataTransfer.effectAllowed = 'copy';
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            backgroundColor: isSelected ? '#1e3a5f' : '#1e293b',
                            border: isSelected ? '1px solid #38bdf8' : '1px solid #334155',
                            borderRadius: 6,
                            cursor: 'grab',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#38bdf8';
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#243248';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = isSelected ? '#38bdf8' : '#334155';
                            e.currentTarget.style.backgroundColor = isSelected ? '#1e3a5f' : '#1e293b';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {batchMode && (
                              <Checkbox
                                checked={isSelected}
                                onChange={() => toggleBatchItem(item.type)}
                              />
                            )}
                            {getIcon(item.type)}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 500, color: '#f8fafc' }}>
                                  {item.name}
                                </span>
                                {countInBatch > 0 && (
                                  <Tag color="#0284c7" style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>
                                    ×{countInBatch}
                                  </Tag>
                                )}
                              </div>
                              <span style={{ fontSize: 10, color: '#94a3b8' }}>
                                {item.portsTemplate.length} ports • {item.defaultCost.currency} ${item.defaultCost.unitCost}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {batchMode ? (
                              <Tooltip title="Add 1 more to batch">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<PlusOutlined style={{ color: '#38bdf8' }} />}
                                  onClick={() => addBatchCount(item.type)}
                                />
                              </Tooltip>
                            ) : (
                              <Tooltip title="Click to add to canvas">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<PlusOutlined style={{ color: '#38bdf8' }} />}
                                  onClick={() => addComponent(item.type, { x: 300, y: 250 })}
                                />
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              }))}
            />
          ) : (
            <div style={{ padding: '36px 16px', textAlign: 'center' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ color: '#64748b', fontSize: 12 }}>
                    {search ? 'No matching equipment found' : `No ${domainMeta.label} components found`}
                  </span>
                }
              />
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Vendor Libraries & Multi-Device Assemblies */
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {/* Active Library Selector */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Select Library:</div>
            <Select
              value={activeLibraryId}
              onChange={(val) => setActiveLibraryId(val)}
              style={{ width: '100%' }}
              options={libraries.map(lib => ({
                label: `${lib.name} (${lib.isBuiltIn ? 'Curated' : 'Custom'})`,
                value: lib.id
              }))}
            />
          </div>

          {/* Assemblies Section */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase' }}>
                Pre-wired Assemblies ({currentLibrary?.assemblies.length || 0})
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {currentLibrary?.assemblies.map(asm => (
                <div
                  key={asm.id}
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc' }}>
                      {asm.name}
                    </span>
                    {asm.estimatedCost && (
                      <Tag color="green" style={{ fontSize: 10 }}>${asm.estimatedCost.toLocaleString()}</Tag>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0' }}>
                    {asm.description.substring(0, 75)}...
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: '#38bdf8' }}>
                      {asm.nodes.length} nodes • {asm.connections.length} links
                    </span>
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      style={{ fontSize: 11, backgroundColor: '#0284c7' }}
                      onClick={() => insertAssembly(asm)}
                    >
                      Deploy
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Library Components Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase' }}>
                Components ({currentLibrary?.components.length || 0})
              </span>
              <Button
                type="text"
                size="small"
                icon={<AppstoreAddOutlined style={{ color: '#10b981' }} />}
                onClick={() => toggleCreateComponentModal(true)}
                style={{ fontSize: 11, color: '#10b981' }}
              >
                + New
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {currentLibrary?.components.map(item => (
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
                    cursor: 'grab'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {getIcon(item.type)}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#f8fafc' }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>
                        {item.defaultCost.manufacturer} • ${item.defaultCost.unitCost}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="text"
                    size="small"
                    icon={<PlusOutlined style={{ color: '#38bdf8' }} />}
                    onClick={() => addComponent(item.type, { x: 300, y: 250 })}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
