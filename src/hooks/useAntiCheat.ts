import { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface UseAntiCheatOptions {
  isActive: boolean;
  onViolation?: (type: 'tab_switch' | 'page_leave' | 'visibility_change') => void;
  onForceSubmit?: () => void;
  warningThreshold?: number;
}

interface AntiCheatState {
  violations: number;
  isWarningShown: boolean;
  lastViolationType: string | null;
}

export function useAntiCheat({
  isActive,
  onViolation,
  onForceSubmit,
  warningThreshold = 3,
}: UseAntiCheatOptions) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [state, setState] = useState<AntiCheatState>({
    violations: 0,
    isWarningShown: false,
    lastViolationType: null,
  });
  const isActiveRef = useRef(isActive);
  const violationsRef = useRef(0);

  // Keep ref in sync
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const handleViolation = useCallback((type: 'tab_switch' | 'page_leave' | 'visibility_change') => {
    if (!isActiveRef.current) return;

    violationsRef.current += 1;
    const currentViolations = violationsRef.current;
    
    setState(prev => ({
      ...prev,
      violations: currentViolations,
      lastViolationType: type,
    }));

    onViolation?.(type);

    const remainingWarnings = warningThreshold - currentViolations;

    if (currentViolations >= warningThreshold) {
      toast({
        title: '⚠️ Test Terminated',
        description: 'You have exceeded the maximum allowed violations. Your test has been invalidated.',
        variant: 'destructive',
        duration: 10000,
      });
      onForceSubmit?.();
    } else {
      toast({
        title: '⚠️ Warning!',
        description: `You are leaving the test. ${remainingWarnings} more violation(s) will invalidate your test.`,
        variant: 'destructive',
        duration: 5000,
      });
    }
  }, [onViolation, onForceSubmit, warningThreshold, toast]);

  // Visibility change detection (tab switching)
  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('visibility_change');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, handleViolation]);

  // Window blur detection (clicking outside)
  useEffect(() => {
    if (!isActive) return;

    const handleBlur = () => {
      // Small delay to avoid false positives from UI interactions
      setTimeout(() => {
        if (document.hidden || !document.hasFocus()) {
          handleViolation('tab_switch');
        }
      }, 100);
    };

    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [isActive, handleViolation]);

  // Prevent back navigation
  useEffect(() => {
    if (!isActive) return;

    const handlePopState = (e: PopStateEvent) => {
      // Push state back to prevent navigation
      window.history.pushState(null, '', window.location.href);
      handleViolation('page_leave');
    };

    // Push initial state
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isActive, handleViolation]);

  // Prevent page refresh/close
  useEffect(() => {
    if (!isActive) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You are in the middle of a test. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isActive]);

  // Keyboard shortcuts prevention
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common escape shortcuts
      if (
        (e.ctrlKey && e.key === 'w') || // Close tab
        (e.ctrlKey && e.key === 't') || // New tab
        (e.ctrlKey && e.key === 'n') || // New window
        (e.altKey && e.key === 'Tab') || // Alt+Tab
        (e.altKey && e.key === 'F4') || // Close window
        e.key === 'F5' || // Refresh
        (e.ctrlKey && e.key === 'r') // Refresh
      ) {
        e.preventDefault();
        toast({
          title: 'Action Blocked',
          description: 'This action is disabled during the test.',
          variant: 'destructive',
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isActive, toast]);

  // Right-click prevention
  useEffect(() => {
    if (!isActive) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isActive]);

  const resetViolations = useCallback(() => {
    violationsRef.current = 0;
    setState({
      violations: 0,
      isWarningShown: false,
      lastViolationType: null,
    });
  }, []);

  return {
    violations: state.violations,
    lastViolationType: state.lastViolationType,
    resetViolations,
  };
}
