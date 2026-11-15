import { randomUUID } from 'node:crypto';
import { normalizeDiagnostics } from './diagnostics.mjs';

// A bounded, explicit result of a user-initiated StudioTestService session.
// "returned" means the Studio Test API returned, NEVER "tests passed".
const RUN_MODES = new Set(['play', 'run']);
const RETURN_STATES = new Set(['returned', 'start_error']);
const HISTORY_SCOPES = new Set(['new_suffix', 'unfiltered_history']);
const LIMIT = 20;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export class PlaytestInputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
function invalid(message) { throw new PlaytestInputError(message); }
function timestamp(value) {
  return typeof value === 'number' && Number.isFinite(value) &&
    Number.isInteger(value) && value >= 0 && value <= 1e12;
}

export function normalizePlaytestReport(input) {
  if (!isObject(input) || input.kind !== 'studio_playtest') invalid('Expected Studio playtest report');
  const fields = 'endedAt,entries,historyScope,kind,mode,returnState,startedAt,truncated';
  if (Object.keys(input).sort().join(',') !== fields) invalid('Unexpected playtest report fields');
  if (!RUN_MODES.has(input.mode)) invalid('Only Play or Run mode can be reported');
  if (!RETURN_STATES.has(input.returnState)) invalid('Invalid test completion state');
  if (!HISTORY_SCOPES.has(input.historyScope)) invalid('Invalid Output coverage');
  if (!timestamp(input.startedAt) || !timestamp(input.endedAt) ||
      input.endedAt < input.startedAt || input.endedAt - input.startedAt > 4 * 60 * 60) {
    invalid('Invalid test time window');
  }
  let messages;
  try {
    messages = normalizeDiagnostics({
      kind: 'studio_output', capturedTimestamp: input.endedAt,
      truncated: input.truncated, entries: input.entries,
    });
  } catch (error) {
    invalid(error.message);
  }
  return {
    kind: 'studio_playtest', mode: input.mode, returnState: input.returnState,
    startedAt: input.startedAt, endedAt: input.endedAt,
    durationSeconds: input.endedAt - input.startedAt,
    historyScope: input.historyScope,
    truncated: messages.truncated,
    entries: messages.entries,
  };
}

export class PlaytestStore {
  constructor() { this.reports = new Map(); }
  inspect(input) {
    const normalized = normalizePlaytestReport(input);
    const result = {
      playtestId: randomUUID(), ...normalized, capturedAt: new Date().toISOString(),
    };
    this.reports.set(result.playtestId, result);
    while (this.reports.size > LIMIT) {
      this.reports.delete(this.reports.keys().next().value);
    }
    return this.metadata(result);
  }
  metadata(p) {
    return {
      playtestId: p.playtestId, kind: p.kind, capturedAt: p.capturedAt,
      mode: p.mode, returnState: p.returnState, startedAt: p.startedAt,
      endedAt: p.endedAt, durationSeconds: p.durationSeconds,
      historyScope: p.historyScope, truncated: p.truncated,
      entryCount: p.entries.length,
      warningCount: p.entries.filter(e => e.type === 'MessageWarning').length,
      errorCount: p.entries.filter(e => e.type === 'MessageError').length,
      verdict: 'not_assessed',
    };
  }
  list() { return [...this.reports.values()].map(p => this.metadata(p)); }
  read(id) {
    const p = this.reports.get(id);
    if (!p) throw new PlaytestInputError('Playtest report missing or expired', 404);
    return { ...this.metadata(p), entries: p.entries.map(e => ({ ...e })) };
  }
}
