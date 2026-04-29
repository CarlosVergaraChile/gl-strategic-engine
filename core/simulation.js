// core/simulation.js
// Monte Carlo Probabilistic Intelligence Engine

function randomNormal() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export const Distributions = {
    normal: (mean, stdDev) => mean + stdDev * randomNormal(),
    logNormal: (mean, stdDev) => {
        if (mean <= 0) return 0;
        const varNormal = (stdDev / mean) * (stdDev / mean);
        const mu = Math.log(mean / Math.sqrt(1 + varNormal));
        const sigma = Math.sqrt(Math.log(1 + varNormal));
        return Math.exp(mu + sigma * randomNormal());
    },
    triangular: (min, mode, max) => {
        const u = Math.random();
        const f = (mode - min) / (max - min);
        if (u < f) {
            return min + Math.sqrt(u * (max - min) * (mode - min));
        } else {
            return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
        }
    },
    betaPert: (min, mode, max) => {
        const mean = (min + 4 * mode + max) / 6;
        const stdDev = (max - min) / 6;
        let val = mean + stdDev * randomNormal();
        return Math.max(min, Math.min(max, val));
    }
};

function sampleValue(inputConfig, baseValue) {
    if (!inputConfig || !inputConfig.distribution) return baseValue;
    const { type, min, mode, max, mean, stdDev } = inputConfig.distribution;
    try {
        switch(type) {
            case 'normal': return Distributions.normal(mean !== undefined ? mean : baseValue, stdDev);
            case 'logNormal': return Distributions.logNormal(mean !== undefined ? mean : baseValue, stdDev);
            case 'triangular': return Distributions.triangular(min !== undefined ? min : inputConfig.min, mode !== undefined ? mode : baseValue, max !== undefined ? max : inputConfig.max);
            case 'betaPert': return Distributions.betaPert(min !== undefined ? min : inputConfig.min, mode !== undefined ? mode : baseValue, max !== undefined ? max : inputConfig.max);
            default: return baseValue;
        }
    } catch(e) {
        return baseValue;
    }
}

/**
 * Executes a Monte Carlo simulation.
 * @param {Function} modelFn - The causal graph model function from the chassis.
 * @param {Object} inputsConfig - The chassis inputs object containing distribution configs.
 * @param {Object} baseState - The current state to simulate around.
 * @param {Number} iterations - Number of simulation loops.
 * @returns {Object} The virtual nodes (P10, P50, P90, P(EBITDA<0)) to be injected into the state.
 */
export function runMonteCarlo(modelFn, inputsConfig, baseState, iterations = 1000) {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
        // Sample state
        const sampledState = { ...baseState };
        if (inputsConfig) {
            // Note: In Health vertical, it's called 'levers', in others it's 'inputs'
            const configObj = Array.isArray(inputsConfig) ? 
                inputsConfig.reduce((acc, curr) => ({...acc, [curr.key]: curr}), {}) : 
                inputsConfig;

            Object.keys(sampledState).forEach(key => {
                if (configObj[key]) {
                    sampledState[key] = sampleValue(configObj[key], sampledState[key]);
                }
            });
        }

        // Run model (single pass is usually enough for EBITDA calculation if formulas are ordered, 
        // but StrategicEngine usually iterates. Here we just run the model once per MC iteration 
        // for performance, assuming causal graph converges fast or is directed acyclic for EBITDA).
        // To be completely accurate to engine.js, we should iterate until stable, but for 1000 MC loops 
        // a fixed pass (e.g., 3 loops) or a single pass if DAG is best. 
        // We'll do a simple 3-loop convergence for each MC iteration to ensure stability.
        let mcState = { ...sampledState };
        for (let j = 0; j < 3; j++) {
            mcState = modelFn(mcState);
        }
        
        results.push(mcState.ebitda || 0);
    }

    results.sort((a, b) => a - b);
    
    const p10Index = Math.floor(iterations * 0.10);
    const p50Index = Math.floor(iterations * 0.50);
    const p90Index = Math.floor(iterations * 0.90);

    const negativeCount = results.filter(v => v < 0).length;

    return {
        ebitda_p10: results[p10Index],
        ebitda_p50: results[p50Index],
        ebitda_p90: results[p90Index],
        probabilidad_perdida: (negativeCount / iterations) * 100
    };
}
