import { useState, useCallback } from 'react';

export type ChecklistStep = 'style' | 'places' | 'schedule' | 'optimize' | 'execute';
export type ExperienceType = 'steady' | 'balanced' | 'exploratory';

interface OnboardingState {
  welcomeCompleted: boolean;
  experienceType: ExperienceType | null;
  completedSteps: ChecklistStep[];
  toursCompleted: {
    home: boolean;
    tripDetail: boolean;
    planStudio: boolean;
    execute: boolean;
  };
  dismissed: boolean;
}

const STORAGE_KEY = 'tripnara_onboarding';

const defaultState: OnboardingState = {
  welcomeCompleted: false,
  experienceType: null,
  completedSteps: [],
  toursCompleted: {
    home: false,
    tripDetail: false,
    planStudio: false,
    execute: false,
  },
  dismissed: false,
};

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultState, ...JSON.parse(stored) };
      }
    } catch (err) {
      console.error('Failed to load onboarding state:', err);
    }
    return defaultState;
  });

  const saveState = useCallback((newState: Partial<OnboardingState>) => {
    setState((prev) => {
      const updated = { ...prev, ...newState };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save onboarding state:', err);
      }
      return updated;
    });
  }, []);

  const completeWelcome = useCallback(
    (experienceType: ExperienceType) => {
      saveState({ welcomeCompleted: true, experienceType });
    },
    [saveState]
  );

  const completeStep = useCallback(
    (step: ChecklistStep) => {
      setState((prev) => {
        if (prev.completedSteps.includes(step)) {
          return prev;
        }
        const updated = {
          ...prev,
          completedSteps: [...prev.completedSteps, step],
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to save onboarding state:', err);
        }
        return updated;
      });
    },
    []
  );

  const completeTour = useCallback(
    (tour: keyof OnboardingState['toursCompleted']) => {
      setState((prev) => {
        const updated = {
          ...prev,
          toursCompleted: { ...prev.toursCompleted, [tour]: true },
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to save onboarding state:', err);
        }
        return updated;
      });
    },
    []
  );

  const dismiss = useCallback(() => {
    saveState({ dismissed: true });
  }, [saveState]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setState(defaultState);
    } catch (err) {
      console.error('Failed to reset onboarding state:', err);
    }
  }, []);

  const isFirstTime = !state.welcomeCompleted && !state.dismissed;
  const showChecklist = !state.dismissed && state.welcomeCompleted;
  const allStepsCompleted = state.completedSteps.length === 5;

  return {
    state,
    isFirstTime,
    showChecklist,
    allStepsCompleted,
    completeWelcome,
    completeStep,
    completeTour,
    dismiss,
    reset,
  };
}


