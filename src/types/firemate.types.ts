import type { Firestore, OrderByDirection, WhereFilterOp } from 'firebase/firestore';

/**
 * Base document type — all Firestore documents will extend this
 */
export type DocumentWithId<T> = T & { id: string };

/**
 * Fields that FireMate manages automatically
 */
export interface TimestampFields {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Remove auto-managed fields from input types
 */
export type CreateData<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateData<T> = Partial<CreateData<T>>;

/**
 * FireMate initialization options
 */
export interface FireMateOptions {
  firestore: Firestore;
  timestamps?: boolean;
  idField?: string;
  onError?: (error: FireMateErrorBase) => void;
  onWrite?: (operation: WriteOperation, path: string) => void;
}

export type WriteOperation = 'add' | 'set' | 'update' | 'delete' | 'batch';

/**
 * Base error type (forward reference)
 */
export interface FireMateErrorBase {
  code: string;
  message: string;
  path?: string;
}

/**
 * Where clause — object syntax for simple equality/operator filters
 */
export type WhereClause<T> = {
  [K in keyof T]?: T[K] | WhereCondition<T[K]>;
};

export interface WhereCondition<V> {
  op: WhereFilterOp;
  value: V;
}

/**
 * Query options for find() and related methods
 */
export interface QueryOptions<T> {
  where?: WhereClause<T>;
  orderBy?: keyof T & string;
  orderDirection?: OrderByDirection;
  limit?: number;
  select?: (keyof T & string)[];
}

/**
 * Pagination options
 */
export interface PaginateOptions<T> extends Omit<QueryOptions<T>, 'limit'> {
  pageSize: number;
}

/**
 * Paginated result
 */
export interface Page<T> {
  data: T[];
  hasMore: boolean;
  nextPage(): Promise<Page<T>>;
}

/**
 * Fluent query builder interface
 */
export interface QueryBuilder<T> {
  where<K extends keyof T & string>(field: K, op: WhereFilterOp, value: T[K]): QueryBuilder<T>;
  orderBy(field: keyof T & string, direction?: OrderByDirection): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  get(): Promise<DocumentWithId<T>[]>;
}
