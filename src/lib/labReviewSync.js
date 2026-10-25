// Shared responses must never become new edits or overwrite a newer local action.
export class LabReviewSync {
  constructor() { this.packets = new Map(); }
  get(packetId) { return this.packets.get(packetId)?.labs; }
  receive(packetId, labs) {
    const signature = JSON.stringify(labs);
    let state = this.packets.get(packetId);
    if (!state) {
      state = { labs, seen: new Set([signature]), pending: 0, dirty: false, tail: Promise.resolve() };
      this.packets.set(packetId, state);
      return labs;
    }
    if (state.seen.has(signature) || state.pending || state.dirty) {
      state.seen.add(signature);
      return state.labs;
    }
    state.seen.add(signature);
    state.labs = labs;
    return labs;
  }
  edit(packetId, labs, persist) {
    if (!this.packets.has(packetId)) this.receive(packetId, []);
    const state = this.packets.get(packetId);
    state.seen.add(JSON.stringify(state.labs));
    state.seen.add(JSON.stringify(labs));
    state.labs = labs;
    state.dirty = true;
    state.pending++;
    const operation = state.tail.catch(() => {}).then(() => persist?.(packetId, labs));
    state.tail = operation.then(() => {
      state.pending--;
      if (!state.pending) state.dirty = false;
    }, error => {
      state.pending--;
      state.dirty = true;
      throw error;
    });
    return state.tail;
  }
  flush(packetId) { return this.packets.get(packetId)?.tail || Promise.resolve(); }
}
