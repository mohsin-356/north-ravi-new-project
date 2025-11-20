import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, FileText, DollarSign, Hash, Users, Activity, MapPin, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDoctors, useCreateToken, useUpdateTokenById, useDepartments } from '@/hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '@/lib/api';
import { printTokenSlip } from '@/utils/printToken';
import { toast } from '@/components/ui/use-toast';
// Tabs removed for unified flow
 

// Type definitions
interface Procedure {
  name: string;
  fee: string;
}

interface TokenData {
  patientId?: string;
  patientName: string;
  age: string;
  phone: string;
  address: string;
  gender: string;
  guardianRelation?: 'S/O' | 'D/O';
  guardianName?: string;
  cnic?: string;
  bloodPressure?: string; // optional: e.g., 120/80
  doctor: string;
  doctorId?: string;
  department: string;
  fee?: string;
  discount?: string;
  procedureDetails?: string;
  procedures?: Procedure[];
  bedId?: string;
  rentAmount?: number;
}

interface Token extends TokenData {
  id: string;
  mrNumber: string;
  dateTime: Date;
  finalFee: number;
  tokenNumber: string;
}

interface Bed {
  _id: string;
  bedNumber: string;
  wardId: string;
  status: string;
  rentAmount: number;
  ward?: {
    _id: string;
    name: string;
  };
}

interface Doctor {
  _id: string;
  name: string;
  specialization: string;
  consultationFee: number;
}

