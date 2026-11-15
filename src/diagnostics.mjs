import { randomUUID } from 'node:crypto';

// A deliberately bounded, opt-in copy of Studio Output warnings and errors.
// Read-only and never mistaken for a live playtest/complete Studio log stream.
export const DIAGNOSTIC_LIMIT = 80;
export const DIAGNOSTIC_MESSAGE_LIMIT = 1600;
const SNAPSHOT_LIMIT = 20;
const TYPES = new Set(['MessageWarning', 'MessageError']);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);

export class DiagnosticInputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function invalid(message) { throw new DiagnosticInputError(message); }

export function normalizeDiagnostics(input) {
  if (!isObject(input) || input.kind !== 'studio_output') invalid('Expected Studio Output snapshot');
  if (Object.keys(input).sort().join(',') !== 'capturedTimestamp,entries,kind,truncated') {
    invalid('Unexpected Studio Output snapshot fields');
  }
  if (!Array.isArray(input.entries) || input.entries.length > DIAGNOSTIC_LIMIT) {
    invalid('Only 0-80 warnings/errors are supported');
  }
  if (typeof input.truncated !== 'boolean') invalid('truncated must be a boolean');
  if (!finite(input.capturedTimestamp) || input.capturedTimestamp < 0 ||
    input.capturedTimestamp > 1e12) invalid('Invalid capture timestamp');
  const entries = [];
  for (const original of input.entries) {
    if (!isObject(original) || Object.keys(original).sort().join(',') !==
      'message,timestamp,type') invalid('Entry must contain only message, timestamp and type');
    if (!TYPES.has(original.type)) invalid('Only warning and error logs can be shared');
    if (typeof original.message !== 'string' || !original.message.trim() ||
        Buffer.byteLength(original.message, 'utf8') > DIAGNOSTIC_MESSAGE_LIMIT) {
      invalid('Diagnostic message must be 1-1600 UTF-8 bytes');
    }
    if (!finite(original.timestamp) || original.timestamp < 0 ||
        original.timestamp > 1e12) invalid('Invalid log timestamp');
    entries.push({
      type: original.type, message: original.message, timestamp: original.timestamp,
    });
  }
  return {
    kind: 'studio_output', capturedTimestamp: input.capturedTimestamp,
    truncated: input.truncated, entries,
  };
}

export class DiagnosticsStore {
  constructor() { this.observations = new Map(); }
  inspect(input) {
    const normalized = normalizeDiagnostics(input);
    const observation = {
      diagnosticsId: randomUUID(),
      ...normalized,
      capturedAt: new Date().toISOString(),
    };
    this.observations.set(observation.diagnosticsId, observation);
    while (this.observations.size > SNAPSHOT_LIMIT) {
      this.observations.delete(this.observations.keys().next().value);
    }
    return this.metadata(observation);
  }
  metadata(o) {
    return {
      diagnosticsId: o.diagnosticsId, kind: o.kind, capturedAt: o.capturedAt,
      capturedTimestamp: o.capturedTimestamp, truncated: o.truncated,
      entryCount: o.entries.length,
      warningCount: o.entries.filter(e => e.type === 'MessageWarning').length,
      errorCount: o.entries.filter(e => e.type === 'MessageError').length,
    };
  }
  list() { return [...this.observations.values()].map(o => this.metadata(o)); }
  read(id) {
    const o = this.observations.get(id);
    if (!o) throw new DiagnosticInputError('Diagnostic snapshot not found or expired', 404);
    return { ...this.metadata(o), entries: o.entries.map(e => ({...e})) };
  }
}
