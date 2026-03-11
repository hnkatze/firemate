import {
  type CollectionReference,
  type Query,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import type { QueryOptions, WhereCondition } from '../types/firemate.types.js';

/**
 * Builds a Firestore Query from FireMate QueryOptions.
 * Translates the object-based where syntax into Firestore constraints.
 */
export function buildQuery<T>(
  collectionRef: CollectionReference,
  options: QueryOptions<T>,
): Query {
  const constraints = [];

  if (options.where) {
    for (const [field, value] of Object.entries(options.where)) {
      if (value === undefined) continue;

      if (isWhereCondition(value)) {
        constraints.push(where(field, value.op, value.value));
      } else {
        constraints.push(where(field, '==', value));
      }
    }
  }

  if (options.orderBy) {
    constraints.push(orderBy(options.orderBy, options.orderDirection ?? 'asc'));
  }

  if (options.limit) {
    constraints.push(limit(options.limit));
  }

  return query(collectionRef, ...constraints);
}

function isWhereCondition(value: unknown): value is WhereCondition<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'op' in value &&
    'value' in value
  );
}
