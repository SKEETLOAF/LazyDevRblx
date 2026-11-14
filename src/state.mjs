import { createHash, randomUUID } from 'node:crypto';
import { StructureStore } from './structure.mjs';

export const SOURCE_LIMIT = 128 * 1024;
const SNAPSHOT_LIMIT = 50;
const PROPOSAL_LIMIT = 100;
const SCRIPT_CLASSES = new Set(['Script', 'LocalScript', 'ModuleScript']);

export class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'InputError';
    this.status = status;
  }
}

function requireString(value, name, maxLength, { allowEmpty = false } = {}) {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || value.length > maxLength) {
    throw new InputError(`${name} must be a string of ${allowEmpty ? '0' : '1'}–${maxLength} characters`);
  }
  return value;
}

export function sourceHash(source) {
  return createHash('sha256').update(source, 'utf8').digest('hex');
}

export class DevKitState {
  constructor() {
    this.snapshots = new Map();
    this.latestByInstance = new Map();
    this.proposals = new Map();
    this.structures = new StructureStore();
  }

  inspect(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InputError('Expected inspection object');
    const instanceId = requireString(input.instanceId, 'instanceId', 100);
    const path = requireString(input.path, 'path', 600);
    const className = requireString(input.className, 'className', 40);
    if (!SCRIPT_CLASSES.has(className)) throw new InputError('Only script source containers can be inspected');
    const source = requireString(input.source, 'source', SOURCE_LIMIT, { allowEmpty: true });
    const previous = this.latestByInstance.get(instanceId);
    for (const proposal of this.proposals.values()) {
      if (proposal.instanceId === instanceId && proposal.status === 'pending') {
        proposal.status = 'superseded';
      }
    }
    if (previous) this.snapshots.delete(previous);
    const snapshot = { snapshotId: randomUUID(), instanceId, path, className, source,
      sha256: sourceHash(source), inspectedAt: new Date().toISOString() };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.latestByInstance.set(instanceId, snapshot.snapshotId);
    while (this.snapshots.size > SNAPSHOT_LIMIT) {
      const oldest = this.snapshots.keys().next().value;
      const evicted = this.snapshots.get(oldest);
      this.snapshots.delete(oldest);
      if (this.latestByInstance.get(evicted.instanceId) === oldest) this.latestByInstance.delete(evicted.instanceId);
    }
    return this.metadata(snapshot);
  }

  metadata(snapshot) {
    const { snapshotId, instanceId, path, className, sha256, inspectedAt } = snapshot;
    return { snapshotId, instanceId, path, className, sha256, inspectedAt };
  }

  listObservations() { return [...this.snapshots.values()].map(snapshot => this.metadata(snapshot)); }

  readObservation(id) {
    const snapshot = this.snapshots.get(requireString(id, 'snapshotId', 100));
    if (!snapshot) throw new InputError('Observation not found or expired', 404);
    return { ...this.metadata(snapshot), source: snapshot.source };
  }

  inspectStructure(input) {
    try { return this.structures.inspect(input, randomUUID); }
    catch (error) { throw new InputError(error.message); }
  }

  listStructures() { return this.structures.list(); }

  readStructure(id) {
    const result = this.structures.read(requireString(id, 'structureId', 100));
    if (!result) throw new InputError('Structure observation not found or expired', 404);
    return result;
  }

