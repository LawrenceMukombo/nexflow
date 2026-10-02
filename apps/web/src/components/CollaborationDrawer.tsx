import React, { useState } from 'react';
import { 
  Drawer, 
  Button, 
  Space, 
  Typography, 
  Tag, 
  Switch, 
  Tabs, 
  List, 
  Avatar, 
  Input, 
  Card, 
  Badge, 
  Tooltip,
  message 
} from 'antd';
import { 
  TeamOutlined, 
  LockOutlined, 
  UnlockOutlined, 
  CommentOutlined, 
  AimOutlined, 
  CheckCircleOutlined, 
  UserOutlined, 
  SendOutlined
} from '@ant-design/icons';
import { useGraphStore } from '../store/graphStore';

const { Paragraph } = Typography;
const { TextArea } = Input;

export const CollaborationDrawer: React.FC = () => {
  const {
    collabSession,
    isCollabDrawerOpen,
    closeCollabDrawer,
    toggleCollabEnabled,
    addCollabAnnotation,
    resolveCollabAnnotation,
    acquireNodeLock,
    releaseNodeLock,
    selectedNodeIds,
    graph,
    setViewport
  } = useGraphStore();

  const [newComment, setNewComment] = useState('');
  const [lockReason, setLockReason] = useState('Active Peer Configuration');

  if (!isCollabDrawerOpen) return null;

  const peers = Object.values(collabSession.activeCollaborators);
  const locks = Object.values(collabSession.locks);
  const selectedNode = selectedNodeIds.length > 0 ? graph.nodes[selectedNodeIds[0]] : null;
  const isSelectedLocked = selectedNode ? !!collabSession.locks[selectedNode.id] : false;

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCollabAnnotation(newComment.trim(), selectedNode?.tag);
    setNewComment('');
    message.success('Added engineering review comment');
  };

  const handleJumpToCollaborator = (peerCursor?: { x: number; y: number }) => {
    if (!peerCursor) return;
    setViewport({
      x: -peerCursor.x + 400,
      y: -peerCursor.y + 300,
      zoom: 1.1
    });
    message.info('Centered canvas viewport onto collaborator location');
  };

  const handleToggleLock = () => {
    if (!selectedNode) {
      message.warning('Select a component on canvas to acquire or release a lock.');
      return;
    }

    if (isSelectedLocked) {
      releaseNodeLock(selectedNode.id);
      message.success(`Released lock on ${selectedNode.tag}`);
    } else {
      const ok = acquireNodeLock(selectedNode.id, lockReason);
      if (ok) {
        message.success(`Acquired exclusive soft-lock on ${selectedNode.tag}`);
      } else {
        message.error(`Cannot lock ${selectedNode.tag}: already locked by another peer.`);
      }
    }
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 8 }}>
          <Space>
            <TeamOutlined style={{ color: '#10b981', fontSize: 18 }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#f8fafc' }}>Real-Time Peer Engineering Collaboration</span>
          </Space>
          <Space>
            <Badge status="processing" color="#10b981" text={<span style={{ color: '#10b981', fontSize: 11, fontWeight: 600 }}>{peers.length + 1} ONLINE</span>} />
            <Switch 
              checked={collabSession.isCollabEnabled} 
              onChange={toggleCollabEnabled} 
              size="small" 
              checkedChildren="Sync" 
              unCheckedChildren="Off" 
            />
          </Space>
        </div>
      }
      placement="right"
      width={460}
      open={isCollabDrawerOpen}
      onClose={closeCollabDrawer}
      styles={{
        body: { backgroundColor: '#090d16', color: '#f8fafc', padding: 14 }
      }}
    >
      <Tabs
        defaultActiveKey="peers"
        items={[
          // Tab 1: Active Collaborators
          {
            key: 'peers',
            label: <span><UserOutlined /> Active Peers ({peers.length + 1})</span>,
            children: (
              <div>
                {/* Local user card */}
                <Card 
                  size="small" 
                  style={{ backgroundColor: '#0f172a', borderColor: '#10b981', marginBottom: 12 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar style={{ backgroundColor: '#10b981', fontWeight: 'bold' }}>ME</Avatar>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: 13 }}>{collabSession.localCollaborator.name}</span>
                        <Tag color="#10b981" style={{ fontSize: 10, margin: 0 }}>YOU</Tag>
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: 11 }}>Role: {collabSession.localCollaborator.role}</div>
                      <div style={{ color: '#38bdf8', fontSize: 11 }}>Status: {collabSession.localCollaborator.activeAction}</div>
                    </div>
                  </div>
                </Card>

                <div style={{ fontSize: 11, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Connected Specialist Engineers
                </div>

                <List
                  dataSource={peers}
                  renderItem={peer => (
                    <Card 
                      size="small" 
                      style={{ backgroundColor: '#0c1322', borderColor: '#1e293b', marginBottom: 8 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <Avatar style={{ backgroundColor: peer.color, fontWeight: 'bold', color: '#090d16' }}>
                            {peer.initials}
                          </Avatar>
                          <div>
                            <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 12 }}>{peer.name}</div>
                            <Tag color={peer.color} style={{ fontSize: 10, margin: '2px 0 4px', color: '#090d16', fontWeight: 600 }}>
                              {peer.role}
                            </Tag>
                            <div style={{ color: '#cbd5e1', fontSize: 11, fontStyle: 'italic' }}>
                              "{peer.activeAction}"
                            </div>
                            <div style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace', marginTop: 3 }}>
                              Cursor: X: {peer.cursor?.x || 0}px, Y: {peer.cursor?.y || 0}px
                            </div>
                          </div>
                        </div>

                        <Tooltip title="Center canvas view onto this collaborator">
                          <Button 
                            size="small" 
                            icon={<AimOutlined />} 
                            onClick={() => handleJumpToCollaborator(peer.cursor)}
                            style={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#38bdf8' }}
                          >
                            Jump
                          </Button>
                        </Tooltip>
                      </div>
                    </Card>
                  )}
                />
              </div>
            )
          },

          // Tab 2: Component Locks
          {
            key: 'locks',
            label: <span><LockOutlined /> Soft-Locks ({locks.length})</span>,
            children: (
              <div>
                {/* Lock Action Box */}
                <Card 
                  size="small" 
                  title={<span style={{ color: '#f8fafc', fontSize: 12 }}>Component Lock Manager</span>}
                  style={{ backgroundColor: '#0f172a', borderColor: '#1e293b', marginBottom: 14 }}
                >
                  <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 8 }}>
                    {selectedNode ? (
                      <div>
                        Selected Target: <Tag color="#0284c7" style={{ fontWeight: 'bold' }}>{selectedNode.tag}</Tag> ({selectedNode.name})
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Select any component on canvas to lock or release.</span>
                    )}
                  </div>

                  <Input 
                    size="small"
                    value={lockReason} 
                    onChange={e => setLockReason(e.target.value)} 
                    placeholder="Reason for locking (e.g. Updating IP / Feeder sizing)"
                    style={{ backgroundColor: '#090d16', borderColor: '#334155', color: '#f8fafc', marginBottom: 8, fontSize: 11 }}
                  />

                  <Button 
                    type={isSelectedLocked ? 'default' : 'primary'}
                    icon={isSelectedLocked ? <UnlockOutlined /> : <LockOutlined />}
                    disabled={!selectedNode}
                    onClick={handleToggleLock}
                    block
                    size="small"
                    style={{ backgroundColor: isSelectedLocked ? '#334155' : '#0284c7', borderColor: 'transparent', fontWeight: 600 }}
                  >
                    {isSelectedLocked ? `Release Lock on ${selectedNode?.tag}` : `Lock Selected (${selectedNode?.tag || 'None'})`}
                  </Button>
                </Card>

                {/* Active Locks List */}
                <div style={{ fontSize: 11, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' }}>
                  Active Component Locks Across Team
                </div>

                {locks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: 12 }}>
                    No components currently locked. All assets editable.
                  </div>
                ) : (
                  <List
                    dataSource={locks}
                    renderItem={lock => (
                      <Card 
                        size="small" 
                        style={{ backgroundColor: '#0c1322', borderColor: '#1e293b', marginBottom: 8 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space>
                            <LockOutlined style={{ color: lock.color }} />
                            <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{lock.componentId}</span>
                          </Space>
                          <Tag color={lock.color} style={{ color: '#090d16', fontWeight: 600, fontSize: 10 }}>
                            {lock.collaboratorName}
                          </Tag>
                        </div>
                        {lock.reason && (
                          <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
                            {lock.reason}
                          </div>
                        )}
                      </Card>
                    )}
                  />
                )}
              </div>
            )
          },

          // Tab 3: Annotations & Review Thread
          {
            key: 'annotations',
            label: <span><CommentOutlined /> Review Notes ({collabSession.annotations.length})</span>,
            children: (
              <div>
                {/* Add Comment Input */}
                <div style={{ marginBottom: 14 }}>
                  <TextArea 
                    rows={2} 
                    value={newComment} 
                    onChange={e => setNewComment(e.target.value)} 
                    placeholder="Add engineering peer review note (e.g. Code compliance verification...)"
                    style={{ backgroundColor: '#0c1322', borderColor: '#334155', color: '#f8fafc', fontSize: 12, marginBottom: 8 }}
                  />
                  <Button 
                    type="primary" 
                    icon={<SendOutlined />} 
                    onClick={handleAddComment}
                    size="small"
                    style={{ backgroundColor: '#10b981', borderColor: 'transparent', fontWeight: 600 }}
                  >
                    Post Review Note
                  </Button>
                </div>

                {/* List of Annotations */}
                <List
                  dataSource={collabSession.annotations}
                  renderItem={annot => (
                    <Card 
                      size="small" 
                      style={{ 
                        backgroundColor: '#0c1322', 
                        borderColor: annot.resolved ? '#1e293b' : annot.color, 
                        marginBottom: 10,
                        opacity: annot.resolved ? 0.65 : 1.0
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Space size="small">
                          <Avatar size={18} style={{ backgroundColor: annot.color, fontSize: 10, color: '#090d16', fontWeight: 'bold' }}>
                            {annot.collaboratorName.substring(0, 2).toUpperCase()}
                          </Avatar>
                          <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: 11 }}>{annot.collaboratorName}</span>
                          {annot.componentId && <Tag color="#0284c7" style={{ fontSize: 9 }}>{annot.componentId}</Tag>}
                        </Space>
                        <span style={{ color: '#64748b', fontSize: 10 }}>{annot.timestamp}</span>
                      </div>

                      <Paragraph style={{ color: '#cbd5e1', fontSize: 12, margin: '6px 0' }}>
                        {annot.content}
                      </Paragraph>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #1e293b', paddingTop: 4 }}>
                        <Button 
                          type="text" 
                          size="small" 
                          icon={<CheckCircleOutlined style={{ color: annot.resolved ? '#10b981' : '#64748b' }} />}
                          onClick={() => resolveCollabAnnotation(annot.id)}
                          style={{ fontSize: 11, color: annot.resolved ? '#10b981' : '#94a3b8' }}
                        >
                          {annot.resolved ? 'Resolved' : 'Mark as Resolved'}
                        </Button>
                      </div>
                    </Card>
                  )}
                />
              </div>
            )
          }
        ]}
      />
    </Drawer>
  );
};
