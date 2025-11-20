import React, { useState, useEffect, useRef } from 'react';
import { Search, Calendar, Phone, Hash, User, Activity, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAllPatients, useTokens, fetchPatients } from '@/hooks/useApi';

interface PatientSearchProps {
  onSelectPatient?: (patient: { id: string; name: string; mrNumber?: string }) => void;
  onAdmitPatient?: (patient: { id: string; name: string; mrNumber?: string }) => void;
  onOpenPatientHistory?: (patient: any) => void;
  onOpenPrescriptionHistory?: (patient: any) => void;
}

const PatientSearch: React.FC<PatientSearchProps> = ({ onSelectPatient, onAdmitPatient, onOpenPatientHistory, onOpenPrescriptionHistory }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [filters, setFilters] = useState({
    mrNumber: '',
    name: '',
    phone: '',
    date: '',
    department: '',
    doctor: '',
    age: '',
    gender: '',
    address: ''
  });

  // Backend data
  const { data: patientsData = [], isLoading: patientsLoading, isError: patientsError } = useAllPatients();
  const { data: tokensData = [], isLoading: tokensLoading } = useTokens();

  // Build enriched patient list from DB + latest token info
  useEffect(() => {
    const byKey = new Map<string, any>();

    // Index latest token by MR or phone
    const latestByKey = new Map<string, any>();
    (tokensData || []).forEach((t: any) => {
      const key = t?.mrNumber || t?.phone;
      if (!key) return;
      const prev = latestByKey.get(key);
      const tDate = t?.dateTime ? new Date(t.dateTime).getTime() : 0;
      const pDate = prev?.dateTime ? new Date(prev.dateTime).getTime() : 0;
      if (!prev || tDate > pDate) latestByKey.set(key, t);
    });

    // Add patients from primary patients API (if available)
    (patientsData || []).forEach((p: any) => {
      const key = p?.mrNumber || p?.phone || p?._id;
      const last = key ? latestByKey.get(key) : undefined;
      byKey.set(key, {
        ...p,
        name: p?.name || last?.patientName || '',
        lastVisit: last?.dateTime ? String(last.dateTime).split('T')[0] : '',
        department: last?.department || '',
        doctor: last?.doctor || '',
        symptoms: last?.symptoms || '',
      });
    });

    // Also derive patient entries directly from tokens so search works even if patients API returns empty
    (tokensData || []).forEach((t: any) => {
      const key = t?.mrNumber || t?.phone || t?._id;
      if (!key || byKey.has(key)) return;
      byKey.set(key, {
        mrNumber: t?.mrNumber || '',
        phone: t?.phone || '',
        name: t?.patientName || '',
        age: t?.age ?? '',
        gender: t?.gender ?? '',
        address: t?.address ?? '',
        lastVisit: t?.dateTime ? String(t.dateTime).split('T')[0] : '',
        department: t?.department || '',
        doctor: t?.doctor || '',
        symptoms: t?.symptoms || '',
      });
    });

    setAllPatients(Array.from(byKey.values()));
  }, [patientsData, tokensData]);

  

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Debounced server-side search on MR/Phone typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const hasInput = (filters.mrNumber?.trim() || filters.phone?.trim());
    if (!hasInput) return; // don't auto-search when both empty
    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        setHasSearched(true);
        setPage(1);
        const server = await fetchPatients({
          mrNumber: filters.mrNumber?.trim() || undefined,
          phone: filters.phone?.trim() || undefined,
        });
        let enriched = (server || []).map((sp: any) => {
          const fromAll = allPatients.find(p => p.mrNumber === sp.mrNumber || p.phone === sp.phone || p._id === sp._id);
          return { ...sp, ...fromAll };
        });
        if (!enriched.length) {
          // fallback to client-side filter across loaded list (case-insensitive contains)
          const activeFilters: [string, any][] = Object.entries({ mrNumber: filters.mrNumber, phone: filters.phone }).filter(([,v]) => (v ?? '').toString().trim());
          enriched = allPatients.filter((p:any) => activeFilters.every(([k,v]) => (p?.[k] ?? '').toString().toLowerCase().includes(String(v).toLowerCase())));
        }
        setSearchResults(enriched);
      } catch (e) {
        console.error('Debounced search failed', e);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [filters.mrNumber, filters.phone, allPatients]);

  const handleSearch = async () => {
    const activeFilters = Object.entries(filters).filter(([_, value]) => (value ?? '').toString().trim());
    setHasSearched(true);
    setSearchQuery(JSON.stringify(filters));
    setPage(1);

    // If no filters, show all patients
    if (activeFilters.length === 0) {
      setSearchResults(allPatients);
      return;
    }

    // Prefer server-side search when MR/Phone provided OR when advanced filters can be handled by backend
    if (filters.mrNumber || filters.phone || filters.name || filters.department || filters.doctor || filters.date) {
      try {
        setSearching(true);
        const dateISO = (filters.date || '').toString();
        const server = await fetchPatients({
          mrNumber: filters.mrNumber || undefined,
          phone: filters.phone || undefined,
          name: filters.name || undefined,
          department: filters.department || undefined,
          doctor: filters.doctor || undefined,
          dateFrom: dateISO || undefined,
          dateTo: dateISO || undefined,
        });
        // Enrich server results with latest token data (already in allPatients map). Fallback to server fields.
        const enriched = (server || []).map((sp: any) => {
          const fromAll = allPatients.find(p => p.mrNumber === sp.mrNumber || p.phone === sp.phone || p._id === sp._id);
          return { ...sp, ...fromAll };
        });
        setSearchResults(enriched);
        return;
      } catch (e) {
        // fall back to client filtering
        console.error('Server search failed, falling back to client filter', e);
      } finally {
        setSearching(false);
      }
    }

    const results = allPatients.filter(patient => {
      return activeFilters.every(([field, value]) => {
        const patientValue = (patient?.[field] ?? '').toString().toLowerCase();
        const filterValue = (value ?? '').toString().toLowerCase();
        
        // Special handling for date and age
        if (field === 'date') {
          // Normalize to YYYY-MM-DD
          const pv = (patient.lastVisit || '').toString().slice(0,10);
          return pv === filterValue || pv.includes(filterValue);
        }
        if (field === 'age') {
          return (patient.age ?? '').toString().toLowerCase() === filterValue;
        }
        
        return patientValue?.includes(filterValue);
      });
    });
    
    setSearchResults(results);
  };

  const resetFilters = () => {
    setFilters({
      mrNumber: '',
      name: '',
      phone: '',
      date: '',
      department: '',
      doctor: '',
      age: '',
      gender: '',
      address: ''
    });
    setSearchResults([]);
  };

  // Removed generateNewToken action in doctor portal search results

  const viewPatientHistory = (patient: any) => {
    if (onOpenPatientHistory) {
      onOpenPatientHistory(patient);
      return;
    }
    // Get all patient visits
    const tokens = JSON.parse(localStorage.getItem('tokens') || '[]');
    const visits = tokens
      .filter((token: any) => token.phone === patient.phone || token.mrNumber === patient.mrNumber)
      .map((token: any) => ({
        dateTime: token.dateTime,
        doctor: token.doctor,
        department: token.department,
        fee: token.finalFee || '0',
        symptoms: token.symptoms || '',
        diagnosis: token.diagnosis || '',
        prescription: token.prescription || ''
      }));
    
    // Navigate to patient history page with complete data
    navigate('/patient-history', {
      state: {
        patient: {
          ...patient,
          visits: visits
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-blue-600 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center space-x-2 text-blue-800">
            <Search className="h-6 w-6 text-blue-600" />
            <span>Advanced Patient Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {(patientsLoading || tokensLoading) && (
            <div className="text-sm text-gray-500">Loading patients...</div>
          )}
          {patientsError && (
            <div className="text-sm text-red-600">Failed to load patients. Please check your connection or login.</div>
          )}
          {searching && (
            <div className="text-sm text-blue-600">Searching...</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="mrNumber">MR Number</Label>
              <Input
                id="mrNumber"
                name="mrNumber"
                value={filters.mrNumber}
                onChange={handleFilterChange}
                placeholder="MR123456"
              />
            </div>
            
            <div>
              <Label htmlFor="name">Patient Name</Label>
              <Input
                id="name"
                name="name"
                value={filters.name}
                onChange={handleFilterChange}
                placeholder="Full or partial name"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                value={filters.phone}
                onChange={handleFilterChange}
                placeholder="03001234567"
              />
            </div>
            
            <div>
              <Label htmlFor="date">Visit Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={filters.date}
                onChange={handleFilterChange}
              />
            </div>
            
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                name="department"
                value={filters.department}
                onChange={handleFilterChange}
                placeholder="Cardiology, etc."
              />
            </div>
            
            <div>
              <Label htmlFor="doctor">Doctor</Label>
              <Input
                id="doctor"
                name="doctor"
                value={filters.doctor}
                onChange={handleFilterChange}
                placeholder="Dr. Name"
              />
            </div>
            
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                name="age"
                type="number"
                value={filters.age}
                onChange={handleFilterChange}
                placeholder="35"
              />
            </div>
            
            <div>
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                name="gender"
                value={filters.gender}
                onChange={handleFilterChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={filters.address}
                onChange={handleFilterChange}
                placeholder="Street, City"
              />
            </div>
          </div>
          
          <div className="flex space-x-2 pt-2">
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
              <Search className="h-4 w-4 mr-2" />
              Search Patients
            </Button>
            <Button onClick={resetFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-blue-700 text-sm">
              <strong>Total Patients in Database:</strong> {allPatients.length}
              {searchResults.length > 0 && (
                <span className="ml-4">
                  <strong>Search Results:</strong> {searchResults.length} found
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {searchResults.length > 0 && (
        <Card className="border-green-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="text-green-800">Search Results ({searchResults.length} found)</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Pagination Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">Page {page} of {Math.max(1, Math.ceil(searchResults.length / pageSize))}</div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Rows:</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={pageSize}
                  onChange={(e) => { setPageSize(parseInt(e.target.value) || 10); setPage(1); }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <Button variant="outline" size="sm" onClick={() => setSearchResults(allPatients)}>Show All</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const header = ['MR Number','Name','Phone','Age','Gender','Last Visit','Department','Doctor','Address'];
                  const rows = searchResults.map((p:any)=>[
                    p.mrNumber || '', p.name || '', p.phone || '', p.age || '', p.gender || '', p.lastVisit || '', p.department || '', p.doctor || '', p.address || ''
                  ]);
                  const csv = [header.join(','), ...rows.map(r=>r.map(v=>String(v).replace(/,/g,' ')).join(','))].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'patient-search.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}>Export CSV</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(Math.ceil(searchResults.length / pageSize), p + 1))} disabled={page >= Math.ceil(searchResults.length / pageSize)}>Next</Button>
              </div>
            </div>

            <div className="space-y-4">
              {searchResults.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize).map((patient, index) => (
                <div key={index} className="border-2 border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors hover:border-blue-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Hash className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-blue-800">{patient.mrNumber}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">{patient.name}, {patient.age} years, {patient.gender}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-green-600" />
                        <span>{patient.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span>Last visit: {patient.lastVisit}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-red-600" />
                        <span><strong>Dept:</strong> {patient.department}</span>
                      </div>
                      <div className="text-sm"><strong>Doctor:</strong> {patient.doctor}</div>
                      {patient.address && (
                        <div className="text-sm text-gray-600"><strong>Address:</strong> {patient.address}</div>
                      )}
                      {patient.symptoms && (
                        <div className="flex items-start space-x-2">
                          <Activity className="h-4 w-4 text-orange-600 mt-0.5" />
                          <span className="text-sm text-gray-600"><strong>Symptoms:</strong> {patient.symptoms}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => viewPatientHistory(patient)}
                      className="border-blue-600 text-blue-600 hover:bg-blue-50"
                    >
                      View History
                    </Button>
                    {/* Removed Prescription History button per request */}
                    {/* Removed Generate New Token and Admit buttons per request */}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasSearched && searchResults.length === 0 && (
        <Card className="border-orange-200">
          <CardContent className="text-center py-8">
            <div className="text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-orange-300" />
              <p className="text-lg font-medium">No patients found matching your search criteria.</p>
              <p className="text-sm mt-2">Try searching with a different term or check the spelling.</p>
              <p className="text-xs mt-3 text-blue-600">Search works with: Name, MR Number, Phone, Date, Department, Doctor, Age, Gender, Address, or Symptoms</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasSearched && allPatients.length === 0 && (
        <Card className="border-gray-200">
          <CardContent className="text-center py-8">
            <div className="text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No patients in database yet.</p>
              <p className="text-sm mt-2">Start by generating tokens to build the patient database.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PatientSearch;
