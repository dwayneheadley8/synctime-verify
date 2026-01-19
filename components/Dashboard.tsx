import React, { useState, useEffect } from 'react';
import {
  Upload, Plus, Users, FileText, ArrowRight, Trash2, ChevronLeft,
  AlertCircle, CheckCircle, RefreshCw, Lock, Edit2, ShieldCheck,
  Search, LogOut, Settings, Layers, Folder, Calendar, Layout, User,
  Clock, Database, Archive, ChevronDown, Check, Activity, Grid
} from './ui/Icons';
import AdminBatchFlow from './AdminBatchFlow';
import UploadFlow from './UploadFlow';
import ManualEntryFlow from './ManualEntryFlow';
import ClashPanel from './ClashPanel';
import InviteCodeModal from './InviteCodeModal';
import { UserProfile, ViewState, WorkingPeriod, Shift, Clash, Team } from '../types';
import { db, auth } from '../services/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayRemove, setDoc, arrayUnion } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

interface DashboardProps {
  activeView: ViewState;
  setView: (view: ViewState) => void;
  userProfile: UserProfile | null;
  periods: WorkingPeriod[];
  selectedPeriod: WorkingPeriod;
  onPeriodChange: (p: WorkingPeriod) => void;
  selectedYear: number;
  onYearChange: (y: number) => void;
  teamShifts: Shift[];
  onShiftsSubmitted: (newShifts?: Shift[]) => Promise<void>;
  activeClashes: Clash[];
  handleClashesUpdate: (clashes: Clash[]) => void;
  handleBeginComparison: () => void;
  comparisonStarted: boolean;
  deleteUserSubmissions: (userId: string) => Promise<void>;
  handleResetComparison: () => void;
  onNavigateHome: () => void;
}

type InternalView = 'OVERVIEW' | 'TEAMS' | 'ADMIN_BATCH' | 'SETTINGS' | 'UPLOAD' | 'MANUAL';

