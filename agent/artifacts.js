import crypto from 'crypto';

export class ArtifactStore {
  #traceId;
  #entries;

  constructor(traceId) {
    this.#traceId = traceId ?? crypto.randomUUID();
    this.#entries = [];
  }

  record({ type, skill, input = null, output = null, metadata = {} }) {
    const artifact = {
      id: crypto.randomUUID(),
      traceId: this.#traceId,
      type,
      skill,
      timestamp: new Date().toISOString(),
      input,
      output,
      metadata,
    };
    this.#entries.push(artifact);
    return artifact;
  }

  getAll() {
    return [...this.#entries];
  }

  getSummary() {
    return {
      traceId: this.#traceId,
      totalSteps: this.#entries.length,
      skills: [...new Set(this.#entries.map((e) => e.skill).filter(Boolean))],
      types: [...new Set(this.#entries.map((e) => e.type))],
      hasErrors: this.#entries.some((e) => e.type === 'error'),
      timeline: this.#entries.map(({ id, type, skill, timestamp }) => ({
        id,
        type,
        skill,
        timestamp,
      })),
    };
  }

  toTaskArtifact({ task, status, changes = {}, validationResults = {}, recommendations = [] }) {
    return {
      taskId: `task-${Date.now()}`,
      traceId: this.#traceId,
      timestamp: new Date().toISOString(),
      task,
      status,
      orchestrator: 'agent_orchestrator',
      execution: {
        specialists: [...new Set(this.#entries.filter((e) => e.skill?.startsWith('specialist')).map((e) => e.skill))],
        validators: [...new Set(this.#entries.filter((e) => e.skill?.startsWith('validator')).map((e) => e.skill))],
        totalSteps: this.#entries.length,
      },
      changes: {
        filesModified: changes.filesModified ?? [],
        filesCreated: changes.filesCreated ?? [],
        filesDeleted: changes.filesDeleted ?? [],
      },
      validationResults,
      recommendations,
    };
  }
}

export function createArtifactStore(traceId) {
  return new ArtifactStore(traceId);
}
