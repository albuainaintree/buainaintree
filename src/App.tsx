/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Family, Submission } from './types';
import { loadFamilies, loadSubmissions, initStorage } from './services/storage';
import { getAppConfig } from './services/config';
import { Header } from './components/Header';
import { FamiliesGrid } from './components/FamiliesGrid';
import { FamilyForm } from './components/FamilyForm';
import { AdminDashboard } from './components/AdminDashboard';
import { TreeViewer } from './components/TreeViewer';
import { SubmissionSuccessModal } from './components/SubmissionSuccessModal';
import { ConfigModal } from './components/ConfigModal';
import { Footer } from './components/Footer';
import { X, Sparkles } from 'lucide-react';

export default function App() {
  const [families, setFamilies] = useState<Family[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentView, setCurrentView] = useState<'home' | 'form' | 'admin'>('home');
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [previewFamily, setPreviewFamily] = useState<Family | null>(null);
  const [successSubmission, setSuccessSubmission] = useState<Submission | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false); // Default to bright royal palette

  // Admin authentication state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return sessionStorage.getItem('albuainain_admin_session') === 'true';
  });

  const [adminEmail, setAdminEmail] = useState(() => getAppConfig().adminEmail);

  // Load initial data
  const refreshData = useCallback(() => {
    const loadedFams = loadFamilies();
    const loadedSubs = loadSubmissions();
    setFamilies(loadedFams);
    setSubmissions(loadedSubs);
    setAdminEmail(getAppConfig().adminEmail);
  }, []);

  useEffect(() => {
    initStorage().then(() => refreshData());
    refreshData();

    const handleFamiliesUpdate = () => setFamilies(loadFamilies());
    const handleSubmissionsUpdate = () => setSubmissions(loadSubmissions());

    window.addEventListener('albuainain_families_updated', handleFamiliesUpdate);
    window.addEventListener('albuainain_submissions_updated', handleSubmissionsUpdate);

    return () => {
      window.removeEventListener('albuainain_families_updated', handleFamiliesUpdate);
      window.removeEventListener('albuainain_submissions_updated', handleSubmissionsUpdate);
    };
  }, [refreshData]);

  // Set default selected family if none chosen when going to form
  useEffect(() => {
    if (!selectedFamily && families.length > 0) {
      setSelectedFamily(families[0]);
    }
  }, [families, selectedFamily]);

  // Handle Admin Login (tree4all / AllahAkbar)
  const handleAdminLogin = (username: string, password: string): boolean => {
    if (username.trim() === 'tree4all' && password === 'AllahAkbar') {
      setIsAdminLoggedIn(true);
      sessionStorage.setItem('albuainain_admin_session', 'true');
      return true;
    }
    return false;
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('albuainain_admin_session');
  };

  // Switch to update form with a specific family
  const handleSelectFamily = (family: Family) => {
    setSelectedFamily(family);
    setCurrentView('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Preview Tree in Fullscreen Lightbox
  const handlePreviewTree = (family: Family) => {
    setPreviewFamily(family);
  };

  // Form submission success handler
  const handleFormSuccess = (submission: Submission) => {
    refreshData();
    setSuccessSubmission(submission);
  };

  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        isDarkMode
          ? 'dark bg-[#070b14] text-slate-100'
          : 'bg-gradient-to-b from-[#FBF9F5] via-[#F3F5F9] to-[#EAEFF6] text-slate-900'
      }`}
    >
      {/* Dynamic Background Mesh / Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] rounded-full bg-[#C5A059]/10 dark:bg-[#0F3D3E]/20 blur-[140px]" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] rounded-full bg-[#0F3D3E]/10 dark:bg-[#C5A059]/10 blur-[130px]" />
        <div className="absolute bottom-10 right-10 w-[450px] h-[450px] rounded-full bg-[#1b2b4a]/10 dark:bg-[#1b2b4a]/25 blur-[120px]" />
      </div>

      {/* Main App Navigation Header */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isAdminLoggedIn={isAdminLoggedIn}
        onAdminLogout={handleAdminLogout}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        pendingRequestsCount={pendingCount}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {currentView === 'home' && (
          <FamiliesGrid
            families={families}
            onSelectFamily={handleSelectFamily}
            onPreviewTree={handlePreviewTree}
            onNavigateToAdmin={() => setCurrentView('admin')}
          />
        )}

        {currentView === 'form' && (
          selectedFamily ? (
            <FamilyForm
              family={selectedFamily}
              allFamilies={families}
              onSelectFamily={setSelectedFamily}
              onBack={() => setCurrentView('home')}
              onSuccess={handleFormSuccess}
            />
          ) : (
            <div className="text-center py-20 px-6 rounded-3xl bg-[#09101F]/80 border border-white/10 max-w-lg mx-auto space-y-4">
              <h3 className="text-xl font-bold text-white">لا توجد أسر مسجلة حالياً</h3>
              <p className="text-xs text-slate-300">
                قائمة الأسر فارغة، يرجى تسجيل الأسرة ورفع مشجرتها أولاً عبر لوحة التحكم للبدء باستقبال التحديثات.
              </p>
              <button
                type="button"
                onClick={() => setCurrentView('admin')}
                className="px-5 py-2.5 rounded-xl bg-[#C5A059] text-[#0A0F1D] text-xs font-bold"
              >
                الذهاب للوحة التحكم وتسجيل أسرة
              </button>
            </div>
          )
        )}

        {currentView === 'admin' && (
          <AdminDashboard
            submissions={submissions}
            families={families}
            onRefreshData={refreshData}
            isAdminLoggedIn={isAdminLoggedIn}
            onAdminLogin={handleAdminLogin}
            onAdminLogout={handleAdminLogout}
            adminEmail={adminEmail}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}
      </main>

      {/* Fullscreen Tree Preview Lightbox Modal */}
      {previewFamily && (
        <TreeViewer
          imageUrl={previewFamily.treeImageUrl}
          familyName={previewFamily.name}
          isInline={false}
          onClose={() => setPreviewFamily(null)}
          onUpdateClick={() => {
            setSelectedFamily(previewFamily);
            setPreviewFamily(null);
            setCurrentView('form');
          }}
        />
      )}

      {/* Submission Success Modal */}
      {successSubmission && (
        <SubmissionSuccessModal
          submission={successSubmission}
          onClose={() => {
            setSuccessSubmission(null);
            setCurrentView('home');
          }}
          onSubmitAnother={() => {
            setSuccessSubmission(null);
            setCurrentView('form');
          }}
        />
      )}

      {/* Configuration & Cloud Setup Modal */}
      <ConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigUpdated={refreshData}
      />

      {/* Footer */}
      <Footer
        onNavigate={view => setCurrentView(view)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isAdminLoggedIn={isAdminLoggedIn}
      />
    </div>
  );
}
