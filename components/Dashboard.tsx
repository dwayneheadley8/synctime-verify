import React, { useState, useEffect } from 'react';
import { Upload, Plus, Users, FileText, ArrowRight, Trash2 } from './ui/Icons';
import { UserProfile } from '../types';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayRemove } from 'firebase/firestore';

interface DashboardProps {
  onSelectUpload: () => void;
  onSelectManual: () => void;
  userProfile: UserProfile | null;
}

const Dashboard: React.FC<DashboardProps> = ({ onSelectUpload, onSelectManual, userProfile }) => {
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Fetch team members
  useEffect(() => {
    if (!userProfile?.teamId) return;

    const fetchTeamMembers = async () => {
      try {
        setLoadingMembers(true);
        // Query all users with this teamId
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

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-fade-in-up">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Welcome, {userProfile?.name || 'User'}</h1>
        <p className="text-lg text-slate-500 flex items-center justify-center gap-2">
          <Users className="w-5 h-5 text-primary-500" />
          Managing timesheets for <span className="text-slate-900 font-semibold">Team Workspace</span>
        </p>
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