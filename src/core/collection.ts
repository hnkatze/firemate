import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type Firestore,
  type CollectionReference,
  type DocumentReference,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type WhereFilterOp,
  type OrderByDirection,
  type Unsubscribe,
  documentId,
} from 'firebase/firestore';

import type {
  DocumentWithId,
  CreateData,
  UpdateData,
  QueryOptions,
  FireMateOptions,
  QueryBuilder,
} from '../types/firemate.types.js';
import { buildQuery } from '../utils/build-query.js';
import { mapDocSnapshot, mapQuerySnapshots } from '../utils/map-snapshot.js';
import { NotFoundError, PermissionError, FireMateError } from '../errors/firemate-error.js';

const MAX_BATCH_IN_QUERY = 30;

export class Collection<T extends Record<string, unknown>> {
  private readonly collectionRef: CollectionReference;
  private readonly idField: string;
  private readonly useTimestamps: boolean;
  private readonly options: FireMateOptions;

  constructor(
    private readonly firestore: Firestore,
    private readonly path: string,
    options: FireMateOptions,
  ) {
    this.collectionRef = collection(this.firestore, this.path);
    this.idField = options.idField ?? 'id';
    this.useTimestamps = options.timestamps ?? false;
    this.options = options;
  }

  // ─── READ ──────────────────────────────────────────────

  /**
   * Get a single document by ID.
   * Returns null if the document doesn't exist.
   */
  async get(id: string): Promise<DocumentWithId<T> | null> {
    try {
      const ref = this.docRef(id);
      const snap = await getDoc(ref);
      return mapDocSnapshot<T>(snap, this.idField);
    } catch (error) {
      throw this.handleError(error, `${this.path}/${id}`);
    }
  }

  /**
   * Get a single document by ID or throw NotFoundError.
   */
  async getOrThrow(id: string): Promise<DocumentWithId<T>> {
    const result = await this.get(id);
    if (!result) throw new NotFoundError(`${this.path}/${id}`);
    return result;
  }

  /**
   * Get multiple documents by their IDs.
   * Missing documents are silently skipped.
   */
  async getMany(ids: string[]): Promise<DocumentWithId<T>[]> {
    if (ids.length === 0) return [];

    const results: DocumentWithId<T>[] = [];

    // Firestore 'in' queries support max 30 items
    for (let i = 0; i < ids.length; i += MAX_BATCH_IN_QUERY) {
      const chunk = ids.slice(i, i + MAX_BATCH_IN_QUERY);
      const q = query(this.collectionRef, where(documentId(), 'in', chunk));
      const snapshot = await getDocs(q);
      results.push(...mapQuerySnapshots<T>(snapshot.docs, this.idField));
    }

    return results;
  }

  /**
   * Find documents matching query options (object syntax).
   */
  async find(options: QueryOptions<T> = {}): Promise<DocumentWithId<T>[]> {
    try {
      const q = buildQuery<T>(this.collectionRef, options);
      const snapshot = await getDocs(q);
      return mapQuerySnapshots<T>(snapshot.docs, this.idField);
    } catch (error) {
      throw this.handleError(error, this.path);
    }
  }

  /**
   * Find a single document matching query options.
   * Returns null if no match found.
   */
  async findOne(options: QueryOptions<T>): Promise<DocumentWithId<T> | null> {
    const results = await this.find({ ...options, limit: 1 });
    return results[0] ?? null;
  }

  /**
   * Check if a document exists.
   */
  async exists(id: string): Promise<boolean> {
    const ref = this.docRef(id);
    const snap = await getDoc(ref);
    return snap.exists();
  }

  // ─── WRITE ─────────────────────────────────────────────

  /**
   * Add a new document with auto-generated ID.
   * Returns the created document with its ID.
   */
  async add(data: CreateData<T>): Promise<DocumentWithId<T>> {
    try {
      const writeData = this.applyTimestamps(data, 'create');
      const ref = await addDoc(this.collectionRef, writeData);
      this.notifyWrite('add', `${this.path}/${ref.id}`);
      return { ...data, [this.idField]: ref.id, ...this.resolveTimestampFields('create') } as DocumentWithId<T>;
    } catch (error) {
      throw this.handleError(error, this.path);
    }
  }

  /**
   * Set a document with a specific ID (creates or overwrites).
   */
  async set(id: string, data: CreateData<T>): Promise<DocumentWithId<T>> {
    try {
      const ref = this.docRef(id);
      const writeData = this.applyTimestamps(data, 'create');
      await setDoc(ref, writeData);
      this.notifyWrite('set', `${this.path}/${id}`);
      return { ...data, [this.idField]: id, ...this.resolveTimestampFields('create') } as DocumentWithId<T>;
    } catch (error) {
      throw this.handleError(error, `${this.path}/${id}`);
    }
  }

  /**
   * Update an existing document (partial update).
   */
  async update(id: string, data: UpdateData<T>): Promise<void> {
    try {
      const ref = this.docRef(id);
      const writeData = this.applyTimestamps(data, 'update');
      await updateDoc(ref, writeData);
      this.notifyWrite('update', `${this.path}/${id}`);
    } catch (error) {
      throw this.handleError(error, `${this.path}/${id}`);
    }
  }

