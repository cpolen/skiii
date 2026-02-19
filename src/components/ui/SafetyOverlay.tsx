'use client';

import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'skiii-safety-acknowledged';

export function SafetyOverlay() {
  const [show, setShow] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const acknowledged = localStorage.getItem(STORAGE_KEY);
    if (!acknowledged) {
      setShow(true);
    }
  }, []);

  // Focus trap: keep Tab cycling within the modal
  useEffect(() => {
    if (!show || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    firstEl?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) { e.preventDefault(); lastEl?.focus(); }
      } else {
        if (document.activeElement === lastEl) { e.preventDefault(); firstEl?.focus(); }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show]);

  function handleAcknowledge() {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="safety-title">
      <div ref={modalRef} className="max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 text-center">
          <span className="text-4xl">{'\u26A0\uFE0F'}</span>
          <h2 id="safety-title" className="mt-2 text-xl font-bold text-gray-900">Before You Go</h2>
        </div>

        <div className="space-y-3 text-sm leading-relaxed text-gray-700">
          <p>
            Backcountry skiing in avalanche terrain is{' '}
            <strong>inherently dangerous</strong> and can result in serious injury or death.
          </p>

          <p>
            <strong>This app is a planning tool.</strong> It is not a substitute for:
          </p>

          <ul className="ml-4 list-disc space-y-1">
            <li>Formal avalanche education (AIARE Level 1 minimum)</li>
            <li>Companion rescue training and practice</li>
            <li>Personal field assessment of snowpack and terrain</li>
            <li>Carrying and knowing how to use a beacon, probe, and shovel</li>
            <li>Reading the full avalanche forecast from the Sierra Avalanche Center</li>
          </ul>

          <p className="text-xs text-gray-500">
            Conditions change rapidly in the mountains. Automated data aggregation cannot
            replace human judgment in the field. The go/no-go decision is yours alone.
          </p>
        </div>

        <div className="mt-5 space-y-2">
          <a
            href="https://find.avtraining.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-center text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            Find an Avalanche Course Near You
          </a>

          <button
            onClick={handleAcknowledge}
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            I Understand - Continue
          </button>
        </div>
      </div>
    </div>
  );
}
