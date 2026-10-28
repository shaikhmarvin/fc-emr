import { isGeneralClinicEncounter } from '../constants.js';

export function generalRoomReservation(encounter, roomNumber, settings, clinicDate) {
  if (!roomNumber || !isGeneralClinicEncounter(encounter)) return null;
  return (settings || []).find(program =>
    program.next_specialty_date &&
    String(program.next_specialty_date).slice(0, 10) === clinicDate &&
    (program.rooms_assigned?.rooms || []).some(room => Number(room) === Number(roomNumber))
  ) || null;
}
