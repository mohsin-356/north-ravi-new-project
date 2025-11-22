import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TestType } from "@/types/sample";
import { AlertTriangle, CheckCircle, Send, ArrowLeft, Search, Plus, Trash } from "lucide-react";
import { api } from "@/lib/api";

interface ResultEntryProps {
  onNavigateBack?: () => void;
}

export interface BackendSample {
  _id: string;
  patientName: string;
  phone: string;
  tests: TestType[];
  status: "received" | "processing" | "completed";
  results?: BackendResult[];
  interpretation?: string;
  age?: string;
  gender?: string;
}

export interface BackendResult {
  parameterId: string;
  value: number | string;
  comment?: string;
  isAbnormal?: boolean;
  isCritical?: boolean;
  // optional fields for manual/custom rows and robustness in reports
  label?: string;
  unit?: string;
  normalText?: string;
}

export interface TestParameter {
  id: string;
  name: string;
  unit: string;
  normalRange: { min: number; max: number };
  // optional group-specific ranges (may be string like "4-11" or object)
  normalRangeMale?: any;
  normalRangeFemale?: any;
  normalRangePediatric?: any;
  criticalRange?: { min: number; max: number };
}

const ResultEntryClean = ({ onNavigateBack }: ResultEntryProps) => {
  const { toast } = useToast();
  const [samples, setSamples] = useState<BackendSample[]>([]);
  const [selectedSample, setSelectedSample] = useState<BackendSample | null>(null);
  const [results, setResults] = useState<BackendResult[]>([]);
  const [interpretation, setInterpretation] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [serverPaging, setServerPaging] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dynamic parameter list fetched per selected test
  const [testParameters, setTestParameters] = useState<TestParameter[]>([]);
  // Derived reference group (read-only UI)
  const [referenceGroup, setReferenceGroup] = useState<'male' | 'female' | 'pediatric'>('male');
  const [patientAge, setPatientAge] = useState<number | ''>('');
  const [patientSex, setPatientSex] = useState<'male' | 'female' | ''>('');
  // Track raw input strings so users can type freely (including empty string)
  const [resultInputs, setResultInputs] = useState<Record<string, string>>({});
  const [editableMeta, setEditableMeta] = useState<Record<string, { unit: string; normalText: string }>>({});

  // Custom/manual rows
  type ManualRow = { id: string; name: string; unit: string; normalText: string };
  const [manualRows, setManualRows] = useState<ManualRow[]>([]);

  const fetchParameters = async (testId: string) => {
    try {
      const { data } = await api.get(`/labtech/tests/${testId}`);
      // Normalize parameters to include optional gender/age specific ranges if present
      const params = (data.parameters || []).map((p: any) => ({
        id: p.id || p._id || `${p.name}|${p.unit || ''}`,
        name: p.name,
        unit: p.unit,
        normalRange: p.normalRange || { min: undefined, max: undefined },
        // pass through optional alternative ranges as metadata
        normalRangeMale: p.normalRangeMale || p.normalRange_male || null,
        normalRangeFemale: p.normalRangeFemale || p.normalRange_female || null,
        normalRangePediatric: p.normalRangePediatric || p.normalRange_pediatric || null,
        criticalRange: p.criticalRange
      }));
      setTestParameters(params);
    } catch {
      toast({ title: "Error", description: "Failed to load test parameters", variant: "destructive" });
    }
  };

  // Derived counters for summary
  const criticalCount = results.filter(r => r.isCritical).length;
  const abnormalCount = results.filter(r => !r.isCritical && r.isAbnormal).length;

  // Auto-select reference group from selected sample demographics
  useEffect(() => {
    if (!selectedSample) return;
    if (selectedSample.gender) {
      const g = selectedSample.gender.toLowerCase();
      if (g === 'male' || g === 'm') { setPatientSex('male'); setReferenceGroup('male'); }
      if (g === 'female' || g === 'f') { setPatientSex('female'); setReferenceGroup('female'); }
    }
    if (selectedSample.age) {
      const years = parseFloat(selectedSample.age);
      if (!isNaN(years)) {
        setPatientAge(years);
        if (years < 13) setReferenceGroup('pediatric');
      }
    }
    // Load parameter definitions for all tests in this sample so units and normal ranges auto-fill
    const loadParamsForSample = async () => {
      try {
        // Try to refetch the selected sample populated from backend to ensure tests include parameters
        let tests = (selectedSample.tests || []) as any[];
        try {
          const { data: enriched } = await api.get(`/labtech/samples/${selectedSample._id}`);
          if (enriched && Array.isArray(enriched.tests)) {
            // Prefer enriched tests if they contain parameters
            const hasParams = enriched.tests.some((t: any) => Array.isArray(t?.parameters) && t.parameters.length > 0);
            if (hasParams) tests = enriched.tests as any[];
          }
        } catch {}
        // 1) Prefer parameters embedded via populate if present
        const embeddedParams: any[] = [];
        tests.forEach((t: any) => {
          const params = (t && t.parameters) ? t.parameters : [];
          params.forEach((p: any) => embeddedParams.push({
            id: p.id || p._id || `${p.name}|${p.unit || ''}`,
            name: p.name,
            unit: p.unit,
            normalRange: p.normalRange || { min: undefined, max: undefined },
            normalRangeMale: p.normalRangeMale || p.normalRange_male || null,
            normalRangeFemale: p.normalRangeFemale || p.normalRange_female || null,
            normalRangePediatric: p.normalRangePediatric || p.normalRange_pediatric || null,
            criticalRange: p.criticalRange || undefined,
          }));
        });
        const dedupe = (arr: any[]) => {
          const out: any[] = [];
          const seen = new Set<string>();
          arr.forEach((p: any) => {
            const key = p.id || `${p.name}|${p.unit || ''}`;
            if (key && !seen.has(key)) { seen.add(key); out.push(p); }
          });
          return out;
        };
        if (embeddedParams.length) {
          setTestParameters(dedupe(embeddedParams));
          return;
        }
        // 2) Fallback: fetch each test to get parameters
        const testIds = tests
          .map((t: any) => (typeof t === 'string' ? t : (t?._id || t?.id || t?.name)))
          .filter(Boolean);
        if (testIds.length === 0) { setTestParameters([]); return; }
        const fetched = await Promise.all(
          testIds.map(async (tid: string) => {
            const { data } = await api.get(`/labtech/tests/${tid}`);
            const params = (data.parameters || []).map((p: any) => ({
              id: p.id || p._id || `${p.name}|${p.unit || ''}`,
              name: p.name,
              unit: p.unit,
              normalRange: p.normalRange || { min: undefined, max: undefined },
              normalRangeMale: p.normalRangeMale || p.normalRange_male || null,
              normalRangeFemale: p.normalRangeFemale || p.normalRange_female || null,
              normalRangePediatric: p.normalRangePediatric || p.normalRange_pediatric || null,
              criticalRange: p.criticalRange || undefined,
            }));
            return params as any[];
          })
        );
        const byDb = dedupe(fetched.flat());
        if (byDb.length) { setTestParameters(byDb); return; }

        // 3) Final fallback: use master tests CSV served by backend to derive parameters by test name
        try {
          const { data: master } = await api.get('/labtech/master-tests-public');
          if (Array.isArray(master) && master.length && tests.length) {
            // helper: fuzzy match a master Test_Name to the given test name
            const norm = (s: string) => {
              const x = (s || '').toString().toLowerCase()
                .replace(/\bhrs?\b/g, 'hour')
                .replace(/\b24\s*hours?\b/g, '24hour')
                .replace(/\s+/g, ' ')
                .trim();
              return x.replace(/[^a-z0-9]+/g, '');
            };
            const score = (a: string, b: string) => {
              if (!a || !b) return 0;
              const na = norm(a), nb = norm(b);
              if (!na || !nb) return 0;
              if (na === nb) return 1.0;
              if (na.includes(nb) || nb.includes(na)) return 0.92;
              const ta = new Set(na.split(/\d+|[^a-z]+/).filter(Boolean));
              const tb = new Set(nb.split(/\d+|[^a-z]+/).filter(Boolean));
              if (!ta.size || !tb.size) return 0;
              let inter = 0; ta.forEach(t => { if (tb.has(t)) inter++; });
              const union = ta.size + tb.size - inter;
              return inter / union;
            };
            const findBestRows = (testName: string) => {
              const name = (testName || '').toString();
              // group rows by their Test_Name
              const byName = new Map<string, any[]>();
              (master as any[]).forEach((r: any) => {
                const tn = (r.Test_Name ?? '').toString();
                if (!byName.has(tn)) byName.set(tn, []);
                byName.get(tn)!.push(r);
              });
              let bestName = '';
              let bestScore = 0;
              byName.forEach((_rows, tn) => {
                const sc = score(name, tn);
                if (sc > bestScore) { bestScore = sc; bestName = tn; }
              });
              if (bestScore < 0.55) return [] as any[]; // too weak
              return byName.get(bestName) || [];
            };

            const rowsToParams = (testName: string) => {
              const matched = findBestRows(testName);
              const out: any[] = [];
              matched.forEach((r: any) => {
                const pname = String(r.Parameter || '').trim();
                const unit = String(r.Unit || '').trim();
                const male = r.Normal_Range_Male || null;
                const female = r.Normal_Range_Female || null;
                const ped = r.Normal_Range_Pediatric || null;
                const ref = r.Reference_Range || r.Reference || null;
                // prefer group-specific strings; else use single reference text if present
                const nr: any = {};
                // Try to parse "A - B" style when Reference_Range given
                const parseStrRange = (s: any) => {
                  if (!s || typeof s !== 'string') return null;
                  const m = s.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
                  if (m) return { min: parseFloat(m[1]), max: parseFloat(m[2]) };
                  return null;
                };
                const parsed = parseStrRange(ref);
                if (parsed) nr.min = parsed.min, nr.max = parsed.max;
                const param = {
                  id: `${pname}|${unit}`,
                  name: pname || testName,
                  unit,
                  normalRange: Object.keys(nr).length ? nr : { min: undefined, max: undefined },
                  normalRangeMale: male || null,
                  normalRangeFemale: female || null,
                  normalRangePediatric: ped || null,
                };
                if (pname || unit) out.push(param);
              });
              return out;
            };
            const fromMaster = dedupe(
              tests.flatMap((t: any) => rowsToParams(typeof t === 'string' ? t : (t?.name || '')))
            );
            if (fromMaster.length) { setTestParameters(fromMaster); return; }
          }
        } catch {}

        // If all fallbacks fail, leave empty array (user can add manual rows)
        setTestParameters([]);
      } catch {
        toast({ title: 'Error', description: 'Failed to load parameters for sample tests', variant: 'destructive' });
      }
    };
    // reset raw input cache when sample changes
    setResultInputs({});
    setEditableMeta({});
    loadParamsForSample();
  }, [selectedSample]);

  const loadSamples = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('status', 'processing,received');
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    api
      .get<any>(`/labtech/samples?${params.toString()}`)
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setServerPaging(false);
          const pending = (data || []).filter((s: any) => s.status === 'processing' || s.status === 'received');
          setSamples(pending);
          const tot = pending.length;
          setTotal(tot);
          setTotalPages(Math.max(1, Math.ceil(tot / limit)));
        } else if (data && Array.isArray(data.data)) {
          setServerPaging(true);
          setSamples(data.data || []);
          setTotal(Number(data.total) || 0);
          setTotalPages(Number(data.totalPages) || 1);
        } else {
          setServerPaging(false);
          setSamples([]);
          setTotal(0);
          setTotalPages(1);
        }
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to load samples', variant: 'destructive' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSamples();
  }, [page, limit, searchTerm]);
  useEffect(() => { setPage(1); }, [searchTerm]);

  // helper to get numeric min/max from parameter based on group
  const getGroupRange = (param: any): { min?: number; max?: number } => {
    const pick = referenceGroup === 'male' ? param.normalRangeMale
      : referenceGroup === 'female' ? param.normalRangeFemale
      : param.normalRangePediatric;
    const toRange = (r: any): { min?: number; max?: number } | null => {
      if (!r) return null;
      if (typeof r === 'object' && (typeof r.min === 'number' || typeof r.max === 'number')) return { min: r.min, max: r.max };
      if (typeof r === 'string') {
        const m = r.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
        if (m) return { min: parseFloat(m[1]), max: parseFloat(m[2]) };
      }
      return null;
    };
    return toRange(pick) || param.normalRange || {};
  };

  const updateResult = (parameterId: string, value: string) => {
    // cache raw input so user can type freely
    setResultInputs(prev => ({ ...prev, [parameterId]: value }));
    const param: any = testParameters.find((p: any) => p.id === parameterId);
    if (!param) {
      // still ensure entry exists for comment linkage
      setResults(prev => {
        const existing = prev.find(r => r.parameterId === parameterId);
        return existing ? prev : [...prev, { parameterId, value: null as any }];
      });
      return;
    }
    if (value === '') {
      // allow clearing the field; keep entry with null value and clear flags
      setResults(prev => {
        const existing = prev.find(r => r.parameterId === parameterId);
        if (existing) return prev.map(r => (r.parameterId === parameterId ? { ...r, value: null as any, isAbnormal: undefined, isCritical: undefined } : r));
        return [...prev, { parameterId, value: null as any }];
      });
      return;
    }
    const normalized = value.trim();
    const num = parseFloat(normalized.replace(/,/g, "."));
    if (normalized !== '' && isNaN(num)) {
      // qualitative value: save as string and clear flags
      setResults(prev => {
        const existing = prev.find(r => r.parameterId === parameterId);
        if (existing) return prev.map(r => (r.parameterId === parameterId ? { ...r, value: normalized, isAbnormal: undefined, isCritical: undefined } : r));
        return [...prev, { parameterId, value: normalized }];
      });
      return;
    }
    const nr = getGroupRange(param) || {};
    const cr = param.criticalRange || undefined;
    const hasMin = typeof nr.min === 'number';
    const hasMax = typeof nr.max === 'number';
    const isAbnormal = (hasMin && num < nr.min) || (hasMax && num > nr.max) ? true : false;
    const isCritical = cr ? ((typeof cr.min === 'number' && num < cr.min) || (typeof cr.max === 'number' && num > cr.max)) : false;
    setResults((prev) => {
      const existing = prev.find((r) => r.parameterId === parameterId);
      if (existing) {
        return prev.map((r) => (r.parameterId === parameterId ? { ...r, value: num, isAbnormal, isCritical } : r));
      }
      return [...prev, { parameterId, value: num, isAbnormal, isCritical }];
    });
  };

  const updateComment = (parameterId: string, comment: string) => {
    setResults((prev) => {
      const existing = prev.find(r => r.parameterId === parameterId);
      if (existing) return prev.map(r => (r.parameterId === parameterId ? { ...r, comment } : r));
      // create entry if not exists so comments are allowed before numeric value
      return [...prev, { parameterId, value: null as any, comment }];
    });
  };

  

  const handleSubmit = async () => {
    if (!selectedSample) return;
    setSubmitting(true);
    try {
      const resultsWithMeta = results.map((r) => {
        const param: any = testParameters.find((p: any) => p.id === r.parameterId);
        let normalText = '';
        const rangeForGroup = referenceGroup === 'male' ? param?.normalRangeMale : referenceGroup === 'female' ? param?.normalRangeFemale : param?.normalRangePediatric;
        if (rangeForGroup) {
          normalText = typeof rangeForGroup === 'string' ? rangeForGroup : '';
        } else if (param?.normalRange && (param.normalRange.min !== undefined || param.normalRange.max !== undefined)) {
          const min = param.normalRange.min ?? '';
          const max = param.normalRange.max ?? '';
          normalText = `${min} - ${max}`.trim();
        }
        const override = editableMeta[r.parameterId];
        return {
          ...r,
          label: param?.name,
          unit: (override?.unit ?? (param?.unit || '')),
          normalText: (override?.normalText ?? normalText),
        } as BackendResult;
      });

      const mergedResults = [
        ...resultsWithMeta,
        ...manualRows.map(r => ({
          parameterId: r.id,
          value: (results.find(x=>x.parameterId===r.id)?.value) ?? null,
          comment: (results.find(x=>x.parameterId===r.id)?.comment) ?? undefined,
          label: r.name,
          unit: r.unit,
          normalText: r.normalText,
        }))
      ];
      await api.put(`/labtech/samples/${selectedSample._id}`, { results: mergedResults, interpretation, status: "completed" });
      toast({ title: "Submitted", description: "Results submitted and sample marked completed" });
      setSelectedSample(null);
      setResults([]);
      setInterpretation("");
      setManualRows([]);
      loadSamples();
    } catch {
      toast({ title: "Error", description: "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (parameterId: string) => {
    const res = results.find((r) => r.parameterId === parameterId);
    if (!res) return null;
    if (res.isCritical) return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
    if (res.isAbnormal) return <Badge className="bg-orange-100 text-orange-800">Abnormal</Badge>;
    return <Badge className="bg-green-100 text-green-800">Normal</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Result Entry</h1>
      </div>

      {/* Sample picker (full-width tabular layout) */}
      {!selectedSample && (
        <Card>
          <CardHeader>
            <CardTitle>Select Sample</CardTitle>
            <CardDescription>Choose a sample to enter test results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search by ID, patient, token, CNIC, phone..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm border">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-2 border-b">SR.NO</th>
                    <th className="px-3 py-2 border-b">Date</th>
                    <th className="px-3 py-2 border-b">Patient</th>
                    <th className="px-3 py-2 border-b">Token</th>
                    <th className="px-3 py-2 border-b">Test(s)</th>
                    <th className="px-3 py-2 border-b">CNIC</th>
                    <th className="px-3 py-2 border-b">Phone</th>
                    <th className="px-3 py-2 border-b">Status</th>
                    <th className="px-3 py-2 border-b text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(serverPaging ? samples : samples.filter(s=>{
                      const q = searchTerm.toLowerCase();
                      const token = (s as any).tokenNo || (s as any).token || '';
                      const cnic = (s as any).cnic || (s as any).patientCNIC || '';
                      const phone = (s as any).phone || (s as any).patientPhone || '';
                      return (
                        (s._id||'').toLowerCase().includes(q) ||
                        (s.patientName||'').toLowerCase().includes(q) ||
                        String(token).toLowerCase().includes(q) ||
                        String(cnic).toLowerCase().includes(q) ||
                        String(phone).toLowerCase().includes(q)
                      );
                    })).map((s, idx)=>{
                      const sr = (page - 1) * limit + idx + 1;
                      const token = (s as any).tokenNo || (s as any).token || '-';
                      const cnic = (s as any).cnic || (s as any).patientCNIC || '-';
                      const phone = (s as any).phone || (s as any).patientPhone || '-';
                      return (
                        <tr key={s._id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 border-b">{sr}</td>
                          <td className="px-3 py-2 border-b whitespace-nowrap">{(() => { const d = (s as any).createdAt || (s as any).updatedAt || (s as any).receivedAt; try { return d ? new Date(d).toLocaleString() : '-'; } catch { return '-'; } })()}</td>
                          <td className="px-3 py-2 border-b">
                            <div className="font-medium">{s.patientName}</div>
                            <div className="text-xs text-gray-500">{(s as any).patientId || ''}</div>
                          </td>
                          <td className="px-3 py-2 border-b">{token}</td>
                          <td className="px-3 py-2 border-b">{(s.tests||[]).map(t=> (typeof t==='string' ? '' : t.name)).filter(Boolean).join(', ')}</td>
                          <td className="px-3 py-2 border-b">{cnic}</td>
                          <td className="px-3 py-2 border-b">{phone}</td>
                          <td className="px-3 py-2 border-b"><Badge variant="outline">{s.status}</Badge></td>
                          <td className="px-3 py-2 border-b text-right">
                            <Button size="sm" onClick={()=>{setSelectedSample(s); setResults(s.results||[]); setInterpretation(s.interpretation||"");}}>Select</Button>
                          </td>
                        </tr>
                      );
                    })}
                  {(!loading && samples.length === 0) && (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-gray-500">No samples available for result entry</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-gray-600">
                {loading ? 'Loading...' : `${Math.min((page-1)*limit+1, Math.max(0, total||0))}-${Math.min(page*limit, Math.max(0, total||0))} of ${total ?? 0}`}
              </div>
              <div className="flex items-center gap-2">
                <select className="px-2 py-1 border rounded text-sm" value={limit} onChange={(e)=>{ setPage(1); setLimit(parseInt(e.target.value)||10); }}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <Button variant="outline" size="sm" onClick={()=>setPage(1)} disabled={page<=1}>First</Button>
                <Button variant="outline" size="sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Prev</Button>
                <div className="px-2 text-sm">Page {page} / {totalPages ?? 1}</div>
                <Button variant="outline" size="sm" onClick={()=>setPage(p=>Math.min((totalPages||1), p+1))} disabled={(totalPages||1) <= page}>Next</Button>
                <Button variant="outline" size="sm" onClick={()=>setPage(totalPages||1)} disabled={(totalPages||1) <= page}>Last</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entry form */}
      {selectedSample && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Sample ID: {selectedSample._id}</h2>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={submitting}><Send className="w-4 h-4 mr-1"/>Submit</Button>
            </div>
          </div>

          {/* stats */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-gray-600">Critical Values</p><p className="text-2xl font-bold text-red-600">{criticalCount}</p></div><AlertTriangle className="w-8 h-8 text-red-500"/></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-gray-600">Abnormal Values</p><p className="text-2xl font-bold text-orange-600">{abnormalCount}</p></div><AlertTriangle className="w-8 h-8 text-orange-500"/></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-gray-600">Normal Values</p><p className="text-2xl font-bold text-green-600">{results.length-criticalCount-abnormalCount}</p></div><CheckCircle className="w-8 h-8 text-green-500"/></CardContent></Card>
          </div>

          {/* Parameter Entry (table-like) */}
          <Card>
            <CardHeader>
              <CardTitle>Parameters</CardTitle>
              <CardDescription>
                Enter results. Reference group is derived from patient demographics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="px-3 py-2 rounded bg-blue-50 text-blue-800 text-sm">
                  Patient: <strong>{selectedSample?.patientName}</strong> • Age: <strong>{patientAge || '-'}</strong> • Sex: <strong>{patientSex || '-'}</strong> • Group: <strong className="capitalize">{referenceGroup}</strong>
                </div>
                <div className="ml-auto">
                  <Button type="button" variant="outline" size="sm" onClick={()=>{
                    const id = `manual-${Date.now()}`;
                    setManualRows(prev=>[...prev,{ id, name: '', unit: '', normalText: ''}]);
                  }} className="gap-2"><Plus className="w-4 h-4"/> Add Row</Button>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-sm border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 border text-left">Test</th>
                      <th className="p-2 border text-left">Normal Value</th>
                      <th className="p-2 border text-left">Unit</th>
                      <th className="p-2 border text-left">Result</th>
                      <th className="p-2 border text-left">Comment</th>
                      <th className="p-2 border"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {testParameters.map((p:any)=>{
                      const result = results.find(r=>r.parameterId===p.id);
                      // derive normal text by group if provided else default min-max
                      let normalText = '';
                      const rangeForGroup = referenceGroup==='male'? p.normalRangeMale : referenceGroup==='female'? p.normalRangeFemale : p.normalRangePediatric;
                      if(rangeForGroup){
                        normalText = typeof rangeForGroup === 'string' ? rangeForGroup : '';
                      } else if(p.normalRange && (p.normalRange.min!==undefined || p.normalRange.max!==undefined)){
                        const min = p.normalRange.min ?? '';
                        const max = p.normalRange.max ?? '';
                        normalText = `${min} - ${max}`.trim();
                      }
                      return (
                        <tr key={p.id} className="align-top">
                          <td className="p-2 border w-64">{p.name}</td>
                          <td className="p-2 border w-48">
                            <Input value={(editableMeta[p.id]?.normalText ?? normalText)} onChange={(e)=>{
                              const v = e.target.value; setEditableMeta(prev=>({ ...prev, [p.id]: { ...(prev[p.id]||{ unit: (p.unit||''), normalText }), normalText: v } }));
                            }} />
                          </td>
                          <td className="p-2 border w-32">
                            <Input value={(editableMeta[p.id]?.unit ?? (p.unit || ''))} onChange={(e)=>{
                              const v = e.target.value; setEditableMeta(prev=>({ ...prev, [p.id]: { ...(prev[p.id]||{ unit: (p.unit||''), normalText }), unit: v } }));
                            }} placeholder="Unit" />
                          </td>
                          <td className="p-2 border w-40">
                            <Input type="text" value={resultInputs[p.id] ?? (result?.value ?? '') as any} onChange={(e)=>updateResult(p.id, e.target.value)} />
                          </td>
                          <td className="p-2 border">
                            <Input value={result?.comment ?? ''} onChange={(e)=>updateComment(p.id, e.target.value)} placeholder="Optional" />
                          </td>
                          <td className="p-2 border w-32">{getStatusBadge(p.id)}</td>
                        </tr>
                      );
                    })}

                    {manualRows.map((r, idx)=>{
                      const res = results.find(x=>x.parameterId===r.id);
                      return (
                        <tr key={r.id} className="align-top bg-gray-50/30">
                          <td className="p-2 border w-64">
                            <Input value={r.name} onChange={(e)=>{
                              const v = e.target.value; setManualRows(prev=>prev.map((m,i)=> i===idx?{...m,name:v}:m));
                            }} placeholder="Custom test name" />
                          </td>
                          <td className="p-2 border w-48">
                            <Input value={r.normalText} onChange={(e)=>{
                              const v = e.target.value; setManualRows(prev=>prev.map((m,i)=> i===idx?{...m,normalText:v}:m));
                            }} placeholder="e.g., 4-11" />
                          </td>
                          <td className="p-2 border w-32">
                            <Input value={r.unit} onChange={(e)=>{
                              const v = e.target.value; setManualRows(prev=>prev.map((m,i)=> i===idx?{...m,unit:v}:m));
                            }} placeholder="Unit" />
                          </td>
                          <td className="p-2 border w-40">
                            <Input type="text" value={resultInputs[r.id] ?? (res?.value ?? '') as any} onChange={(e)=>updateResult(r.id, e.target.value)} />
                          </td>
                          <td className="p-2 border">
                            <Input value={res?.comment ?? ''} onChange={(e)=>updateComment(r.id, e.target.value)} placeholder="Optional" />
                          </td>
                          <td className="p-2 border w-32">
                            <Button variant="ghost" size="icon" onClick={()=>{
                              setManualRows(prev=>prev.filter((_,i)=>i!==idx));
                            }}><Trash className="w-4 h-4"/></Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* interpretation */}
          <Card><CardHeader><CardTitle>Interpretation</CardTitle></CardHeader><CardContent><textarea className="w-full p-3 border rounded" rows={4} value={interpretation} onChange={(e)=>setInterpretation(e.target.value)} placeholder="Clinical interpretation..."/></CardContent></Card>
        </>
      )}
    </div>
  );
};

export default ResultEntryClean;
