export function nextWednesday(date) {
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + (3 - day.getUTCDay() + 7) % 7);
  return day.toISOString().slice(0, 10);
}

export function withCounselingSchedule(rows, today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())) {
  return rows.map(row => row.program_type === 'Counseling'
    ? { ...row, next_specialty_date: row.counseling_enabled === false ? '' : nextWednesday(today) }
    : row);
}
