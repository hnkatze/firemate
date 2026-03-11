import type { DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import type { DocumentWithId } from '../types/firemate.types.js';

/**
 * Maps a single DocumentSnapshot to a typed object with ID included.
 * Returns null if the document doesn't exist.
 */
export function mapDocSnapshot<T>(
  snap: DocumentSnapshot,
  idField: string = 'id',
): DocumentWithId<T> | null {
  if (!snap.exists()) return null;

  return {
    ...snap.data(),
    [idField]: snap.id,
  } as DocumentWithId<T>;
}

/**
 * Maps a QueryDocumentSnapshot (always exists) to a typed object with ID.
 */
export function mapQueryDocSnapshot<T>(
  snap: QueryDocumentSnapshot,
  idField: string = 'id',
): DocumentWithId<T> {
  return {
    ...snap.data(),
    [idField]: snap.id,
  } as DocumentWithId<T>;
}

/**
 * Maps an array of QueryDocumentSnapshots to typed objects.
 */
export function mapQuerySnapshots<T>(
  snaps: QueryDocumentSnapshot[],
  idField: string = 'id',
): DocumentWithId<T>[] {
  return snaps.map((snap) => mapQueryDocSnapshot<T>(snap, idField));
}
