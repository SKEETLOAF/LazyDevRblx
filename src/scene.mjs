import { randomUUID } from 'node:crypto';

// Scene mutations are intentionally narrow. No deletion, arbitrary class names,
// scripts, attributes, services, or method invocation is available here.
const CREATE_PARENTS = Object.freeze({
  Folder: ['Workspace', 'Folder', 'Model', 'ServerStorage', 'ReplicatedStorage'],
  Model: ['Workspace', 'Folder', 'Model', 'ServerStorage', 'ReplicatedStorage'],
  Part: ['Workspace', 'Folder', 'Model', 'ServerStorage', 'ReplicatedStorage'],
  ScreenGui: ['StarterGui'],
  Frame: ['ScreenGui', 'Frame'],
  TextLabel: ['ScreenGui', 'Frame'],
});
const MATERIALS = new Set(['Plastic', 'SmoothPlastic', 'Neon', 'Wood', 'Metal',
  'Glass', 'Concrete', 'Slate', 'Fabric', 'Grass', 'Sand', 'Brick', 'ForceField']);
const PROPERTY_CLASSES = Object.freeze({
  Anchored: ['Part'], CanCollide: ['Part'], Position: ['Part'], Size: ['Part'],
  Color: ['Part'], Material: ['Part'], Transparency: ['Part'],
  Enabled: ['ScreenGui'], Visible: ['Frame', 'TextLabel'],
  GuiSize: ['Frame', 'TextLabel'], GuiPosition: ['Frame', 'TextLabel'],
  ZIndex: ['Frame', 'TextLabel'], BackgroundTransparency: ['Frame', 'TextLabel'],
});
const STATUS = new Set(['applied', 'rejected', 'stale', 'failed']);
const LIMIT = 100;
const obj = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function invalid(message) { throw new SceneInputError(message); }

export class SceneInputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
function str(value, name, length = 1000) {
  if (typeof value !== 'string' || !value.trim() || value.length > length) {
    invalid(name + ' must be a nonempty bounded string');
  }
  return value;
}
function validateValue(property, value) {
  if (['Anchored', 'CanCollide', 'Enabled', 'Visible'].includes(property)) {
    return typeof value === 'boolean';
  }
  if (['Transparency', 'BackgroundTransparency'].includes(property)) {
    return finite(value) && value >= 0 && value <= 1;
  }
  if (property === 'ZIndex') return Number.isInteger(value) && value >= 0 && value <= 1000;
  if (property === 'Material') return typeof value === 'string' && MATERIALS.has(value);
  if (['Position', 'Size', 'Color'].includes(property)) {
    if (!Array.isArray(value) || value.length !== 3 || !value.every(finite)) return false;
    if (property === 'Color') return value.every(n => n >= 0 && n <= 1);
    if (property === 'Size') return value.every(n => n >= 0.05 && n <= 2048);
    return value.every(n => Math.abs(n) <= 100000);
  }
  if (['GuiSize', 'GuiPosition'].includes(property)) {
    if (!obj(value) || Object.keys(value).sort().join(',') !==
      'xOffset,xScale,yOffset,yScale' || !Object.values(value).every(finite)) return false;
    return Math.abs(value.xScale) <= 100 && Math.abs(value.yScale) <= 100 &&
      Math.abs(value.xOffset) <= 100000 && Math.abs(value.yOffset) <= 100000;
  }
  return false;
}

