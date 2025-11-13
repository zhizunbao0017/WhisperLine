export type ChapterType = 'companion' | 'theme';

export interface Chapter {
  id: string;
  title: string;
  entryIds: string[];
  type: ChapterType;
  lastUpdated: string;
  createdAt: string;
  sourceId?: string;
  keywords?: string[];
}

export interface ChapterPayload extends Partial<Chapter> {
  id?: string;
  title?: string;
  type: ChapterType;
}

export class ChapterRecord implements Chapter {
  public id: string;

  public title: string;

  public entryIds: string[];

  public type: ChapterType;

  public lastUpdated: string;

  public createdAt: string;

  public sourceId?: string;

  public keywords?: string[];

  constructor({
    id,
    title,
    entryIds = [],
    type,
    lastUpdated,
    createdAt,
    sourceId,
    keywords = [],
  }: ChapterPayload) {
    const now = new Date().toISOString();
    this.id = id ? String(id) : ChapterRecord.generateId(type, title);
    this.title = title?.trim() || 'Untitled Chapter';
    this.entryIds = ChapterRecord.normalizeIds(entryIds);
    this.type = type;
    this.lastUpdated = ChapterRecord.serializeDate(lastUpdated) ?? now;
    this.createdAt = ChapterRecord.serializeDate(createdAt) ?? now;
    this.sourceId = sourceId ? String(sourceId) : undefined;
    this.keywords = Array.isArray(keywords)
      ? [...new Set(keywords.map((keyword) => keyword.toLowerCase()))]
      : [];
  }

  static generateId(type: ChapterType, candidate?: string) {
    const base = candidate
      ? candidate
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      : '';
    const random = Math.random().toString(36).slice(2, 8);
    return `${type}-${base || 'chapter'}-${random}`;
  }

  static serializeDate(value?: string) {
    if (!value) {
      return undefined;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }

  static normalizeIds(value?: Chapter['entryIds']) {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return Array.from(
        new Set(
          value
            .map((item) => {
              if (!item) {
                return null;
              }
              if (typeof item === 'string') {
                return item;
              }
              if (typeof item === 'object' && 'id' in item) {
                return String(item.id);
              }
              return null;
            })
            .filter(Boolean)
        )
      );
    }
    if (typeof value === 'string') {
      return [value];
    }
    return [];
  }

  static fromJSON(payload: Chapter | ChapterPayload) {
    return new ChapterRecord(payload);
  }

  toJSON(): Chapter {
    return {
      id: this.id,
      title: this.title,
      entryIds: [...this.entryIds],
      type: this.type,
      lastUpdated: this.lastUpdated,
      createdAt: this.createdAt,
      sourceId: this.sourceId,
      keywords: this.keywords ? [...this.keywords] : undefined,
    };
  }

  touch() {
    this.lastUpdated = new Date().toISOString();
  }

  addEntry(entryId: string) {
    if (!entryId) {
      return false;
    }
    if (this.entryIds.includes(entryId)) {
      return false;
    }
    this.entryIds.unshift(entryId);
    this.touch();
    return true;
  }
}

export default ChapterRecord;

