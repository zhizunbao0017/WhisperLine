/**
 * Theme model captures automatically discovered or user-defined thematic clusters.
 * It keeps the source keywords, linked diary entries and a flag that marks manual edits.
 */
class Theme {
  constructor({
    id = Theme.generateId(),
    name = '',
    keywords = [],
    diaryEntryIDs = [],
    isUserDefined = false,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
  } = {}) {
    this.id = String(id);
    this.name = name;
    this.keywords = Theme.normalizeStringArray(keywords);
    this.diaryEntryIDs = Theme.normalizeStringArray(diaryEntryIDs);
    this.isUserDefined = Boolean(isUserDefined);
    this.createdAt = Theme.serializeDate(createdAt);
    this.updatedAt = Theme.serializeDate(updatedAt);
  }

  static generateId() {
    const random = Math.random().toString(36).slice(2, 10);
    return `theme_${Date.now().toString(36)}_${random}`;
  }

  static serializeDate(value) {
    if (!value) {
      return new Date().toISOString();
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }

  static normalizeStringArray(value) {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (!item) {
            return null;
          }
          if (typeof item === 'string') {
            return item;
          }
          if (typeof item === 'object' && item.id) {
            return String(item.id);
          }
          return null;
        })
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      return [value];
    }
    return [];
  }

  static fromJSON(payload = {}) {
    return new Theme(payload);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      keywords: [...this.keywords],
      diaryEntryIDs: [...this.diaryEntryIDs],
      isUserDefined: this.isUserDefined,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default Theme;


