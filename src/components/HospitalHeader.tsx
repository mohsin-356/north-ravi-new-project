import React from 'react';
import { Hospital, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';

const HospitalHeader = () => {
  const { user, logout } = useAuth();
  const [hospitalName, setHospitalName] = React.useState('Mindspire POS');

  React.useEffect(() => {
    const storedName = localStorage.getItem('hospitalName') || 'Mindspire POS';
    setHospitalName(storedName);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'hospitalName') {
        setHospitalName(e.newValue || 'Mindspire Hospital POS');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <header className="bg-background border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Hospital className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold">{hospitalName}</h1>
                <p className="text-xs text-muted-foreground">Patient Management System</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <div className="text-right">
                <div className="font-medium">{user?.name}</div>
                <div className="text-xs capitalize text-primary">{user?.role}</div>
              </div>
            </div>
            
            <Button 
              onClick={logout} 
              variant="outline" 
              size="sm" 
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HospitalHeader;
