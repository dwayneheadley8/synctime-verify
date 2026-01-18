import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, ChevronDown } from './ui/Icons';
import { TimesheetEntry, Clash, WorkingPeriod, Shift, UserProfile } from '../types';
import { SAMPLE_EXTRACTED_DATA } from '../constants';
import { detectClashesForEntry } from '../utils/timeUtils';
import { auth, db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { parseCSV, parsePDF, ParsedEntry } from '../utils/documentParser';

interface UploadFlowProps {
  onClashesDetected: (clashes: Clash[]) => void;
  periods: WorkingPeriod[];
  selectedPeriod: WorkingPeriod;
  onPeriodChange: (period: WorkingPeriod) => void;
  selectedYear: number;
  onYearChange: (year: number) => void;
  teamShifts: Shift[];
  userProfile: UserProfile | null;
  onShiftsSubmitted?: (shifts: Shift[]) => Promise<void>;
}

type TabType = 'csv' | 'pdf' | 'manual';

const UploadFlow: React.FC<UploadFlowProps> = ({
  onClashesDetected,
  periods,
  selectedPeriod,
  onPeriodChange,
  selectedYear,
  onYearChange,
  teamShifts,
  userProfile,
  onShiftsSubmitted
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('csv');

  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // PDF state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Shared state
  const [extractedEntries, setExtractedEntries] = useState<ParsedEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Process CSV file
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setIsProcessing(true);
    setError(null);
    setSubmitSuccess(false);

    try {
      const entries = await parseCSV(file);
      if (entries.length > 0) {
        setExtractedEntries(entries);
      } else {
        setError('No valid timesheet entries found in CSV.');
      }
    } catch (err) {
      setError(`Failed to parse CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process PDF file
  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📕 PDF upload started:', file.name);
    setPdfFile(file);
    setIsProcessing(true);
    setError(null);
    setSubmitSuccess(false);

    try {
      console.log('📕 Calling parsePDF...');
      const result = await parsePDF(file);
      console.log('📕 parsePDF returned:', result);
      if (result.entries.length > 0) {
        console.log(`📕 Successfully extracted ${result.entries.length} entries for ${result.worker.name}`);
        setExtractedEntries(result.entries);
      } else {
        console.log('📕 No entries found in PDF');
        setError('No valid timesheet entries found in PDF.');
      }
    } catch (err) {
      console.error('📕 PDF upload error:', err);
      setError(`Failed to parse PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!userProfile?.teamId || !userProfile?.uid) {
      setError('User profile or team not found.');
      return;
    }

    console.log('💾 Starting save process...');
    console.log('💾 Entries to save:', extractedEntries);
    setIsSubmitting(true);
    setError(null);
    try {
      const shiftsRef = collection(db, 'shifts');

      const promises = extractedEntries
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
            description: 'Uploaded via document',
            createdAt: serverTimestamp()
          };
          console.log('💾 Saving shift:', shiftData);
          return addDoc(shiftsRef, shiftData);
        });

      const saved = await Promise.all(promises);
      console.log(`✅ Saved ${saved.length} shifts to Firestore`);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);
      setExtractedEntries([]);
      setCsvFile(null);
      setPdfFile(null);

      // Build shift objects for optimistic update
      const savedShifts: Shift[] = extractedEntries
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
          description: 'Uploaded via document'
        }));

      // Notify parent to refresh team shifts
      console.log('📤 Calling onShiftsSubmitted callback with shifts:', savedShifts);
      if (onShiftsSubmitted) {
        await onShiftsSubmitted(savedShifts);
        console.log('✅ onShiftsSubmitted callback completed');
      }
    } catch (err) {
      console.error('❌ Error saving shifts:', err);
      setError('Failed to save shifts to the database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFlow = () => {
    setCsvFile(null);
    setPdfFile(null);
    setExtractedEntries([]);
    onClashesDetected([]);
    setError(null);
    setSubmitSuccess(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Upload Timesheet</h2>
          <p className="text-slate-500">Upload a CSV, PDF, or enter manually for automatic processing.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Year Dropdown */}
          <div className="relative group">
            <select
              value={selectedYear}
              onChange={(e) => onYearChange(parseInt(e.target.value))}
              className="appearance-none bg-white border border-slate-200 px-4 py-2 pr-10 rounded-lg text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer"
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
              className="appearance-none bg-white border border-slate-200 px-4 py-2 pr-10 rounded-lg text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer"
            >
              {periods.map(period => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 border-b border-slate-200">
        {(['csv', 'pdf', 'manual'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              resetFlow();
            }}
            className={`px-6 py-3 font-semibold transition-all border-b-2 ${activeTab === tab
                ? 'text-primary-600 border-primary-600'
                : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
          >
            {tab === 'csv' && '📄 CSV Upload'}
            {tab === 'pdf' && '📕 PDF Upload'}
            {tab === 'manual' && '✏️ Manual Entry'}
          </button>
        ))}
      </div>

      {/* CSV Tab */}
      {activeTab === 'csv' && (
        <div>
          {!csvFile && !isProcessing && !extractedEntries.length && (
            <div
              onClick={() => csvInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-3xl h-64 flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <input
                type="file"
                className="hidden"
                ref={csvInputRef}
                onChange={handleCSVUpload}
                accept=".csv"
              />
              <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <p className="text-slate-900 font-semibold">Drop your CSV here</p>
              <p className="text-sm text-slate-500 mt-1">Columns: DATE, ARRIVAL TIME, DEPARTURE TIME, HOURS WORKED</p>
            </div>
          )}
        </div>
      )}

      {/* PDF Tab */}
      {activeTab === 'pdf' && (
        <div>
          {!pdfFile && !isProcessing && !extractedEntries.length && (
            <div
              onClick={() => pdfInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-3xl h-64 flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <input
                type="file"
                className="hidden"
                ref={pdfInputRef}
                onChange={handlePDFUpload}
                accept=".pdf"
              />
              <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8" />
              </div>
              <p className="text-slate-900 font-semibold">Drop your PDF here</p>
              <p className="text-sm text-slate-500 mt-1">We'll extract dates and times automatically</p>
            </div>
          )}
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center shadow-sm h-64">
          <div className="relative w-16 h-16 mb-6">
            <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Processing Document...</h3>
          <p className="text-slate-500 text-center max-w-xs">Extracting timesheet data...</p>
        </div>
      )}

      {/* Data Preview */}
      {extractedEntries.length > 0 && !isProcessing && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Data Preview</h3>
                <p className="text-sm text-slate-500">{extractedEntries.length} entries identified</p>
              </div>
            </div>
            <button
              onClick={resetFlow}
              className="text-sm text-slate-500 hover:text-red-600 font-medium transition-colors"
            >
              Discard & Retry
            </button>
          </div>

          {error && (
            <div className="mx-8 mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{error}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Arrival</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Departure</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {extractedEntries.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4 text-slate-900 font-medium">{entry.date}</td>
                    <td className="px-8 py-4 text-slate-600 font-mono text-sm">{entry.arrivalTime}</td>
                    <td className="px-8 py-4 text-slate-600 font-mono text-sm">{entry.departureTime}</td>
                    <td className="px-8 py-4 text-slate-900 font-bold">{entry.hoursWorked}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl shadow-primary-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : submitSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Sent to Team!
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Confirm & Submit
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadFlow;