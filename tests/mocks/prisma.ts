import type { PasteDbClient, PasteRecord } from "@/lib/paste-service";

type WhereFilter = {
  id?: string;
  AND?: WhereFilter[];
  OR?: WhereFilter[];
  expiresAt?: null | { gt?: Date };
  viewCount?: { lt?: number };
};

function matchesFilter(record: PasteRecord, filter: WhereFilter): boolean {
  if (filter.id !== undefined && record.id !== filter.id) {
    return false;
  }

  if (filter.expiresAt === null && record.expiresAt !== null) {
    return false;
  }

  if (
    filter.expiresAt &&
    typeof filter.expiresAt === "object" &&
    filter.expiresAt.gt
  ) {
    if (
      !record.expiresAt ||
      record.expiresAt.getTime() <= filter.expiresAt.gt.getTime()
    ) {
      return false;
    }
  }

  if (filter.viewCount?.lt !== undefined) {
    if (record.viewCount >= filter.viewCount.lt) {
      return false;
    }
  }

  if (filter.AND) {
    for (const sub of filter.AND) {
      if (!matchesFilter(record, sub)) {
        return false;
      }
    }
  }

  if (filter.OR) {
    const anyMatch = filter.OR.some((sub) => matchesFilter(record, sub));
    if (!anyMatch) {
      return false;
    }
  }

  return true;
}

export class InMemoryPasteDb implements PasteDbClient {
  private store = new Map<string, PasteRecord>();
  public forceError: Error | null = null;

  clear() {
    this.store.clear();
    this.forceError = null;
  }

  seed(record: PasteRecord) {
    this.store.set(record.id, { ...record });
  }

  getRaw(id: string): PasteRecord | undefined {
    const found = this.store.get(id);
    return found ? { ...found } : undefined;
  }

  paste = {
    create: async ({
      data,
    }: {
      data: {
        id: string;
        content: string;
        createdAt: Date;
        expiresAt: Date | null;
        maxViews: number | null;
        viewCount: number;
      };
    }) => {
      if (this.forceError) {
        throw this.forceError;
      }
      const record: PasteRecord = {
        id: data.id,
        content: data.content,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        maxViews: data.maxViews,
        viewCount: data.viewCount,
      };
      this.store.set(record.id, record);
      return { ...record };
    },

    findUnique: async ({ where }: { where: { id: string } }) => {
      if (this.forceError) {
        throw this.forceError;
      }
      const found = this.store.get(where.id);
      return found ? { ...found } : null;
    },

    updateManyAndReturn: async ({
      where,
      data,
    }: {
      where: WhereFilter;
      data: { viewCount: { increment: number } };
    }) => {
      if (this.forceError) {
        throw this.forceError;
      }
      const updated: PasteRecord[] = [];
      for (const [id, record] of this.store.entries()) {
        if (matchesFilter(record, where)) {
          const nextRecord: PasteRecord = {
            ...record,
            viewCount: record.viewCount + data.viewCount.increment,
          };
          this.store.set(id, nextRecord);
          updated.push({ ...nextRecord });
        }
      }
      return updated;
    },
  } as unknown as PasteDbClient["paste"];
}