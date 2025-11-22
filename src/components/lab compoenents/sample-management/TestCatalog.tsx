import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TestType } from "@/types/sample";
// import { labDataStore } from "@/store/labData";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  TestTube,
  
  DollarSign,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { triggerNotificationsRefresh } from "@/hooks/use-notifications";

interface TestCatalogProps {
  onNavigateBack?: () => void;
}

const TestCatalog = ({ onNavigateBack }: TestCatalogProps) => {
  // Basic CSV parser (handles quoted fields and commas within quotes)
  const parseCSV = (text: string): any[] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (ch === '"') {
        if (inQuotes && next === '"') { // escaped quote
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        row.push(cur);
        cur = '';
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (cur.length || row.length) {
          row.push(cur);
          rows.push(row);
          row = [];
          cur = '';
        }
        // handle CRLF by skipping the next \n when \r\n
        if (ch === '\r' && next === '\n') i++;
      } else {
        cur += ch;
      }
    }
    if (cur.length || row.length) {
      row.push(cur);
      rows.push(row);
    }
    if (rows.length === 0) return [];
    const headers = rows[0].map(h => (h || '').toString().trim());
    const dataRows = rows.slice(1).filter(r => r.some(c => (c || '').toString().trim() !== ''));
    return dataRows.map(cols => {
      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = (cols[idx] ?? '').toString().trim();
      });
      return obj;
    });
  };
  // helper functions for parameter list
  const addParam = () => {
    if (editingTest) {
      (editingTest as any).parameters = [
        ...(((editingTest as any).parameters)||[]),
        { id:'', name:'', unit:'', normalMin:0, normalMax:0, criticalMin: undefined, criticalMax: undefined, normalRangeMale:'', normalRangeFemale:'', normalRangePediatric:'' }
      ];
      setEditingTest({ ...editingTest });
    } else {
      setNewTest(prev=>({
        ...prev,
        parameters:[...prev.parameters, { id:'', name:'', unit:'', normalMin:0, normalMax:0, criticalMin: undefined, criticalMax: undefined, normalRangeMale:'', normalRangeFemale:'', normalRangePediatric:'' }]
      }));
    }
  };
  const updateParam = (idx:number,key:string,value:any)=>{
    if (editingTest) {
      const arr = [...((editingTest as any).parameters||[])];
      arr[idx] = { ...arr[idx], [key]: value };
      (editingTest as any).parameters = arr;
      setEditingTest({ ...editingTest });
    } else {
      const arr = [...newTest.parameters];
      arr[idx] = { ...arr[idx], [key]: value };
      setNewTest({...newTest, parameters: arr});
    }
  };
  const removeParam = (idx:number)=>{
    if (editingTest) {
      (editingTest as any).parameters = ((editingTest as any).parameters||[]).filter((_,i)=>i!==idx);
      setEditingTest({ ...editingTest });
    } else {
      setNewTest({...newTest, parameters: newTest.parameters.filter((_,i)=>i!==idx)});
    }
  };

  const saveParamRow = async (idx:number) => {
    if (!editingTest) return;
    try {
      const et: any = editingTest as any;
      const hasList = Array.isArray(et.parameters) && et.parameters.length > 0;
      const mapped = hasList ? et.parameters.map(mapParam) : [];
      const payload = { ...editingTest, parameters: mapped } as any;
      const res = await fetch(`/api/labtech/tests/${(editingTest as any)._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast({ title: 'Error', description: 'Failed to update parameter', variant: 'destructive' });
        return;
      }
      const updated = await res.json();
      setTests((prev)=> prev.map(t=> (t._id === updated._id ? updated : t)));
      setEditingTest(updated);
      toast({ title: 'Updated', description: `Parameter ${idx+1} saved.` });
    } catch {
      toast({ title: 'Error', description: 'Update failed', variant: 'destructive' });
    }
  };

  const [tests, setTests] = useState<TestType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAddingTest, setIsAddingTest] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [total, setTotal] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [serverPaging, setServerPaging] = useState(false);
  const [loading, setLoading] = useState(false);
  // helper: specimen options
  
  const [editingTest, setEditingTest] = useState<TestType | null>(null);
  interface ParameterInput {
    id: string;
    name: string;
    unit: string;
    conventionalUnit?: string;
    referenceRangeText?: string;
    normalMin: number;
    normalMax: number;
    criticalMin?: number;
    criticalMax?: number;
    normalRangeMale?: string;
    normalRangeFemale?: string;
    normalRangePediatric?: string;
  }

  const [newTest, setNewTest] = useState({
    name: "",
    category: "",
    notes: "",
    
    price: 0,
    
    sampleType: "blood" as "blood" | "urine" | "other",
    parameters: [] as ParameterInput[],
    parameter: "",
    unit: "",
    normalRangeMale: "",
    normalRangeFemale: "",
    normalRangePediatric: "",
    specimen: "blood",
    fastingRequired: false,
  });

  // NEW: master lab tests for auto–fill

  // helper to auto-fill based on master test match
  const autoFillFromMaster = (val: string) => {
    const match = masterTests.find((t) => t.Test_Name.toLowerCase() === val.toLowerCase());
    if (!match) return;
    const filled = {
      name: match.Test_Name,
      category: match.Category || "",
      notes: match.Notes || "",
      price: parseFloat(match.Price) || 0,
      sampleType: (match.Specimen || "blood").toLowerCase() as "blood" | "urine" | "other",
      fastingRequired: (match.Fasting_Required || "no").toString().toLowerCase().startsWith("y"),
      parameter: match.Parameter || "",
      unit: match.Unit || "",
      normalRangeMale: match.Normal_Range_Male || "",
      normalRangeFemale: match.Normal_Range_Female || "",
      normalRangePediatric: match.Normal_Range_Pediatric || "",
    };
    if (editingTest) {
      setEditingTest({ ...(editingTest as any), ...filled });
    } else {
      setNewTest((prev) => ({ ...prev, ...filled }));
    }
  }
  const [masterTests, setMasterTests] = useState<any[]>([]);

  // Reset to first page when search or category changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (searchTerm.trim()) params.set("q", searchTerm.trim());
    if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
    setLoading(true);
    fetch(`/api/labtech/tests?${params.toString()}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      signal: controller.signal,
    })
      .then(async (r) => {
        try {
          const data = await r.json();
          if (Array.isArray(data)) {
            setServerPaging(false);
            setTests(data || []);
            setTotal(data?.length || 0);
            setTotalPages(Math.max(1, Math.ceil((data?.length || 0) / limit)));
          } else if (data && Array.isArray(data.data)) {
            setServerPaging(true);
            setTests(data.data || []);
            setTotal(Number(data.total) || 0);
            setTotalPages(Number(data.totalPages) || 1);
          } else {
            setServerPaging(false);
            setTests([]);
            setTotal(0);
            setTotalPages(1);
          }
        } catch {
          setServerPaging(false);
          setTests([]);
          setTotal(0);
          setTotalPages(1);
        }
      })
      .catch(() => {
        setServerPaging(false);
        setTests([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [page, limit, searchTerm, categoryFilter]);

  useEffect(() => {
    // Fetch master list once from public CSV for client-side auto-fill
    const base = (import.meta as any)?.env?.BASE_URL || './';
    const csvUrl = `${base}lab_tests_500.csv`;
    fetch(csvUrl)
      .then((r) => r.text())
      .then((csv) => {
        const data = parseCSV(csv);
        // Normalize and de-duplicate by Test_Name (case-insensitive)
        const unique = Array.from(
          new Map(
            (data as any[]).map((item: any) => [
              (item.Test_Name ?? "").toString().trim().toLowerCase(),
              item,
            ])
          ).values()
        );
        setMasterTests(unique);
      })
      .catch(() => setMasterTests([]));
  }, []);

  const { toast } = useToast();

  const handleBackButton = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      window.history.back();
    }
  };

  const mapParam = (p: ParameterInput) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    conventionalUnit: (p as any).conventionalUnit,
    referenceRangeText: (p as any).referenceRangeText,
    normalRange: {
      min: (p as any).normalMin ?? (p as any).normalRange?.min,
      max: (p as any).normalMax ?? (p as any).normalRange?.max,
    },
    criticalRange: p.criticalMin !== undefined && p.criticalMax !== undefined ? { min: p.criticalMin, max: p.criticalMax } : undefined,
    normalRangeMale: p.normalRangeMale || undefined,
    normalRangeFemale: p.normalRangeFemale || undefined,
    normalRangePediatric: p.normalRangePediatric || undefined,
  });

  const handleAddTest = async () => {
    if (!newTest.name || !newTest.category || !newTest.notes) {
      toast({
        title: "Error",
        description: "Please fill all required fields (Name, Category, Notes).",
        variant: "destructive"
      });
      return;
    }

    // Option B: if no rows in parameters list, map the single-field inputs into one parameter object
    const directParam =
      (newTest.parameter || newTest.unit || newTest.normalRangeMale || newTest.normalRangeFemale || newTest.normalRangePediatric)
        ? [{
            id: "",
            name: newTest.parameter || "",
            unit: newTest.unit || "",
            normalRangeMale: newTest.normalRangeMale || null,
            normalRangeFemale: newTest.normalRangeFemale || null,
            normalRangePediatric: newTest.normalRangePediatric || null,
          }]
        : [] as any[];
    const params = (newTest.parameters && newTest.parameters.length)
      ? newTest.parameters.map(mapParam)
      : directParam;

    const res = await fetch("/api/labtech/tests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        name: newTest.name,
        category: newTest.category,
        price: newTest.price,
        sampleType: newTest.sampleType,
        description: newTest.notes, // Map notes to description
        fastingRequired: newTest.fastingRequired,
        parameters: params,
      }),
    });
    if (!res.ok) {
      let detail = "";
      try {
        const data = await res.json();
        if (data?.message) detail = data.message;
        else if (Array.isArray(data?.errors)) {
          detail = data.errors.map((e:any)=> `${e.param}: ${e.msg}`).join(", ");
        } else if (data) {
          detail = JSON.stringify(data);
        }
      } catch {
        try { detail = await res.text(); } catch { detail = res.statusText; }
      }
      toast({ title: "Error", description: `Failed to add test: ${detail}`, variant: "destructive" });
      return;
    }
    const addedTest = await res.json();
    setTests((prev) => [...prev, addedTest]);
    setNewTest({
      name: "",
      category: "",
      notes: "",
      price: 0,
      sampleType: "blood" as "blood" | "urine" | "other",
      parameters: [],
      parameter: "",
      unit: "",
      normalRangeMale: "",
      normalRangeFemale: "",
      normalRangePediatric: "",
      specimen: "blood",
      fastingRequired: false,
    });
    setIsAddingTest(false);
    
    toast({
      title: "Test Added",
      description: `${addedTest.name} has been added to the catalog.`,
    });
    // Immediately refresh notifications bell/list
    triggerNotificationsRefresh();
  };

  const handleEditTest = async () => {
    if (!editingTest) return;
    // Option B for Edit: map single-field inputs if parameters list is empty
    const et: any = editingTest as any;
    const hasList = Array.isArray(et.parameters) && et.parameters.length > 0;
    const directParam =
      (!hasList && (et.parameter || et.unit || et.normalRangeMale || et.normalRangeFemale || et.normalRangePediatric))
        ? [{
            id: "",
            name: et.parameter || "",
            unit: et.unit || "",
            normalRangeMale: et.normalRangeMale || null,
            normalRangeFemale: et.normalRangeFemale || null,
            normalRangePediatric: et.normalRangePediatric || null,
          }]
        : [] as any[];
    const mapped = hasList ? et.parameters.map(mapParam) : directParam;
    const payload = { ...editingTest, parameters: mapped };
    if (!editingTest) return;

    const res = await fetch(`/api/labtech/tests/${editingTest._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      toast({ title: "Error", description: "Failed to update test", variant: "destructive" });
      return;
    }
    const updated = await res.json();
    setTests((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    setEditingTest(null);
    toast({
      title: "Test Updated",
      description: `${updated.name} has been updated.`,
    });
  };

  const handleDeleteTest = async (id: string) => {
    const res = await fetch(`/api/labtech/tests/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (!res.ok) {
      toast({ title: "Error", description: "Failed to delete test", variant: "destructive" });
      return;
    }
    setTests((prev) => prev.filter((t) => t._id !== id));
    toast({
      title: "Test Deleted",
      description: "Test has been removed from the catalog.",
    });
  };

  const filteredTests = serverPaging
    ? tests
    : tests.filter(test => {
        const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              test.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === "all" || test.category === categoryFilter;
        return matchesSearch && matchesCategory;
      });

  const clientTotal = filteredTests.length;
  const clientTotalPages = Math.max(1, Math.ceil(clientTotal / limit));
  const effectiveTotalPages = serverPaging ? (totalPages || 1) : clientTotalPages;
  const effectiveTotal = serverPaging ? (total || 0) : clientTotal;
  const testsToRender = serverPaging
    ? filteredTests
    : filteredTests.slice((page - 1) * limit, (page - 1) * limit + limit);

  const categories = Array.from(new Set(tests.map(test => test.category)));
  const masterNameOptions = useMemo(
    () => Array.from(new Set(masterTests.map((t: any) => (t.Test_Name ?? "").toString().trim()))),
    [masterTests]
  );

  // Specimen dropdown (blood/urine/other + any extra from master sheet)
  const specimenOptions = useMemo(() => {
    const basics = ["blood", "urine", "other"];
    const extra = Array.from(
      new Set(
        masterTests
          .map((t: any) => (t.Specimen ?? "").toString().trim().toLowerCase())
          .filter((s: string) => s && !basics.includes(s))
      )
    );
    return [...basics, ...extra];
  }, [masterTests]);

  // Input refs for Enter navigation (fix: ensure these are defined in component scope)
  const testNameRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const sampleTypeRef = useRef<HTMLSelectElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={handleBackButton}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Test Catalog</h1>
            <p className="text-gray-600">Manage available laboratory tests</p>
          </div>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => setIsAddingTest(true)}
        >
          <Plus className="w-4 h-4" />
          Add New Test
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search tests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          className="px-3 py-2 border border-gray-200 rounded-md text-sm w-full sm:w-auto"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        <select
          className="px-3 py-2 border border-gray-200 rounded-md text-sm w-full sm:w-auto"
          value={limit}
          onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value) || 12); }}
        >
          <option value={6}>6</option>
          <option value={12}>12</option>
          <option value={24}>24</option>
          <option value={48}>48</option>
        </select>
      </div>

      {/* Add/Edit Test Form */}
      {(isAddingTest || editingTest) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingTest ? "Edit Test" : "Add New Test"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="testName">Test Name</Label>
                <Input
                  id="testName"
                  ref={testNameRef}
                  placeholder="Enter test name"
                  list="test-name-options"
                  value={editingTest ? editingTest.name : newTest.name}
                  onChange={(e) => {
                    const val = e.target.value;

                    // update the name field
                    if (editingTest) {
                      setEditingTest({ ...editingTest, name: val });
                    } else {
                      setNewTest({ ...newTest, name: val });
                    }

                    // attempt auto-fill if exact match
                    autoFillFromMaster(val);

                  }}
                  onBlur={(e) => {
                    const val = e.target.value.toLowerCase();
                    autoFillFromMaster(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') categoryRef.current?.focus();
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  ref={categoryRef}
                  placeholder="Enter category"
                  value={editingTest ? editingTest.category : newTest.category}
                  onChange={(e) => editingTest 
                    ? setEditingTest({...editingTest, category: e.target.value})
                    : setNewTest({...newTest, category: e.target.value})
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') notesRef.current?.focus();
                  }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                ref={notesRef}
                placeholder="Enter test notes"
                value={editingTest ? (editingTest as any).notes ?? "" : newTest.notes}
                onChange={(e) => editingTest 
                  ? setEditingTest({ ...(editingTest as any), notes: e.target.value })
                  : setNewTest({ ...newTest, notes: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') priceRef.current?.focus();
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (PKR)</Label>
                <Input
                  id="price"
                  ref={priceRef}
                  type="number"
                  placeholder="0.00"
                  value={editingTest ? editingTest.price : newTest.price}
                  onChange={(e) => editingTest 
                    ? setEditingTest({...editingTest, price: parseFloat(e.target.value) || 0})
                    : setNewTest({...newTest, price: parseFloat(e.target.value) || 0})
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sampleTypeRef.current?.focus();
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sampleType">Specimen</Label>
                <select
                  id="sampleType"
                  ref={sampleTypeRef}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={editingTest ? editingTest.sampleType : newTest.sampleType}
                  onChange={(e) =>
                    editingTest
                      ? setEditingTest({ ...editingTest, sampleType: e.target.value as any })
                      : setNewTest({ ...newTest, sampleType: e.target.value as any })
                  }
                >
                  {specimenOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="fastingRequired"
                  checked={editingTest ? (editingTest as any).fastingRequired : newTest.fastingRequired}
                  onChange={(e) =>
                    editingTest
                      ? setEditingTest({ ...(editingTest as any), fastingRequired: e.target.checked })
                      : setNewTest({ ...newTest, fastingRequired: e.target.checked })
                  }
                />
                <Label htmlFor="fastingRequired">Fasting Required</Label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parameter">Parameter</Label>
                <Input
                  id="parameter"
                  placeholder="Enter parameter (optional)"
                  value={editingTest ? (editingTest as any).parameter ?? "" : newTest.parameter}
                  onChange={(e) => editingTest
                    ? setEditingTest({ ...(editingTest as any), parameter: e.target.value })
                    : setNewTest({ ...newTest, parameter: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  placeholder="Enter unit (optional)"
                  value={editingTest ? (editingTest as any).unit ?? "" : newTest.unit}
                  onChange={(e) => editingTest
                    ? setEditingTest({ ...(editingTest as any), unit: e.target.value })
                    : setNewTest({ ...newTest, unit: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Normal Ranges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rangeMale">Normal Range (Male)</Label>
                <Input
                  id="rangeMale"
                  placeholder="e.g., 3.5-5.0"
                  value={editingTest ? (editingTest as any).normalRangeMale ?? "" : newTest.normalRangeMale}
                  onChange={(e) => editingTest
                    ? setEditingTest({ ...(editingTest as any), normalRangeMale: e.target.value })
                    : setNewTest({ ...newTest, normalRangeMale: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rangeFemale">Normal Range (Female)</Label>
                <Input
                  id="rangeFemale"
                  placeholder="e.g., 3.5-5.0"
                  value={editingTest ? (editingTest as any).normalRangeFemale ?? "" : newTest.normalRangeFemale}
                  onChange={(e) => editingTest
                    ? setEditingTest({ ...(editingTest as any), normalRangeFemale: e.target.value })
                    : setNewTest({ ...newTest, normalRangeFemale: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rangePediatric">Normal Range (Pediatric)</Label>
                <Input
                  id="rangePediatric"
                  placeholder="e.g., 3.5-5.0"
                  value={editingTest ? (editingTest as any).normalRangePediatric ?? "" : newTest.normalRangePediatric}
                  onChange={(e) => editingTest
                    ? setEditingTest({ ...(editingTest as any), normalRangePediatric: e.target.value })
                    : setNewTest({ ...newTest, normalRangePediatric: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Parameters editor inside the form */}
            <div className="flex items-center justify-between mt-4">
              <h3 className="text-base font-semibold">Parameters</h3>
              <Button variant="outline" size="sm" onClick={addParam}>+ Add Parameter</Button>
            </div>
            <div className="space-y-4">
              {(editingTest ? (editingTest as any).parameters : newTest.parameters).map((p, idx) => (
                <div key={idx} className="border rounded-md p-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input placeholder="Parameter" value={p.name} onChange={e=>updateParam(idx,'name',e.target.value)} />
                    <Input placeholder="Unit (optional)" value={p.unit} onChange={e=>updateParam(idx,'unit',e.target.value)} />
                    <Input placeholder="Custom ID (optional)" value={p.id} onChange={e=>updateParam(idx,'id',e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input placeholder="Normal Range (Male)" value={p.normalRangeMale||''} onChange={e=>updateParam(idx,'normalRangeMale',e.target.value)} />
                    <Input placeholder="Normal Range (Female)" value={p.normalRangeFemale||''} onChange={e=>updateParam(idx,'normalRangeFemale',e.target.value)} />
                    <Input placeholder="Normal Range (Pediatric)" value={p.normalRangePediatric||''} onChange={e=>updateParam(idx,'normalRangePediatric',e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
                    <Input type="number" placeholder="Norm Min" value={p.normalMin} onChange={e=>updateParam(idx,'normalMin',e.target.valueAsNumber)} />
                    <Input type="number" placeholder="Norm Max" value={p.normalMax} onChange={e=>updateParam(idx,'normalMax',e.target.valueAsNumber)} />
                    <Input type="number" placeholder="Crit Min" value={p.criticalMin ?? ''} onChange={e=>updateParam(idx,'criticalMin',e.target.valueAsNumber)} />
                    <Input type="number" placeholder="Crit Max" value={p.criticalMax ?? ''} onChange={e=>updateParam(idx,'criticalMax',e.target.valueAsNumber)} />
                    <div className="col-span-2 flex gap-2 justify-end">
                      {editingTest && <Button variant="outline" size="sm" onClick={()=>saveParamRow(idx)}>Update</Button>}
                      <Button variant="outline" size="sm" onClick={()=>removeParam(idx)}>Remove</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddingTest(false);
                  setEditingTest(null);
                }}
              >
                Cancel
              </Button>
              <Button
                ref={saveButtonRef}
                onClick={editingTest ? handleEditTest : handleAddTest}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (editingTest ? handleEditTest() : handleAddTest());
                }}
              >
                {editingTest ? "Update Test" : "Add Test"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      

      <datalist id="test-name-options">
        {masterNameOptions.map((name, i) => (
          <option key={`${name}-${i}`} value={name} />
        ))}
      </datalist>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testsToRender.map((test) => (
          <Card key={(test as any)._id || test.id || test.name} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{test.name}</CardTitle>
                <Badge variant="secondary">{test.category}</Badge>
              </div>
              <CardDescription>{test.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span>PKR {test.price.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TestTube className="w-4 h-4 text-gray-500" />
                  <span>{test.sampleType}</span>
                </div>
                
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setEditingTest(test)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDeleteTest(test._id as string)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!loading && testsToRender.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          <TestTube className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No tests found matching your criteria</p>
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-600">
          {loading ? "Loading..." : `${Math.min((page-1)*limit+1, Math.max(0, effectiveTotal))}-${Math.min(page*limit, Math.max(0, effectiveTotal))} of ${effectiveTotal}`}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page<=1}>First</Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Prev</Button>
          <div className="px-3 py-2 text-sm text-gray-700">Page {page} / {effectiveTotalPages}</div>
          <Button variant="outline" size="sm" onClick={() => setPage(p=>Math.min(effectiveTotalPages, p+1))} disabled={page>=effectiveTotalPages}>Next</Button>
          <Button variant="outline" size="sm" onClick={() => setPage(effectiveTotalPages)} disabled={page>=effectiveTotalPages}>Last</Button>
        </div>
      </div>
    </div>
  );
};

export default TestCatalog;
