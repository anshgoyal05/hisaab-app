import React, { useState } from 'react';
import { BookOpen, Users, ShieldCheck, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher.js';

export interface OnboardingScreenProps {
  onComplete: () => void;
  onLoginClick: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
  onLoginClick,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: <BookOpen className="w-10 h-10 text-action-primary" />,
      title: 'Calm money. Clear friendships.',
      subtitle:
        'A campus notebook, not a banking app. Warm paper, deep-teal ink, and room to breathe.',
      tag: 'CAMPUS EDITION',
    },
    {
      icon: <Users className="w-10 h-10 text-action-primary" />,
      title: 'Split chai & dinner without friction.',
      subtitle:
        'Live split preview, exact down to the paise. No more awkward "who owes what" math after group meals.',
      tag: 'EXACT & AUDITABLE',
    },
    {
      icon: <ShieldCheck className="w-10 h-10 text-action-primary" />,
      title: '100% private. Your data is yours alone.',
      subtitle:
        'Encrypted notes and names. Zero trackers, zero ads, zero third-party telemetry. Export or delete anytime.',
      tag: 'PRIVACY FIRST',
    },
  ];

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col justify-between p-6 sm:p-12 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-action-primary text-white dark:text-[#102622] font-bold text-sm flex items-center justify-center">
            H
          </div>
          <span className="font-bold tracking-tight text-sm">hisaab</span>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Slide Content */}
      <div className="my-auto py-8 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-2xl bg-surface border border-border-rule shadow-soft flex items-center justify-center mb-6">
          {slide.icon}
        </div>

        <span className="text-[11px] font-semibold uppercase tracking-widest text-action-primary mb-2">
          {slide.tag}
        </span>

        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary mb-3">
          {slide.title}
        </h2>

        <p className="text-sm text-text-secondary max-w-sm font-normal leading-relaxed">
          {slide.subtitle}
        </p>

        {/* Carousel Dots */}
        <div className="flex items-center gap-2 mt-8">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentSlide
                  ? 'w-6 bg-action-primary'
                  : 'w-2 bg-border-rule hover:bg-text-secondary/40'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-3">
        {currentSlide < slides.length - 1 ? (
          <Button
            variant="primary"
            size="lg"
            className="w-full gap-2"
            onClick={() => setCurrentSlide(currentSlide + 1)}
          >
            <span>Continue</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={onComplete}
          >
            Get Started
          </Button>
        )}

        <button
          type="button"
          onClick={onLoginClick}
          className="text-xs text-text-secondary hover:text-text-primary py-2 font-medium text-center focus:outline-none"
        >
          Already have an account? <span className="underline font-semibold">Log in</span>
        </button>
      </div>
    </div>
  );
};
