import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { DesktopHeader, BottomNav, NavTab } from './components/ui/Navigation.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { PeopleScreen } from './screens/PeopleScreen.js';
import { HistoryScreen } from './screens/HistoryScreen.js';
import { ReportsScreen } from './screens/ReportsScreen.js';
import { BudgetsScreen } from './screens/BudgetsScreen.js';
import { SettingsScreen } from './screens/SettingsScreen.js';
import { OnboardingScreen } from './screens/OnboardingScreen.js';
import { AuthScreen } from './screens/AuthScreen.js';
import { AddExpenseModal } from './components/modals/AddExpenseModal.js';
import { SettleUpModal } from './components/modals/SettleUpModal.js';
import { NightReviewModal } from './components/modals/NightReviewModal.js';
import { apiRequest } from './lib/api.js';

const MainApp: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [peopleFilter, setPeopleFilter] = useState<'all' | 'owes_me' | 'i_owe' | 'settled'>('all');
  
  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);
  const [isNightReviewOpen, setIsNightReviewOpen] = useState(false);
  const [friendsList, setFriendsList] = useState<Array<{ id: string; name: string }>>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Onboarding flag for first-time visitors
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('hisaab_onboarded') === 'true';
  });
  const [showAuthScreen, setShowAuthScreen] = useState(false);

  // Pre-fetch friends list for fast split selection
  useEffect(() => {
    if (isAuthenticated) {
      apiRequest('/people')
        .then((res) => {
          if (res?.people) {
            setFriendsList(res.people.map((p: any) => ({ id: p.id, name: p.name })));
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, refreshKey]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas text-text-primary flex flex-col items-center justify-center p-6 select-none">
        <div className="w-14 h-14 rounded-2xl bg-action-primary text-white dark:text-[#102622] flex items-center justify-center text-2xl font-bold shadow-md animate-pulse">
          ₹
        </div>
        <p className="mt-4 text-sm font-semibold tracking-wide text-text-secondary">
          Loading your campus hisaab...
        </p>
      </div>
    );
  }

  // Unauthenticated flow
  if (!isAuthenticated) {
    if (!hasCompletedOnboarding && !showAuthScreen) {
      return (
        <OnboardingScreen
          onComplete={() => {
            localStorage.setItem('hisaab_onboarded', 'true');
            setHasCompletedOnboarding(true);
            setShowAuthScreen(true);
          }}
          onLoginClick={() => {
            setShowAuthScreen(true);
          }}
        />
      );
    }

    return (
      <AuthScreen
        onBackToOnboarding={() => setShowAuthScreen(false)}
      />
    );
  }

  // Navigation handlers
  const handleNavigateTab = (tab: NavTab, filter?: string) => {
    setActiveTab(tab);
    if (tab === 'people' && filter) {
      setPeopleFilter(filter as any);
    }
  };

  const handleExpenseAdded = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleSettled = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col selection:bg-action-primary/20">
      {/* Desktop Header */}
      <DesktopHeader
        activeTab={activeTab}
        onTabChange={(tab) => handleNavigateTab(tab)}
        onAddClick={() => setIsAddExpenseOpen(true)}
        userName={user?.email ? user.email.split('@')[0] : 'Student'}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:py-6">
        {activeTab === 'home' && (
          <HomeScreen
            key={refreshKey}
            onAddExpense={() => setIsAddExpenseOpen(true)}
            onSettleUp={() => setIsSettleUpOpen(true)}
            onOpenNightReview={() => setIsNightReviewOpen(true)}
            onNavigateTab={handleNavigateTab}
            userName={user?.email ? user.email.split('@')[0] : 'Student'}
          />
        )}

        {activeTab === 'people' && (
          <PeopleScreen
            key={`people-${refreshKey}-${peopleFilter}`}
            initialFilter={peopleFilter}
          />
        )}

        {activeTab === 'history' && (
          <HistoryScreen key={`history-${refreshKey}`} />
        )}

        {activeTab === 'reports' && (
          <ReportsScreen key={`reports-${refreshKey}`} />
        )}

        {activeTab === 'budgets' && (
          <BudgetsScreen key={`budgets-${refreshKey}`} />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen key={`settings-${refreshKey}`} />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => handleNavigateTab(tab)}
        onAddClick={() => setIsAddExpenseOpen(true)}
      />

      {/* Global Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onExpenseAdded={handleExpenseAdded}
        initialFriends={friendsList}
      />

      <SettleUpModal
        isOpen={isSettleUpOpen}
        onClose={() => setIsSettleUpOpen(false)}
        onSettled={handleSettled}
      />

      <NightReviewModal
        isOpen={isNightReviewOpen}
        onClose={() => setIsNightReviewOpen(false)}
        onAddMissedClick={() => {
          setIsNightReviewOpen(false);
          setIsAddExpenseOpen(true);
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
