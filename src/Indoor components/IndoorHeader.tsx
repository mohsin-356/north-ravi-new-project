import React from 'react';
import { useIndoorSettings } from '@/Indoor contexts/SettingsContext';
import { useIndoorAuth } from '@/Indoor contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Sun, Moon, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  isDarkMode?: boolean;
  setIsDarkMode?: (v: boolean) => void;
}

const IndoorHeader: React.FC<Props> = ({ isDarkMode = false, setIsDarkMode }) => {
  const { settings } = useIndoorSettings();
  const { logout, user } = useIndoorAuth();
  const nav = useNavigate();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  return (
    <div className="flex items-center justify-between p-4 bg-background border-b">
      <div className="flex items-center space-x-4">
        <h1 className="text-title font-poppins">
          <span className="text-xl font-bold truncate max-w-xs">{settings.companyName || 'Indoor Pharmacy'}</span>
        </h1>
        <Badge variant={isOnline ? 'default' : 'destructive'} className="flex items-center space-x-1">
          {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        {setIsDarkMode && (
          <Button variant="outline" size="sm" onClick={() => setIsDarkMode(!isDarkMode)} className="flex items-center gap-2">
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="hidden md:inline">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </Button>
        )}
        <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => { logout(); nav('/indoor/login', { replace: true }); }}>
          <User className="h-4 w-4" />
          <span className="hidden md:inline">{user?.username || 'Logout'}</span>
        </Button>
      </div>
    </div>
  );
};

export default IndoorHeader;
