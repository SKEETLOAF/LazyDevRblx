// A deliberately small, read-only structural evidence format.
// It never transports Lua source, arbitrary Instance property values, or binary assets.
export const NODE_LIMIT = 128;
export const MAX_TREE_DEPTH = 4;
const STRUCTURE_LIMIT = 25;

const TYPES = {
  Anchored: 'boolean', CanCollide: 'boolean', Visible: 'boolean', Enabled: 'boolean',
  Transparency: 'number', BackgroundTransparency: 'number', ZIndex: 'number',
  Material: 'string', Size: 'vector', Position: 'vector', Color: 'vector',
  GuiSize: 'udim2', GuiPosition: 'udim2',
};
const isObject = o => o !== null && typeof o === 'object' && !Array.isArray(o);
const boundedString = (v, length) => typeof v === 'string' && v.length > 0 && v.length <= length;
const finite = v => typeof v === 'number' && Number.isFinite(v);

function checkProperty(key, value) {
  switch (TYPES[key]) {
    case 'boolean': return typeof value === 'boolean';
    case 'number': return finite(value) && (key !== 'ZIndex' || Number.isInteger(value));
    case 'string': return boundedString(value, 80);
    case 'vector': return Array.isArray(value) && value.length === 3 && value.every(finite);
    case 'udim2': return isObject(value) &&
      Object.keys(value).sort().join(',') === 'xOffset,xScale,yOffset,yScale' &&
      Object.values(value).every(finite);
    default: return false;
  }
}
function invalid(message) { throw new TypeError(message); }

export function normalizeStructure(input) {
  if (!isObject(input)) invalid('Expected structure observation object');
  if ('source' in input) invalid('Source is forbidden in structural inspections');
  if (!boundedString(input.rootPath, 600)) invalid('rootPath must be 1-600 characters');
  if (!Array.isArray(input.nodes) || input.nodes.length < 1 || input.nodes.length > NODE_LIMIT) {
    invalid('Structure must contain 1-128 nodes');
  }
  if (typeof input.truncated !== 'boolean') invalid('truncated must be boolean');
  const nodes = [];
  for (const [index, original] of input.nodes.entries()) {
    if (!isObject(original) || 'source' in original || 'Source' in original) {
      invalid('Nodes must not contain script source');
    }
    if (original.id !== index || !Number.isInteger(original.depth) ||
        original.depth < 0 || original.depth > MAX_TREE_DEPTH) {
      invalid('Nodes require sequential ids and depth 0-4');
    }
    if (!boundedString(original.path, 600) || !boundedString(original.name, 200) ||
        !boundedString(original.className, 80)) invalid('Invalid node identity');
    if (index === 0) {
      if (original.parentId != null || original.depth !== 0 || original.path !== input.rootPath) {
        invalid('Invalid structure root');
      }
    } else {
      if (!Number.isInteger(original.parentId) || original.parentId < 0 ||
          original.parentId >= index || nodes[original.parentId].depth + 1 !== original.depth) {
        invalid('Invalid structure parent relationship');
      }
    }
    // Roblox HttpService:JSONEncode({}) serializes an empty dictionary as [].
    // Accept only that zero-length array as an empty property object.
    const rawProps = Array.isArray(original.properties) && original.properties.length === 0
      ? {} : original.properties;
    if (!isObject(rawProps)) invalid('Node properties must be a simple object');
    if (Object.keys(rawProps).length > 14) invalid('Too many node properties');
    const properties = {};
    for (const [key, value] of Object.entries(rawProps)) {
      if (!checkProperty(key, value)) invalid('Unsupported or invalid property: ' + key);
      properties[key] = value;
    }
    nodes.push({ id: index, parentId: index === 0 ? null : original.parentId, depth: original.depth,
      name: original.name, className: original.className, path: original.path, properties });
  }
  return { rootPath: input.rootPath, truncated: input.truncated, nodes };
}

export class StructureStore {
  constructor() { this.observations = new Map(); this.latestByPath = new Map(); }

  inspect(input, randomUUID) {
    const normalized = normalizeStructure(input);
    const observation = { structureId: randomUUID(),
      ...normalized, inspectedAt: new Date().toISOString() };
    this.observations.set(observation.structureId, observation);
    this.latestByPath.set(observation.rootPath, observation.structureId);
    while (this.observations.size > STRUCTURE_LIMIT) {
      const oldId = this.observations.keys().next().value;
      const old = this.observations.get(oldId);
      this.observations.delete(oldId);
      if (this.latestByPath.get(old.rootPath) === oldId) this.latestByPath.delete(old.rootPath);
    }
    return this.metadata(observation);
  }

  metadata(observation) {
    const { structureId, rootPath, truncated, inspectedAt, nodes } = observation;
    return { structureId, rootPath, truncated, inspectedAt, nodeCount: nodes.length };
  }

  isLatest(id) {
    const observation = this.observations.get(id);
    return Boolean(observation && this.latestByPath.get(observation.rootPath) === id);
  }

  list() { return [...this.observations.values()].map(o => this.metadata(o)); }
  read(id) {
    const observation = this.observations.get(id);
    if (!observation) return null;
    return { ...this.metadata(observation), nodes: observation.nodes };
  }
}
