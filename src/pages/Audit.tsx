import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/lib/api';

const AuditPage: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const [logs, setLogs] = React.useState<any[]>([]);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [total, setTotal] = React.useState<number | null>(null);
  const [action, setAction] = React.useState('');
  const [module, setModule] = React.useState('');
  const [userId, setUserId] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', String(limit));
      if (action) qs.set('action', action);
      if (module) qs.set('module', module);
      if (userId) qs.set('userId', userId);
      if (dateFrom) qs.set('dateFrom', dateFrom);
      if (dateTo) qs.set('dateTo', dateTo);
      const res = await fetch(`${API_URL}/api/audit?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
      setLogs(items);
      setTotal(!Array.isArray(data) ? (data?.total ?? null) : null);
    } catch {
      setLogs([]);
      setTotal(null);
    } finally { setLoading(false); }
  }, [page, limit, action, module, userId, dateFrom, dateTo]);

  React.useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="p-4">
      <Card className="shadow">
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3">
            <div>
              <label className="text-xs text-slate-600">Action</label>
              <input className="w-full h-9 px-2 border rounded" value={action} onChange={e=>{ setPage(1); setAction(e.target.value); }} placeholder="e.g. login, token.create" />
            </div>
            <div>
              <label className="text-xs text-slate-600">Module</label>
              <input className="w-full h-9 px-2 border rounded" value={module} onChange={e=>{ setPage(1); setModule(e.target.value); }} placeholder="e.g. auth, tokens" />
            </div>
            <div>
              <label className="text-xs text-slate-600">User ID</label>
              <input className="w-full h-9 px-2 border rounded" value={userId} onChange={e=>{ setPage(1); setUserId(e.target.value); }} placeholder="optional" />
            </div>
            <div>
              <label className="text-xs text-slate-600">From</label>
              <input type="date" className="w-full h-9 px-2 border rounded" value={dateFrom} onChange={e=>{ setPage(1); setDateFrom(e.target.value); }} />
            </div>
            <div>
              <label className="text-xs text-slate-600">To</label>
              <input type="date" className="w-full h-9 px-2 border rounded" value={dateTo} onChange={e=>{ setPage(1); setDateTo(e.target.value); }} />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={fetchLogs} disabled={loading}>Refresh</Button>
              <Button variant="outline" onClick={()=>{ setAction(''); setModule(''); setUserId(''); setDateFrom(''); setDateTo(''); setPage(1); }}>Clear</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Date/Time</th>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Module</th>
                  <th className="py-2 pr-4">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l: any, idx: number) => (
                  <tr key={l._id || idx} className="border-b last:border-0">
                    <td className="py-2 pr-4">{l.timestamp ? new Date(l.timestamp).toLocaleString() : '-'}</td>
                    <td className="py-2 pr-4">{l.user || l.username || '-'}</td>
                    <td className="py-2 pr-4">{l.action || '-'}</td>
                    <td className="py-2 pr-4">{l.module || '-'}</td>
                    <td className="py-2 pr-4">{l.details || l.description || '-'}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td className="py-4 text-gray-500" colSpan={5}>No audit logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Rows per page</span>
                <select className="border rounded h-8 px-2" value={limit} onChange={e=>{ setPage(1); setLimit(parseInt(e.target.value)||10); }}>
                  {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" disabled={page<=1 || loading} onClick={()=> setPage(p => Math.max(1, p-1))}>Prev</Button>
                <div className="text-sm">Page {page}{total!=null ? ` of ${Math.max(1, Math.ceil(total/limit))}` : ''}</div>
                <Button variant="outline" disabled={total!=null ? (page*limit)>=total : logs.length<limit || loading} onClick={()=> setPage(p => p+1)}>Next</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditPage;
