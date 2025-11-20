
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrentView } from "@/lab pages/Index";
import { Filter } from "lucide-react";
import { api } from "@/lib/api";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from "recharts";

interface LabTechnicianDashboardProps {
  onViewChange: (view: CurrentView) => void;
}

const LabTechnicianDashboard = ({ onViewChange }: LabTechnicianDashboardProps) => {

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const todayIso = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const monthStartIso = new Date(firstOfMonth.getTime() - firstOfMonth.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const [range, setRange] = useState<{from:string; to:string}>({ from: monthStartIso, to: todayIso });
  const [dashSamples, setDashSamples] = useState<any[]>([]);
  const [loadingDash, setLoadingDash] = useState(false);

  // Helper: parse 12-hour time string to Date on today
  const parseSampleTime = (timeStr: string) => {
    const [time, meridian] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (meridian && meridian.toLowerCase() === "pm" && hours < 12) hours += 12;
    if (meridian && meridian.toLowerCase() === "am" && hours === 12) hours = 0;
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  };

  // For demo/mock data: assume completed samples have today's date
  const now = new Date();
  const isToday = (dateObj: Date) => {
    return dateObj.getDate() === now.getDate() &&
           dateObj.getMonth() === now.getMonth() &&
           dateObj.getFullYear() === now.getFullYear();
  };

  // Compute dynamic stats
  const [recentSamples, setRecentSamples] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ pending: 0, inProgress: 0, completedToday: 0, urgent: 0 });

  // fetch samples on mount
  useEffect(() => {
    api.get(`/labtech/samples`)
      .then(({ data }) => {
        const mapped = data
          .sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0,10)
          .map((s:any)=>({
            id: s._id,
            patient: s.patientName || "Unknown",
            test: Array.isArray(s.tests) && s.tests.length ? (typeof s.tests[0]==='string'? s.tests[0] : (s.tests[0].name || 'Test')) : 'Test',
            status: s.status || 'received',
            priority: s.priority || 'normal',
            receivedTime: new Date(s.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
            expectedTime: s.expectedCompletion ? new Date(s.expectedCompletion).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '-',
            technician: s.processedBy || 'You'
          }));
        setRecentSamples(mapped);
      })
      .catch(()=>setRecentSamples([]));
  }, []);

  useEffect(() => {
    const fetchDash = async () => {
      try {
        setLoadingDash(true);
        const params = new URLSearchParams();
        params.set('limit','500');
        params.set('from', range.from);
        params.set('to', range.to);
        const res = await fetch(`/api/labtech/samples?${params.toString()}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const json = await res.json();
        const rows = Array.isArray(json) ? json : (json?.data || []);
        setDashSamples(rows);
      } catch {
        setDashSamples([]);
      } finally {
        setLoadingDash(false);
      }
    };
    fetchDash();
  }, [range.from, range.to]);

  // Fetch KPIs from server
  useEffect(() => {
    api.get(`/lab/dashboard/kpis`)
      .then(({ data }) => {
        setKpis(data);
      })
      .catch(() => {
        // keep defaults; UI will fallback to client-derived values below
      });
  }, []);

  // Fallback client-side counts if KPI API is not available
  const fallbackPending = recentSamples.filter((s:any) => s.status === "pending" || s.status === "received").length;
  const fallbackInProgress = recentSamples.filter((s:any)=> s.status === "in-progress" || s.status === "processing").length;
  const fallbackCompletedToday = recentSamples.filter((s:any)=> s.status === "completed").length;
  const fallbackUrgent = recentSamples.filter((s:any)=> s.priority === "urgent" || s?.results?.some?.((r:any)=>r?.isCritical)).length;

  const pendingCount = kpis.pending || fallbackPending;
  const inProgressCount = kpis.inProgress || fallbackInProgress;
  const completedTodayCount = kpis.completedToday || fallbackCompletedToday;
  const urgentCount = kpis.urgent || fallbackUrgent;

  // Stats array removed in favor of pharmacy-style gradient KPIs below

  
  // Color helpers for old list removed

  // Filter not used in the pharmacy-like summary view

  const source = (dashSamples && dashSamples.length ? dashSamples : recentSamples) as any[];
  const toDayStr = todayIso;
  const statusOf = (s:any) => (s?.status || '').toLowerCase();
  const priorityOf = (s:any) => (s?.priority || '').toLowerCase();
  const getDate = (s:any) => new Date((s.createdAt || s.receivedAt || s.updatedAt || Date.now()));
  const counts = {
    total: source.length,
    received: source.filter(s => ['received','pending'].includes(statusOf(s))).length,
    inProgress: source.filter(s => ['in-progress','processing'].includes(statusOf(s))).length,
    completed: source.filter(s => statusOf(s)==='completed').length,
    pending: source.filter(s => ['received','pending'].includes(statusOf(s))).length,
    urgent: source.filter(s => priorityOf(s)==='urgent').length,
    completedToday: source.filter(s => statusOf(s)==='completed' && new Date(s.completedAt || s.updatedAt || s.createdAt).toISOString().slice(0,10)===toDayStr).length,
  };
  const testsTotal = source.reduce((sum, s:any) => sum + ((s.tests && s.tests.length) ? s.tests.length : 0), 0);

  const perDayMap = new Map<string, number>();
  for (const s of source) {
    const d = getDate(s);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    perDayMap.set(key, (perDayMap.get(key)||0)+1);
  }
  const samplesPerDay = Array.from(perDayMap.entries()).sort((a,b)=> new Date(a[0]).getTime()-new Date(b[0]).getTime()).map(([date, value])=>({ date, value }));
  const statusComparison = [
    { name: 'Received', amount: counts.received },
    { name: 'Processing', amount: counts.inProgress },
    { name: 'Completed', amount: counts.completed },
  ];

  const Row = ({ label, value, bg }: { label: string; value: number; bg: string }) => (
    <Card className={`shadow-sm border bg-gradient-to-r ${bg}`}>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-gray-700">{label}</p>
        <p className="text-xl font-extrabold text-gray-900">{Number(value||0).toLocaleString()}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-6 w-full max-w-full mx-0 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Lab Technician Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage samples, tests, and laboratory operations</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Filter className="h-4 w-4 text-gray-500" />
        <Input type="date" value={range.from} onChange={(e)=>setRange({ ...range, from: e.target.value })} />
        <span>—</span>
        <Input type="date" value={range.to} onChange={(e)=>setRange({ ...range, to: e.target.value })} />
        <Button variant="outline" onClick={()=> setRange(r=> ({...r}))} disabled={loadingDash}>Apply</Button>
      </div>

      {/* Stats Grid (Pending & Urgent removed) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        <Row label="Total Samples" value={counts.total} bg="from-blue-100 to-blue-200" />
        <Row label="Completed" value={counts.completed} bg="from-green-100 to-green-200" />
        <Row label="Pending" value={counts.pending} bg="from-amber-100 to-amber-200" />
        <Row label="Tests in Range" value={testsTotal} bg="from-teal-100 to-teal-200" />
        <Row label="Received" value={counts.received} bg="from-sky-100 to-sky-200" />
        <Row label="Completed Today" value={counts.completedToday} bg="from-emerald-100 to-emerald-200" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-base font-semibold mb-2">Samples Per Day</h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={samplesPerDay} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RTooltip formatter={(v: any) => [Number(v).toLocaleString(), 'Samples']} />
                  <Bar dataKey="value" fill="#60a5fa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-base font-semibold mb-2">Status Distribution</h3>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusComparison} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RTooltip formatter={(v: any, _n: any, item: any) => [Number(v).toLocaleString(), item?.payload?.name || 'Count']} />
                  <Bar dataKey="amount" fill="#34d399" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}

      {/* Recent Samples removed */}
    </div>
  );
};

export default LabTechnicianDashboard;
