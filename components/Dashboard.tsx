import React, { useState, useEffect } from 'react';
import { Upload, Plus, Users, FileText, ArrowRight, Trash2, ChevronLeft, AlertCircle, CheckCircle, RefreshCw, Lock, Edit2, ShieldCheck } from './ui/Icons';
import AdminBatchFlow from './AdminBatchFlow';
import { UserProfile } from '../types';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayRemove, setDoc, arrayUnion } from 'firebase/firestore';
import { auth } from '../services/firebase';
import { Team } from '../types';

interface DashboardProps {
  onSelectUpload: () => void;
  onSelectManual: () => void;
  userProfile: UserProfile | null;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectUpload, onSelectManual, userProfile }) => {
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [view, setView] = useState<'MAIN' | 'TEAMS' | 'ADMIN_BATCH'>('MAIN');
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch team members
  useEffect(() => {
    if (!userProfile?.teamId) return;

    const fetchTeamMembers = async () => {
      try {
        setLoadingMembers(true);
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('teamId', '==', userProfile.teamId));
        const querySnapshot = await getDocs(q);

        const members: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          members.push(doc.data() as UserProfile);
        });

        setTeamMembers(members);
      } catch (err) {
        console.error('Error fetching team members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchTeamMembers();
  }, [userProfile?.teamId]);

  // Fetch all teams user belongs to
  useEffect(() => {
    if (!userProfile?.uid) return;

    const fetchUserTeams = async () => {
      try {
        setLoadingTeams(true);
        const teamsRef = collection(db, 'teams');
        const q = query(teamsRef, where('members', 'array-contains', userProfile.uid));
        const querySnapshot = await getDocs(q);

        const teams: Team[] = [];
        querySnapshot.forEach((doc) => {
          teams.push(doc.data() as Team);
        });

        setUserTeams(teams);
      } catch (err) {
        console.error('Error fetching user teams:', err);
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchUserTeams();
  }, [userProfile?.uid, view]);

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.uid) return;
    setLoadingTeams(true);
    setError('');

    try {
      const teamId = `team_${Date.now()}`;
      const code = generateInviteCode();

      const teamData = {
        id: teamId,
        name: newTeamName,
        inviteCode: code,
        createdBy: userProfile.uid,
        members: [userProfile.uid],
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'teams', teamId), teamData);

      // Update user to have this new teamId as active
      await updateDoc(doc(db, 'users', userProfile.uid), {
        teamId: teamId,
        role: 'admin'
      });

      setSuccess(`Team "${newTeamName}" created successfully!`);
      setNewTeamName('');
      setIsCreating(false);
      // Wait a bit then refresh
      setTimeout(() => {
        window.location.reload(); // Simplest way to refresh all state from App.tsx
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to create team');
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.uid) return;
    setLoadingTeams(true);
    setError('');

    try {
      const q = query(collection(db, 'teams'), where('inviteCode', '==', inviteCode.toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Invalid invite code');
      }

      const teamDoc = querySnapshot.docs[0];
      const teamId = teamDoc.id;
      const teamData = teamDoc.data() as Team;

      if (teamData.members.includes(userProfile.uid)) {
        throw new Error('You are already a member of this team');
      }

      await updateDoc(doc(db, 'teams', teamId), {
        members: arrayUnion(userProfile.uid)
      });

      await updateDoc(doc(db, 'users', userProfile.uid), {
        teamId: teamId
      });

      setSuccess(`Joined team successfully!`);
      setInviteCode('');
      setIsJoining(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to join team');
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleSwitchTeam = async (teamId: string) => {
    if (!userProfile?.uid) return;
    try {
      setLoadingTeams(true);
      await updateDoc(doc(db, 'users', userProfile.uid), {
        teamId: teamId
      });
      window.location.reload();
    } catch (err) {
      console.error('Error switching team:', err);
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleRenameTeam = async (teamId: string) => {
    if (!renameValue.trim()) return;
    setLoadingTeams(true);
    setError('');

    try {
      await updateDoc(doc(db, 'teams', teamId), {
        name: renameValue.trim()
      });

      setSuccess('Team renamed successfully!');
      setEditingTeamId(null);
      setRenameValue('');

      // Update local state
      setUserTeams(userTeams.map(t => t.id === teamId ? { ...t, name: renameValue.trim() } : t));
    } catch (err: any) {
      setError(err.message || 'Failed to rename team');
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleRemoveUser = async (userToRemoveUid: string) => {
    if (!userProfile?.teamId) return;

    try {
      // Update the team to remove the user from members array
      await updateDoc(doc(db, 'teams', userProfile.teamId), {
        members: arrayRemove(userToRemoveUid)
      });

      // Update the user to remove teamId
      await updateDoc(doc(db, 'users', userToRemoveUid), {
        teamId: null
      });

      // Update local state
      setTeamMembers(teamMembers.filter(member => member.uid !== userToRemoveUid));
    } catch (err) {
      console.error('Error removing user:', err);
    }
  };

  const activeTeam = userTeams.find(t => t.id === userProfile?.teamId);

  if (view === 'ADMIN_BATCH') {
    return <AdminBatchFlow onBack={() => setView('MAIN')} userProfile={userProfile} />;
  }

  if (view === 'TEAMS') {
    return (
      <div className="w-full max-w-4xl animate-fade-in-up py-8">
        <button
          onClick={() => setView('MAIN')}
          className="flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors mb-8"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </button>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Team Management</h1>
            <p className="text-slate-500">Manage your workspaces and team collaborations</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => { setIsJoining(true); setIsCreating(false); setError(''); setSuccess(''); }}
              className="flex-1 md:flex-none px-6 py-2.5 bg-white border border-slate-200 text-slate-900 font-semibold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" /> Join Team
            </button>
            <button
              onClick={() => { setIsCreating(true); setIsJoining(false); setError(''); setSuccess(''); }}
              className="flex-1 md:flex-none px-6 py-2.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all shadow-md shadow-primary-500/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Team
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl text-green-700 text-sm flex items-center gap-2 animate-bounce">
            <CheckCircle className="w-4 h-4" /> {success}
          </div>
        )}

        {isJoining && (
          <form onSubmit={handleJoinTeam} className="mb-8 bg-white p-6 rounded-2xl border border-primary-100 shadow-sm animate-fade-in">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Join New Team</h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="ENTER INVITE CODE"
                className="flex-grow px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 uppercase font-mono tracking-widest"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loadingTeams}
                className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {loadingTeams ? 'Joining...' : 'Join'}
              </button>
              <button
                type="button"
                onClick={() => setIsJoining(false)}
                className="px-4 py-2 text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {isCreating && (
          <form onSubmit={handleCreateTeam} className="mb-8 bg-white p-6 rounded-2xl border border-primary-100 shadow-sm animate-fade-in">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Create New Team</h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Team Name"
                className="flex-grow px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loadingTeams}
                className="px-6 py-2 bg-primary-600 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {loadingTeams ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 gap-4">
          {loadingTeams ? (
            <div className="flex justify-center py-12">
              <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
            </div>
          ) : userTeams.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500">You're not a member of any teams yet.</p>
            </div>
          ) : (
            userTeams.map((team) => (
              <div
                key={team.id}
                className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6 bg-white rounded-2xl border transition-all ${team.id === userProfile?.teamId
                  ? 'border-primary-500 shadow-md shadow-primary-500/5'
                  : 'border-slate-200 hover:border-primary-200'
                  }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${team.id === userProfile?.teamId ? 'bg-primary-50 text-primary-600' : 'bg-slate-50 text-slate-400'
                  }`}>
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex-grow w-full">
                  <div className="flex items-center gap-2">
                    {editingTeamId === team.id ? (
                      <div className="flex items-center gap-2 flex-grow max-w-sm">
                        <input
                          type="text"
                          className="w-full px-3 py-1 text-sm border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameTeam(team.id);
                            if (e.key === 'Escape') setEditingTeamId(null);
                          }}
                        />
                        <button
                          onClick={() => handleRenameTeam(team.id)}
                          className="text-primary-600 hover:text-primary-700 text-sm font-bold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTeamId(null)}
                          className="text-slate-400 hover:text-slate-600 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-lg font-bold text-slate-900">{team.name}</h3>
                        {team.createdBy === userProfile?.uid && (
                          <button
                            onClick={() => {
                              setEditingTeamId(team.id);
                              setRenameValue(team.name);
                              setError('');
                              setSuccess('');
                            }}
                            className="p-1 text-slate-400 hover:text-primary-600 transition-colors"
                            title="Rename Team"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {team.id === userProfile?.teamId && (
                          <span className="bg-primary-100 text-primary-700 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold">Active</span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-sm text-slate-400 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {team.members.length} members
                    </p>
                    <p className="text-sm text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Code: <span className="font-mono text-slate-600">{team.inviteCode}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                  {team.id !== userProfile?.teamId && (
                    <button
                      onClick={() => handleSwitchTeam(team.id)}
                      disabled={loadingTeams}
                      className="w-full sm:w-auto px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      Switch
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-fade-in-up">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Welcome, {userProfile?.name || 'User'}</h1>
        <div className="flex flex-col items-center gap-3">
          <p className="text-lg text-slate-500 flex items-center justify-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            Managing timesheets for <span className="text-slate-900 font-semibold">{activeTeam?.name || 'Team Workspace'}</span>
          </p>
          <button
            onClick={() => setView('TEAMS')}
            className="text-primary-600 text-sm font-semibold hover:text-primary-700 flex items-center gap-1 group"
          >
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            Switch or Manage Teams
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mt-8">
        {/* Upload Card */}
        <div
          onClick={onSelectUpload}
          className="group relative bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-primary-500/30 transition-all duration-300 cursor-pointer flex flex-col items-start"
        >
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Upload className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Upload PDF / Image</h3>
          <p className="text-slate-500 mb-8 flex-grow">
            Automatically extract data using OCR. Best for paper timesheets or scanned PDFs.
          </p>
          <div className="flex items-center text-blue-600 font-medium group-hover:translate-x-1 transition-transform">
            Start Upload <ArrowRight className="w-4 h-4 ml-2" />
          </div>
        </div>

        {/* Manual Entry Card */}
        <div
          onClick={onSelectManual}
          className="group relative bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-primary-500/30 transition-all duration-300 cursor-pointer flex flex-col items-start"
        >
          <div className="w-14 h-14 bg-teal-50 text-primary-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Manual Entry</h3>
          <p className="text-slate-500 mb-8 flex-grow">
            Input hours directly with real-time validation. Best for digital corrections or new entries.
          </p>
          <div className="flex items-center text-primary-600 font-medium group-hover:translate-x-1 transition-transform">
            Create Entry <ArrowRight className="w-4 h-4 ml-2" />
          </div>
        </div>

        {/* Admin Portal Card */}
        {userProfile?.role === 'admin' && (
          <div
            onClick={() => setView('ADMIN_BATCH')}
            className="group relative bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-primary-500/30 transition-all duration-300 cursor-pointer flex flex-col items-start overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-primary-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30 mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Admin Batch Portal</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                Upload multiple timesheets for different workers and verify clashes across the entire batch.
              </p>
              <div className="flex items-center gap-2 text-primary-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                Open Portal <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Team Members Section */}
      <div className="w-full max-w-4xl mt-16">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-slate-900">Team Members</h2>
            <span className="ml-auto bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
              {teamMembers.length}
            </span>
          </div>

          {loadingMembers ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
            </div>
          ) : teamMembers.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No team members yet. Share your invite code to add members!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map((member) => (
                <div
                  key={member.uid}
                  className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary-200 hover:bg-primary-50 transition-all group"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {member.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 truncate">{member.name || 'User'}</p>
                      {member.role === 'admin' && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Admin</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{member.email}</p>
                  </div>
                  {/* Remove button - only for admin and not themselves */}
                  {userProfile?.role === 'admin' && userProfile?.uid !== member.uid && (
                    <button
                      onClick={() => handleRemoveUser(member.uid)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-100 rounded-lg text-red-600 flex-shrink-0"
                      title="Remove from team"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;