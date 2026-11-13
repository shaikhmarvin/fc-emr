import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

// Exercise the hook's async refresh with lightweight React and API stand-ins.
const source = readFileSync(new URL('./useClinicData.js', import.meta.url), 'utf8')
  .replace(/import[\s\S]*?from\s*"[^"]+";/g, '')
  .replace('export function useClinicData', 'function useClinicData');

test('stale refreshes cannot undo shared button updates or post-save reloads', async () => {
  const cases = [
    { status: 'in_visit' },
    { status: 'cancelled' },
    { status: 'done' },
    { pharmacyStatus: 'meds_ready' },
    { labStatus: 'collected' },
    { soapStatus: 'signed' },
    { roomNumber: '4', assignedStudent: 'Student' },
    { socialWorkSeen: true },
    { medicationList: [{ id: 'new-medication' }] },
    { allergyList: [{ id: 'new-allergy' }] },
    { importedSendOutLabs: [{ key: 'glucose', value: 90 }] },
    'reload-only',
  ];
  for (const update of cases) {
    let state = [];
    let release;
    let reads = 0;
    const freshRead = new Promise(resolve => { release = resolve; });
    const dependencies = {
      useState: () => [state, next => { state = typeof next === 'function' ? next(state) : next; }],
      useRef: value => ({ current: value }),
      useCallback: callback => callback,
      useEffect: () => {},
      fetchPatients: async () => (++reads === 1 ? [{ id: 'old' }] : freshRead),
      fetchEncounters: async () => [],
      fetchSocialWorkNotes: async () => [],
      fetchMedications: async () => [],
      fetchAllergies: async () => [],
    };
    const makeHook = new Function(...Object.keys(dependencies), `${source}; return useClinicData;`);
    const hook = makeHook(...Object.values(dependencies))({ authReady: true, session: {}, userRole: 'leadership' });
    const refresh = hook.refreshClinicData();
    const saved = [{ id: 'saved', encounters: [update] }];
    if (update === 'reload-only') {
      state = saved;
      await hook.refreshClinicData();
    } else {
      hook.setPatients(() => saved);
    }
    await refresh;
    assert.equal(state[0].id, 'saved');
    assert.deepEqual(state, saved);
    assert.equal(reads, 2, 'a fresh reconciliation is queued');
    release([{ id: 'fresh' }]);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(state[0].id, 'fresh');
  }
});
