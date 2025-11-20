import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type AuthContextType = {
  user: {
    id: string;
    name: string;
    role: string;
  } | null;
  login: (user: AuthContextType['user']) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// 15 minutes expressed in milliseconds
const INACTIVITY_LIMIT = 15 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  // Strict login policy: do NOT auto-restore on refresh or reopen.
  // Always start unauthenticated so the login screen is shown.
  const [user, setUser] = useState<AuthContextType['user']>(null);

  const login = (userData: AuthContextType['user']) => {
    setUser(userData);
    try {
      // Persist for optional analytics/audit, but ignored on boot
      localStorage.setItem('pharmacy_user', JSON.stringify(userData));
    } catch {}
    // No forced reload; let routers/components update naturally
  };

    const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('pharmacy_user');
    } catch {}
  };

  /**
   * Inactivity tracker – logs out the user and shows a timeout dialog
   * after 15 minutes without any user events.
   */
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!user) return; // do nothing when not logged in

    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setTimedOut(true);
        logout();
      }, INACTIVITY_LIMIT);
    };

    // List of events that indicate user activity
    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keypress',
      'scroll',
      'touchstart',
    ];

    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer(); // initialise

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      clearTimeout(timeoutId);
    };
    }, [user]);

  

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
      {timedOut && (
        <Dialog open>
          <DialogContent className="text-center space-y-4">
            <DialogHeader>
              <DialogTitle>Session Timed Out</DialogTitle>
              <DialogDescription>
                You have been logged out due to 15 minutes of inactivity. Please log in again to continue.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="justify-center">
              <Button onClick={() => setTimedOut(false)}>OK</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AuthContext.Provider>
  );
}
