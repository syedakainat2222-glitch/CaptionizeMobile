import { EventEmitter } from 'events';
import type { FirestorePermissionError } from './errors';

type AppEvents = {
  'permission-error': (error: FirestorePermissionError) => void;
};

// We need to declare the `emit` method with the correct types
declare interface AppEventEmitter {
  emit<E extends keyof AppEvents>(event: E, ...args: Parameters<AppEvents[E]>): boolean;
  on<E extends keyof AppEvents>(event: E, listener: AppEvents[E]): this;
}

class AppEventEmitter extends EventEmitter {}

export const errorEmitter = new AppEventEmitter();
