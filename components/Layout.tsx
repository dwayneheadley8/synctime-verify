import React, { useState } from 'react';
import { LogOut, Users as UsersIcon, ChevronDown } from './ui/Icons';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import InviteCodeModal from './InviteCodeModal';
import { UserProfile } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigateHome: () => void;
  userProfile?: UserProfile | null;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigateHome, userProfile }) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-[#82e761] selection:text-[#031b29]">
      {/* Navigation Bar - Matching Landing Page */}
      <nav className="fixed top-0 w-full z-50 bg-[#031b29] text-white border-b border-white/10 h-20 shadow-md">
        <div className="max-w-[1400px] mx-auto px-6 h-full flex items-center justify-between">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onNavigateHome}
          >
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
              <span className="text-[#031b29] font-bold text-xl">S</span>
            </div>
            <span className="text-2xl font-bold tracking-tight font-montserrat">SyncTime</span>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-6">
            {/* Invite Team Button - Only for Admin */}
            {userProfile?.teamId && userProfile?.role === 'admin' && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-medium transition-all border border-white/20"
              >
                <UsersIcon className="w-4 h-4" />
                Invite Team
              </button>
            )}

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                  <span className="text-sm font-semibold">{userProfile?.name?.charAt(0) || 'U'}</span>
                </div>
                <ChevronDown className="w-4 h-4 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900">{userProfile?.name || 'User'}</p>
                      <p className="text-xs text-slate-500">{userProfile?.email}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {children}
      </main>

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

export default Layout;