const TokenGenerator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const qc = useQueryClient();

  // State management
  const [tokenData, setTokenData] = useState<TokenData>({
    patientName: '',
    age: '',
    gender: '',
    phone: '',
    address: '',
    guardianRelation: undefined,
    guardianName: '',
    cnic: '',
    bloodPressure: '',
    doctor: '',
    doctorId: '',
    department: '',
    fee: '',
    discount: '0',
    procedureDetails: '',
    procedures: [{ name: '', fee: '' }],
    bedId: '',
    rentAmount: 0,
  });

  const [generatedToken, setGeneratedToken] = useState<Token | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [existingPatient, setExistingPatient] = useState<any>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [cnicError, setCnicError] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [ageError, setAgeError] = useState<string>('');
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  // IPD bed selection removed
  const [mrNumberSearch, setMrNumberSearch] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  // Billing type fixed to cash (Corporate panel removed)
  const [billingType, setBillingType] = useState<'cash'>('cash');
  // Auto-lookup will trigger from phone input; no manual search UI

  // API Hooks
  const { data: doctorsData } = useDoctors();
  const createTokenMutation = useCreateToken();
  const updateTokenMutation = useUpdateTokenById();

  // Utility Functions
  const resetForm = () => {
    setTokenData({
      patientName: '',
      age: '',
      gender: '',
      phone: '',
      address: '',
      guardianRelation: undefined,
      guardianName: '',
      cnic: '',
      bloodPressure: '',
      doctor: '',
      doctorId: '',
      department: '',
      fee: '',
      discount: '0',
      procedureDetails: '',
      procedures: [{ name: '', fee: '' }],
      bedId: '',
      rentAmount: 0,
    });
    setExistingPatient(null);
    setEditingTokenId(null);
    setGeneratedToken(null);
    setBillingType('cash');
    
  };

  // Effects
  useEffect(() => {
    const handleOpenWithData = (e: any) => handleOpenTokenWithData(e.detail);
    const handleEdit = (e: any) => handleEditToken(e.detail);

    window.addEventListener('openTokenWithData', handleOpenWithData);
    window.addEventListener('editToken', handleEdit);

    return () => {
      window.removeEventListener('openTokenWithData', handleOpenWithData);
      window.removeEventListener('editToken', handleEdit);
    };
  }, []);

  // Fallback: if navigation happened before listeners attached, use a persisted token
  useEffect(() => {
    try {
      const s = localStorage.getItem('pendingEditToken');
      if (s) {
        const tok = JSON.parse(s);
        // Defer to ensure component state is ready
        setTimeout(() => {
          try { handleOpenTokenWithData(tok); } catch {}
          try { handleEditToken(tok); } catch {}
        }, 0);
      }
    } catch {}
    try { localStorage.removeItem('pendingEditToken'); } catch {}
  }, []);

  // Auto fetch existing patient by 11-digit phone and assign MR
  useEffect(() => {
    const phone = (tokenData.phone || '').trim();
    if (phone.length !== 11) return;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(`${API_URL}/api/patients/phone/${phone}` , {
          headers: { Authorization: `Bearer ${token || ''}` },
        });
        const patient = Array.isArray(data) ? data[0] : data;
        if (patient) {
          handleOpenTokenWithData(patient);
          toast({ title: 'Patient Matched', description: 'Existing patient loaded from phone number.' });
        } else {
          setExistingPatient(null);
        }
      } catch (error) {
        setExistingPatient(null);
      }
    })();
  }, [tokenData.phone]);

  // Auto fetch by MR number with debounce and on Enter
  useEffect(() => {
    const mr = (mrNumberSearch || '').trim();
    if (!mr) return;
    const handle = setTimeout(() => {
      searchPatientByMr();
    }, 400);
    return () => clearTimeout(handle);
  }, [mrNumberSearch]);

  // MR number helpers for simple sequence MR-1, MR-2, ...
  const peekNextMR = (): string => {
    const current = parseInt(localStorage.getItem('mrCounterSimple') || '0');
    return `MR-${current + 1}`;
  };
  const consumeNextMR = (): string => {
    const current = parseInt(localStorage.getItem('mrCounterSimple') || '0');
    const next = current + 1;
    localStorage.setItem('mrCounterSimple', String(next));
    return `MR-${next}`;
  };

  // Corporate portal removed: no panels to load

  useEffect(() => {
    if (doctorsData) {
      setDoctors(doctorsData.map((d: any) => ({ ...d, id: d._id })));
    }
  }, [doctorsData]);

  // Load Departments from API (Departments page)
  const { data: departmentsData = [] } = useDepartments();
  useEffect(() => {
    const names = (Array.isArray(departmentsData) ? departmentsData : []).map((d: any) => d?.name).filter(Boolean);
    if (names.length > 0) {
      setDepartments(names);
      if (!names.includes(tokenData.department)) {
        setTokenData(prev => ({ ...prev, department: names[0] }));
      }
    } else {
      setDepartments([]);
      setTokenData(prev => ({ ...prev, department: '' }));
    }
  }, [departmentsData]);

  // On first load, if there are no tokens in DB, reset simple MR counter so it starts from 1
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(`${API_URL}/api/tokens`, {
          headers: { Authorization: `Bearer ${token || ''}` },
        });
        if (Array.isArray(data) && data.length === 0) {
          localStorage.setItem('mrCounterSimple', '0');
        }
      } catch (err) {
        // ignore; fallback to whatever is in localStorage
      }
    })();
  }, []);

  // Event Handlers
  const handleOpenTokenWithData = (patientData: any) => {
    if (!patientData) return;
    // Normalize MR and common fields from various backends
    const mrNorm = patientData.mrNumber || patientData.mrn || patientData.mr || patientData.mrNo || patientData.mr_code || '';
    const nameNorm = patientData.patientName || patientData.name || '';
    const phoneNorm = patientData.phone || patientData.mobile || patientData.contact || '';
    const genderNorm = patientData.gender || patientData.sex || '';
    const ageNorm = patientData.age || patientData.patientAge || '';
    const addressNorm = patientData.address || patientData.addr || patientData.location || '';
    const guardianRelationNorm = patientData.guardianRelation || undefined;
    const guardianNameNorm = patientData.guardianName || '';
    const cnicNorm = patientData.cnic || '';
    const bpNorm = patientData.bloodPressure || '';

    const mergedPatient = { ...patientData, mrNumber: mrNorm };

    setExistingPatient(mergedPatient);
    setTokenData(prev => ({
      ...prev,
      patientId: patientData._id,
      patientName: nameNorm || prev.patientName,
      phone: String(phoneNorm || prev.phone || ''),
      gender: String(genderNorm || prev.gender || ''),
      age: String(ageNorm || prev.age || ''),
      address: String(addressNorm || prev.address || ''),
      guardianRelation: guardianRelationNorm || prev.guardianRelation,
      guardianName: String(guardianNameNorm || prev.guardianName || ''),
      cnic: String(cnicNorm || prev.cnic || ''),
      bloodPressure: String(bpNorm || prev.bloodPressure || ''),
    }));
  };

  const handleEditToken = (token: any) => {
    setEditingTokenId(token._id);
    setTokenData({ ...token, procedures: token.procedures || [{ name: '', fee: '' }] });
    setGeneratedToken(null);
  };

  const handleInputChange = (field: keyof TokenData, value: string | number) => {
    // CNIC input masking and validation (digits only, max 13)
    if (field === 'cnic') {
      const digits = String(value || '').replace(/\D+/g, '').slice(0, 13);
      setTokenData(prev => ({ ...prev, cnic: digits }));
      if (digits.length > 0 && digits.length !== 13) {
        setCnicError('CNIC must be exactly 13 digits (no dashes).');
      } else {
        setCnicError('');
      }
      return;
    }
    // Phone input masking (digits only, exactly 11 if provided)
    if (field === 'phone') {
      const digits = String(value || '').replace(/\D+/g, '').slice(0, 11);
      setTokenData(prev => ({ ...prev, phone: digits }));
      if (digits.length > 0 && digits.length !== 11) setPhoneError('Phone must be exactly 11 digits.');
      else setPhoneError('');
      return;
    }
    // Age input: integers only
    if (field === 'age') {
      const digits = String(value || '').replace(/\D+/g, '');
      setTokenData(prev => ({ ...prev, age: digits }));
      if (digits !== '' && !/^\d+$/.test(digits)) setAgeError('Age must be an integer.');
      else setAgeError('');
      return;
    }
    setTokenData(prev => ({ ...prev, [field]: value }));
  };

  const handleDepartmentChange = (value: string) => {
    const doctorFee = tokenData.doctorId ? doctors.find(d => d._id === tokenData.doctorId)?.consultationFee || 0 : 0;
    setTokenData(prev => ({ ...prev, department: value, bedId: '', rentAmount: 0, fee: doctorFee.toString() }));
  };

  const handleDoctorChange = (doctorId: string) => {
    const doctor = doctors.find(d => d._id === doctorId);
    if (doctor) {
      const rentAmount = tokenData.rentAmount || 0;
      setTokenData(prev => ({
        ...prev,
        doctorId: doctor._id,
        doctor: doctor.name,
        fee: (doctor.consultationFee + rentAmount).toString(),
      }));
    }
  };

  // IPD bed handling removed

  const searchPatientByPhone = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/api/patients/phone/${searchPhone}` , {
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });
      if (data) {
        handleOpenTokenWithData(data);
        toast({ title: 'Patient Found', description: 'Existing patient data loaded.' });
        return true;
      } else {
        setExistingPatient(null);
        toast({ title: 'Not Found', description: 'No patient found with this phone.', variant: 'destructive' });
        return false;
      }
    } catch (error) {
      setExistingPatient(null);
      toast({ title: 'Error', description: 'Failed to search by phone.', variant: 'destructive' });
      return false;
    }
  };

  const searchPatientByMr = async (): Promise<boolean> => {
    if (!mrNumberSearch) return;
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_URL}/api/patients/mr/${encodeURIComponent(mrNumberSearch)}` , {
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });
      const patient = Array.isArray(data) ? data[0] : data;
      if (patient) {
        handleOpenTokenWithData(patient);
        toast({ title: 'Patient Found', description: 'Existing patient data loaded via MR number.' });
        return true;
      } else {
        setExistingPatient(null);
        toast({ title: 'Not Found', description: 'No patient found with this MR number.', variant: 'destructive' });
        return false;
      }
    } catch (error) {
      setExistingPatient(null);
      toast({ title: 'Error', description: 'Failed to search by MR number.', variant: 'destructive' });
      return false;
    }
  };

  const searchPatientUnified = async () => {
    const mr = (mrNumberSearch || '').trim();
    const phone = (searchPhone || '').trim();
    if (!mr && !phone) {
      toast({ title: 'Input Required', description: 'Enter MR number or phone to search.', variant: 'destructive' });
      return;
    }
    if (mr) {
      const found = await searchPatientByMr();
      if (found) return;
      if (!phone) return; // Only MR provided and not found
    }
    if (phone) {
      await searchPatientByPhone();
    }
  };

  const generateToken = async () => {
    // Require department selection
    if (!tokenData.department) {
      toast({ title: 'Department Required', description: 'Please select a department.', variant: 'destructive' });
      return;
    }
    // Doctor is required
    if (!tokenData.patientName || !tokenData.doctor) {
      toast({
        title: 'Error',
        description: 'Patient name and doctor are required.',
        variant: 'destructive',
      });
      return;
    }

    // Corporate portal removed: no corporate panel selection required

    // CNIC validation (optional field): if provided, must be exactly 13 digits (no dashes)
    if ((tokenData.cnic || '').length > 0 && (tokenData.cnic || '').length !== 13) {
      setCnicError('CNIC must be exactly 13 digits (no dashes).');
      toast({ title: 'Invalid CNIC', description: 'Please enter a 13-digit CNIC without dashes.', variant: 'destructive' });
      return;
    }

    // Phone validation: exactly 11 digits
    if ((tokenData.phone || '').length !== 11) {
      setPhoneError('Phone must be exactly 11 digits.');
      toast({ title: 'Invalid Phone', description: 'Please enter an 11-digit phone number.', variant: 'destructive' });
      return;
    }
    // Age validation: integer (optional but if provided, must be digits)
    if ((tokenData.age || '') !== '' && !/^\d+$/.test(String(tokenData.age))) {
      setAgeError('Age must be an integer.');
      toast({ title: 'Invalid Age', description: 'Please enter a whole number for age.', variant: 'destructive' });
      return;
    }

    const finalFee = (parseFloat(tokenData.fee || '0') || 0) - (parseFloat(tokenData.discount || '0') || 0);
    // MR logic: use existing patient's MR if found; otherwise generate simple MR-# sequence
    const mrNumber = existingPatient?.mrNumber || consumeNextMR();

    const payload: any = { ...tokenData, mrNumber, finalFee, status: 'waiting', billingType: 'cash' };

    try {
      const result = editingTokenId
        ? await updateTokenMutation.mutateAsync({ ...payload, _id: editingTokenId })
        : await createTokenMutation.mutateAsync(payload);
      
      setGeneratedToken(result);
      toast({ title: 'Success', description: `Token ${editingTokenId ? 'updated' : 'generated'}.` });
      // Auto print slip
      try { printTokenSlip({
        tokenNumber: result?.tokenNumber,
        dateTime: result?.dateTime,
        patientName: result?.patientName,
        age: result?.age,
        gender: result?.gender,
        phone: result?.phone,
        address: result?.address,
        doctor: result?.doctor,
        department: result?.department,
        finalFee: result?.finalFee,
        mrNumber: result?.mrNumber,
        billingType: payload?.billingType,
        guardianRelation: tokenData.guardianRelation,
        guardianName: tokenData.guardianName,
        cnic: tokenData.cnic,
        bloodPressure: tokenData.bloodPressure,
      }); } catch {}

      // IPD auto-admission removed
      window.dispatchEvent(new Event('tokenGenerated'));
      // Corporate linking removed; simply reset form after success
      resetForm();
    } catch (error: any) {
      const msg = error?.message || (typeof error === 'string' ? error : 'Failed to process token.');
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  };

  const handleDeleteToken = (tokenId: string) => {
    if (window.confirm('Are you sure you want to delete this token?')) {
      // deleteTokenMutation.mutate(tokenId);
      alert(`Token ${tokenId} will be deleted.`); // Placeholder
      resetForm();
    }
  };

  const printToken = () => {
    if (!generatedToken) return;
    printTokenSlip(generatedToken as any);
  };

  // Render Logic
  const finalFee = (parseFloat(tokenData.fee || '0') || 0) - (parseFloat(tokenData.discount || '0') || 0);

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <Card className="w-full shadow-lg">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
          <CardTitle className="text-2xl font-poppins font-extrabold bg-gradient-to-r from-indigo-800 via-indigo-700 to-blue-600 bg-clip-text text-transparent">
            Patient Token Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Unified form: enter new; phone auto-checks for existing patient */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-indigo-900 border-b border-indigo-100 pb-2">
                Patient Information
              </h3>
              {/* Always-visible phone for token entry (moved below search) */}
              <InputWithLabel id="phone" label="Phone" placeholder="Enter 11-digit phone" value={tokenData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
              {/* MR search (optional) */}
              <div className="space-y-2">
                <Label htmlFor="mrNumberSearch" className="text-gray-700 font-poppins font-medium">Search by MR Number</Label>
                <Input
                  id="mrNumberSearch"
                  placeholder="Enter MR# (e.g., MR-15)"
                  value={mrNumberSearch}
                  onChange={e => setMrNumberSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchPatientByMr(); } }}
                  className="border-gray-300 focus:border-blue-500"
                />
              </div>
              <InputWithLabel id="patientName" label="Patient Name" placeholder="Full Name" value={tokenData.patientName} onChange={e => handleInputChange('patientName', e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <InputWithLabel id="age" label="Age" placeholder="e.g., 25" value={tokenData.age} onChange={e => handleInputChange('age', e.target.value)} />
                <SelectWithLabel id="gender" label="Gender" placeholder="Select gender" value={tokenData.gender} onValueChange={v => handleInputChange('gender', v)} items={[{ value: 'Male' }, { value: 'Female' }, { value: 'Other' }]} />
              </div>
              <InputWithLabel id="bloodPressure" label="Blood Pressure (optional)" placeholder="e.g., 120/80" value={tokenData.bloodPressure || ''} onChange={e => handleInputChange('bloodPressure', e.target.value)} />
              {/* Guardian & CNIC */}
              <div className="grid grid-cols-3 gap-4">
                <SelectWithLabel
                  id="guardianRelation"
                  label="Guardian"
                  placeholder="S/O or D/O"
                  value={tokenData.guardianRelation || ''}
                  onValueChange={(v: 'S/O' | 'D/O') => handleInputChange('guardianRelation', v)}
                  items={[{ value: 'S/O', label: 'S/O' }, { value: 'D/O', label: 'D/O' }]}
                />
                <InputWithLabel id="guardianName" label="Guardian Name" placeholder="Father/Guardian Name" value={tokenData.guardianName || ''} onChange={e => handleInputChange('guardianName', e.target.value)} />
                <div className="space-y-1">
                  <InputWithLabel id="cnic" label="CNIC" placeholder="13-digit CNIC (no dashes)" value={tokenData.cnic || ''} onChange={e => handleInputChange('cnic', e.target.value)} />
                  {cnicError && <div className="text-red-600 text-xs">{cnicError}</div>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-gray-700 font-poppins font-medium">Address</Label>
                <Textarea id="address" placeholder="Residential Address" value={tokenData.address} onChange={e => handleInputChange('address', e.target.value)} className="border-gray-300 focus:border-blue-500" />
              </div>
              {/* MR number is auto-assigned; hidden from UI */}
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-indigo-900 border-b border-indigo-100 pb-2">
                Visit & Billing
              </h3>
              <SelectWithLabel id="doctor" label="Doctor" placeholder="Select doctor" value={tokenData.doctorId} onValueChange={handleDoctorChange} items={doctors.map(d => ({ value: d._id, label: `Dr. ${d.name} - ${d.specialization} (Rs. ${d.consultationFee})` }))} />
              <SelectWithLabel id="department" label="Department" placeholder="Select department" value={tokenData.department} onValueChange={handleDepartmentChange} items={departments.map(d => ({ value: d }))} />
              {/* Billing type (Corporate removed) */}
              <SelectWithLabel
                id="billingType"
                label="Billing Type"
                placeholder="Select billing type"
                value={billingType}
                onValueChange={(_v: 'cash') => setBillingType('cash')}
                items={[{ value: 'cash', label: 'Cash' }]}
              />
              {/* Billing type fixed to Cash */}
            </div>

            <div className="md:col-span-2 space-y-4">
              <h3 className="font-semibold text-lg text-indigo-900 border-b border-indigo-100 pb-2">
                Fee Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <InputWithLabel id="fee" label="Consultation Fee" placeholder="Fee" value={tokenData.fee} onChange={e => handleInputChange('fee', e.target.value)} />
                <InputWithLabel id="discount" label="Discount" placeholder="Discount" value={tokenData.discount} onChange={e => handleInputChange('discount', e.target.value)} />
                <div className="space-y-2">
                  <Label className="text-gray-700 font-poppins font-medium">Final Fee</Label>
                  <p className="text-xl font-bold text-green-600 p-2 bg-gray-100 rounded-md">Rs. {finalFee.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-4">
            <Button variant="outline" onClick={resetForm} className="font-poppins font-semibold">Reset Form</Button>
            <Button onClick={generateToken} className="bg-blue-600 hover:bg-blue-700 text-white font-poppins font-semibold">
              {editingTokenId ? 'Update Token' : 'Generate Token'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedToken && <GeneratedTokenCard token={generatedToken} onPrint={printToken} onEdit={handleEditToken} onDelete={handleDeleteToken} isAdmin={isAdmin} />} 
    </div>
  );
};

// Helper components to reduce repetition
const InputWithLabel = ({ id, label, ...props }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-gray-700 font-poppins font-medium">{label}</Label>
    <Input id={id} {...props} className="border-gray-300 focus:border-blue-500" />
  </div>
);

const SelectWithLabel = ({ id, label, placeholder, value, onValueChange, items, ...props }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-gray-700 font-poppins font-medium">{label}</Label>
    <Select onValueChange={onValueChange} value={value} {...props}>
      <SelectTrigger className="border-gray-300 focus:border-blue-500 font-poppins">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-white border shadow-lg font-poppins max-h-60 overflow-y-auto">
        {items.map(item => <SelectItem key={item.value} value={item.value}>{item.label || item.value}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);

const GeneratedTokenCard = ({ token, onPrint, onEdit, onDelete, isAdmin }) => (
  <Card className="w-full mt-6 shadow-lg">
    <CardHeader className="bg-green-100">
      <CardTitle className="text-2xl font-poppins font-bold text-green-800">Token Generated Successfully</CardTitle>
    </CardHeader>
    <CardContent className="p-6">
      <div className="text-center mb-4">
        <h2 className="text-4xl font-bold text-gray-800">{token.tokenNumber}</h2>
        <p className="text-gray-500">Token Number</p>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <div><strong>MR Number:</strong> {token.mrNumber}</div>
        <div><strong>Date & Time:</strong> {new Date(token.dateTime).toLocaleString()}</div>
        <div><strong>Patient Name:</strong> {token.patientName}</div>
        <div><strong>Age:</strong> {token.age}</div>
        <div><strong>Gender:</strong> {token.gender}</div>
        <div><strong>Phone:</strong> {token.phone}</div>
        <div className="col-span-2"><strong>Address:</strong> {token.address}</div>
        <div><strong>Doctor:</strong> {token.doctor}</div>
        <div><strong>Department:</strong> {token.department}</div>
        <div><strong>Final Fee:</strong> Rs. {token.finalFee}</div>
      </div>
      <div className="flex flex-wrap gap-4 mt-6">
        <Button onClick={onPrint} className="bg-green-600 hover:bg-green-700">Print Token</Button>
        <Button onClick={() => { /* Implement prescription printing */ alert('Printing prescription...'); }} className="bg-blue-600 hover:bg-blue-700">Print Prescription</Button>
        <Button onClick={() => onEdit(token)} className="bg-amber-600 hover:bg-amber-700">Edit Token</Button>
        {isAdmin && <Button onClick={() => onDelete((token as any)._id || token.id)} variant="destructive">Delete Token</Button>}
      </div>
    </CardContent>
  </Card>
);

export default TokenGenerator;
