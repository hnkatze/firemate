// Core
export { createFireMate, FireMate } from './core/firemate.js';
export { Collection } from './core/collection.js';

// Batch & Transactions
export { BatchWriter, FireMateTransaction } from './core/batch.js';

// Pagination
export { InfiniteLoader } from './core/pagination.js';

// Subcollections
export { SubCollection, NestedSubCollection } from './core/subcollection.js';

// Field values
export {
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  deleteField,
} from './core/field-values.js';

// Errors
export {
  FireMateError,
  NotFoundError,
  PermissionError,
  BatchLimitError,
  ValidationError,
} from './errors/firemate-error.js';

// Types
export type {
  DocumentWithId,
  TimestampFields,
  CreateData,
  UpdateData,
  FireMateOptions,
  QueryOptions,
  PaginateOptions,
  Page,
  QueryBuilder,
  WhereClause,
  WhereCondition,
  WriteOperation,
} from './types/firemate.types.js';