export function normalizeSceneAction(input, observation) {
  if (!obj(input)) invalid('Expected scene action object');
  if (!observation) throw new SceneInputError('Structure observation missing or expired', 409);
  if (input.structureId !== observation.structureId) {
    throw new SceneInputError('Structure observation mismatch', 409);
  }
  const action = str(input.action, 'action', 30);
  const rationale = str(input.rationale, 'rationale', 1000);
  const targetNodeId = input.targetNodeId;
  if (!Number.isInteger(targetNodeId) || targetNodeId < 0 ||
      targetNodeId >= observation.nodes.length) invalid('Target must be an observed node id');
  const node = observation.nodes[targetNodeId];
  if (action === 'create_child') {
    const className = str(input.className, 'className', 40);
    const name = str(input.name, 'name', 64);
    if (!/^[A-Za-z_][A-Za-z0-9_ -]*$/.test(name)) {
      invalid('Name must start with a letter or underscore, and contain only letters, numbers, spaces, underscores or hyphens');
    }
    if (!CREATE_PARENTS[className]?.includes(node.className)) {
      invalid('Class cannot be created under this parent class');
    }
    if (Object.hasOwn(input, 'property') || Object.hasOwn(input, 'value')) {
      invalid('Creation and property edits must be separate proposals');
    }
    return { structureId: input.structureId, action, targetNodeId, path: node.path,
      targetClass: node.className, className, name, rationale,
      expectedProperties: structuredClone(node.properties) };
  }
  if (action === 'set_property') {
    const property = str(input.property, 'property', 50);
    if (!PROPERTY_CLASSES[property]?.includes(node.className) ||
        !Object.hasOwn(node.properties, property)) {
      invalid('Property is not editable on this observed class');
    }
    if (!validateValue(property, input.value)) invalid('Invalid or unsafe property value');
    if (equal(input.value, node.properties[property])) invalid('No property change proposed');
    if (Object.hasOwn(input, 'className') || Object.hasOwn(input, 'name')) {
      invalid('Property changes cannot create objects');
    }
    return { structureId: input.structureId, action, targetNodeId, path: node.path,
      targetClass: node.className, property, beforeValue: structuredClone(node.properties[property]),
      value: structuredClone(input.value), rationale,
      expectedProperties: structuredClone(node.properties) };
  }
  invalid('Only create_child and set_property are supported');
}

export class SceneProposalStore {
  constructor(structureStore) {
    this.structures = structureStore;
    this.proposals = new Map();
  }
  propose(input) {
    if (!obj(input)) invalid('Expected scene action object');
    if (!this.structures.isLatest(input.structureId)) {
      throw new SceneInputError('Structure is stale or missing; re-inspect in Studio', 409);
    }
    const action = normalizeSceneAction(input, this.structures.read(input.structureId));
    if ([...this.proposals.values()].some(p => p.structureId === action.structureId && p.status === 'pending')) {
      throw new SceneInputError('An Instance action is already awaiting approval', 409);
    }
    const proposal = { id: randomUUID(), ...action, status: 'pending', createdAt: new Date().toISOString() };
    this.proposals.set(proposal.id, proposal);
    while (this.proposals.size > LIMIT) this.proposals.delete(this.proposals.keys().next().value);
    return this.metadata(proposal);
  }
  metadata(proposal) {
    const { expectedProperties, ...metadata } = proposal;
    return structuredClone(metadata);
  }
  pending(structureId) {
    str(structureId, 'structureId', 100);
    if (!this.structures.isLatest(structureId)) return null;
    const proposal = [...this.proposals.values()].find(p => p.structureId === structureId && p.status === 'pending');
    return proposal ? structuredClone(proposal) : null;
  }
  status(id) {
    const proposal = this.proposals.get(str(id, 'proposalId', 100));
    if (!proposal) throw new SceneInputError('Scene proposal not found', 404);
    return this.metadata(proposal);
  }
  finish(id, input) {
    const proposal = this.proposals.get(str(id, 'proposalId', 100));
    if (!proposal) throw new SceneInputError('Scene proposal not found', 404);
    if (proposal.status !== 'pending') throw new SceneInputError('Scene proposal is not pending', 409);
    if (!obj(input) || input.structureId !== proposal.structureId) {
      throw new SceneInputError('Decision belongs to a different structure', 409);
    }
    if (!STATUS.has(input.outcome)) invalid('Unsupported outcome');
    if (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 500)) {
      invalid('Invalid decision note');
    }
    // The proposal can no longer be applied once Studio reports stale inspection.
    if (input.outcome === 'applied' && !this.structures.isLatest(proposal.structureId)) {
      throw new SceneInputError('Structure has been re-inspected; action is stale', 409);
    }
    proposal.status = input.outcome === 'applied' ? 'studio_reported_applied' : input.outcome;
    proposal.resultNote = input.note ?? '';
    proposal.completedAt = new Date().toISOString();
    return this.metadata(proposal);
  }
}
