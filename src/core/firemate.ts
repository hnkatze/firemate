import type { Firestore } from 'firebase/firestore';
import type { FireMateOptions } from '../types/firemate.types.js';
import { Collection } from './collection.js';

export class FireMate {
  private readonly firestore: Firestore;
  private readonly options: FireMateOptions;

  constructor(options: FireMateOptions) {
    this.firestore = options.firestore;
    this.options = options;
  }

  /**
   * Get a typed collection reference.
   *
   * @example
   * ```ts
   * const users = db.collection<User>('users');
   * const user = await users.get('userId');
   * ```
   */
  collection<T extends Record<string, unknown>>(path: string): Collection<T> {
    return new Collection<T>(this.firestore, path, this.options);
  }
}

/**
 * Create a new FireMate instance.
 *
 * @example
 * ```ts
 * import { createFireMate } from '@hnkatze/firemate';
 * import { getFirestore } from 'firebase/firestore';
 *
 * const db = createFireMate({
 *   firestore: getFirestore(),
 *   timestamps: true,
 *   idField: 'id',
 * });
 *
 * const users = db.collection<User>('users');
 * ```
 */
export function createFireMate(options: FireMateOptions): FireMate {
  return new FireMate(options);
}
