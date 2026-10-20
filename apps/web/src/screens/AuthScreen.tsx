import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher.js';
import { Shield, Sparkles } from 'lucide-react';

export const AuthScreen: React.FC<{ onBackToOnboarding?: () => void }> = ({
  onBackToOnboarding,
}) => {
  const { login, register, demoLogin } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }
        await register(email, password, confirmPassword);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoClick = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await demoLogin();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-surface p-6 sm:p-8 rounded-card border border-border-rule shadow-soft">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-action-primary text-white dark:text-[#102622] font-bold text-base flex items-center justify-center">
              H
            </div>
            <span className="font-bold tracking-tight text-base">hisaab</span>
          </div>
          <LanguageSwitcher />
        </div>

        <h2 className="text-xl font-semibold tracking-tight text-text-primary mb-1">
          {isRegister ? 'Create your campus account' : 'Welcome back to your notebook'}
        </h2>
        <p className="text-xs text-text-secondary mb-5">
          {isRegister
            ? 'Track your expenses and clear debts with friends in seconds.'
            : 'Enter your credentials or try the instant demo account.'}
        </p>

        {/* 1-Click Demo Login Banner */}
        <button
          type="button"
          onClick={handleDemoClick}
          disabled={isLoading}
          className="w-full mb-6 p-3 bg-action-primary/10 hover:bg-action-primary/15 border border-action-primary/30 rounded-control flex items-center justify-between text-left transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-action-primary shrink-0" />
            <div>
              <span className="text-xs font-semibold text-action-primary block">
                Instant Demo Student Account
              </span>
              <span className="text-[11px] text-text-secondary">
                Pre-populated with canteen, dhaba, and metro expenses
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-action-primary uppercase tracking-wider shrink-0">
            1-Click →
          </span>
        </button>

        <div className="relative mb-5 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-rule" />
          </div>
          <span className="relative bg-surface px-3 text-[11px] uppercase tracking-wider text-text-secondary">
            Or sign in with email
          </span>
        </div>

        {error ? (
          <div className="mb-4 p-3 bg-balance-iowe-surface border border-balance-iowe text-balance-iowe text-xs rounded-control">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="College Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@college.edu"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {isRegister ? (
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2"
          >
            {isRegister ? 'Create Account' : 'Log In'}
          </Button>
        </form>

        <div className="mt-5 text-center flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-text-secondary hover:text-text-primary font-medium focus:outline-none"
          >
            {isRegister ? (
              <>
                Already have an account? <span className="underline font-semibold">Log in</span>
              </>
            ) : (
              <>
                New student? <span className="underline font-semibold">Create an account</span>
              </>
            )}
          </button>

          {onBackToOnboarding ? (
            <button
              type="button"
              onClick={onBackToOnboarding}
              className="text-xs text-text-secondary/70 hover:text-text-secondary font-normal"
            >
              Back to overview
            </button>
          ) : null}
        </div>

        {/* Privacy Promise Footer */}
        <div className="mt-6 pt-4 border-t border-border-rule flex items-center justify-center gap-1.5 text-text-secondary text-[11px]">
          <Shield className="w-3.5 h-3.5 text-action-primary" />
          <span>Encrypted data · Zero third-party trackers</span>
        </div>

      </div>
    </div>
  );
};
