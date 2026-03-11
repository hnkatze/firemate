import type { Firestore } from 'firebase/firestore';
import {
  collectionGroup,
  getDocs,
} from 'firebase/firestore';

import type { FireMateOptions, DocumentWithId, QueryOptions } from '../types/firemate.types.js';
import { Collection } from './collection.js';
import { buildQuery } from '../utils/build-query.js';
import { mapQuerySnapshots } from '../utils/map-snapshot.js';

/**
 * Represents a subcollection definition tied to a parent collection.
 *
 * @example
 * ```ts
 * const userOrders = users.subcollection<Order>('orders');
 *
 * // Access for a specific parent
 * const orders = await userOrders.of('userId123').find({ where: { status: 'pending' } });
 *
 * // Collection group query
 * const allPending = await userOrders.group({ where: { status: 'pending' } });
 * ```
 */
export class SubCollection<
  _TParent extends Record<string, unknown>,
  TChild extends Record<string, unknown>,
> {
  private readonly subcollectionName: string;

  constructor(
    private readonly firestore: Firestore,
    private readonly parentPath: string,
    subcollectionName: string,
    private readonly options: FireMateOptions,
  ) {
    this.subcollectionName = subcollectionName;
  }

  /**
   * Access the subcollection for a specific parent document.
   * Returns a fully typed Collection scoped to that parent.
   */
  of(parentId: string): Collection<TChild> {
    const path = `${this.parentPath}/${parentId}/${this.subcollectionName}`;
    return new Collection<TChild>(this.firestore, path, this.options);
  }

  /**
   * Define a nested subcollection.
   *
   * @example
   * ```ts
   * const orderItems = userOrders.subcollection<OrderItem>('items');
   * const items = await orderItems.of('userId', 'orderId').find({});
   * ```
   */
  subcollection<TSub extends Record<string, unknown>>(
    name: string,
  ): NestedSubCollection<TChild, TSub> {
    return new NestedSubCollection<TChild, TSub>(
      this.firestore,
      this.parentPath,
      this.subcollectionName,
      name,
      this.options,
    );
  }

  /**
   * Collection group query — searches across ALL instances of this subcollection.
   *
   * @example
   * ```ts
   * const allPendingOrders = await userOrders.group({ where: { status: 'pending' } });
   * ```
   */
  async group(options: QueryOptions<TChild> = {}): Promise<DocumentWithId<TChild>[]> {
    const groupRef = collectionGroup(this.firestore, this.subcollectionName);
    const q = buildQuery<TChild>(groupRef as never, options);
    const snapshot = await getDocs(q);
    return mapQuerySnapshots<TChild>(snapshot.docs, this.options.idField ?? 'id');
  }
}

/**
 * Nested subcollection (2+ levels deep).
 */
export class NestedSubCollection<
  _TParent extends Record<string, unknown>,
  TChild extends Record<string, unknown>,
> {
  constructor(
    private readonly firestore: Firestore,
    private readonly rootPath: string,
    private readonly parentSubName: string,
    private readonly childSubName: string,
    private readonly options: FireMateOptions,
  ) {}

  /**
   * Access a nested subcollection for specific parent documents.
   *
   * @example
   * ```ts
   * const items = await orderItems.of('userId123', 'orderId456').find({});
   * ```
   */
  of(rootId: string, parentId: string): Collection<TChild> {
    const path = `${this.rootPath}/${rootId}/${this.parentSubName}/${parentId}/${this.childSubName}`;
    return new Collection<TChild>(this.firestore, path, this.options);
  }

  /**
   * Collection group query across all nested subcollections.
   */
  async group(options: QueryOptions<TChild> = {}): Promise<DocumentWithId<TChild>[]> {
    const groupRef = collectionGroup(this.firestore, this.childSubName);
    const q = buildQuery<TChild>(groupRef as never, options);
    const snapshot = await getDocs(q);
    return mapQuerySnapshots<TChild>(snapshot.docs, this.options.idField ?? 'id');
  }
}
