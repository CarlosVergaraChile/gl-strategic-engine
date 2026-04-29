/**
 * GL Strategic Engine - Motor Core
 * Version: 2.1 (Iterative)
 * Provides the simulation loop and state management.
 */

class StrategicEngine {
    constructor(maxIterations = 1000) {
        this.maxIterations = maxIterations;
        this.state = {};
        this.model = null;
    }

    setModel(model) {
        this.model = model;
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
    }

    /**
     * Iterates the causal graph until convergence or max iterations.
     * Convergence is defined as no change in state between iterations.
     */
    iterate(inputs) {
        let currentState = { ...inputs };
        let iterations = 0;
        let stabilized = false;

        while (iterations < this.maxIterations && !stabilized) {
            const nextState = this.model(currentState);
            
            // Check for stability (simple shallow comparison)
            stabilized = Object.keys(nextState).every(key => 
                nextState[key] === currentState[key]
            );

            currentState = { ...nextState };
            iterations++;
        }

        if (iterations === this.maxIterations) {
            console.warn(`Engine: Max iterations (${this.maxIterations}) reached. Possible circular reference detected.`);
        }

        return {
            ...currentState,
            _metadata: {
                iterations,
                stabilized
            }
        };
    }
}

export default StrategicEngine;
