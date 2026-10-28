import test from 'node:test';
import assert from 'node:assert/strict';
import { generalRoomReservation } from './roomReservations.js';
const date = '2026-10-28';
const program = { program_type: 'Dermatology', next_specialty_date: date, rooms_assigned: { rooms: ['3'] } };
const reserved = (encounter, room = 3, settings = [program], day = date) => generalRoomReservation(encounter, room, settings, day);
test('reserved rooms block general and combined visits, including persisted visit types', () => {
  assert.equal(reserved({ visitType: 'general' }), program);
  assert.equal(reserved({ visitType: 'both' }), program);
  assert.equal(reserved({ intake_data: { visitType: 'general' } }), program);
  assert.equal(reserved({ visitType: 'specialty_only' }), null);
});
test('clearing a reservation releases the room and reservations only apply to their date and rooms', () => {
  assert.equal(reserved({}, 3, [{ ...program, rooms_assigned: { rooms: [] } }]), null);
  assert.equal(reserved({}, 3, []), null);
  assert.equal(reserved({}, 4), null);
  assert.equal(reserved({}, 3, [program], '2026-10-29'), null);
  assert.equal(reserved({}, ''), null);
});
