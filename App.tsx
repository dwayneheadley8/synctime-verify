import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import UploadFlow from './components/UploadFlow';
import ManualEntryFlow from './components/ManualEntryFlow';
import ClashPanel from './components/ClashPanel';
import LandingPage from './components/LandingPage';
import AuthFlow from './components/AuthFlow';
import TeamFlow from './components/TeamFlow';
import { ViewState, Clash, WorkingPeriod, UserProfile, Shift } from './types';
import { ChevronLeft } from './components/ui/Icons';
import { getWorkingPeriods, formatToRegularTime } from './utils/timeUtils';
import { auth, db } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.LANDING);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeClashes, setActiveClashes] = useState<Clash[]>([]);
  const [teamShifts, setTeamShifts] = useState<Shift[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const initialPeriods = getWorkingPeriods(12, 2026);
  const [periods, setPeriods] = useState<WorkingPeriod[]>(initialPeriods);
  const [selectedPeriod, setSelectedPeriod] = useState<WorkingPeriod>(initialPeriods[0]);
  const [comparisonStarted, setComparisonStarted] = useState(false);

  // Update periods when year changes
  useEffect(() => {
    const newPeriods = getWorkingPeriods(12, selectedYear);
    setPeriods(newPeriods);
    setSelectedPeriod(newPeriods[0]);
  }, [selectedYear]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch additional user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setUser(userData);

          if (!userData.teamId) {
            setView(ViewState.TEAM);
          } else if (view === ViewState.AUTH) {
            setView(ViewState.DASHBOARD);
          }
        } else {
          // Fallback if doc not yet created
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User'
          });
          setView(ViewState.TEAM);
        }
      } else {
        setUser(null);
        if (view !== ViewState.LANDING && view !== ViewState.AUTH) setView(ViewState.LANDING);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [view]);

  // Fetch team shifts when team or period changes - USE REAL-TIME LISTENER
  useEffect(() => {
    if (!user?.teamId || !selectedPeriod) return;

    const shiftsRef = collection(db, 'shifts');
    // Query by teamId only (no composite index required)
    const q = query(
      shiftsRef,
      where('teamId', '==', user.teamId)
    );

    // Use real-time listener instead of one-off query
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedShifts: Shift[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Shift;
        // Filter by date range in JavaScript
        if (data.date >= selectedPeriod.startDate && data.date <= selectedPeriod.endDate) {
          fetchedShifts.push({ id: doc.id, ...data } as Shift);
        }
      });
      setTeamShifts(fetchedShifts);
      console.log(`🔄 Real-time update: ${fetchedShifts.length} shifts for period ${selectedPeriod.label}`);
    }, (err) => {
      console.error("Error setting up real-time listener:", err);
    });

    return () => unsubscribe();
  }, [user?.teamId, selectedPeriod.id]);

  const handleClashesUpdate = (clashes: Clash[]) => {
    setActiveClashes(clashes);
  };

  const refreshTeamShifts = async (newShifts?: Shift[]) => {
    console.log('🔄 refreshTeamShifts called', { teamId: user?.teamId, period: selectedPeriod?.label, newShiftsCount: newShifts?.length });

    // Optimistic update: add new shifts immediately
    if (newShifts && newShifts.length > 0) {
      setTeamShifts(prev => [...prev, ...newShifts]);
      console.log('✨ Optimistically added', newShifts.length, 'shifts');
    }

    if (!user?.teamId || !selectedPeriod) {
      console.warn('❌ Missing teamId or selectedPeriod', { teamId: user?.teamId, selectedPeriod });
      return;
    }

    try {
      const shiftsRef = collection(db, 'shifts');
      console.log('📅 Query params:', {
        teamId: user.teamId,
        startDate: selectedPeriod.startDate,
        endDate: selectedPeriod.endDate
      });

      // Query by teamId only (no composite index required)
      const q = query(
        shiftsRef,
        where('teamId', '==', user.teamId)
      );

      const querySnapshot = await getDocs(q);
      const fetchedShifts: Shift[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Shift;
        // Filter by date range in JavaScript
        if (data.date >= selectedPeriod.startDate && data.date <= selectedPeriod.endDate) {
          fetchedShifts.push({ id: doc.id, ...data });
          console.log('📄 Fetched shift:', { userId: data.userId, userName: data.userName, date: data.date });
        }
      });

      console.log(`✅ Refreshed: ${fetchedShifts.length} shifts for period ${selectedPeriod.label}`);
      setTeamShifts(fetchedShifts);
    } catch (err) {
      console.error("❌ Error refreshing shifts:", err);
    }
  };

  const getSubmitters = () => {
    const submitterMap = new Map<string, { uid: string; name: string }>();
    teamShifts.forEach(shift => {
      if (!submitterMap.has(shift.userId)) {
        submitterMap.set(shift.userId, { uid: shift.userId, name: shift.userName });
      }
    });
    const submitters = Array.from(submitterMap.values());
    console.log('👥 getSubmitters:', { count: submitters.length, submitters, teamShiftsCount: teamShifts.length });
    return submitters;
  };

  const deleteUserSubmissions = async (userId: string) => {
    console.log('🗑️ Deleting submissions for user:', userId);
    try {
      const shiftsRef = collection(db, 'shifts');
      const q = query(
        shiftsRef,
        where('teamId', '==', user?.teamId),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      console.log(`✅ Deleted ${querySnapshot.docs.length} submissions for user ${userId}`);

      // Update local state immediately
      setTeamShifts(prev => prev.filter(shift => shift.userId !== userId));

      // Reset comparison if started
      if (comparisonStarted) {
        setComparisonStarted(false);
        setActiveClashes([]);
      }
    } catch (err) {
      console.error('❌ Error deleting submissions:', err);
    }
  };

  const handleBeginComparison = () => {
    // Detect clashes for all current shifts
    const allClashes: Clash[] = [];
    const submitters = getSubmitters();

    submitters.forEach(submitter => {
      const userShifts = teamShifts.filter(s => s.userId === submitter.uid);

      userShifts.forEach(shift => {
        // Check against shifts from OTHER users
        teamShifts.forEach(otherShift => {
          if (otherShift.userId !== submitter.uid && otherShift.date === shift.date) {
            // Check for time overlap
            const shiftStart = shift.arrivalTime.split(':').map(Number);
            const shiftEnd = shift.departureTime.split(':').map(Number);
            const otherStart = otherShift.arrivalTime.split(':').map(Number);
            const otherEnd = otherShift.departureTime.split(':').map(Number);

            const shiftStartMin = shiftStart[0] * 60 + shiftStart[1];
            const shiftEndMin = shiftEnd[0] * 60 + shiftEnd[1];
            const otherStartMin = otherStart[0] * 60 + otherStart[1];
            const otherEndMin = otherEnd[0] * 60 + otherEnd[1];

            if (shiftStartMin < otherEndMin && shiftEndMin > otherStartMin) {
              const clashDate = new Date(shift.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

              const timeRange1 = `${formatToRegularTime(shift.arrivalTime)} - ${formatToRegularTime(shift.departureTime)}`;
              const timeRange2 = `${formatToRegularTime(otherShift.arrivalTime)} - ${formatToRegularTime(otherShift.departureTime)}`;

              allClashes.push({
                id: `clash_${Date.now()}_${Math.random()}`,
                entryId: shift.id || '',
                conflictingUser: otherShift.userName,
                conflictingTime: timeRange2,
                message: `On ${clashDate}: ${submitter.name} (${timeRange1}) overlaps with ${otherShift.userName} (${timeRange2})`,
                severity: 'critical',
                details: {
                  user1: { name: submitter.name, time: timeRange1, description: shift.description },
                  user2: { name: otherShift.userName, time: timeRange2, description: otherShift.description },
                  date: clashDate
                }
              });
            }
          }
        });
      });
    });

    setActiveClashes(allClashes);
    setComparisonStarted(true);
  };

  const handleResetComparison = () => {
    setComparisonStarted(false);
    setActiveClashes([]);
  };

  const handleTeamJoined = async () => {
    if (auth.currentUser) {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        setUser(userDoc.data() as UserProfile);
        setView(ViewState.DASHBOARD);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If on Landing Page, render full screen component without Layout wrapper
  if (view === ViewState.LANDING) {
    return (
      <LandingPage
        onGetStarted={() => setView(user ? (user.teamId ? ViewState.DASHBOARD : ViewState.TEAM) : ViewState.AUTH)}
        userProfile={user}
        onGoToDashboard={() => setView(ViewState.DASHBOARD)}
      />
    );
  }

  // If on Auth Page, render full screen without Layout wrapper
  if (view === ViewState.AUTH) {
    return <AuthFlow onAuthenticated={() => { }} onBackToLanding={() => setView(ViewState.LANDING)} />; // View transition handled by useEffect
  }

  // If on Team Page, render full screen without Layout wrapper
  if (view === ViewState.TEAM) {
    return <TeamFlow onTeamJoined={handleTeamJoined} onBackToLanding={() => setView(ViewState.LANDING)} />;
  }

  const renderContent = () => {
    switch (view) {
      case ViewState.UPLOAD:
        return (
          <div className={`flex flex-col ${getSubmitters().length > 0 ? 'lg:flex-row' : 'w-full'} gap-8 items-start`}>
            <div className="flex-grow w-full">
              <div className="mb-6">
                <button
                  onClick={() => { setView(ViewState.DASHBOARD); setActiveClashes([]); }}
                  className="flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                </button>
              </div>
              <UploadFlow
                onClashesDetected={handleClashesUpdate}
                periods={periods}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                teamShifts={teamShifts}
                userProfile={user}
                onShiftsSubmitted={refreshTeamShifts}
              />
            </div>
            <ClashPanel
              clashes={activeClashes}
              submitters={getSubmitters()}
              teamShifts={teamShifts}
              onBeginComparison={handleBeginComparison}
              comparisonStarted={comparisonStarted}
              currentUserId={user?.uid}
              onDeleteSubmission={deleteUserSubmissions}
              onResetComparison={handleResetComparison}
            />
          </div>
        );
      case ViewState.MANUAL:
        return (
          <div className={`flex flex-col ${getSubmitters().length > 0 ? 'lg:flex-row' : 'w-full'} gap-8 items-start`}>
            <div className="flex-grow w-full">
              <div className="mb-6">
                <button
                  onClick={() => { setView(ViewState.DASHBOARD); setActiveClashes([]); setComparisonStarted(false); }}
                  className="flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                </button>
              </div>
              <ManualEntryFlow
                onClashesUpdate={handleClashesUpdate}
                periods={periods}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                teamShifts={teamShifts}
                userProfile={user}
                onShiftsSubmitted={refreshTeamShifts}
              />
            </div>
            <ClashPanel
              clashes={activeClashes}
              submitters={getSubmitters()}
              teamShifts={teamShifts}
              onBeginComparison={handleBeginComparison}
              comparisonStarted={comparisonStarted}
              currentUserId={user?.uid}
              onDeleteSubmission={deleteUserSubmissions}
              onResetComparison={handleResetComparison}
            />
          </div>
        );
      case ViewState.DASHBOARD:
      default:
        return (
          <Dashboard
            onSelectUpload={() => setView(ViewState.UPLOAD)}
            onSelectManual={() => setView(ViewState.MANUAL)}
            userProfile={user}
          />
        );
    }
  };

  return (
    <Layout
      activeView={view}
      onNavigateHome={() => {
        setView(ViewState.LANDING);
        setActiveClashes([]);
      }}
      userProfile={user}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;