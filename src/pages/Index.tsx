import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import TokenGenerator from '../components/TokenGenerator';
import PatientSearch from '../components/PatientSearch';
import Reports from '../components/Reports';
import Settings from '../components/Settings';
import TodayTokens from '../components/TodayTokens';
import DepartmentOverview from '../components/DepartmentOverview';
import DoctorManagement from '../components/DoctorManagement';
import UsersManagement from '../components/UsersManagement';
import Backup from '../components/Backup';
import AdminLayout from '@/layouts/AdminLayout';

const Index = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tokens');
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize/Sync tab from URL or user role
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    const roleDefault = user?.role === 'receptionist' ? 'today-tokens' : 'tokens';
    const next = urlTab || roleDefault;
    if (next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, location.search]);

  // Push tab to URL when changed
  useEffect(() => {
    const current = searchParams.get('tab');
    if (activeTab && current !== activeTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', activeTab);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Removed legacy sidebar scroll handling

  useEffect(() => {
    const handleOpenTokenWithData = (_event: any) => {
      setActiveTab('tokens');
    };

    const handleOpenAnalytics = () => {
      setActiveTab('analytics');
    };

    window.addEventListener('openTokenWithData', handleOpenTokenWithData);
    window.addEventListener('openAnalytics', handleOpenAnalytics);
    
    return () => {
      window.removeEventListener('openTokenWithData', handleOpenTokenWithData);
      window.removeEventListener('openAnalytics', handleOpenAnalytics);
    };
  }, []);

  const isAdmin = user?.role === 'admin';
  const isReceptionist = user?.role === 'receptionist';

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 font-poppins">
        <main className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-8">
          {/* Removed top widgets (DashboardStats) as requested */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex">
              <div className="hidden" />
              <div className="p-0 m-0">
                <TabsList className="flex flex-wrap gap-2 bg-gray-50 p-2">
                  {/* Core Tabs */}
                  <TabsTrigger 
                    value="tokens"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all bg-gray-50 hover:bg-gray-100 data-[state=active]:bg-gray-100 data-[state=active]:text-indigo-700 data-[state=active]:font-medium"
                    hidden={user?.role === 'doctor'}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                    </svg>
                    Generate Token
                  </TabsTrigger>
                  {/* IPD tab removed */}
                  <TabsTrigger 
                    value="analytics"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all bg-gray-50 hover:bg-gray-100 data-[state=active]:bg-gray-100 data-[state=active]:text-indigo-700 data-[state=active]:font-medium"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger 
                    value="today-tokens"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all bg-gray-50 hover:bg-gray-100 data-[state=active]:bg-gray-100 data-[state=active]:text-indigo-700 data-[state=active]:font-medium"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    Today's Tokens
                  </TabsTrigger>
                  
                  {/* Role-based Tabs */}
                  {isAdmin && (
                    <>
                      <TabsTrigger 
                        value="search"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all bg-gray-50 hover:bg-gray-100 data-[state=active]:bg-gray-100 data-[state=active]:text-indigo-700 data-[state=active]:font-medium"
                      >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zm-6 0H7v2h3m6 3H7v2h8z" />
                        </svg>
                        Search Patients
                      </TabsTrigger>
                      <TabsTrigger 
                        value="doctors"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all bg-gray-50 hover:bg-gray-100 data-[state=active]:bg-gray-100 data-[state=active]:text-indigo-700 data-[state=active]:font-medium"
                      >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0h-2c0 1.104-.95 2-2 2v3m-4 0c0 1.104-.95 2-2 2v3m-4 0c0 1.104-.95 2-2 2v3m-4 0c0 1.104-.95 2-2 2V7m6 1H7v2h3m6 3H7v2h8z"></path>
                        </svg>
                        Doctors
                      </TabsTrigger>
                      <TabsTrigger 
                        value="users"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all bg-gray-50 hover:bg-gray-100 data-[state=active]:bg-gray-100 data-[state=active]:text-indigo-700 data-[state=active]:font-medium"
                      >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0h-2c0 1.104-.95 2-2 2v3m-4 0c0 1.104-.95 2-2 2v3m-4 0c0 1.104-.95 2-2 2v3m-4 0c0 1.104-.95 2-2 2V7m6 1H7v2h3m6 3H7v2h8z"></path>
                        </svg>
                        Users
                      </TabsTrigger>
                      <TabsTrigger 
                        value="reports"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all bg-gray-50 hover:bg-gray-100 data-[state=active]:bg-gray-100 data-[state=active]:text-indigo-700 data-[state=active]:font-medium"
                      >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        Reports
                      </TabsTrigger>
                      <TabsTrigger 
                        value="backup"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all bg-gray-50 hover:bg-gray-100 data-[state=active]:bg-gray-100 data-[state=active]:text-indigo-700 data-[state=active]:font-medium"
                      >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                        Backup
                      </TabsTrigger>
                      <TabsTrigger 
                        value="settings"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all bg-gray-50 hover:bg-gray-100 data-[state=active]:bg-gray-100 data-[state=active]:text-indigo-700 data-[state=active]:font-medium"
                      >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        Settings
                      </TabsTrigger>
                    </>
                  )}
                  
                  {isReceptionist && (
                    <TabsTrigger 
                      value="search"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all bg-gray-50 hover:bg-gray-100 data-[state=active]:bg-gray-100 data-[state=active]:text-indigo-700 data-[state=active]:font-medium"
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zm-6 0H7v2h3m6 3H7v2h8z" />
                      </svg>
                      Search Patients
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
              <div className="p-4 md:p-6 lg:p-6 flex-1 overflow-x-auto">
                <TabsContent value="today-tokens" className="space-y-6 mt-0">
                  <TodayTokens />
                </TabsContent>
                <TabsContent value="analytics" className="space-y-6 mt-0">
                  <DepartmentOverview />
                </TabsContent>
                <TabsContent value="tokens" className="space-y-6 mt-0">
                  <TokenGenerator />
                </TabsContent>
                
                <TabsContent value="search" className="space-y-6 mt-0">
                  <PatientSearch />
                </TabsContent>
                <TabsContent value="doctors" className="space-y-6 mt-0">
                  <DoctorManagement />
                </TabsContent>
                <TabsContent value="users" className="space-y-6 mt-0">
                  <UsersManagement />
                </TabsContent>
                <TabsContent value="reports" className="space-y-6 mt-0">
                  <Reports />
                </TabsContent>
                <TabsContent value="backup" className="space-y-6 mt-0">
                  <Backup />
                </TabsContent>
                <TabsContent value="settings" className="space-y-6 mt-0">
                  <Settings />
                </TabsContent>
                {/* IPD content removed */}
              </div>
            </Tabs>
          </div>
        </main>
      </div>
    </AdminLayout>
  );

};

export default Index;
