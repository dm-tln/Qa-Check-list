import type { FlatItem, TestItem, TestStatus } from './models';

export function createId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createTestItem(title: string): TestItem {
  const ts = nowIso();
  return {
    id: createId(),
    title: title.trim(),
    status: 'not_tested',
    children: [],
    createdAt: ts,
    updatedAt: ts,
  };
}

export function flattenItems(
  items: TestItem[],
  parentNumber = '',
  depth = 0,
  parentId: string | null = null,
): FlatItem[] {
  const result: FlatItem[] = [];
  items.forEach((item, index) => {
    const number = parentNumber ? `${parentNumber}.${index + 1}` : `${index + 1}`;
    result.push({ item, number, depth, parentId });
    if (item.children.length > 0) {
      result.push(...flattenItems(item.children, number, depth + 1, item.id));
    }
  });
  return result;
}

export function getItemNumber(items: TestItem[], itemId: string): string | null {
  const flat = flattenItems(items);
  return flat.find((f) => f.item.id === itemId)?.number ?? null;
}

export function findItem(items: TestItem[], itemId: string): TestItem | null {
  for (const item of items) {
    if (item.id === itemId) return item;
    const found = findItem(item.children, itemId);
    if (found) return found;
  }
  return null;
}

function mapTree(items: TestItem[], mapper: (item: TestItem) => TestItem): TestItem[] {
  return items.map((item) => {
    const mapped = mapper(item);
    return {
      ...mapped,
      children: mapTree(mapped.children, mapper),
    };
  });
}

export function updateItem(
  items: TestItem[],
  itemId: string,
  patch: Partial<Pick<TestItem, 'title' | 'description' | 'status' | 'comment' | 'url'>>,
): TestItem[] {
  return mapTree(items, (item) => {
    if (item.id !== itemId) return item;
    return { ...item, ...patch, updatedAt: nowIso() };
  });
}

export function addRootItem(items: TestItem[], title: string): { items: TestItem[]; item: TestItem } {
  const item = createTestItem(title);
  return { items: [...items, item], item };
}

export function addChildItem(
  items: TestItem[],
  parentId: string,
  title: string,
): { items: TestItem[]; item: TestItem | null } {
  const child = createTestItem(title);
  let added = false;
  const next = mapTree(items, (item) => {
    if (item.id !== parentId) return item;
    added = true;
    return {
      ...item,
      children: [...item.children, child],
      updatedAt: nowIso(),
    };
  });
  return { items: next, item: added ? child : null };
}

export interface RemovedSubtree {
  item: TestItem;
  parentId: string | null;
  index: number;
}

export function removeItem(
  items: TestItem[],
  itemId: string,
): { items: TestItem[]; removed: RemovedSubtree | null } {
  let removed: RemovedSubtree | null = null;

  function walk(list: TestItem[], parentId: string | null): TestItem[] {
    const result: TestItem[] = [];
    list.forEach((item, index) => {
      if (item.id === itemId) {
        removed = { item, parentId, index };
        return;
      }
      result.push({
        ...item,
        children: walk(item.children, item.id),
      });
    });
    return result;
  }

  return { items: walk(items, null), removed };
}

export function restoreItem(
  items: TestItem[],
  removed: RemovedSubtree,
): TestItem[] {
  if (removed.parentId === null) {
    const next = [...items];
    next.splice(removed.index, 0, removed.item);
    return next;
  }

  return mapTree(items, (item) => {
    if (item.id !== removed.parentId) return item;
    const children = [...item.children];
    children.splice(removed.index, 0, removed.item);
    return { ...item, children, updatedAt: nowIso() };
  });
}

function findParentList(
  items: TestItem[],
  itemId: string,
  parentId: string | null = null,
): { list: TestItem[]; index: number; parentId: string | null } | null {
  const index = items.findIndex((i) => i.id === itemId);
  if (index >= 0) {
    return { list: items, index, parentId };
  }

  for (const item of items) {
    const nested = findParentList(item.children, itemId, item.id);
    if (nested) return nested;
  }
  return null;
}

function replaceChildren(
  items: TestItem[],
  parentId: string | null,
  children: TestItem[],
): TestItem[] {
  if (parentId === null) return children;
  return mapTree(items, (item) => {
    if (item.id !== parentId) return item;
    return { ...item, children, updatedAt: nowIso() };
  });
}

export function moveItemUp(items: TestItem[], itemId: string): TestItem[] {
  const loc = findParentList(items, itemId);
  if (!loc || loc.index === 0) return items;
  const list = [...loc.list];
  const tmp = list[loc.index - 1]!;
  list[loc.index - 1] = list[loc.index]!;
  list[loc.index] = tmp;
  return replaceChildren(items, loc.parentId, list);
}

export function moveItemDown(items: TestItem[], itemId: string): TestItem[] {
  const loc = findParentList(items, itemId);
  if (!loc || loc.index >= loc.list.length - 1) return items;
  const list = [...loc.list];
  const tmp = list[loc.index + 1]!;
  list[loc.index + 1] = list[loc.index]!;
  list[loc.index] = tmp;
  return replaceChildren(items, loc.parentId, list);
}

/** Indent: make item a child of previous sibling */
export function indentItem(items: TestItem[], itemId: string): TestItem[] {
  const loc = findParentList(items, itemId);
  if (!loc || loc.index === 0) return items;
  const list = [...loc.list];
  const item = list[loc.index]!;
  const prev = list[loc.index - 1]!;
  list.splice(loc.index, 1);
  const newPrev: TestItem = {
    ...prev,
    children: [...prev.children, item],
    updatedAt: nowIso(),
  };
  list[loc.index - 1] = newPrev;
  return replaceChildren(items, loc.parentId, list);
}

/** Outdent: move item after its parent into grandparent list */
export function outdentItem(items: TestItem[], itemId: string): TestItem[] {
  const loc = findParentList(items, itemId);
  if (!loc || loc.parentId === null) return items;

  const item = loc.list[loc.index]!;
  const parentListWithout = loc.list.filter((_, i) => i !== loc.index);
  const withoutItem = replaceChildren(items, loc.parentId, parentListWithout);

  const freshParentLoc = findParentList(withoutItem, loc.parentId);
  if (!freshParentLoc) return items;

  const grandparentId = freshParentLoc.parentId;
  const siblingList =
    grandparentId === null
      ? [...withoutItem]
      : [...(findItem(withoutItem, grandparentId)?.children ?? [])];

  const parentIndex = siblingList.findIndex((i) => i.id === loc.parentId);
  if (parentIndex < 0) return items;

  siblingList.splice(parentIndex + 1, 0, item);
  return replaceChildren(withoutItem, grandparentId, siblingList);
}

export function collectLeaves(items: TestItem[]): TestItem[] {
  const leaves: TestItem[] = [];
  for (const item of items) {
    if (item.children.length === 0) {
      leaves.push(item);
    } else {
      leaves.push(...collectLeaves(item.children));
    }
  }
  return leaves;
}

export function setItemStatus(items: TestItem[], itemId: string, status: TestStatus): TestItem[] {
  return updateItem(items, itemId, { status });
}
