
import React from 'react';
import { useSettings } from '@/Pharmacy contexts/PharmacySettingsContext';
import { useInventory } from '@/Pharmacy contexts/InventoryContext';
import { useAuth } from '@/Pharmacy contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Globe, 
  Wifi, 
  WifiOff, 
  Moon, 
  Sun,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EnhancedHeaderProps {
  isUrdu: boolean; // ignored; Urdu removed
  setIsUrdu: (value: boolean) => void; // ignored; Urdu removed
  isDarkMode?: boolean;
  setIsDarkMode?: (value: boolean) => void;
  currentUser?: any;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
}

const EnhancedHeader: React.FC<EnhancedHeaderProps> = ({
  isUrdu,
  setIsUrdu,
  isDarkMode = false,
  setIsDarkMode,
  currentUser,
  onProfileClick,
  onSettingsClick
}) => {
  const { settings } = useSettings();
  const auth = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const { inventory } = useInventory();

  // --- Insert logo in header ---
  // Place this at the start of your main header render/return:
  // {settings.logo && (
  //   <img src={settings.logo} alt="Pharmacy Logo" className="h-10 mr-4 rounded bg-white border shadow" style={{objectFit: 'contain'}} />
  // )}


  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const t = {
    online: 'Online',
    offline: 'Offline',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    profile: 'Profile',
    settings: 'Settings',
  };

  return (
    <div className="flex items-center justify-between p-4 bg-background border-b">
      <div className="flex items-center space-x-4">
        <h1 className="text-title font-poppins">
          <span className="text-xl font-bold truncate max-w-xs">
            {settings.companyName || 'Pharmacy'}
          </span>
        </h1>
        <Badge variant={isOnline ? "default" : "destructive"} className="flex items-center space-x-1">
          {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          <span>{isOnline ? t.online : t.offline}</span>
        </Badge>
      </div>

      <div className="flex items-center space-x-2 relative">

        {/* Dark Mode Toggle */}
        {setIsDarkMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex items-center space-x-2"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="hidden md:inline">
              {isDarkMode ? t.lightMode : t.darkMode}
            </span>
          </Button>
        )}

        {/* Notifications removed */}

        {/* Settings removed */}

        {/* User Dropdown */}
        {currentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="hidden md:inline">{currentUser.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">{settings.companyName || 'Pharmacy'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* Optional: Profile action retained if provided */}
              {onProfileClick && (
                <DropdownMenuItem onClick={onProfileClick}>Profile</DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  try { auth?.logout(); } catch {}
                  try { navigate('/pharmacy/login', { replace: true }); } catch {}
                }}
                className="text-red-600 focus:text-red-600"
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export default EnhancedHeader;
