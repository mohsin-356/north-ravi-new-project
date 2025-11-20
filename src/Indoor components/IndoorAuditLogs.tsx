import React from 'react';
import { indoorApi } from '@/Indoor lib/api';

const IndoorAuditLogs: React.FC = () => {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [action, setAction] = React.useState('all');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [auto, setAuto] = React.useState(false);

  const fetchLogs = async () => {
    setLoading(true); setErr(null);
    try {
      const params: any = { search, action };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data } = await indoorApi.get('/audit-logs', { params });
      setLogs(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load logs');
    } finally { setLoading(false); }
  };

  React.useEffect(() => { fetchLogs(); // initial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!auto) return;
    const t = setInterval(fetchLogs, 5000);
    return () => clearInterval(t);
  }, [auto, search, action, startDate, endDate]);

  return (
    <div className="space-y-3">
      <div className="p-3 bg-white border rounded-md grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
        <input className="border rounded px-3 py-2 w-full md:col-span-2" placeholder="Search user/action/details" value={search} onChange={e=>setSearch(e.target.value)} />
        <div>
          <label className="text-xs block mb-1 text-slate-600">Start</label>
          <input type="date" className="border rounded px-3 py-2 w-full" value={startDate} onChange={e=>setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs block mb-1 text-slate-600">End</label>
          <input type="date" className="border rounded px-3 py-2 w-full" value={endDate} onChange={e=>setEndDate(e.target.value)} />
        </div>
        <select className="border rounded px-3 py-2" value={action} onChange={e=>setAction(e.target.value)}>
          <option value="all">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="SALE_CREATE">SALE_CREATE</option>
          <option value="ADD_STOCK_CREATE">ADD_STOCK_CREATE</option>
          <option value="ADD_STOCK_APPROVE">ADD_STOCK_APPROVE</option>
          <option value="ADD_STOCK_UPDATE">ADD_STOCK_UPDATE</option>
          <option value="ADD_STOCK_DELETE">ADD_STOCK_DELETE</option>
          <option value="RETURN_CUSTOMER">RETURN_CUSTOMER</option>
          <option value="RETURN_SUPPLIER">RETURN_SUPPLIER</option>
          <option value="EXPENSE_CREATE">EXPENSE_CREATE</option>
          <option value="EXPENSE_UPDATE">EXPENSE_UPDATE</option>
          <option value="EXPENSE_DELETE">EXPENSE_DELETE</option>
        </select>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={fetchLogs} disabled={loading}>{loading ? 'Loading…' : 'Filter'}</button>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)} /> Auto refresh
          </label>
        </div>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="overflow-auto bg-white border rounded-md">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-1 text-left">Time</th>
              <th className="px-2 py-1 text-left">User</th>
              <th className="px-2 py-1 text-left">Action</th>
              <th className="px-2 py-1 text-left">Entity</th>
              <th className="px-2 py-1 text-left">Details</th>
              <th className="px-2 py-1 text-left">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l._id} className="border-t">
                <td className="px-2 py-1">{l.timestamp ? new Date(l.timestamp).toLocaleString() : ''}</td>
                <td className="px-2 py-1">{l.userName} <span className="text-xs text-gray-500">({l.userRole})</span></td>
                <td className="px-2 py-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    l.action?.includes('DELETE') ? 'bg-rose-100 text-rose-700' :
                    l.action?.includes('UPDATE') ? 'bg-amber-100 text-amber-800' :
                    l.action?.includes('RETURN') ? 'bg-sky-100 text-sky-700' :
                    l.action?.includes('CREATE') ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>{l.action}</span>
                </td>
                <td className="px-2 py-1">{l.entityType} <span className="text-xs text-gray-500">{l.entityId}</span></td>
                <td className="px-2 py-1">{l.details}</td>
                <td className="px-2 py-1">{l.ipAddress}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td className="px-2 py-3 text-center text-gray-500" colSpan={6}>No audit logs</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IndoorAuditLogs;
