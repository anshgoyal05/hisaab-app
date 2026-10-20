import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import {
  Globe,
  Moon,
  Clock,
  Lock,
  Download,
  Trash2,
  LogOut,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { apiRequest } from '../lib/api.js';

export const SettingsScreen: React.FC = () => {
  const { i18n } = useTranslation();
  const { user, logout } = useAuth();

  const [settings, setSettings] = useState<any>({
    language: 'en',
    currency: 'INR',
    theme: 'system',
    reminderTime: '21:30',
    reminderEnabled: true,
    pinEnabled: false,
  });

  const [isSaved, setIsSaved] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  // Delete Account State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    apiRequest('/settings')
      .then((res) => setSettings(res.settings || {}))
      .catch(console.error);
  }, []);

  const handleUpdate = async (key: string, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    if (key === 'language') {
      i18n.changeLanguage(value);
    }

    if (key === 'theme') {
      if (value === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (value === 'light') {
        document.documentElement.classList.remove('dark');
      }
    }

    try {
      await apiRequest('/settings', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: value }),
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  const handleDownloadData = async () => {
    try {
      const data = await apiRequest('/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hisaab-complete-export-${user?.id || 'user'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    setIsDeleting(true);

    try {
      await apiRequest('/me', {
        method: 'DELETE',
        body: JSON.stringify({ password: deletePassword }),
      });
      await logout();
    } catch (err: any) {
      setDeleteError(err.message || 'Account deletion failed');
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            Settings & Privacy
          </h2>
          <p className="text-xs text-text-secondary">
            Manage your preferences, data security, and account rights.
          </p>
        </div>

        {isSaved ? (
          <span className="text-xs font-semibold text-balance-owed flex items-center gap-1 bg-balance-owed-surface px-2.5 py-1 rounded-full">
            <Check className="w-3.5 h-3.5" />
            Saved
          </span>
        ) : null}
      </div>

      {/* Account Profile Card */}
      <div className="p-5 bg-surface border border-border-rule rounded-card shadow-soft flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-0.5">
            Signed in as
          </span>
          <span className="text-sm font-bold text-text-primary">
            {user?.email}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={logout}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </Button>
      </div>

      {/* Preferences Section */}
      <div className="p-5 bg-surface border border-border-rule rounded-card shadow-soft flex flex-col gap-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          App Preferences
        </h3>

        {/* Language Selection */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-action-primary" />
            <div>
              <span className="text-xs font-semibold text-text-primary block">Language</span>
              <span className="text-[11px] text-text-secondary">Instant switch without page reload</span>
            </div>
          </div>
          <select
            value={settings.language}
            onChange={(e) => handleUpdate('language', e.target.value)}
            className="px-3 py-1.5 bg-canvas text-text-primary border border-border-rule rounded-control text-xs font-medium focus:outline-none"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Devanagari)</option>
            <option value="hinglish">Hinglish (Roman Hindi)</option>
          </select>
        </div>

        {/* Theme Selection */}
        <div className="flex items-center justify-between border-t border-border-rule pt-4">
          <div className="flex items-center gap-2.5">
            <Moon className="w-4 h-4 text-action-primary" />
            <div>
              <span className="text-xs font-semibold text-text-primary block">Theme</span>
              <span className="text-[11px] text-text-secondary">Daylight paper or After-hours ink</span>
            </div>
          </div>
          <select
            value={settings.theme}
            onChange={(e) => handleUpdate('theme', e.target.value)}
            className="px-3 py-1.5 bg-canvas text-text-primary border border-border-rule rounded-control text-xs font-medium focus:outline-none"
          >
            <option value="light">Daylight paper (Light)</option>
            <option value="dark">After-hours ink (Dark)</option>
            <option value="system">System Default</option>
          </select>
        </div>

        {/* Nightly Reminder Time */}
        <div className="flex items-center justify-between border-t border-border-rule pt-4">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-action-primary" />
            <div>
              <span className="text-xs font-semibold text-text-primary block">Nightly Log Reminder</span>
              <span className="text-[11px] text-text-secondary">Notification prompt to log daily expenses</span>
            </div>
          </div>
          <input
            type="time"
            value={settings.reminderTime || '21:30'}
            onChange={(e) => handleUpdate('reminderTime', e.target.value)}
            className="px-3 py-1 bg-canvas text-text-primary border border-border-rule rounded-control text-xs font-medium focus:outline-none"
          />
        </div>

        {/* App PIN Lock */}
        <div className="flex items-center justify-between border-t border-border-rule pt-4">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-action-primary" />
            <div>
              <span className="text-xs font-semibold text-text-primary block">4-Digit App PIN Lock</span>
              <span className="text-[11px] text-text-secondary">Require PIN on opening app</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.pinEnabled || false}
            onChange={(e) => handleUpdate('pinEnabled', e.target.checked)}
            className="w-4 h-4 text-action-primary rounded focus:ring-action-primary"
          />
        </div>
      </div>

      {/* Data Sovereignty & Rights */}
      <div className="p-5 bg-surface border border-border-rule rounded-card shadow-soft flex flex-col gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Data Ownership & Privacy
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-primary block">
              Download My Data
            </span>
            <span className="text-[11px] text-text-secondary">
              Export complete JSON archive of all transactions and friends
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={handleDownloadData}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </Button>
        </div>

        <div className="border-t border-border-rule pt-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-primary block">
              Privacy Policy & Threat Model
            </span>
            <span className="text-[11px] text-text-secondary">
              Plain-language details on encryption at rest and zero telemetry
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowPrivacyPolicy(!showPrivacyPolicy)}
            className="text-xs text-action-primary font-semibold hover:underline"
          >
            {showPrivacyPolicy ? 'Hide' : 'Read Policy'}
          </button>
        </div>

        {/* Plain Language Privacy Policy View */}
        {showPrivacyPolicy ? (
          <div className="p-4 bg-canvas/70 border border-border-rule rounded-card text-xs text-text-primary leading-relaxed flex flex-col gap-2 animate-in fade-in-0">
            <span className="font-bold block">Hisaab Plain-Language Privacy Policy:</span>
            <p>1. <span className="font-semibold">Your Financial Data Belongs to You</span>: We never sell, rent, or share your transaction records, friend names, or balances with advertisers, data brokers, or credit bureaus.</p>
            <p>2. <span className="font-semibold">Envelope Encryption at Rest</span>: Sensitive notes and friend names are encrypted with AES-256-GCM using per-user keys.</p>
            <p>3. <span className="font-semibold">Zero Third-Party Telemetry</span>: No Google Analytics, no Facebook SDKs, no tracking pixels. All assets and fonts are self-hosted.</p>
            <p>4. <span className="font-semibold">Right to Permanent Erasure</span>: You can permanently delete your account and all associated financial records with one click below.</p>
          </div>
        ) : null}
      </div>

      {/* Danger Zone: Permanent Account Deletion */}
      <div className="p-5 bg-balance-iowe-surface border border-balance-iowe/30 rounded-card shadow-soft flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-balance-iowe block">
            Delete Account & Financial Data
          </span>
          <span className="text-[11px] text-text-secondary">
            Permanently erases your user profile, friends, transactions, and balances.
          </span>
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="gap-1.5"
          onClick={() => setIsDeleteModalOpen(true)}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Account</span>
        </Button>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsDeleteModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm bg-surface p-6 rounded-card border border-border-rule shadow-modal">
            <h3 className="text-base font-bold text-balance-iowe mb-2">
              Permanently Delete Account?
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              This action cannot be undone. All your expenses, split ledgers, friend records, and settings will be permanently wiped from the database.
            </p>

            {deleteError ? (
              <div className="p-2.5 mb-3 bg-balance-iowe-surface border border-balance-iowe text-balance-iowe text-xs rounded-control flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            ) : null}

            <form onSubmit={handleDeleteAccount} className="flex flex-col gap-3">
              <Input
                label="Confirm Your Password"
                type="password"
                placeholder="••••••••"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                required
              />

              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  className="flex-1"
                  isLoading={isDeleting}
                >
                  Yes, Delete All
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
