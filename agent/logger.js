import crypto from 'crypto';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const LOG_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

export class Logger {
  constructor(context = {}) {
    this.context = context;
    this.traceId = context.traceId ?? crypto.randomUUID();
  }

  _emit(level, message, data = {}) {
    if (LEVELS[level] < LOG_LEVEL) return null;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      traceId: this.traceId,
      ...this.context,
      message,
      ...data,
    };

    const output = JSON.stringify(entry);
    if (level === 'error') {
      console.error(output);
    } else {
      console.log(output);
    }
    return entry;
  }

  debug(msg, data) { return this._emit('debug', msg, data); }
  info(msg, data) { return this._emit('info', msg, data); }
  warn(msg, data) { return this._emit('warn', msg, data); }
  error(msg, data) { return this._emit('error', msg, data); }

  child(extraContext) {
    return new Logger({ ...this.context, ...extraContext, traceId: this.traceId });
  }
}

export function createLogger(context = {}) {
  return new Logger(context);
}

export function traceIdFromEvent(event) {
  return (
    event?.headers?.['x-trace-id'] ||
    event?.headers?.['X-Trace-Id'] ||
    crypto.randomUUID()
  );
}
