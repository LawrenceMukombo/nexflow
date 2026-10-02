import React, { useState } from 'react';
import { 
  Modal, 
  Steps, 
  Card, 
  Input, 
  Slider, 
  Switch, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Tag,
  message
} from 'antd';
import { 
  BuildOutlined, 
  ApartmentOutlined, 
  DatabaseOutlined, 
  VideoCameraOutlined, 
  ClusterOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';
import { NetworkWizardOptions } from '@omniflow/network-engine';

const { Title, Text, Paragraph } = Typography;

export const NetworkWizardModal: React.FC = () => {
  const { isWizardOpen, toggleWizardModal, applyWizardTopology } = useGraphStore();
  const [currentStep, setCurrentStep] = useState(0);

  const [archetype, setArchetype] = useState<NetworkWizardOptions['archetype']>('BRANCH_OFFICE');
  const [projectName, setProjectName] = useState('Enterprise Network Blueprint');
  const [subnetPrefix, setSubnetPrefix] = useState('192.168.10');
  const [clientCount, setClientCount] = useState(8);
  const [includeWifi, setIncludeWifi] = useState(true);
  const [includeVoip, setIncludeVoip] = useState(true);
  const [includeRedundancy, setIncludeRedundancy] = useState(false);

  const archetypes = [
    {
      key: 'BRANCH_OFFICE',
      title: 'Branch Office Network',
      icon: <ApartmentOutlined style={{ fontSize: 28, color: '#38bdf8' }} />,
      desc: 'SD-WAN dual-WAN router, 24-port PoE+ access switch, WiFi 6 AP, workstations, VoIP, and MFP printer.',
      badge: 'Most Popular'
    },
    {
      key: 'ENTERPRISE_CAMPUS',
      title: 'Corporate Campus HQ',
      icon: <ClusterOutlined style={{ fontSize: 28, color: '#10b981' }} />,
      desc: 'High-availability firewall pair, Core L3 distribution switch, multi-tier access switches, and dual ISP uplinks.',
      badge: 'High Availability'
    },
    {
      key: 'DATA_CENTER',
      title: 'Data Center & Server Farm',
      icon: <DatabaseOutlined style={{ fontSize: 28, color: '#818cf8' }} />,
      desc: 'Dual BGP border routers, 10G SFP+ aggregation, 42U rack cabinet, clustered servers, all-flash SAN array, and 3kVA UPS.',
      badge: 'Compute & Storage'
    },
    {
      key: 'SECURITY_CCTV',
      title: 'CCTV & Physical Security',
      icon: <VideoCameraOutlined style={{ fontSize: 28, color: '#f59e0b' }} />,
      desc: 'Perimeter gateway, high-budget PoE+ switch, 4K PTZ surveillance cameras, networked RFID door controllers, and NVR.',
      badge: 'Physical Security'
    },
    {
      key: 'INDUSTRIAL_IOT',
      title: 'Industrial IoT & Warehouse',
      icon: <ThunderboltOutlined style={{ fontSize: 28, color: '#ec4899' }} />,
      desc: 'Hardened DIN-rail gateway & switch (-40 to 75C), 60GHz wireless bridge, outdoor IP67 APs, and plant HMI stations.',
      badge: 'Rugged Environment'
    }
  ];

  const handleGenerate = () => {
    applyWizardTopology({
      archetype,
      projectName,
      subnetPrefix,
      clientCount,
      includeWifi,
      includeVoip,
      includeRedundancy
    });
    message.success(`Generated and deployed ${archetypes.find(a => a.key === archetype)?.title} to canvas!`);
    setCurrentStep(0);
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BuildOutlined style={{ color: '#38bdf8', fontSize: 22 }} />
          <Title level={4} style={{ color: '#f8fafc', margin: 0 }}>
            Automated Network & System Wizard
          </Title>
        </div>
      }
      open={isWizardOpen}
      onCancel={() => toggleWizardModal(false)}
      width={880}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>
            Back
          </Button>
          <Space>
            {currentStep < 2 ? (
              <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>
                Next: {currentStep === 0 ? 'Parameters' : 'Review & Deploy'}
              </Button>
            ) : (
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleGenerate} style={{ backgroundColor: '#10b981' }}>
                Deploy Topology to Canvas
              </Button>
            )}
          </Space>
        </div>
      }
    >
      <Steps
        current={currentStep}
        onChange={(step) => setCurrentStep(step)}
        style={{ marginBottom: 24, marginTop: 12 }}
        items={[
          { title: 'System Archetype' },
          { title: 'Parameters & Scale' },
          { title: 'Review & Synthesize' }
        ]}
      />

      {/* STEP 0: CHOOSE ARCHETYPE */}
      {currentStep === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Paragraph style={{ color: '#94a3b8' }}>
            Select an engineering topology blueprint. OmniFlow will automatically provision the hardware components, configure interfaces, assign IP subnets, and route compatible cables.
          </Paragraph>

          <Row gutter={[12, 12]}>
            {archetypes.map((arch) => (
              <Col span={12} key={arch.key}>
                <Card
                  hoverable
                  onClick={() => setArchetype(arch.key as any)}
                  style={{
                    backgroundColor: archetype === arch.key ? 'rgba(56, 189, 248, 0.12)' : '#1e293b',
                    borderColor: archetype === arch.key ? '#38bdf8' : '#334155',
                    cursor: 'pointer',
                    height: '100%'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    {arch.icon}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text strong style={{ color: '#f8fafc', fontSize: 14 }}>{arch.title}</Text>
                        <Tag color={archetype === arch.key ? 'cyan' : 'default'} style={{ margin: 0, fontSize: 10 }}>
                          {arch.badge}
                        </Tag>
                      </div>
                      <Text style={{ fontSize: 12, color: '#94a3b8' }}>{arch.desc}</Text>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* STEP 1: PARAMETERS & SCALE */}
      {currentStep === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Text style={{ fontSize: 12, color: '#94a3b8' }}>SYSTEM / PROJECT NAME</Text>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Branch Office Production Network"
              style={{ marginTop: 4 }}
            />
          </div>

          <Row gutter={16}>
            <Col span={12}>
              <Text style={{ fontSize: 12, color: '#94a3b8' }}>IP NETWORK / SUBNET PREFIX (/24)</Text>
              <Input
                value={subnetPrefix}
                onChange={(e) => setSubnetPrefix(e.target.value)}
                placeholder="192.168.10"
                style={{ fontFamily: 'monospace', marginTop: 4 }}
                addonAfter=".0/24"
              />
            </Col>
            <Col span={12}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#94a3b8' }}>CLIENT WORKSTATIONS COUNT</Text>
                <strong style={{ color: '#38bdf8' }}>{clientCount} PCs</strong>
              </div>
              <Slider
                min={2}
                max={20}
                value={clientCount}
                onChange={(val) => setClientCount(val)}
                style={{ marginTop: 8 }}
              />
            </Col>
          </Row>

          <Card size="small" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#f8fafc', fontWeight: 500 }}>Include WiFi 6 Coverage</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>Provisions Ceiling Mount Dual-Band WiFi 6 Access Points with PoE</div>
                </div>
                <Switch checked={includeWifi} onChange={(c) => setIncludeWifi(c)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#f8fafc', fontWeight: 500 }}>Include VoIP Telephony</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>Adds dedicated Gigabit PoE VoIP desktop phones with passthrough</div>
                </div>
                <Switch checked={includeVoip} onChange={(c) => setIncludeVoip(c)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#f8fafc', fontWeight: 500 }}>High-Availability / Redundant Uplinks</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>Deploys secondary backup fiber feed or clustered firewall interfaces</div>
                </div>
                <Switch checked={includeRedundancy} onChange={(c) => setIncludeRedundancy(c)} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* STEP 2: REVIEW & SYNTHESIZE */}
      {currentStep === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: 14, backgroundColor: '#1e293b', borderRadius: 8, border: '1px solid #334155' }}>
            <Text strong style={{ color: '#38bdf8', fontSize: 15 }}>
              Ready to Synthesize: {archetypes.find(a => a.key === archetype)?.title}
            </Text>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12 }}>
              <div><span style={{ color: '#64748b' }}>Network Subnet:</span> <span style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{subnetPrefix}.0/24</span></div>
              <div><span style={{ color: '#64748b' }}>Client Workstations:</span> <span style={{ color: '#f8fafc' }}>{clientCount} Devices</span></div>
              <div><span style={{ color: '#64748b' }}>WiFi 6 Active:</span> <Tag color={includeWifi ? 'green' : 'default'}>{includeWifi ? 'YES' : 'NO'}</Tag></div>
              <div><span style={{ color: '#64748b' }}>VoIP Telephony:</span> <Tag color={includeVoip ? 'green' : 'default'}>{includeVoip ? 'YES' : 'NO'}</Tag></div>
            </div>
          </div>

          <Paragraph style={{ color: '#94a3b8', fontSize: 12 }}>
            Deploying this blueprint will generate all required nodes with intelligent auto-layout, establish physical cable connections according to TIA/EIA standards, configure DHCP/Static IP parameters, and run initial verification.
          </Paragraph>
        </div>
      )}
    </Modal>
  );
};
