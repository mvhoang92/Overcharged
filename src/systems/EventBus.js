export class EventBus {
    constructor() {
        this.handlers = new Map();
    }
    on(event, handler) {
        if (!this.handlers.has(event))
            this.handlers.set(event, new Set());
        this.handlers.get(event).add(handler);
    }
    off(event, handler) {
        this.handlers.get(event)?.delete(handler);
    }
    emit(event, ...args) {
        this.handlers.get(event)?.forEach((h) => h(...args));
    }
}
export const bus = new EventBus();
