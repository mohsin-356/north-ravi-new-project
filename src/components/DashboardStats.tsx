
import React, { useState, useEffect } from 'react';
import { Users, FileText, DollarSign, Undo2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTokens } from '@/hooks/useApi';

interface Token {
  tokenNumber: string;
  dateTime: Date | string;
  patientName: string;
  age: string | number;
  gender: string;
  phone?: string;
  address?: string;
  doctor: string;
  department: string;
  finalFee: number;
  mrNumber: string;
}

const DashboardStats = () => {
  const [stats, setStats] = useState({
    todayPatients: 0,
    tokensGenerated: 0,
    todayRevenue: 0,
    returned: 0
  });

  // Fetch today's tokens from backend
  const todayStr = new Date().toLocaleDateString('en-CA');
  const { data: tokens = [], refetch } = useTokens(todayStr);

  useEffect(() => {
    calculateRealTimeStats();
    const interval = setInterval(() => refetch(), 30000);
    const onGenerated = () => refetch();
    const onRevenueChanged = () => refetch();
    window.addEventListener('tokenGenerated', onGenerated);
    window.addEventListener('revenueChanged', onRevenueChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener('tokenGenerated', onGenerated);
      window.removeEventListener('revenueChanged', onRevenueChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);

  const calculateRealTimeStats = () => {
    let todaysTokens: Token[] = Array.isArray(tokens) ? (tokens as Token[]) : [];
    // Fallback to localStorage if API returned empty
    if (!todaysTokens || todaysTokens.length === 0) {
      try {
        const lsTokens = JSON.parse(localStorage.getItem('tokens') || '[]');
        const today = new Date().toISOString().slice(0, 10);
        todaysTokens = lsTokens.filter((t: any) => (t?.dateTime || '').slice(0,10) === today);
      } catch {}
    }

    const todayRevenue = todaysTokens.reduce((sum: number, token: any) => {
      const isReturned = String(token?.status || '').toLowerCase() === 'returned';
      const refundAmount = Number(token?.refundAmount || 0) || 0;
      // Only count positive revenue for non-returned tokens, subtract explicit refunds if any
      const base = Number(token?.finalFee || 0) || 0;
      if (isReturned) return sum; // returned -> remove from revenue
      return sum + Math.max(0, base - refundAmount);
    }, 0);
    const todayPatients = todaysTokens.length;
    const totalTokensGeneratedToday = todaysTokens.length; // if you want all-time, create another endpoint
    const returned = todaysTokens.filter((token: any) => String(token?.status || '').toLowerCase() === 'returned').length;

    setStats({
      todayPatients,
      tokensGenerated: totalTokensGeneratedToday,
      todayRevenue,
      returned
    });
  };

  const statsData = [
    {
      title: 'Today\'s Patients',
      value: stats.todayPatients.toString(),
      change: '+0%',
      icon: Users,
      // theme classes
      card: 'bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200',
      titleClass: 'text-blue-700',
      valueClass: 'text-blue-900',
      iconWrap: 'bg-blue-100 text-blue-700'
    },
    {
      title: 'Tokens Generated',
      value: stats.tokensGenerated.toString(),
      change: '+0%',
      icon: FileText,
      card: 'bg-gradient-to-br from-emerald-50 to-green-100 border border-green-200',
      titleClass: 'text-emerald-700',
      valueClass: 'text-emerald-900',
      iconWrap: 'bg-emerald-100 text-emerald-700'
    },
    {
      title: 'Today\'s Revenue',
      value: `Rs. ${stats.todayRevenue.toLocaleString()}`,
      change: '+0%',
      icon: DollarSign,
      card: 'bg-gradient-to-br from-purple-50 to-violet-100 border border-violet-200',
      titleClass: 'text-violet-700',
      valueClass: 'text-violet-900',
      iconWrap: 'bg-violet-100 text-violet-700'
    },
    {
      title: 'Returned Patients',
      value: stats.returned.toString(),
      change: '+0%',
      icon: Undo2,
      card: 'bg-gradient-to-br from-amber-50 to-orange-100 border border-orange-200',
      titleClass: 'text-orange-700',
      valueClass: 'text-orange-900',
      iconWrap: 'bg-amber-100 text-orange-700'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <Card key={index} className={`${stat.card} hover:shadow-xl transition-all duration-200`}> 
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${stat.titleClass}`}>
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${stat.iconWrap}`}>
              <stat.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stat.valueClass}`}>{stat.value}</div>
            <p className="text-xs text-gray-600 mt-1">Real-time data</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;
