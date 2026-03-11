import {
  serverTimestamp as fbServerTimestamp,
  increment as fbIncrement,
  arrayUnion as fbArrayUnion,
  arrayRemove as fbArrayRemove,
  deleteField as fbDeleteField,
  type FieldValue,
} from 'firebase/firestore';

/**
 * Returns a sentinel value for the server timestamp.
 */
export function serverTimestamp(): FieldValue {
  return fbServerTimestamp();
}

/**
 * Returns a sentinel value to increment a numeric field.
 */
export function increment(n: number): FieldValue {
  return fbIncrement(n);
}

/**
 * Returns a sentinel value to add elements to an array field.
 */
export function arrayUnion<T>(...elements: T[]): FieldValue {
  return fbArrayUnion(...elements);
}

/**
 * Returns a sentinel value to remove elements from an array field.
 */
export function arrayRemove<T>(...elements: T[]): FieldValue {
  return fbArrayRemove(...elements);
}

/**
 * Returns a sentinel value to delete a field from a document.
 */
export function deleteField(): FieldValue {
  return fbDeleteField();
}
