import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Calendar, Clock, ChevronDown, Loader2, CheckCircle } from './ui/Icons';
import { TimesheetEntry, Clash, WorkingPeriod, Shift, UserProfile } from '../types';
import { INITIAL_MANUAL_ENTRY } from '../constants';
import { calculateDuration, detectClashesForEntry } from '../utils/timeUtils';
import { auth, db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ManualEntryFlowProps {
  onClashesUpdate: (clashes: Clash[]) => void;
  periods: WorkingPeriod[];
  selectedPeriod: WorkingPeriod;
  onPeriodChange: (period: WorkingPeriod) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
  teamShifts: Shift[];
  userProfile: UserProfile | null;
  onShiftsSubmitted?: (shifts: Shift[]) => Promise<void>;
}

const ManualEntryFlow: React.FC<ManualEntryFlowProps> = ({
  onClashesUpdate,
  periods,
  selectedPeriod,
  onPeriodChange,
  selectedYear,
  onYearChange,
  teamShifts,
  userProfile,
  onShiftsSubmitted
}) => {
  const [entries, setEntries] = useState<TimesheetEntry[]>([INITIAL_MANUAL_ENTRY]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Don't auto-detect clashes anymore - only show hasClash status for validation
  useEffect(() => {
    // Remove entries with incomplete data from showing errors
    const updatedEntries = entries.map(entry => ({ ...entry, hasClash: false }));
    setEntries(updatedEntries);
    onClashesUpdate([]); // Clear clashes on mount/update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.map(e => e.arrivalTime + e.departureTime + e.date).join(',')])

  const addRow = () => {
    const newEntry = {
      ...INITIAL_MANUAL_ENTRY,
      id: `manual_${Date.now()}`,
      date: entries.length > 0 ? entries[entries.length - 1].date : INITIAL_MANUAL_ENTRY.date,
    };
    setEntries([...entries, newEntry]);
  };

  const removeRow = (id: string) => {
    if (entries.length === 1) return;
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof TimesheetEntry, value: string) => {
    setEntries(prev => prev.map(entry => {
      if (entry.id !== id) return entry;

      const updated = { ...entry, [field]: value };

      // Auto-calc hours
      if (field === 'arrivalTime' || field === 'departureTime') {
        updated.hoursWorked = calculateDuration(updated.arrivalTime, updated.departureTime);
      }

      return updated;
    }));
  };

  const handleSave = async () => {
    if (!userProfile?.teamId || !userProfile?.uid) return;

    setIsSubmitting(true);
    try {
      const shiftsRef = collection(db, 'shifts');

      const promises = entries
        .filter(entry => entry.date && entry.arrivalTime && entry.departureTime)
        .map(entry => {
          const shiftData = {
            userId: userProfile.uid,
            userName: userProfile.name,
            teamId: userProfile.teamId,
            date: entry.date,
            arrivalTime: entry.arrivalTime,
            departureTime: entry.departureTime,
            hoursWorked: entry.hoursWorked,
            description: entry.description,
            createdAt: serverTimestamp()
          };
          console.log('💾 Saving shift:', { date: entry.date, arrivalTime: entry.arrivalTime, userName: userProfile.name });
          return addDoc(shiftsRef, shiftData);
        });

      await Promise.all(promises);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);
      // Removed clearing entries as per user request
      // setEntries([{ ...INITIAL_MANUAL_ENTRY, id: Date.now().toString() }]);

      // Build shift objects for optimistic update
      const savedShifts: Shift[] = entries
        .filter(entry => entry.date && entry.arrivalTime && entry.departureTime)
        .map(entry => ({
          id: `temp_${Date.now()}_${Math.random()}`,
          userId: userProfile.uid,
          userName: userProfile.name,
          teamId: userProfile.teamId,
          date: entry.date,
          arrivalTime: entry.arrivalTime,
          departureTime: entry.departureTime,
          hoursWorked: entry.hoursWorked,
          description: entry.description
        }));

      // Notify parent to refresh team shifts
      console.log('📤 Calling onShiftsSubmitted callback...');
      if (onShiftsSubmitted) {
        await onShiftsSubmitted(savedShifts);
        console.log('✅ onShiftsSubmitted callback completed');
      }
    } catch (err) {
      console.error("Error saving shifts:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manual Entry</h2>
          <p className="text-slate-500">Log your hours. Clashes will be highlighted automatically.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Year Dropdown */}
          <div className="relative group">
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(parseInt(e.target.value))}
              className="appearance-none bg-white border border-slate-200 px-4 py-2 pr-10 rounded-lg text-sm font-medium text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 cursor-pointer transition-all hover:border-slate-300"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" />
          </div>

          {/* Period Dropdown */}
          <div className="relative group">
            <select
              value={selectedPeriod.id || ''}
              onChange={(e) => {
                const period = periods.find(p => p.id === e.target.value);
                if (period) onPeriodChange(period);
              }}
              className="appearance-none bg-white border border-slate-200 px-4 py-2 pr-10 rounded-lg text-sm font-medium text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 cursor-pointer transition-all hover:border-slate-300"
            >
              {periods.map(period => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 w-40">Date</th>
                <th className="px-4 py-4 w-32">Arrival</th>
                <th className="px-4 py-4 w-32">Departure</th>
                <th className="px-4 py-4 w-24">Hours</th>
                <th className="px-4 py-4">Description</th>
                <th className="px-4 py-4 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <tr key={entry.id} className={`group transition-colors ${entry.hasClash ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}>
                  <td className="px-4 py-3 align-top">
                    <div className="relative">
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) => updateEntry(entry.id, 'date', e.target.value)}
                        className={`w-full pl-9 pr-3 py-2 bg-white border ${entry.hasClash ? 'border-red-300' : 'border-slate-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow`}
                      />
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="relative">
                      <input
                        type="time"
                        value={entry.arrivalTime}
                        onChange={(e) => updateEntry(entry.id, 'arrivalTime', e.target.value)}
                        className="w-full pl-9 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                      <Clock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="relative">
                      <input
                        type="time"
                        value={entry.departureTime}
                        onChange={(e) => updateEntry(entry.id, 'departureTime', e.target.value)}
                        className="w-full pl-9 pr-2 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      />
                      <Clock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 text-center">
                      {entry.hoursWorked.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <textarea
                      placeholder="Task description..."
                      value={entry.description}
                      onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                      rows={1}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none overflow-hidden focus:min-h-[80px] transition-all"
                    />
                    {entry.hasClash && (
                      <div className="mt-2 flex items-center text-xs text-red-600 animate-pulse">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Overlap detected
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <button
                      onClick={() => removeRow(entry.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={addRow}
            className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Row
          </button>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSubmitting || entries.some(e => e.hasClash)}
              className="flex items-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl shadow-primary-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : submitSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Timesheet Submitted!
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Submit Timesheet
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualEntryFlow;