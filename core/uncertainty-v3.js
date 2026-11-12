/**
 * Reproducible, metric-agnostic Monte Carlo core (experimental).
 * No domain concepts or UI dependencies.
 */
function seededRandom(seed) {
  if (!Number.isInteger(seed)) throw new TypeError("seed must be an integer");
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
function normal(rng) {
  const a = Math.max(rng(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * rng());
}
function draw(def, rng) {
  if (!def || typeof def !== "object") throw new TypeError("invalid distribution");
  if (def.type === "fixed") {
    if (!Number.isFinite(def.value)) throw new RangeError("invalid fixed value");
    return def.value;
  }
  if (def.type === "normal") {
    if (!Number.isFinite(def.mean) || !Number.isFinite(def.stdDev) || def.stdDev < 0) {
      throw new RangeError("invalid normal parameters");
    }
    return def.mean + def.stdDev * normal(rng);
  }
  if (def.type === "triangular") {
    const { min, mode, max } = def;
    if (![min, mode, max].every(Number.isFinite) || !(min <= mode && mode <= max)) {
      throw new RangeError("invalid triangular bounds");
    }
    if (min === max) return min;
    const u = rng(), k = (mode - min) / (max - min);
    return u < k ? min + Math.sqrt(u * (max - min) * (mode - min))
      : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
  throw new RangeError("unknown distribution: " + def.type);
}
function quantile(sorted, p) {
  const x = (sorted.length - 1) * p, lo = Math.floor(x), hi = Math.ceil(x);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (x - lo);
}
/**
 * @param {object} options
 * @param {(inputs:object)=>object} options.model pure model function
 * @param {object} options.baseInputs starting values
 * @param {object} options.distributions input key to distribution
 * @param {(output:object)=>number} options.selectMetric explicit output metric
 * @param {number} options.seed deterministic seed
 * @param {number} options.iterations Monte Carlo trials (1..100000)
 * @param {number} options.lossThreshold explicit metric threshold
 */
export function runUncertainty({
  model, baseInputs, distributions = {}, selectMetric,
  seed = 1, iterations = 1000, lossThreshold = 0,
}) {
  if (typeof model !== "function" || typeof selectMetric !== "function") {
    throw new TypeError("model and selectMetric are required functions");
  }
  if (!baseInputs || typeof baseInputs !== "object" || Array.isArray(baseInputs)) {
    throw new TypeError("baseInputs must be an object");
  }
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 100000) {
    throw new RangeError("iterations must be 1..100000");
  }
  if (!Number.isFinite(lossThreshold)) throw new RangeError("invalid lossThreshold");
  const rng = seededRandom(seed);
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const inputs = { ...baseInputs };
    for (const [key, config] of Object.entries(distributions)) {
      if (!Object.hasOwn(inputs, key)) throw new RangeError("unknown input: " + key);
      inputs[key] = draw(config, rng);
    }
    const value = selectMetric(model(inputs));
    if (!Number.isFinite(value)) throw new RangeError("model returned non-finite metric at iteration " + i);
    samples.push(value);
  }
  samples.sort((a, b) => a - b);
  const belowThreshold = samples.filter(v => v < lossThreshold).length;
  return {
    seed, iterations, lossThreshold,
    p10: quantile(samples, .10), p50: quantile(samples, .50), p90: quantile(samples, .90),
    mean: samples.reduce((a, b) => a + b, 0) / samples.length,
    probabilityBelowThreshold: belowThreshold / iterations,
    limitations: "Distribution assumptions, model validity and independence must be assessed separately.",
  };
}
