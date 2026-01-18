import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Layers, Trash2, ChevronLeft } from './ui/Icons';
import { BatchParsedResult, Clash, WorkingPeriod, UserProfile } from '../types';
import { parsePDF } from '../utils/documentParser';
import { formatToRegularTime } from '../utils/timeUtils';

interface AdminBatchFlowProps {
    onBack: () => void;
    userProfile: UserProfile | null;
}

const BatchClashCard: React.FC<{ clash: Clash }> = ({ clash }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 hover:border-red-200 transition-all group">
            <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-grow">
                    <p className="text-sm font-bold text-slate-900 mb-1">{clash.message}</p>
                    <p className="text-xs text-slate-500 mb-3">{clash.details?.date}</p>

                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-[10px] font-bold uppercase text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                        {expanded ? 'Collapse Log' : 'Review Extended Log'}
                    </button>

                    {expanded && clash.details && (
                        <div className="mt-4 pt-4 border-t border-red-100 space-y-4 animate-fade-in">
                            <div className="bg-white/60 p-3 rounded-xl border border-red-50">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{clash.details.user1.name}</p>
                                <p className="text-xs font-bold text-slate-900">{clash.details.user1.time}</p>
                                <p className="text-[10px] text-slate-500 italic mt-1">{clash.details.user1.description}</p>
                            </div>
                            <div className="bg-white/60 p-3 rounded-xl border border-red-50">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{clash.details.user2.name}</p>
                                <p className="text-xs font-bold text-slate-900">{clash.details.user2.time}</p>
                                <p className="text-[10px] text-slate-500 italic mt-1">{clash.details.user2.description}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdminBatchFlow: React.FC<AdminBatchFlowProps> = ({ onBack, userProfile }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [results, setResults] = useState<BatchParsedResult[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [clashes, setClashes] = useState<Clash[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files || []);
        if (selectedFiles.length === 0) return;
        setFiles(prev => [...prev, ...selectedFiles]);
        // Reset results if adding new files
        setResults([]);
        setClashes([]);
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
        setResults([]);
        setClashes([]);
    };

    const processBatch = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setError(null);
        const newResults: BatchParsedResult[] = [];

        try {
            for (const file of files) {
                const result = await parsePDF(file);
                newResults.push(result);
            }
            setResults(newResults);
            detectBatchClashes(newResults);
        } catch (err) {
            setError(`Processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const detectBatchClashes = (allResults: BatchParsedResult[]) => {
        const allClashes: Clash[] = [];

        // Compare each worker's entries against every other worker's entries
        for (let i = 0; i < allResults.length; i++) {
            for (let j = i + 1; j < allResults.length; j++) {
                const worker1 = allResults[i];
                const worker2 = allResults[j];

                worker1.entries.forEach(entry1 => {
                    worker2.entries.forEach(entry2 => {
                        if (entry1.date === entry2.date) {
                            const [h1s, m1s] = entry1.arrivalTime.split(':').map(Number);
                            const [h1e, m1e] = entry1.departureTime.split(':').map(Number);
                            const [h2s, m2s] = entry2.arrivalTime.split(':').map(Number);
                            const [h2e, m2e] = entry2.departureTime.split(':').map(Number);

                            const s1 = h1s * 60 + m1s;
                            const e1 = h1e * 60 + m1e;
                            const s2 = h2s * 60 + m2s;
                            const e2 = h2e * 60 + m2e;

                            if (s1 < e2 && e1 > s2) {
                                const dateLabel = new Date(entry1.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                const time1 = `${formatToRegularTime(entry1.arrivalTime)} - ${formatToRegularTime(entry1.departureTime)}`;
                                const time2 = `${formatToRegularTime(entry2.arrivalTime)} - ${formatToRegularTime(entry2.departureTime)}`;

                                allClashes.push({
                                    id: `batch_clash_${Date.now()}_${Math.random()}`,
                                    entryId: 'batch',
                                    conflictingUser: worker2.worker.name,
                                    conflictingTime: time2,
                                    message: `Overlap on ${dateLabel}: ${worker1.worker.name} vs ${worker2.worker.name}`,
                                    severity: 'critical',
                                    details: {
                                        user1: { name: worker1.worker.name, time: time1, description: `File: ${worker1.fileName}` },
                                        user2: { name: worker2.worker.name, time: time2, description: `File: ${worker2.fileName}` },
                                        date: dateLabel
                                    }
                                });
                            }
                        }
                    });
                });
            }
        }
        setClashes(allClashes);
    };

    return (
        <div className="max-w-6xl mx-auto animate-fade-in">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4 text-sm font-medium"
                    >
                        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
                    </button>
                    <h2 className="text-3xl font-bold text-slate-900">Admin Batch Portal</h2>
                    <p className="text-slate-500">Upload multiple worker timesheets for cross-verification.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Upload and File List */}
                <div className="lg:col-span-1 space-y-6">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 rounded-3xl p-8 flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept=".pdf"
                        />
                        <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-slate-900 font-bold">Add timesheets</p>
                        <p className="text-xs text-slate-500 mt-1">Select multiple PDFs</p>
                    </div>

                    {files.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase">Queue ({files.length})</span>
                                <button
                                    onClick={() => { setFiles([]); setResults([]); setClashes([]); }}
                                    className="text-xs text-red-500 hover:text-red-700 font-bold"
                                >
                                    Clear All
                                </button>
                            </div>
                            <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                                {files.map((file, idx) => (
                                    <li key={idx} className="px-4 py-3 flex items-center justify-between group">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                            <span className="text-sm text-slate-700 truncate">{file.name}</span>
                                        </div>
                                        <button
                                            onClick={() => removeFile(idx)}
                                            className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="p-4 bg-slate-50 border-t border-slate-200">
                                <button
                                    disabled={isProcessing || files.length < 2}
                                    onClick={processBatch}
                                    className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Layers className="w-5 h-5" />}
                                    {isProcessing ? 'Processing...' : 'Verify Batch'}
                                </button>
                                {files.length === 1 && <p className="text-[10px] text-amber-600 mt-2 text-center uppercase font-bold">Add at least 2 files to compare</p>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Results and Clashes */}
                <div className="lg:col-span-2 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 mx-auto max-w-md">
                            <AlertCircle className="w-5 h-5" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {results.length > 0 && !isProcessing && (
                        <div className="space-y-6">
                            {/* Workers Identified */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Extracted Data</h3>
                                </div>
                                <div className="divide-y divide-slate-100 overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50">
                                            <tr>
                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Worker Name</th>
                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Position</th>
                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Entries</th>
                                                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {results.map((res, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-900">{res.worker.name}</div>
                                                        <div className="text-[10px] text-slate-400">{res.fileName}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">{res.worker.position}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">{res.entries.length}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Parsed</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Conflict Analysis */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden animate-fade-in-up">
                                <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${clashes.length > 0 ? 'bg-red-500' : 'bg-teal-500'}`}>
                                            {clashes.length > 0 ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold">Conflict Analysis</h3>
                                            <p className="text-xs text-white/60">{clashes.length} clashes detected across {results.length} files</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {clashes.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle className="w-8 h-8" />
                                            </div>
                                            <h4 className="text-lg font-bold text-slate-900">All Clear!</h4>
                                            <p className="text-slate-500">No overlaps found between these {results.length} timesheets.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {clashes.map((clash, idx) => (
                                                <BatchClashCard key={clash.id || idx} clash={clash} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {!isProcessing && results.length === 0 && files.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl h-64 flex flex-col items-center justify-center text-center p-8">
                            <Layers className="w-12 h-12 text-slate-300 mb-4" />
                            <p className="text-slate-500 max-w-xs">Ready to process {files.length} {files.length === 1 ? 'file' : 'files'}. Click 'Verify Batch' to begin extraction and clash detection.</p>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-center h-96">
                            <div className="relative w-20 h-20 mb-6">
                                <div className="absolute inset-0 border-4 border-primary-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Analyzing Batch...</h3>
                            <p className="text-slate-500 max-w-xs">Extracting worker names, positions, and verifying scheduling conflicts across all documents.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminBatchFlow;
