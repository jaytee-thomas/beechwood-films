import { EventEmitter } from "events";

const globalBus = global.__beechwoodBus;

export const bus = globalBus instanceof EventEmitter ? globalBus : new EventEmitter();
if (!globalBus) {
  bus.setMaxListeners(50);
  global.__beechwoodBus = bus;
}