  /**
   * Delete a document by ID.
   */
  async delete(id: string): Promise<void> {
    try {
      const ref = this.docRef(id);
      await deleteDoc(ref);
      this.notifyWrite('delete', `${this.path}/${id}`);
    } catch (error) {
      throw this.handleError(error, `${this.path}/${id}`);
    }
  }

  // ─── REAL-TIME ─────────────────────────────────────────

  /**
   * Listen to a single document in real-time.
   */
  onDoc(
    id: string,
    callback: (data: DocumentWithId<T> | null) => void,
    onError?: (error: Error) => void,
    options?: { signal?: AbortSignal },
  ): Unsubscribe {
    const ref = this.docRef(id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        callback(mapDocSnapshot<T>(snap, this.idField));
      },
      (error) => {
        onError?.(error);
        this.options.onError?.({
          code: 'listener-error',
          message: error.message,
          path: `${this.path}/${id}`,
        });
      },
    );

    if (options?.signal) {
      options.signal.addEventListener('abort', unsub, { once: true });
    }

    return unsub;
  }

  /**
   * Listen to a query in real-time.
   */
  onQuery(
    queryOptions: QueryOptions<T>,
    callback: (data: DocumentWithId<T>[]) => void,
    onError?: (error: Error) => void,
    options?: { signal?: AbortSignal },
  ): Unsubscribe {
    const q = buildQuery<T>(this.collectionRef, queryOptions);
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        callback(mapQuerySnapshots<T>(snapshot.docs, this.idField));
      },
      (error) => {
        onError?.(error);
        this.options.onError?.({
          code: 'listener-error',
          message: error.message,
          path: this.path,
        });
      },
    );

    if (options?.signal) {
      options.signal.addEventListener('abort', unsub, { once: true });
    }

    return unsub;
  }

  // ─── FLUENT QUERY BUILDER ──────────────────────────────

  /**
   * Start a fluent query chain.
   */
  where<K extends keyof T & string>(
    field: K,
    op: WhereFilterOp,
    value: T[K],
  ): QueryBuilder<T> {
    return new FluentQueryBuilder<T>(this.collectionRef, this.idField).where(field, op, value);
  }

  // ─── AGGREGATIONS ──────────────────────────────────────

  /**
   * Count documents matching optional query.
   */
  async count(options: QueryOptions<T> = {}): Promise<number> {
    const results = await this.find(options);
    return results.length;
  }

  // ─── INTERNALS ─────────────────────────────────────────

  private docRef(id: string): DocumentReference {
    return doc(this.firestore, this.path, id);
  }

  private applyTimestamps(data: Record<string, unknown>, mode: 'create' | 'update'): Record<string, unknown> {
    if (!this.useTimestamps) return { ...data };

    if (mode === 'create') {
      return {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
    }

    return {
      ...data,
      updatedAt: serverTimestamp(),
    };
  }

  private resolveTimestampFields(mode: 'create' | 'update'): Record<string, Date> {
    if (!this.useTimestamps) return {};

    const now = new Date();
    if (mode === 'create') {
      return { createdAt: now, updatedAt: now };
    }
    return { updatedAt: now };
  }

  private notifyWrite(operation: string, path: string): void {
    this.options.onWrite?.(operation as 'add', path);
  }

  private handleError(error: unknown, path: string): FireMateError {
    if (error instanceof FireMateError) return error;

    const firebaseError = error as { code?: string; message?: string };
    const code = firebaseError.code ?? 'unknown';
    const message = firebaseError.message ?? 'Unknown error';

    if (code === 'permission-denied' || code === 'PERMISSION_DENIED') {
      return new PermissionError(path, message);
    }

    return new FireMateError(code, message, path);
  }
}

// ─── FLUENT QUERY BUILDER ────────────────────────────────

class FluentQueryBuilder<T extends Record<string, unknown>> implements QueryBuilder<T> {
  private constraints: Array<ReturnType<typeof where> | ReturnType<typeof orderBy> | ReturnType<typeof limit>> = [];

  constructor(
    private readonly collectionRef: CollectionReference,
    private readonly idField: string,
  ) {}

  where<K extends keyof T & string>(field: K, op: WhereFilterOp, value: T[K]): QueryBuilder<T> {
    this.constraints.push(where(field, op, value as unknown));
    return this;
  }

  orderBy(field: keyof T & string, direction: OrderByDirection = 'asc'): QueryBuilder<T> {
    this.constraints.push(orderBy(field, direction));
    return this;
  }

  limit(count: number): QueryBuilder<T> {
    this.constraints.push(limit(count));
    return this;
  }

  async get(): Promise<DocumentWithId<T>[]> {
    const q = query(this.collectionRef, ...this.constraints);
    const snapshot = await getDocs(q);
    return mapQuerySnapshots<T>(snapshot.docs, this.idField);
  }
}
