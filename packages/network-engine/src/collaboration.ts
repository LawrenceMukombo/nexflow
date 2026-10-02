export interface Collaborator {
  id: string;
  name: string;
  role: 'ELECTRICAL_LEAD' | 'HVAC_SPECIALIST' | 'NETWORK_ARCHITECT' | 'COMMISSIONING_AGENT' | 'BIM_COORDINATOR';
  initials: string;
  color: string;
  cursor?: { x: number; y: number };
  activeNodeId?: string | null;
  activeAction?: string;
  isOnline: boolean;
  lastActiveMs: number;
}

export interface ComponentLock {
  componentId: string;
  collaboratorId: string;
  collaboratorName: string;
  color: string;
  acquiredAtMs: number;
  reason?: string;
}

export interface CollaborativeAnnotation {
  id: string;
  componentId?: string;
  collaboratorId: string;
  collaboratorName: string;
  color: string;
  content: string;
  timestamp: string;
  resolved: boolean;
}

export interface CollaborationSessionState {
  sessionId: string;
  localCollaborator: Collaborator;
  activeCollaborators: Record<string, Collaborator>;
  locks: Record<string, ComponentLock>;
  annotations: CollaborativeAnnotation[];
  isCollabEnabled: boolean;
}

export const DEMO_PEER_COLLABORATORS: Collaborator[] = [
  {
    id: 'collab_elena_r',
    name: 'Elena Rostova, PE',
    role: 'ELECTRICAL_LEAD',
    initials: 'ER',
    color: '#eab308', // Electrical Gold
    cursor: { x: 380, y: 280 },
    activeNodeId: null,
    activeAction: 'Auditing 400V ATS Breaker Trip Curves',
    isOnline: true,
    lastActiveMs: Date.now()
  },
  {
    id: 'collab_marcus_v',
    name: 'Marcus Vance, CEM',
    role: 'HVAC_SPECIALIST',
    initials: 'MV',
    color: '#0284c7', // Cooling Blue
    cursor: { x: 740, y: 320 },
    activeNodeId: null,
    activeAction: 'Optimizing Chilled Water Supply Loop Delta-T',
    isOnline: true,
    lastActiveMs: Date.now()
  },
  {
    id: 'collab_dev_p',
    name: 'Dev Patel, CCIE',
    role: 'NETWORK_ARCHITECT',
    initials: 'DP',
    color: '#38bdf8', // Network Cyan
    cursor: { x: 520, y: 190 },
    activeNodeId: null,
    activeAction: 'Configuring BGP / OSPF Core Trunk Aggregation',
    isOnline: true,
    lastActiveMs: Date.now()
  }
];

/**
 * Creates initial collaborative session state
 */
export function createInitialCollaborationSession(
  sessionId: string = `collab_${Date.now()}`
): CollaborationSessionState {
  const localCollaborator: Collaborator = {
    id: 'collab_local_user',
    name: 'Lead Design Engineer (You)',
    role: 'BIM_COORDINATOR',
    initials: 'ME',
    color: '#10b981', // Emerald green
    cursor: { x: 500, y: 300 },
    activeNodeId: null,
    activeAction: 'Authoring System Model',
    isOnline: true,
    lastActiveMs: Date.now()
  };

  const activeCollaborators: Record<string, Collaborator> = {};
  for (const peer of DEMO_PEER_COLLABORATORS) {
    activeCollaborators[peer.id] = { ...peer };
  }

  const annotations: CollaborativeAnnotation[] = [
    {
      id: 'annot_1',
      collaboratorId: 'collab_elena_r',
      collaboratorName: 'Elena Rostova, PE',
      color: '#eab308',
      content: 'Verified 400A feeder cable sizing for ATS. IEEE 141 demand factor calculations conform to NEC Article 220.',
      timestamp: '10 mins ago',
      resolved: false
    },
    {
      id: 'annot_2',
      collaboratorId: 'collab_marcus_v',
      collaboratorName: 'Marcus Vance, CEM',
      color: '#0284c7',
      content: 'Chilled water buffer storage tank sized to 5,000L provides 14.5 mins thermal ride-through during chiller transfer.',
      timestamp: '5 mins ago',
      resolved: true
    }
  ];

  return {
    sessionId,
    localCollaborator,
    activeCollaborators,
    locks: {},
    annotations,
    isCollabEnabled: true
  };
}

/**
 * Acquire component lock for a collaborator
 */
export function acquireComponentLock(
  session: CollaborationSessionState,
  componentId: string,
  collaborator: Collaborator,
  reason?: string
): { success: boolean; session: CollaborationSessionState; lock?: ComponentLock; error?: string } {
  const existingLock = session.locks[componentId];
  if (existingLock && existingLock.collaboratorId !== collaborator.id) {
    return {
      success: false,
      session,
      error: `Component is currently locked by ${existingLock.collaboratorName}`
    };
  }

  const newLock: ComponentLock = {
    componentId,
    collaboratorId: collaborator.id,
    collaboratorName: collaborator.name,
    color: collaborator.color,
    acquiredAtMs: Date.now(),
    reason
  };

  return {
    success: true,
    lock: newLock,
    session: {
      ...session,
      locks: {
        ...session.locks,
        [componentId]: newLock
      }
    }
  };
}

/**
 * Release component lock
 */
export function releaseComponentLock(
  session: CollaborationSessionState,
  componentId: string,
  collaboratorId: string
): CollaborationSessionState {
  const existingLock = session.locks[componentId];
  if (!existingLock || existingLock.collaboratorId !== collaboratorId) {
    return session;
  }

  const nextLocks = { ...session.locks };
  delete nextLocks[componentId];

  return {
    ...session,
    locks: nextLocks
  };
}

/**
 * Simulate subtle, natural collaborator cursor wandering for live presence feel
 */
export function stepCollaboratorPresence(
  session: CollaborationSessionState,
  stepDeltaSec: number = 1.0
): CollaborationSessionState {
  if (!session.isCollabEnabled) return session;

  const nextCollabs = { ...session.activeCollaborators };
  const now = Date.now();

  for (const [id, peer] of Object.entries(nextCollabs)) {
    if (!peer.cursor) continue;

    // Smooth wandering walk
    const angle = ((now * 0.001 * (id.charCodeAt(id.length - 1) % 5 + 1))) % (Math.PI * 2);
    const speed = 15 * stepDeltaSec;
    const nx = Math.round(peer.cursor.x + Math.cos(angle) * speed);
    const ny = Math.round(peer.cursor.y + Math.sin(angle) * speed);

    nextCollabs[id] = {
      ...peer,
      cursor: { x: Math.max(50, Math.min(1800, nx)), y: Math.max(50, Math.min(1200, ny)) },
      lastActiveMs: now
    };
  }

  return {
    ...session,
    activeCollaborators: nextCollabs
  };
}