const Dashboard: React.FC<DashboardProps> = (props) => {
  const { userProfile, setView: setGlobalView, activeView } = props;
  const [internalView, setInternalView] = useState<InternalView>('OVERVIEW');
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Sync internal view with global view
  useEffect(() => {
    if (activeView === ViewState.UPLOAD) setInternalView('UPLOAD');
    else if (activeView === ViewState.MANUAL) setInternalView('MANUAL');
    else if (activeView === ViewState.DASHBOARD) setInternalView('OVERVIEW');
  }, [activeView]);

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
        querySnapshot.forEach((doc) => { members.push(doc.data() as UserProfile); });
        setTeamMembers(members);
      } catch (err) { console.error('Error fetching members:', err); }
      finally { setLoadingMembers(false); }
    };
    fetchTeamMembers();
  }, [userProfile?.teamId]);

  // Fetch user teams
  useEffect(() => {
    if (!userProfile?.uid) return;
    const fetchUserTeams = async () => {
      try {
        setLoadingTeams(true);
        const teamsRef = collection(db, 'teams');
        const q = query(teamsRef, where('members', 'array-contains', userProfile.uid));
        const querySnapshot = await getDocs(q);
        const teams: Team[] = [];
        querySnapshot.forEach((doc) => { teams.push(doc.data() as Team); });
        setUserTeams(teams);
      } catch (err) { console.error('Error fetching teams:', err); }
      finally { setLoadingTeams(false); }
    };
    fetchUserTeams();
  }, [userProfile?.uid, internalView]);

  const handleSignOut = () => signOut(auth);

  const handleSwitchTeam = async (teamId: string) => {
    if (!userProfile?.uid) return;
    try {
      setLoadingTeams(true);
      await updateDoc(doc(db, 'users', userProfile.uid), { teamId: teamId });
      window.location.reload();
    } catch (err) { console.error('Error switching team:', err); }
    finally { setLoadingTeams(false); }
  };

  const activeTeam = userTeams.find(t => t.id === userProfile?.teamId);

  // Statistics Calculation
  const stats = {
    totalSubmissions: props.teamShifts.length,
    pendingVerifications: props.activeClashes.length,
    approvedHours: Math.round(props.teamShifts.length * 8.5), // Mock calculation
    activeMembers: teamMembers.length
  };

  const SidebarItem = ({ icon: Icon, label, view, badge }: { icon: any, label: string, view: InternalView, badge?: number }) => (
    <button
      onClick={() => setInternalView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${internalView === view
        ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
        }`}
    >
      <Icon className={`w-5 h-5 ${internalView === view ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
      <span className="font-semibold text-sm">{label}</span>
      {badge && (
        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${internalView === view ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
          {badge}
        </span>
      )}
      {internalView === view && (activeView !== ViewState.DASHBOARD && (view === 'OVERVIEW')) && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500"></div>
      )}
    </button>
  );

  const renderActiveView = () => {
    switch (internalView) {
      case 'UPLOAD':
        return (
          <div className="flex flex-col lg:flex-row gap-8 items-start animate-fade-in">
            <div className="flex-grow w-full">
              <UploadFlow
                onClashesDetected={props.handleClashesUpdate}
                periods={props.periods}
                selectedPeriod={props.selectedPeriod}
                onPeriodChange={props.onPeriodChange}
                selectedYear={props.selectedYear}
                onYearChange={props.onYearChange}
                teamShifts={props.teamShifts}
                userProfile={userProfile}
                onShiftsSubmitted={props.onShiftsSubmitted}
              />
            </div>
            <ClashPanel
              clashes={props.activeClashes}
              submitters={teamMembers}
              teamShifts={props.teamShifts}
              onBeginComparison={props.handleBeginComparison}
              comparisonStarted={props.comparisonStarted}
              currentUserId={userProfile?.uid}
              onDeleteSubmission={props.deleteUserSubmissions}
              onResetComparison={props.handleResetComparison}
            />
          </div>
        );
      case 'MANUAL':
        return (
          <div className="flex flex-col lg:flex-row gap-8 items-start animate-fade-in">
            <div className="flex-grow w-full">
              <ManualEntryFlow
                onClashesUpdate={props.handleClashesUpdate}
                periods={props.periods}
                selectedPeriod={props.selectedPeriod}
                onPeriodChange={props.onPeriodChange}
                selectedYear={props.selectedYear}
                onYearChange={props.onYearChange}
                teamShifts={props.teamShifts}
                userProfile={userProfile}
                onShiftsSubmitted={props.onShiftsSubmitted}
              />
            </div>
            <ClashPanel
              clashes={props.activeClashes}
              submitters={teamMembers}
              teamShifts={props.teamShifts}
              onBeginComparison={props.handleBeginComparison}
              comparisonStarted={props.comparisonStarted}
              currentUserId={userProfile?.uid}
              onDeleteSubmission={props.deleteUserSubmissions}
              onResetComparison={props.handleResetComparison}
            />
          </div>
        );
      case 'ADMIN_BATCH':
        return <AdminBatchFlow onBack={() => setInternalView('OVERVIEW')} userProfile={userProfile} />;
      case 'TEAMS':
        return (
          <div className="max-w-4xl mx-auto py-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Team Workspaces</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 text-sm font-semibold border border-primary-200 text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-all flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Invite Team
                </button>
                <button onClick={() => setIsJoining(true)} className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Join Team</button>
                <button onClick={() => setIsCreating(true)} className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all">Create Team</button>
              </div>
            </div>
            {/* Team management list (existing logic) */}
            <div className="grid gap-4">
              {userTeams.map(team => (
                <div key={team.id} className={`p-6 bg-white rounded-2xl border transition-all ${team.id === userProfile?.teamId ? 'border-primary-500 shadow-md' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{team.name}</h3>
                        <p className="text-sm text-slate-400">Code: <span className="font-mono">{team.inviteCode}</span> • {team.members.length} members</p>
                      </div>
                    </div>
                    {team.id !== userProfile?.teamId && (
                      <button onClick={() => handleSwitchTeam(team.id)} className="px-4 py-2 text-sm font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all">Switch</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'OVERVIEW':
      default:
        return (
          <div className="animate-fade-in space-y-10">
            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-[24px] text-white shadow-lg shadow-blue-500/20">
                <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-2">Total Submissions</p>
                <h3 className="text-4xl font-black mb-2">{stats.totalSubmissions}</h3>
                <p className="text-blue-100 text-[10px]">Total number of timesheets</p>
              </div>
              <div className="bg-blue-600 p-6 rounded-[24px] text-white shadow-lg shadow-blue-600/20">
                <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-2">Pending Clashes</p>
                <h3 className="text-4xl font-black mb-2">{stats.pendingVerifications}</h3>
                <p className="text-blue-100 text-[10px]">Verify collisions in batch</p>
              </div>
              <div className="bg-blue-700 p-6 rounded-[24px] text-white shadow-lg shadow-blue-700/20">
                <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-2">Total Hours</p>
                <h3 className="text-4xl font-black mb-2">{stats.approvedHours}</h3>
                <p className="text-blue-100 text-[10px]">Estimated total duration</p>
              </div>
              <div className="bg-blue-800 p-6 rounded-[24px] text-white shadow-lg shadow-blue-800/20">
                <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider mb-2">Active Members</p>
                <h3 className="text-4xl font-black mb-2">{stats.activeMembers}</h3>
                <p className="text-blue-100 text-[10px]">Staff in current workspace</p>
              </div>
            </div>

            {/* Recent Submissions Section */}
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-900">Recent Submissions</h2>
                  <ArrowRight className="w-5 h-5 text-slate-300" />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400">Filter by</span>
                  <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-200">
                    <option>This month</option>
                    <option>Last month</option>
                    <option>This year</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {props.teamShifts.slice(0, 5).map((shift, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all group border border-transparent hover:border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{shift.userName}</h4>
                        <p className="text-xs text-slate-400">{shift.date} • {shift.arrivalTime} - {shift.departureTime}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{Math.round(Math.random() * 10 + 5)} MB</p>
                      <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Digitized</span>
                    </div>
                  </div>
                ))}
                {props.teamShifts.length === 0 && (
                  <div className="py-20 text-center">
                    <Archive className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                    <p className="text-slate-400">No submissions found in the current period.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col h-full shadow-2xl shadow-slate-200 z-50">
        <div className="p-8 flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-lg">
            <span className="text-white font-black">S</span>
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tighter">SyncTime</span>
        </div>

        <div className="px-4 mb-8">
          <button
            onClick={() => setInternalView('UPLOAD')}
            className="w-full flex items-center justify-center gap-2 py-4 bg-white text-slate-900 border-2 border-slate-100 shadow-sm rounded-2xl font-black text-sm hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5 text-primary-500" strokeWidth={3} />
            New Entry
          </button>
        </div>

        <nav className="flex-grow px-4 space-y-2">
          <SidebarItem icon={Layout} label="Overview" view="OVERVIEW" />
          <SidebarItem icon={Activity} label="Auto-Extraction" view="UPLOAD" />
          <SidebarItem icon={Edit2} label="Manual Entry" view="MANUAL" />
          <SidebarItem icon={ShieldCheck} label="Admin Portal" view="ADMIN_BATCH" />
          <SidebarItem icon={Users} label="Workspaces" view="TEAMS" badge={userTeams.length} />
          <SidebarItem icon={Settings} label="Settings" view="SETTINGS" />
        </nav>

        <div className="p-8 space-y-6">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Sync Usage</p>
              <p className="text-xs text-slate-600 mb-4 font-medium leading-relaxed">Monthly timesheet quota updated <span className="text-slate-900 font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-primary-500 rounded-full w-[71%] shadow-sm"></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-900">
                <span>71%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all group font-bold text-sm"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col h-full overflow-hidden bg-[#f8fafc]">
        {/* Header */}
        <header className="h-24 px-10 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Hello {userProfile?.name?.split(' ')[0] || 'User'}</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} • {activeTeam?.name || 'Workspace'}
                </p>
              </div>
            </div>
            {userProfile?.role === 'admin' && (
              <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-amber-200 shadow-sm shadow-amber-200/20">
                <ShieldCheck className="w-3 h-3" />
                Admin
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              <input
                type="text"
                placeholder="Search submissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-100 border-none rounded-2xl py-3 pl-11 pr-6 text-sm font-medium w-64 focus:ring-4 focus:ring-slate-100 focus:bg-white transition-all outline-none"
              />
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer group">
              <User className="w-5 h-5 text-slate-900 group-hover:scale-110 transition-transform" />
            </div>
          </div>
        </header>

        {/* Dynamic Viewport */}
        <div className="flex-grow overflow-y-auto p-10 custom-scrollbar scroll-smooth">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight capitalize">{internalView.toLowerCase().replace('_', ' ')}</h2>
                {internalView === 'OVERVIEW' && (
                  <button className="p-2 hover:bg-slate-200 rounded-xl transition-all">
                    <RefreshCw className="w-5 h-5 text-slate-400 hover:rotate-180 transition-transform duration-700" />
                  </button>
                )}
              </div>
              {(internalView === 'UPLOAD' || internalView === 'MANUAL') && (
                <button
                  onClick={() => setInternalView('OVERVIEW')}
                  className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Overview
                </button>
              )}
            </div>

            {renderActiveView()}
          </div>
        </div>
      </main>

      {/* Invite Code Modal handled globally or via Settings tab */}
      {/* Invite Code Modal */}
      {userProfile?.teamId && (
        <InviteCodeModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          teamId={userProfile.teamId}
        />
      )}
    </div>
  );
};

export default Dashboard;