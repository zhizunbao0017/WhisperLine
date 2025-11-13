/**
 * DiaryEntry model encapsulates the structure persisted in storage and consumed by the UI.
 * It introduces companionIDs to link entries with one or more companions.
 */
class DiaryEntry {
  constructor({
    id = DiaryEntry.generateId(),
    title = '',
    content = '',
    contentHTML = null,
    mood = null,
    weather = null,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    companionIDs = [],
    companionIds = undefined,
    analysis = null,
    themeID = null,
    themeId = undefined,
    captureType = null,
    captureMeta = null,
  } = {}) {
    const resolvedContentHTML = typeof contentHTML === 'string' && contentHTML.length > 0
      ? contentHTML
      : content;

    this.id = String(id);
    this.title = title;
    this.content = content;
    this.contentHTML = resolvedContentHTML;
    this.mood = mood;
    this.weather = weather;
    this.createdAt = DiaryEntry.serializeDate(createdAt);
    this.updatedAt = DiaryEntry.serializeDate(updatedAt);
    const normalizedCompanions = DiaryEntry.normalizeCompanionIDs(
      companionIDs ?? companionIds ?? []
    );
    this.companionIDs = normalizedCompanions;
    this.analysis = analysis || null;
    this.themeID = DiaryEntry.normalizeThemeID(themeID ?? themeId ?? null);
    this.captureType = captureType ?? null;
    this.captureMeta = captureMeta ? { ...captureMeta } : null;
  }

  static generateId() {
    const random = Math.random().toString(36).slice(2, 10);
    return `entry_${Date.now().toString(36)}_${random}`;
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

  static normalizeCompanionIDs(value) {
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

  static fromRaw(payload = {}) {
    const inferredCompanions =
      payload.companionIDs ??
      payload.companionIds ??
      payload.companions ??
      payload.relatedCompanions ??
      [];

    return new DiaryEntry({
      ...payload,
      companionIDs: DiaryEntry.normalizeCompanionIDs(inferredCompanions),
    });
  }

  static normalizeThemeID(value) {
    if (!value) {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object' && value.id) {
      return String(value.id);
    }
    return null;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      contentHTML: this.contentHTML,
      mood: this.mood,
      weather: this.weather,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      companionIDs: [...this.companionIDs],
      analysis: this.analysis,
      themeID: this.themeID,
      captureType: this.captureType,
      captureMeta: this.captureMeta ? { ...this.captureMeta } : null,
    };
  }
}

export const normalizeDiaryEntry = (payload = {}) => DiaryEntry.fromRaw(payload).toJSON();

export const createDiaryEntry = (payload = {}) => DiaryEntry.fromRaw(payload).toJSON();

export default DiaryEntry;

