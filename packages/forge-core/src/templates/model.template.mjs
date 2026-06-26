export function modelTemplate({ modelName }) {
  return `export class ${modelName} {
  constructor(data = {}) {
    Object.assign(this, data);
  }

  static from(data = {}) {
    return new ${modelName}(data);
  }

  toJSON() {
    return { ...this };
  }
}
`;
}
