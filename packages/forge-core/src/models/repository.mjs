export class Repository {
  constructor(data = {}) {
    Object.assign(this, data);
  }

  static from(data = {}) {
    return new Repository(data);
  }

  toJSON() {
    return { ...this };
  }
}
