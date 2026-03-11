import {
  writeBatch,
  doc,
  collection,
  serverTimestamp,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore';

import type { Collection } from './collection.js';
import type { CreateData, UpdateData, FireMateOptions } from '../types/firemate.types.js';

const FIRESTORE_BATCH_LIMIT = 500;

/**
 * Auto-chunking batch writer.
 * Splits operations into chunks of 500 (Firestore limit) automatically.
 */
export class BatchWriter {
  private readonly operations: Array<(batch: WriteBatch, firestore: Firestore) => void> = [];

  constructor(
    private readonly firestore: Firestore,
    private readonly options: FireMateOptions,
  ) {}

  /**
   * Add a set operation to the batch.
   */
  set<T extends Record<string, unknown>>(
    col: Collection<T>,
    id: string,
    data: CreateData<T>,
  ): void {
    this.operations.push((batch, firestore) => {
      const ref = doc(collection(firestore, col.getPath()), id);
      const writeData = this.applyTimestamps(data, 'create');
      batch.set(ref, writeData);
    });
  }

  /**
   * Add an update operation to the batch.
   */
  update<T extends Record<string, unknown>>(
    col: Collection<T>,
    id: string,
    data: UpdateData<T>,
  ): void {
    this.operations.push((batch, firestore) => {
      const ref = doc(collection(firestore, col.getPath()), id);
      const writeData = this.applyTimestamps(data, 'update');
      batch.update(ref, writeData);
    });
  }

  /**
   * Add a delete operation to the batch.
   */
  delete<T extends Record<string, unknown>>(
    col: Collection<T>,
    id: string,
  ): void {
    this.operations.push((batch, firestore) => {
      const ref = doc(collection(firestore, col.getPath()), id);
      batch.delete(ref);
    });
  }

  /**
   * Commit all operations. Auto-chunks if > 500 operations.
   */
  async commit(): Promise<void> {
    const chunks = chunkArray(this.operations, FIRESTORE_BATCH_LIMIT);

    for (const chunk of chunks) {
      const batch = writeBatch(this.firestore);
      for (const op of chunk) {
        op(batch, this.firestore);
      }
      await batch.commit();
    }

    this.options.onWrite?.('batch', `${this.operations.length} operations`);
  }

  get size(): number {
    return this.operations.length;
  }

  private applyTimestamps(
    data: Record<string, unknown>,
    mode: 'create' | 'update',
  ): Record<string, unknown> {
    if (!this.options.timestamps) return { ...data };

    if (mode === 'create') {
      return { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    }
    return { ...data, updatedAt: serverTimestamp() };
  }
}

/**
 * Simplified transaction wrapper.
 */
export async function runFireMateTransaction<R>(
  firestore: Firestore,
  callback: (tx: FireMateTransaction) => Promise<R>,
): Promise<R> {
  const { runTransaction } = await import('firebase/firestore');

  return runTransaction(firestore, async (transaction) => {
    const tx = new FireMateTransaction(firestore, transaction);
    return callback(tx);
  });
}

export class FireMateTransaction {
  constructor(
    private readonly firestore: Firestore,
    private readonly transaction: import('firebase/firestore').Transaction,
  ) {}

  async get<T extends Record<string, unknown>>(
    col: Collection<T>,
    id: string,
    idField: string = 'id',
  ): Promise<(T & { [key: string]: string }) | null> {
    const ref = doc(this.firestore, col.getPath(), id);
    const snap = await this.transaction.get(ref);
    if (!snap.exists()) return null;
    return { ...snap.data(), [idField]: snap.id } as T & { [key: string]: string };
  }

  set<T extends Record<string, unknown>>(
    col: Collection<T>,
    id: string,
    data: CreateData<T>,
  ): void {
    const ref = doc(this.firestore, col.getPath(), id);
    this.transaction.set(ref, data as Record<string, unknown>);
  }

  update<T extends Record<string, unknown>>(
    col: Collection<T>,
    id: string,
    data: UpdateData<T>,
  ): void {
    const ref = doc(this.firestore, col.getPath(), id);
    this.transaction.update(ref, data as Record<string, unknown>);
  }

  delete<T extends Record<string, unknown>>(
    col: Collection<T>,
    id: string,
  ): void {
    const ref = doc(this.firestore, col.getPath(), id);
    this.transaction.delete(ref);
  }
}

// ─── UTILS ────────────────────────────────────────────────

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export { chunkArray, FIRESTORE_BATCH_LIMIT };
