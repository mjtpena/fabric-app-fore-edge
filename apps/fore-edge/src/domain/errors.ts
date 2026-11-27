export class RuleError extends Error {
  readonly category = 'validation';
  constructor(message: string) {
    super(message);
    this.name = 'RuleError';
  }
}

export class PermissionError extends Error {
  readonly category = 'permission';
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}
