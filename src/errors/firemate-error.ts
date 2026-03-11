export class FireMateError extends Error {
  readonly code: string;
  readonly path?: string;

  constructor(code: string, message: string, path?: string) {
    super(message);
    this.name = 'FireMateError';
    this.code = code;
    this.path = path;
  }
}

export class NotFoundError extends FireMateError {
  constructor(path: string) {
    super('not-found', `Document not found at path: ${path}`, path);
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends FireMateError {
  constructor(path: string, originalMessage?: string) {
    super(
      'permission-denied',
      originalMessage ?? `Permission denied for path: ${path}`,
      path,
    );
    this.name = 'PermissionError';
  }
}

export class BatchLimitError extends FireMateError {
  constructor(count: number) {
    super(
      'batch-limit',
      `Batch operation exceeds the 500 limit with ${count} operations. Use auto-chunking methods instead.`,
    );
    this.name = 'BatchLimitError';
  }
}

export class ValidationError extends FireMateError {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super('validation', message);
    this.name = 'ValidationError';
    this.field = field;
  }
}
