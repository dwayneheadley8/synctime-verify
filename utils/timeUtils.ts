import { TimesheetEntry, Clash, WorkingPeriod, Shift } from '../types';
import { auth } from '../services/firebase';

export const calculateDuration = (start: string, end: string): number => {
  if (!start || !end) return 0;

  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  const startDate = new Date(0, 0, 0, startH, startM);
  const endDate = new Date(0, 0, 0, endH, endM);

  let diff = (endDate.getTime() - startDate.getTime()) / 1000 / 60 / 60;
  if (diff < 0) diff += 24; // Handle overnight shifts roughly

  return parseFloat(diff.toFixed(2));
};

export const detectClashesForEntry = (entry: TimesheetEntry, existingShifts: Shift[]): Clash[] => {
  const clashes: Clash[] = [];

  // Helper to convert time string (HH:MM) to minutes for accurate comparison
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  existingShifts.forEach(existing => {
    // Don't clash with self
    if (existing.userId === auth.currentUser?.uid && existing.id === entry.id) return;

    if (existing.date === entry.date) {
      // Convert times to minutes for accurate overlap check
      const entryStart = timeToMinutes(entry.arrivalTime);
      const entryEnd = timeToMinutes(entry.departureTime);
      const existingStart = timeToMinutes(existing.arrivalTime);
      const existingEnd = timeToMinutes(existing.departureTime);

      // Check for overlap: start1 < end2 AND end1 > start2
      if (entryStart < existingEnd && entryEnd > existingStart) {
        clashes.push({
          id: `clash_${Date.now()}_${Math.random()}`,
          entryId: entry.id,
          conflictingUser: existing.userName,
          conflictingTime: `${formatToRegularTime(existing.arrivalTime)} - ${formatToRegularTime(existing.departureTime)}`,
          message: `Overlaps with ${existing.userName} (${formatToRegularTime(existing.arrivalTime)} - ${formatToRegularTime(existing.departureTime)})`,
          severity: 'warning'
        });
      }
    }
  });

  return clashes;
};

export const getWorkingPeriods = (count: number = 12, year: number = 2026): WorkingPeriod[] => {
  const periods: WorkingPeriod[] = [];

  // Logic: 
  // 1. First period: Jan 26 - Feb 26
  // 2. Subsequent: 27th of prev month - 26th of current month

  let month = 1; // Start with the month ending in February
  let currentYear = year;

  for (let i = 0; i < count; i++) {
    const end = new Date(currentYear, month, 26);
    // Jan 26 - Feb 26 is the exception (starts on 26th)
    // All others start on the 27th of the previous month
    const startDay = (month === 1) ? 26 : 27;
    const start = new Date(currentYear, month - 1, startDay);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const formatLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    periods.push({
      id: `period_${formatDate(start)}_${formatDate(end)}`,
      label: `${formatLabel(start)} – ${formatLabel(end)}`,
      startDate: formatDate(start),
      endDate: formatDate(end)
    });

    month++;
    if (month > 11) {
      month = 0;
      currentYear++;
    }
  }

  return periods;
};

export const formatToRegularTime = (militaryTime: string): string => {
  if (!militaryTime) return '';
  const [hours, minutes] = militaryTime.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};
