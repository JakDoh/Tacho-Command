// Ownership is shared by LIVE and download. Late completions of an old session
// may clean up that session, but must never disconnect a newer owner.
const owners = new WeakMap();
export function claimBleDevice(device) {
  const token = {};
  owners.set(device, token);
  let closed = false;
  return {
    active: () => !closed && owners.get(device) === token,
    disconnectIfOwner() {
      if (owners.get(device) !== token) return;
      try { device.gatt?.disconnect?.(); } catch {}
    },
    close() {
      if (closed) return;
      closed = true;
      this.disconnectIfOwner();
    },
  };
}

export function boundedBleOperation(operation, { signal, timeoutMs = 15000, label = 'BLE_OPERATION', onLateResult } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(value);
    };
    const abort = () => finish(new Error('BLE_CANCELLED'));
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, { once: true });
    if (Number.isFinite(timeoutMs)) timer = setTimeout(() => finish(new Error(label + '_TIMEOUT')), timeoutMs);
    try {
      // Call immediately: requestDevice needs the original user gesture.
      Promise.resolve(operation()).then(value => {
        if (settled) { try { onLateResult?.(value); } catch {} return; }
        finish(null, value);
      }, error => finish(error));
    } catch (error) { finish(error); }
  });
}

export function abortableBleDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(new Error('BLE_CANCELLED')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}