  proposeScopedEdit(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new InputError('Expected scoped edit object');
    }
    const snapshotId = requireString(input.snapshotId, 'snapshotId', 100);
    const beforeText = requireString(input.beforeText, 'beforeText', 16 * 1024);
    const afterText = requireString(input.afterText, 'afterText', 16 * 1024, { allowEmpty: true });
    const expectedSha256 = requireString(input.expectedSha256, 'expectedSha256', 64);
    const rationale = requireString(input.rationale, 'rationale', 1000);
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot || this.latestByInstance.get(snapshot.instanceId) !== snapshotId) {
      throw new InputError('Stale or missing observation; inspect again', 409);
    }
    if (snapshot.sha256 !== expectedSha256) throw new InputError('Source hash mismatch; inspect again', 409);
    const first = snapshot.source.indexOf(beforeText);
    if (first === -1) throw new InputError('Exact text not present in inspected source', 409);
    if (snapshot.source.indexOf(beforeText, first + 1) !== -1) {
      throw new InputError('Exact text occurs more than once; include more context', 409);
    }
    const newSource = snapshot.source.slice(0, first) + afterText +
      snapshot.source.slice(first + beforeText.length);
    return this.propose({ snapshotId, expectedSha256, newSource, rationale, kind: 'scoped' });
  }

  propose(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InputError('Expected proposal object');
    const snapshotId = requireString(input.snapshotId, 'snapshotId', 100);
    const expectedSha256 = requireString(input.expectedSha256, 'expectedSha256', 64);
    const newSource = requireString(input.newSource, 'newSource', SOURCE_LIMIT, { allowEmpty: true });
    const rationale = requireString(input.rationale, 'rationale', 1000);
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot || this.latestByInstance.get(snapshot.instanceId) !== snapshotId) {
      throw new InputError('Stale or missing observation; inspect again', 409);
    }
    if (snapshot.sha256 !== expectedSha256) throw new InputError('Source hash mismatch; inspect again', 409);
    if (snapshot.source === newSource) throw new InputError('No source change proposed');
    for (const proposal of this.proposals.values()) {
      if (proposal.snapshotId === snapshotId && proposal.status === 'pending') {
        throw new InputError('A proposal is already awaiting review', 409);
      }
    }
    const proposal = { id: randomUUID(), snapshotId, instanceId: snapshot.instanceId,
      path: snapshot.path, expectedSha256, newSource, rationale,
      kind: input.kind === 'scoped' ? 'scoped' : 'replacement', status: 'pending', createdAt: new Date().toISOString() };
    this.proposals.set(proposal.id, proposal);
    while (this.proposals.size > PROPOSAL_LIMIT) this.proposals.delete(this.proposals.keys().next().value);
    return this.proposalMetadata(proposal);
  }

  proposalMetadata(proposal) {
    const { id, snapshotId, instanceId, path, expectedSha256, rationale, kind, status, createdAt, resultNote } = proposal;
    return { id, snapshotId, instanceId, path, expectedSha256, rationale, kind, status, createdAt, ...(resultNote ? { resultNote } : {}) };
  }

  pendingFor(instanceId) {
    requireString(instanceId, 'instanceId', 100);
    const pending = [...this.proposals.values()].find(p => p.instanceId === instanceId && p.status === 'pending');
    return pending ? { ...this.proposalMetadata(pending), newSource: pending.newSource } : null;
  }

  proposalStatus(id) {
    const p = this.proposals.get(requireString(id, 'proposalId', 100));
    if (!p) throw new InputError('Proposal not found or expired', 404);
    return this.proposalMetadata(p);
  }

  finishProposal(id, input) {
    const p = this.proposals.get(requireString(id, 'proposalId', 100));
    if (!p) throw new InputError('Proposal not found', 404);
    if (p.status !== 'pending') throw new InputError('Proposal is no longer pending', 409);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InputError('Expected decision object');
    const snapshotId = requireString(input.snapshotId, 'snapshotId', 100);
    if (p.snapshotId !== snapshotId) throw new InputError('Decision targets a different observation', 409);
    const outcome = requireString(input.outcome, 'outcome', 20);
    if (!['applied', 'rejected', 'stale', 'failed'].includes(outcome)) throw new InputError('Unsupported outcome');
    const note = requireString(input.note ?? '', 'note', 500, { allowEmpty: true });
    p.status = outcome === 'applied' ? 'studio_reported_applied' : outcome;
    p.resultNote = note;
    p.completedAt = new Date().toISOString();
    return this.proposalMetadata(p);
  }
}
