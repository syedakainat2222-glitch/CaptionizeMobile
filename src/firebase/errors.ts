export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
};

/**
 * A custom error class for Firestore permission errors.
 * This error is designed to be thrown in a development environment
 * to provide detailed context about a security rule violation.
 */
export class FirestorePermissionError extends Error {
  public readonly context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `FirestoreError: Missing or insufficient permissions.`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This is to make the error object serializable for the Next.js error overlay
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }

  // A toJSON method to control what gets serialized.
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      stack: this.stack,
    };
  }
}
