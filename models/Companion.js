/**
 * Companion model represents a concrete relationship anchor that diary entries can attach to.
 * Each companion carries its own identity, name, avatar image and timestamps.
 */
class Companion {
  constructor({
    id = Companion.generateId(),
    name = '',
    avatarIdentifier = '',
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
  } = {}) {
    this.id = String(id);
    this.name = name;
    this.avatarIdentifier = avatarIdentifier;
    this.createdAt = Companion.serializeDate(createdAt);
    this.updatedAt = Companion.serializeDate(updatedAt);
  }

  static generateId() {
    const random = Math.random().toString(36).slice(2, 10);
    return `comp_${Date.now().toString(36)}_${random}`;
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

  static fromJSON(payload = {}) {
    return new Companion(payload);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      avatarIdentifier: this.avatarIdentifier,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default Companion;

