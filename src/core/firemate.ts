import type { Firestore } from 'firebase/firestore';
import type { FireMateOptions } from '../types/firemate.types.js';
import { Collection } from './collection.js';
import { BatchWriter, runFireMateTransaction, type FireMateTransaction } from './batch.js';

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

  /**
   * Execute a batch of write operations. Auto-chunks if > 500.
   *
   * @example
   * ```ts
   * await db.batch(b => {
   *   b.set(users, 'id1', { name: 'Alice' });
   *   b.update(users, 'id2', { active: false });
   *   b.delete(users, 'id3');
   * });
   * ```
   */
  async batch(callback: (batch: BatchWriter) => void): Promise<void> {
    const batchWriter = new BatchWriter(this.firestore, this.options);
    callback(batchWriter);
    await batchWriter.commit();
  }

  /**
   * Run a Firestore transaction with simplified API.
   *
   * @example
   * ```ts
   * await db.transaction(async (tx) => {
   *   const sender = await tx.get(users, senderId);
   *   const receiver = await tx.get(users, receiverId);
   *   tx.update(users, senderId, { balance: sender.balance - 100 });
   *   tx.update(users, receiverId, { balance: receiver.balance + 100 });
   * });
   * ```
   */
  async transaction<R>(callback: (tx: FireMateTransaction) => Promise<R>): Promise<R> {
    return runFireMateTransaction<R>(this.firestore, callback);
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
