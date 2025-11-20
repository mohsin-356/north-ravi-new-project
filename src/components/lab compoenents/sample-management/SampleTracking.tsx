import { useState, useEffect } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TestType } from "@/types/sample";
import { useToast } from "@/hooks/use-toast";
import { Search, ArrowLeft } from "lucide-react";
import { printLabTokenSlip } from "../../../utils/printLabSlip";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SampleTrackingProps {
  onNavigateBack?: () => void;
}

export interface BackendSample {
  _id: string;
  patientName: string;
  patientId?: string;
  tests: TestType[];
  status: "received" | "processing" | "completed" | "archived";
  priority: "normal" | "high" | "urgent";
  receivedAt: string;
  processedAt?: string;
  completedAt?: string;
  notes?: string;
}

const SampleTrackingClean = ({ onNavigateBack }: SampleTrackingProps) => {
  const { toast } = useToast();
  const [samples, setSamples] = useState<BackendSample[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const buildQuery = () => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(pageSize));
    if (statusFilter) params.set('status', statusFilter);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    if (searchTerm) params.set('q', searchTerm);
    return params.toString();
  };

  const loadSamples = () => {
    setLoading(true);
    const qs = buildQuery();
    fetch(`/api/labtech/samples?${qs}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(async (r) => {
        const data = await r.json();
        // Backward compatibility: server may return an array
        if (Array.isArray(data)) {
          setSamples(data);
          setTotal(data.length);
        } else {
          setSamples(data.data || []);
          setTotal(Number(data.total || 0));
        }
      })
      .catch(() => toast({ title: "Error", description: "Failed to load samples", variant: "destructive" }))
      .finally(()=> setLoading(false));
  };

  const deleteSample = async (sample: BackendSample) => {
    if (!confirm(`Delete sample ${sample._id}? This cannot be undone.`)) return;
    setUpdatingId(sample._id);
    try {
      const res = await fetch(`/api/labtech/samples/${sample._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Deleted', description: `Sample ${sample._id} removed` });
      loadSamples();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete sample', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    loadSamples();
    // re-fetch when paging/filters/search change
  }, [page, pageSize, statusFilter, dateFrom, dateTo, searchTerm]);

  const updateSampleStatus = async (sample: BackendSample, newStatus: BackendSample["status"]) => {
    setUpdatingId(sample._id);
    try {
      const res = await fetch(`/api/labtech/samples/${sample._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Success", description: `Sample ${sample._id} updated to ${newStatus}` });
      loadSamples();
    } catch {
      toast({ title: "Error", description: "Failed to update sample", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  // Server-side pagination: samples is already the paged set
  const filtered = samples;

  // Reset to page 1 when filters or date range change
  useEffect(() => { setPage(1); }, [statusFilter, dateFrom, dateTo]);

  const handlePrintToken = (s: BackendSample) => {
    try {
      const token = (s as any).tokenNo || (s as any).token || (s as any).sampleNumber || s._id;
      const phone = (s as any).phone || (s as any).patientPhone || '';
      const tests = (s.tests || []).map((t: any) => ({ name: (t?.name || ''), amount: Number(t?.amount ?? t?.price ?? 0) }));
      const discount = Number((s as any).discount || 0);
      printLabTokenSlip({
        tokenNumber: String(token),
        dateTime: (s as any).createdAt || s.receivedAt,
        doctor: (s as any).doctor || (s as any).doctorName || '',
        patientName: s.patientName,
        phone,
        age: (s as any).age || '',
        gender: (s as any).gender || '',
        tests,
        discount,
      });
    } catch {
      toast({ title: 'Print Failed', description: 'Unable to render token slip for this row.', variant: 'destructive' });
    }
  };

  const statusColor = (status: BackendSample["status"]) => {
    switch (status) {
      case "received":
        return "bg-blue-100 text-blue-800";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleDailyRegister = async (mode: 'download' | 'print' = 'download') => {
    try {
      const start = new Date(`${dateFrom}T00:00:00`);
      const end = new Date(`${dateTo}T23:59:59`);
      const inRange = samples.filter((s: any) => {
        const d = new Date((s as any).createdAt || (s as any).updatedAt || s.receivedAt);
        return d >= start && d <= end;
      });

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const marginLeft = 36;
      const contentW = 523;
      let y = 40;

      const labSettingsRaw = (typeof window !== 'undefined') ? localStorage.getItem('labSettings') : null;
      const labSettings = labSettingsRaw ? JSON.parse(labSettingsRaw) : {};
      const name = labSettings?.labName || localStorage.getItem('hospitalName') || 'Hospital Laboratory';
      const address = labSettings?.address || '';
      const phone = labSettings?.phone || '';
      const logoUrl = localStorage.getItem('hospitalLogoUrl') || localStorage.getItem('labLogoUrl') || labSettings?.logoUrl || '';

      // Try to draw logo if available
      let logoDrawn = false;
      if (logoUrl) {
        try {
          const resp = await fetch(logoUrl);
          const blob = await resp.blob();
          const reader = new FileReader();
          const dataUrl: string = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          const imgW = 60; const imgH = 60;
          // Place same size as ReportGenerator top-left
          doc.addImage(dataUrl, 'PNG', marginLeft, y - 30, imgW, imgH, undefined, 'FAST');
          // Adjust text X start to avoid overlapping logo
          doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
          doc.text(String(name), marginLeft + imgW + 10, y);
          logoDrawn = true; y += 18;
        } catch {}
      }

      if (!logoDrawn) { doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text(String(name), marginLeft, y); y += 18; }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
      const startDd = String(start.getDate()).padStart(2, '0');
      const endDd = String(end.getDate()).padStart(2, '0');
      const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const startFmt = `${startDd}-${m[start.getMonth()]}-${start.getFullYear()}`;
      const endFmt = `${endDd}-${m[end.getMonth()]}-${end.getFullYear()}`;
      const duration = `DURATION (FROM ${startFmt} -TO- ${endFmt})`;
      doc.text(duration, marginLeft + contentW, y, { align: 'right' });
      y += 18;

      doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
      doc.text('DAILY LAB REGISTER', marginLeft + contentW / 2, y, { align: 'center' });
      y += 14;
      doc.setLineWidth(1); doc.line(marginLeft, y, marginLeft + contentW, y); y += 8;

      const rows = inRange.map((s: any, idx: number) => {
        const mr = (s as any).mrNumber || (s as any).patientMr || s.patientId || '-';
        const labno = (s as any).tokenNo || (s as any).token || (s as any).sampleNumber || s._id;
        const dt = new Date((s as any).createdAt || (s as any).updatedAt || s.receivedAt);
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yyyy = String(dt.getFullYear());
        const date = `${dd}/${mm}/${yyyy}`;
        const name = s.patientName || '-';
        const age = (s as any).age ? `${(s as any).age} Y` : '';
        const tests = (s.tests || []).map((t: any) => (typeof t === 'string' ? '' : (t?.name || ''))).filter(Boolean).join(', ');
        const sampling = new Date((s as any).receivedAt || (s as any).createdAt || dt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const reporting = (s as any).completedAt ? new Date((s as any).completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
        return [String(idx + 1), String(mr), String(labno), date, name, age, tests, sampling, reporting];
      });

      (autoTable as any)(doc, {
        startY: y,
        head: [[ 'SR.NO', 'MR NO', 'LABNO', 'DATE', 'PATIENT NAME', 'AGE', 'TESTS', 'SAMPLING TIME', 'REPORTING TIME' ]],
        body: rows,
        tableWidth: 'wrap',
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 3, overflow: 'linebreak' },
        headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 32, halign: 'center' },   // SR.NO
          1: { cellWidth: 58, halign: 'center' },   // MR NO
          2: { cellWidth: 58, halign: 'center' },   // LABNO
          3: { cellWidth: 60, halign: 'center' },   // DATE (dd/MM/yyyy)
          4: { cellWidth: 94, halign: 'left' },    // PATIENT NAME
          5: { cellWidth: 28, halign: 'center' },  // AGE
          6: { cellWidth: 90, halign: 'left' },    // TESTS (wrap)
          7: { cellWidth: 51, halign: 'center' },  // SAMPLING TIME (avoid wrap)
          8: { cellWidth: 52, halign: 'center' },  // REPORTING TIME (avoid wrap)
        },
        margin: { left: marginLeft, right: marginLeft },
      });

      if (mode === 'print') {
        const blob = (doc as any).output('blob');
        const url = URL.createObjectURL(blob);
        const win = window.open(url);
        if (win) { win.onload = () => win.print(); }
      } else {
        doc.save(`DailyLabRegister_${dateFrom}_to_${dateTo}.pdf`);
      }
    } catch {
      toast({ title: 'Export failed', description: 'Could not generate daily register', variant: 'destructive' });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Sample Tracking</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-end">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by sample ID, patient, or test..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2">
          <div className="flex items-center gap-2">
            <Label className="sr-only">From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[150px]" />
            <Label className="sr-only">To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[150px]" />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-md">
            {[
              { key: "all", label: "All" },
              { key: "received", label: "Received" },
              { key: "completed", label: "Completed" },
            ].map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                variant={statusFilter === tab.key ? "default" : "ghost"}
                className={`h-8 px-3 ${statusFilter === tab.key ? 'shadow' : ''}`}
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="outline" className="h-9" onClick={() => handleDailyRegister('download')}>Download Daily Register</Button>
        </div>
      </div>

      <div className="rounded-xl border overflow-auto">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50 text-left text-sm text-gray-600">
              <th className="px-3 py-2 border-b">Date</th>
              <th className="px-3 py-2 border-b">Patient</th>
              <th className="px-3 py-2 border-b">Token No</th>
              <th className="px-3 py-2 border-b">Test(s)</th>
              <th className="px-3 py-2 border-b">CNIC</th>
              <th className="px-3 py-2 border-b">Father Name</th>
              <th className="px-3 py-2 border-b">Phone</th>
              <th className="px-3 py-2 border-b">Sample Time</th>
              <th className="px-3 py-2 border-b">Reporting Time</th>
              <th className="px-3 py-2 border-b">Status</th>
              <th className="px-3 py-2 border-b text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filtered.map((s) => {
              const token = (s as any).tokenNo || (s as any).token || '-';
              const cnic = (s as any).cnic || (s as any).patientCnic || '-';
              const phone = (s as any).phone || (s as any).patientPhone || '-';
              const father = (s as any).fatherName || (s as any).guardianName || '-';
              const sampling = new Date((s as any).receivedAt || (s as any).createdAt || (s as any).updatedAt || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
              const reporting = (s as any).completedAt ? new Date((s as any).completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
              return (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border-b whitespace-nowrap">{(() => { const d = (s as any).createdAt || (s as any).updatedAt || s.receivedAt; try { return d ? new Date(d).toLocaleString() : '-'; } catch { return '-'; } })()}</td>
                  <td className="px-3 py-2 border-b">
                    <div className="font-medium">{s.patientName || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{s.patientId || ''}</div>
                  </td>
                  <td className="px-3 py-2 border-b">{token}</td>
                  <td className="px-3 py-2 border-b">{s.tests.map(t => t.name).join(', ')}</td>
                  <td className="px-3 py-2 border-b">{cnic}</td>
                  <td className="px-3 py-2 border-b">{father}</td>
                  <td className="px-3 py-2 border-b">{phone}</td>
                  <td className="px-3 py-2 border-b whitespace-nowrap">{sampling}</td>
                  <td className="px-3 py-2 border-b whitespace-nowrap">{reporting}</td>
                  <td className="px-3 py-2 border-b">
                    <Badge className={statusColor(s.status)}>{s.status}</Badge>
                  </td>
                  <td className="px-3 py-2 border-b text-right">
                    <Button variant="outline" size="sm" className="mr-2"
                      onClick={() => handlePrintToken(s)}>
                      Print Token
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50"
                      disabled={updatingId === s._id}
                      onClick={() => deleteSample(s as any)}>
                      {updatingId === s._id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-gray-500">
                  <Search className="mx-auto w-10 h-10 text-gray-300 mb-2" />
                  No samples found matching your criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3 pt-3">
        <div className="text-sm text-gray-600">
          {loading ? 'Loading…' : `Showing ${(total===0)?0:((page-1)*pageSize+1)}-${Math.min(page*pageSize,total)} of ${total}`}
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Rows</Label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={pageSize}
            onChange={(e)=>{ setPageSize(parseInt(e.target.value)||20); setPage(1); }}
          >
            {[10,20,50,100].map(n=> (<option key={n} value={n}>{n}</option>))}
          </select>
          <Button size="sm" variant="outline" disabled={page<=1 || loading} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</Button>
          <div className="text-sm min-w-[80px] text-center">Page {page}</div>
          <Button size="sm" variant="outline" disabled={page*pageSize>=total || loading} onClick={()=>setPage(p=>p+1)}>Next</Button>
        </div>
      </div>
    </div>
  );
};

export default SampleTrackingClean;

  