import React, { useState, useEffect } from 'react';
import { X, Copy, CheckCircle } from './ui/Icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface InviteCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamId: string;
}

const InviteCodeModal: React.FC<InviteCodeModalProps> = ({ isOpen, onClose, teamId }) => {
    const [inviteCode, setInviteCode] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInviteCode = async () => {
            if (!teamId) return;

            try {
                const teamDoc = await getDoc(doc(db, 'teams', teamId));
                if (teamDoc.exists()) {
                    setInviteCode(teamDoc.data().inviteCode || '');
                }
            } catch (error) {
                console.error('Error fetching invite code:', error);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            fetchInviteCode();
        }
    }, [isOpen, teamId]);

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#031b29] rounded-3xl max-w-md w-full p-8 relative shadow-2xl border border-white/10 animate-fade-in-up">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white mb-3">Team Invite Code</h2>
                    <p className="text-gray-400 mb-8">Share this code with your team members to join</p>

                    {loading ? (
                        <div className="py-8">
                            <div className="w-12 h-12 border-4 border-[#82e761] border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </div>
                    ) : (
                        <>
                            {/* Invite Code Display */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                                <div className="text-6xl font-mono font-bold text-[#82e761] tracking-[0.3em] mb-2">
                                    {inviteCode}
                                </div>
                                <p className="text-xs text-gray-500">6-character invite code</p>
                            </div>

                            {/* Copy Button */}
                            <button
                                onClick={handleCopy}
                                className="w-full py-4 bg-[#82e761] hover:bg-[#6fd650] text-[#031b29] font-bold text-lg rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-5 h-5" />
                                        Copy Code
                                    </>
                                )}
                            </button>

                            {/* Instructions */}
                            <div className="mt-6 text-left bg-white/5 rounded-xl p-4">
                                <p className="text-sm text-gray-400 mb-2">
                                    <span className="font-semibold text-white">How to share:</span>
                                </p>
                                <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                                    <li>Copy the code above</li>
                                    <li>Send it to your team member</li>
                                    <li>They can use it during sign-up to join your team</li>
                                </ol>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InviteCodeModal;
