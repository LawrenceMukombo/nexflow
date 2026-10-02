import { 
  createInitialCollaborationSession, 
  acquireComponentLock, 
  releaseComponentLock, 
  stepCollaboratorPresence,
  DEMO_PEER_COLLABORATORS
} from '../src/index';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log('=== RUNNING OMNIFLOW MULTI-ENGINEER COLLABORATION TEST SUITE ===');

// 1. Initial Session Creation
const session = createInitialCollaborationSession('proj_session_101');
assert(session.sessionId === 'proj_session_101', 'Collaboration session initialized with session ID');
assert(session.localCollaborator.name.includes('Lead Design Engineer'), 'Local user assigned as lead BIM coordinator');
assert(Object.keys(session.activeCollaborators).length === 3, 'Demo peer collaborators loaded (3 specialist engineers online)');
assert(session.annotations.length >= 2, 'Loaded engineering peer review annotations');

// 2. Component Soft-Lock Acquisition
const elena = DEMO_PEER_COLLABORATORS[0];
const lockResult = acquireComponentLock(session, 'node_ats_01', elena, 'Calibrating ATS Trip Curve');
assert(lockResult.success === true, 'Elena acquired component lock on node_ats_01');
assert(lockResult.session.locks.node_ats_01.collaboratorName === 'Elena Rostova, PE', 'Lock reflects Elena Rostova as lock holder');

// 3. Prevent Conflicting Concurrent Lock Acquisition
const dev = DEMO_PEER_COLLABORATORS[2];
const conflictResult = acquireComponentLock(lockResult.session, 'node_ats_01', dev, 'Attempting conflicting edit');
assert(conflictResult.success === false, 'Dev Patel prevented from acquiring lock on already-locked component');
assert(conflictResult.error !== undefined && conflictResult.error.includes('Elena Rostova'), 'Conflict error accurately identifies lock holder');

// 4. Release Lock
const releasedSession = releaseComponentLock(lockResult.session, 'node_ats_01', elena.id);
assert(releasedSession.locks.node_ats_01 === undefined, 'Component lock released successfully');

// Dev can now acquire the released lock
const devLockResult = acquireComponentLock(releasedSession, 'node_ats_01', dev, 'Now allowed after release');
assert(devLockResult.success === true, 'Dev Patel successfully acquired lock after release');

// 5. Collaborator Presence Cursor Movement
const steppedSession = stepCollaboratorPresence(session, 1.0);
const peerAfter = Object.values(steppedSession.activeCollaborators)[0];
assert(peerAfter.cursor !== undefined && typeof peerAfter.cursor.x === 'number', 'Peer collaborator cursor position updated smoothly');

console.log('======================================================');
console.log('🎉 ALL MULTI-ENGINEER COLLABORATION TESTS PASSED!');
console.log('======================================================');
