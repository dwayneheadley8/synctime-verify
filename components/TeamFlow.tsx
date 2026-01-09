import React, { useState } from 'react';
import {
    collection,
    doc,
    setDoc,
    updateDoc,
    query,
    where,
    getDocs,
    arrayUnion
} from 'firebase/firestore';
import { Plus, Users, ArrowRight, Loader2, CheckCircle, Sparkles } from './ui/Icons';
import { db, auth } from '../services/firebase';

interface TeamFlowProps {
    onTeamJoined: () => void;
    onBackToLanding?: () => void;
}

const TeamFlow: React.FC<TeamFlowProps> = ({ onTeamJoined, onBackToLanding }) => {
    const [teamName, setTeamName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [view, setView] = useState<'CHOICE' | 'CREATE' | 'JOIN'>('CHOICE');

    const generateInviteCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Not authenticated');

            const teamId = `team_${Date.now()}`;
            const code = generateInviteCode();

            const teamData = {
                id: teamId,
                name: teamName,
                inviteCode: code,
                createdBy: user.uid,
                members: [user.uid],
                createdAt: new Date().toISOString()
            };

            await setDoc(doc(db, 'teams', teamId), teamData);

            await updateDoc(doc(db, 'users', user.uid), {
                teamId: teamId,
                role: 'admin'
            });

            onTeamJoined();
        } catch (err: any) {
            setError(err.message || 'Failed to create team');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Not authenticated');

            const q = query(collection(db, 'teams'), where('inviteCode', '==', inviteCode.toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error('Invalid invite code');
            }

            const teamDoc = querySnapshot.docs[0];
            const teamId = teamDoc.id;

            await updateDoc(doc(db, 'teams', teamId), {
                members: arrayUnion(user.uid)
            });

            await updateDoc(doc(db, 'users', user.uid), {
                teamId: teamId
            });

            onTeamJoined();
        } catch (err: any) {
            setError(err.message || 'Failed to join team');
        } finally {
            setLoading(false);
        }
    };

    if (view === 'CHOICE') {
        return (
            <div className="min-h-screen bg-[#031b29] text-white font-sans overflow-hidden selection:bg-[#82e761] selection:text-[#031b29] flex items-center justify-center px-6 py-12 relative">
                {/* Background Gradients */}
                <div className="absolute top-0 right-0 w-[60%] h-[80%] bg-gradient-to-b from-[#0f4c75] to-[#1b998b] opacity-20 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/4 pointer-events-none"></div>


                <div className="max-w-5xl w-full relative z-10 animate-fade-in-up">
                    <div className="text-center mb-12">
                        <h2 className="text-5xl font-extrabold text-white mb-4 tracking-tight">
                            You're in! Now, select your team.
                        </h2>
                        <p className="text-gray-400 text-xl max-w-2xl mx-auto">
                            Create a new workspace for your team or join an existing one with an invite code.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Create Team Card */}
                        <div
                            onClick={() => setView('CREATE')}
                            className="group p-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-2xl hover:shadow-[0_8px_30px_rgba(130,231,97,0.3)] hover:border-[#82e761]/30 transition-all cursor-pointer text-center relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-[#82e761]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative z-10">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                                    <Plus className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">Create a Team</h3>
                                <p className="text-gray-400 mb-6 leading-relaxed">
                                    Start a new project and invite your colleagues to collaborate.
                                </p>
                                <div className="flex items-center justify-center text-[#82e761] font-semibold text-lg">
                                    Get Started
                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </div>

                        {/* Join Team Card */}
                        <div
                            onClick={() => setView('JOIN')}
                            className="group p-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-2xl hover:shadow-[0_8px_30px_rgba(130,231,97,0.3)] hover:border-[#82e761]/30 transition-all cursor-pointer text-center relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-[#82e761]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative z-10">
                                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                                    <Users className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">Join a Team</h3>
                                <p className="text-gray-400 mb-6 leading-relaxed">
                                    Enter an invite code to join your team's workspace.
                                </p>
                                <div className="flex items-center justify-center text-[#82e761] font-semibold text-lg">
                                    Join Existing
                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#031b29] text-white font-sans overflow-hidden selection:bg-[#82e761] selection:text-[#031b29] flex items-center justify-center px-6 py-12 relative">
            {/* Background Gradients */}
            <div className="absolute top-0 right-0 w-[60%] h-[80%] bg-gradient-to-b from-[#0f4c75] to-[#1b998b] opacity-20 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/4 pointer-events-none"></div>

            <div className="max-w-md w-full relative z-10 animate-fade-in-up">
                {/* Logo Header */}
                <div className="text-center mb-12">
                    <button
                        onClick={onBackToLanding}
                        className="inline-flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none"
                    >
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-lg">
                            <span className="text-[#031b29] font-bold text-lg">S</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight font-montserrat text-white">SyncTime</span>
                    </button>
                </div>

                <button
                    onClick={() => setView('CHOICE')}
                    className="text-gray-400 hover:text-[#82e761] mb-6 flex items-center mx-auto transition-colors"
                >
                    <ArrowRight className="w-4 h-4 mr-1 rotate-180" /> Back to options
                </button>

                <h2 className="text-4xl font-extrabold text-white mb-3 tracking-tight">
                    {view === 'CREATE' ? 'Create Your Team' : 'Join a Team'}
                </h2>
                <p className="text-gray-400 text-lg">
                    {view === 'CREATE' ? 'Set up your workspace' : 'Enter your invite code'}
                </p>
            </div>

            {/* Main Card */}
            <div className="bg-white/5 backdrop-blur-xl rounded-[32px] border border-white/10 shadow-2xl overflow-hidden">
                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm backdrop-blur-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={view === 'CREATE' ? handleCreateTeam : handleJoinTeam} className="space-y-5">
                        {view === 'CREATE' ? (
                            <div className="relative group">
                                <label className="text-sm font-semibold text-gray-300 ml-1 mb-2 block">Team Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Marketing Department"
                                    required
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#82e761]/50 focus:border-[#82e761]/50 text-white placeholder-gray-500 transition-all backdrop-blur-sm"
                                />
                            </div>
                        ) : (
                            <div className="relative group">
                                <label className="text-sm font-semibold text-gray-300 ml-1 mb-2 block">Invite Code</label>
                                <input
                                    type="text"
                                    placeholder="ABCDEF"
                                    required
                                    maxLength={6}
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#82e761]/50 focus:border-[#82e761]/50 text-white placeholder-gray-500 transition-all backdrop-blur-sm text-center tracking-[0.5em] font-mono text-2xl uppercase"
                                />
                                <p className="text-xs text-gray-500 mt-2 ml-1">Enter the 6-character code from your team admin</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-[#82e761] hover:bg-[#6fd650] hover:scale-[1.02] text-[#031b29] font-bold text-lg rounded-2xl shadow-[0_4px_20px_rgba(130,231,97,0.4)] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 mt-6"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {view === 'CREATE' ? 'Create Workspace' : 'Join Workspace'}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TeamFlow;
