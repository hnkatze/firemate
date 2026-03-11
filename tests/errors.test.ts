import { describe, it, expect } from 'vitest';
import {
  FireMateError,
  NotFoundError,
  PermissionError,
  BatchLimitError,
  ValidationError,
} from '../src/errors/firemate-error.js';

describe('FireMateError', () => {
  it('should create a base error with code and message', () => {
    const error = new FireMateError('test-code', 'Test message', 'users/123');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(FireMateError);
    expect(error.code).toBe('test-code');
    expect(error.message).toBe('Test message');
    expect(error.path).toBe('users/123');
    expect(error.name).toBe('FireMateError');
  });
});

describe('NotFoundError', () => {
  it('should create error with path', () => {
    const error = new NotFoundError('users/123');

    expect(error).toBeInstanceOf(FireMateError);
    expect(error.code).toBe('not-found');
    expect(error.path).toBe('users/123');
    expect(error.message).toContain('users/123');
    expect(error.name).toBe('NotFoundError');
  });
});

describe('PermissionError', () => {
  it('should create error with path', () => {
    const error = new PermissionError('users/123');

    expect(error).toBeInstanceOf(FireMateError);
    expect(error.code).toBe('permission-denied');
    expect(error.path).toBe('users/123');
    expect(error.name).toBe('PermissionError');
  });

  it('should use custom message when provided', () => {
    const error = new PermissionError('users/123', 'Custom denied');

    expect(error.message).toBe('Custom denied');
  });
});

describe('BatchLimitError', () => {
  it('should create error with count', () => {
    const error = new BatchLimitError(600);

    expect(error).toBeInstanceOf(FireMateError);
    expect(error.code).toBe('batch-limit');
    expect(error.message).toContain('600');
    expect(error.name).toBe('BatchLimitError');
  });
});

describe('ValidationError', () => {
  it('should create error with message and optional field', () => {
    const error = new ValidationError('Invalid email', 'email');

    expect(error).toBeInstanceOf(FireMateError);
    expect(error.code).toBe('validation');
    expect(error.message).toBe('Invalid email');
    expect(error.field).toBe('email');
    expect(error.name).toBe('ValidationError');
  });

  it('should work without field', () => {
    const error = new ValidationError('Something wrong');

    expect(error.field).toBeUndefined();
  });
});
