/**
 * Minimal directed acyclic dependency evaluator.
 * Graph edges are explicit input -> output relationships, not inferred causality.
 * Rejects cycles, undefined dependencies, name collisions and nonfinite results.
 */
export function evaluateGraph({inputs, nodes, dependencies}) {
  if (!inputs || !nodes || !dependencies) throw new TypeError("inputs, nodes, dependencies required");
  const state = {...inputs}, done = new Set(), visiting = new Set();
  for (const [key, val] of Object.entries(inputs)) if (!Number.isFinite(val)) throw new RangeError("invalid input "+key);
  function compute(key) {
    if (Object.hasOwn(state,key)) return state[key];
    const node = nodes[key];
    if (typeof node !== "function") throw new Error("missing node: "+key);
    if (visiting.has(key)) throw new Error("dependency cycle: "+key);
    visiting.add(key);
    const req = dependencies[key];
    if (!Array.isArray(req)) throw new Error("dependencies missing for "+key);
    for (const dep of req) {
      if (!Object.hasOwn(state,dep)) compute(dep);
    }
    const value=node(Object.freeze({...state}));
    if (!Number.isFinite(value)) throw new RangeError("nonfinite node: "+key);
    state[key]=value;
    visiting.delete(key);
    done.add(key);
    return value;
  }
  for (const key of Object.keys(nodes)) {
    if (Object.hasOwn(inputs,key)) throw new Error("node collides with input: "+key);
    compute(key);
  }
  return state;
}
