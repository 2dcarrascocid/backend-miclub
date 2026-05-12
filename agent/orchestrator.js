import crypto from 'crypto';
import { createLogger } from './logger.js';
import { createArtifactStore } from './artifacts.js';

export class Orchestrator {
  #taskName;
  #traceId;
  #log;
  #artifacts;
  #stepCount;

  constructor(taskName, { traceId } = {}) {
    this.#taskName = taskName;
    this.#traceId = traceId ?? crypto.randomUUID();
    this.#log = createLogger({ taskName, traceId: this.#traceId, layer: 'orchestrator' });
    this.#artifacts = createArtifactStore(this.#traceId);
    this.#stepCount = 0;
    this.#log.info('Task started', { taskName });
  }

  get traceId() { return this.#traceId; }
  get log() { return this.#log; }

  async run(specialistFn, { skill, input, validate } = {}) {
    const stepId = ++this.#stepCount;
    const stepLog = this.#log.child({ skill, stepId });
    stepLog.info('Step started');

    const start = Date.now();

    try {
      const output = await specialistFn(input);

      if (validate) {
        const result = await validate(output);
        if (!result.valid) {
          const errors = result.errors?.join(', ') ?? 'validation failed';
          throw new ValidationError(`[${skill}] ${errors}`);
        }
        this.#artifacts.record({ type: 'validation', skill, input, output: result, metadata: { stepId } });
      }

      const durationMs = Date.now() - start;
      this.#artifacts.record({ type: 'step', skill, input, output, metadata: { stepId, durationMs } });
      stepLog.info('Step completed', { durationMs });
      return output;

    } catch (err) {
      this.#artifacts.record({ type: 'error', skill, input, output: { error: err.message }, metadata: { stepId } });
      stepLog.error('Step failed', { error: err.message });
      throw err;
    }
  }

  complete({ task, status = 'COMPLETED', changes, validationResults, recommendations } = {}) {
    const artifact = this.#artifacts.toTaskArtifact({
      task: task ?? this.#taskName,
      status,
      changes,
      validationResults,
      recommendations,
    });
    this.#log.info('Task completed', { status, totalSteps: this.#stepCount });
    return artifact;
  }

  getEvidence() {
    return this.#artifacts.getSummary();
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function createOrchestrator(taskName, options = {}) {
  return new Orchestrator(taskName, options);
}
