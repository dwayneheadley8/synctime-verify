import React from 'react';
import { Clash, Shift } from '../types';
import { AlertCircle, CheckCircle, Users, Trash2 } from './ui/Icons';

interface ClashPanelProps {
  clashes: Clash[];
  submitters: { uid: string; name: string }[];
  teamShifts: Shift[];
  onBeginComparison: () => void;
  comparisonStarted: boolean;
  currentUserId?: string;
  onDeleteSubmission?: (userId: string) => Promise<void>;
  onResetComparison?: () => void;
}

const ClashPanel: React.FC<ClashPanelProps> = ({ clashes, submitters, teamShifts, onBeginComparison, comparisonStarted, currentUserId, onDeleteSubmission, onResetComparison }) => {
  const submitterCount = submitters.length;

  // Show submission status first
  if (!comparisonStarted) {
    if (submitterCount === 0) {
      return (
        <div className="w-full mt-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-xl text-slate-900 font-semibold mb-2">Waiting for Submissions</h3>
            <p className="text-slate-500 max-w-md">Team members need to submit their timesheets to begin comparison.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full lg:w-80 shrink-0 lg:sticky lg:top-24 mt-8 lg:mt-0">
        <div className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm shadow-blue-100/50">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <h3 className="font-semibold text-slate-900">Submissions Received ({submitterCount})</h3>
          </div>

          <div className="space-y-3 mb-6">
            {submitters.map((submitter) => (
              <div key={submitter.uid} className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center gap-3 justify-between group">
                <div className="flex items-center gap-3 flex-grow min-w-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {submitter.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{submitter.name}</p>
                    <p className="text-xs text-slate-500">{teamShifts.filter(s => s.userId === submitter.uid).length} shifts</p>
                  </div>
                </div>
                {currentUserId === submitter.uid && onDeleteSubmission && (
                  <button
                    onClick={() => onDeleteSubmission(submitter.uid)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-2 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"
                    title="Delete your submission"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {submitterCount >= 2 && (
            <button
              onClick={onBeginComparison}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Begin Comparison
            </button>
          )}

          {submitterCount === 1 && (
            <p className="text-xs text-slate-400 text-center">
              Waiting for at least one more team member to submit.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show comparison results
  if (clashes.length === 0) {
    return (
      <div className="w-full mt-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl text-slate-900 font-semibold mb-2">No Conflicts</h3>
          <p className="text-slate-500 max-w-md mb-6">All {submitterCount} timesheet submissions are compatible and do not overlap.</p>
          {onResetComparison && (
            <button
              onClick={onResetComparison}
              className="text-sm px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium rounded-lg transition-colors"
            >
              Back to Submissions
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-96 shrink-0 lg:sticky lg:top-24 mt-8 lg:mt-0">
      <div className="bg-white rounded-2xl border border-red-100 p-6 shadow-sm shadow-red-100/50">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <h3 className="font-semibold text-slate-900">Conflicts Found ({clashes.length})</h3>
        </div>

        <div className="space-y-4">
          {clashes.map((clash) => {
            const [showLog, setShowLog] = React.useState(false);

            return (
              <div key={clash.id} className="p-4 bg-red-50/50 border border-red-100 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-medium text-slate-900 mb-1">Time Overlap</p>
                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      {clash.message}
                    </p>

                    {clash.details && (
                      <>
                        <button
                          onClick={() => setShowLog(!showLog)}
                          className="text-[10px] font-bold uppercase tracking-wider text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
                        >
                          {showLog ? 'Hide Extended Log' : 'Show Extended Log'}
                        </button>

                        {showLog && (
                          <div className="mt-4 space-y-4 border-t border-red-100 pt-4 animate-fade-in">
                            {/* User 1 Details */}
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{clash.details.user1.name} (Submission)</p>
                              <div className="bg-white/60 p-2 rounded-lg border border-red-50">
                                <p className="text-[11px] font-bold text-slate-900 mb-1">{clash.details.user1.time}</p>
                                <p className="text-[11px] text-slate-600 italic leading-snug">
                                  {clash.details.user1.description || 'No description provided'}
                                </p>
                              </div>
                            </div>

                            {/* User 2 Details */}
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{clash.details.user2.name} (Submission)</p>
                              <div className="bg-white/60 p-2 rounded-lg border border-red-50">
                                <p className="text-[11px] font-bold text-slate-900 mb-1">{clash.details.user2.time}</p>
                                <p className="text-[11px] text-slate-600 italic leading-snug">
                                  {clash.details.user2.description || 'No description provided'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-4">
          <p className="text-xs text-slate-400 text-center">
            {submitterCount} team members submitted shifts. {clashes.length} overlap(s) detected.
          </p>
          {onResetComparison && (
            <button
              onClick={onResetComparison}
              className="w-full text-sm px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium rounded-lg transition-colors"
            >
              Back to Submissions
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClashPanel;