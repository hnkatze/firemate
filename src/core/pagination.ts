import {
  getDocs,
  query,
  startAfter,
  limit,
  orderBy,
  type CollectionReference,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore';

import type {
  DocumentWithId,
  PaginateOptions,
  Page,
} from '../types/firemate.types.js';
import { buildQuery } from '../utils/build-query.js';
import { mapQuerySnapshots } from '../utils/map-snapshot.js';

/**
 * Creates a paginated query that returns Page objects with nextPage() support.
 */
export async function paginateCollection<T extends Record<string, unknown>>(
  collectionRef: CollectionReference,
  options: PaginateOptions<T>,
  idField: string,
  lastDoc?: QueryDocumentSnapshot,
): Promise<Page<DocumentWithId<T>>> {
  const { pageSize, ...queryOpts } = options;

  // Build base constraints from query options (without limit)
  const baseQuery = buildQuery<T>(collectionRef, queryOpts);

  // Add pagination constraints
  const constraints: QueryConstraint[] = [];

  if (!options.orderBy) {
    constraints.push(orderBy('__name__'));
  }

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  // Request one extra to check hasMore
  constraints.push(limit(pageSize + 1));

  const paginatedQuery = query(baseQuery, ...constraints);
  const snapshot = await getDocs(paginatedQuery);

  const hasMore = snapshot.docs.length > pageSize;
  const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
  const data = mapQuerySnapshots<T>(docs, idField);

  const lastVisible = docs[docs.length - 1] as QueryDocumentSnapshot | undefined;

  return {
    data,
    hasMore,
    async nextPage(): Promise<Page<DocumentWithId<T>>> {
      if (!hasMore || !lastVisible) {
        return { data: [], hasMore: false, nextPage: async () => this };
      }
      return paginateCollection<T>(collectionRef, options, idField, lastVisible);
    },
  };
}

/**
 * Infinite loader — accumulates items across pages.
 */
export class InfiniteLoader<T extends Record<string, unknown>> {
  private _items: DocumentWithId<T>[] = [];
  private _hasMore = true;
  private _lastDoc: QueryDocumentSnapshot | undefined;
  private _loading = false;

  constructor(
    private readonly collectionRef: CollectionReference,
    private readonly options: PaginateOptions<T>,
    private readonly idField: string,
  ) {}

  get items(): DocumentWithId<T>[] {
    return this._items;
  }

  get hasMore(): boolean {
    return this._hasMore;
  }

  get loading(): boolean {
    return this._loading;
  }

  async loadMore(): Promise<DocumentWithId<T>[]> {
    if (!this._hasMore || this._loading) return [];

    this._loading = true;

    try {
      const page = await paginateCollection<T>(
        this.collectionRef,
        this.options,
        this.idField,
        this._lastDoc,
      );

      this._items = [...this._items, ...page.data];
      this._hasMore = page.hasMore;

      if (page.data.length > 0) {
        // We need the raw snapshot for cursor — re-query to get it
        const { pageSize, ...queryOpts } = this.options;
        const baseQuery = buildQuery<T>(this.collectionRef, queryOpts);

        const constraints: QueryConstraint[] = [];
        if (!this.options.orderBy) {
          constraints.push(orderBy('__name__'));
        }
        if (this._lastDoc) {
          constraints.push(startAfter(this._lastDoc));
        }
        constraints.push(limit(pageSize));

        const snapshot = await getDocs(query(baseQuery, ...constraints));
        this._lastDoc = snapshot.docs[snapshot.docs.length - 1];
      }

      return page.data;
    } finally {
      this._loading = false;
    }
  }

  reset(): void {
    this._items = [];
    this._hasMore = true;
    this._lastDoc = undefined;
    this._loading = false;
  }
}
