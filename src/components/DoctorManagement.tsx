import React, { useState, useEffect } from 'react';
import { UserPlus, Edit, Trash2, Stethoscope, Phone, Save, X, DollarSign, Users, TrendingUp, Calendar, Settings, Lock, IdCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useDoctors, useCreateDoctor, useUpdateDoctor, useDeleteDoctor, useCreateUser } from '@/hooks/useApi';
import { checkUsernameExists } from '../hooks/useApi';

export interface Doctor {
  _id: string;
  id: string;
  name: string;
  username: string;
  specialization: string;
  phone: string;
  cnic?: string;
  consultationFee: number;
  commissionRate: number;
  totalRevenue?: number;
  totalCommission?: number;
  patientsChecked?: number;
  tokensToday?: number;
  isActive?: boolean;
}

export type UserCreateData = {
  name: string;
  password: string;
  role?: string;
  username: string;
};

type DoctorFormData = UserCreateData & {
  specialization: string;
  phone: string;
  cnic?: string;
  consultationFee: number;
  commissionRate: number;
};

const DoctorManagement = () => {
  // API hooks
  const { data: doctorsData, refetch: refetchDoctors, isFetching } = useDoctors();
  const createDoctorMutation = useCreateDoctor();
  const createUserMutation = useCreateUser();
  const updateDoctorMutation = useUpdateDoctor();
  const deleteDoctorMutation = useDeleteDoctor();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [formData, setFormData] = useState<DoctorFormData>({
    name: '',
    password: '',
    specialization: '',
    phone: '',
    cnic: '',
    consultationFee: 0,
    commissionRate: 0,
    username: ''
  });
  const [cnicError, setCnicError] = useState('');
  const [error, setError] = useState('');
  // Popup/modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDoctorId, setDeleteDoctorId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [suggestedUsernames, setSuggestedUsernames] = useState<string[]>([]);
  const [username, setUsername] = useState('');
  const [showFormDialog, setShowFormDialog] = useState(false);

  // Sync doctors from backend
  useEffect(() => {
    if (doctorsData) {
      // Map _id to id for internal usage
      setDoctors((doctorsData as any).map((d: any) => ({ ...d, id: d._id })));
    }
  }, [doctorsData]);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const { name } = e.currentTarget;
    const value = e.clipboardData.getData('text');
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const { name } = e.currentTarget;
    const value = e.clipboardData.getData('text');
    
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? 0 : Number(value)
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'cnic') {
      const digits = value.replace(/\D+/g, '').slice(0, 13);
      setFormData(prev => ({ ...prev, cnic: digits } as any));
      if (digits.length > 0 && digits.length !== 13) setCnicError('CNIC must be exactly 13 digits (no dashes).');
      else setCnicError('');
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? 0 : Number(value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setError('');
      const password = formData.password || Math.random().toString(36).slice(-8);
      
      if (editingDoctor) {
        updateDoctorMutation.mutate({ id: editingDoctor.id, payload: {
          name: formData.name,
          specialization: formData.specialization,
          phone: formData.phone,
          cnic: formData.cnic,
          consultationFee: formData.consultationFee,
          commissionRate: formData.commissionRate,
          ...(formData.password && formData.password.trim() !== '' ? { password: formData.password } : {})
        } }, {
          onSuccess: () => {
            setEditingDoctor(null);
            setFormData({ name: '', password: '', specialization: '', phone: '', cnic: '', consultationFee: 0, commissionRate: 0, username: '' });
            setShowFormDialog(false);
          },
        });
      } else {
        if (cnicError) return;
        // Create user first (no name/email on user)
        await createUserMutation.mutateAsync({
          // Use chosen username for doctor-linked user (email no longer required)
          username: formData.username,
          password,
          role: 'doctor'
        });
        
        // Then create doctor
        await createDoctorMutation.mutateAsync({
          name: formData.name,
          specialization: formData.specialization,
          phone: formData.phone,
          cnic: formData.cnic,
          consultationFee: formData.consultationFee,
          commissionRate: formData.commissionRate,
          username: formData.username,
        });
        
        // Show success
        setSuccessMessage('Doctor added successfully!');
        setShowSuccessModal(true);
        setFormData({ name: '', password: '', specialization: '', phone: '', cnic: '', consultationFee: 0, commissionRate: 0, username: '' });
        setShowFormDialog(false);
      }
    } catch (err) {
      setError(err.message);
      
      // Scroll to error and highlight
      setTimeout(() => {
        const errorElement = document.getElementById('doctor-error');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth' });
          errorElement.style.animation = 'flashError 0.5s 3';
        }
      }, 100);
    }
  }

  const handleCommissionUpdate = (doctorId: string, newCommissionRate: number) => {
    // Persist commission rate change directly to backend; stats will be recalculated once token APIs are integrated
    updateDoctorMutation.mutate({ id: doctorId, payload: { commissionRate: newCommissionRate } });
  };

  const handleEdit = (doctor: Doctor) => {
    // Prevent unnecessary re-renders or double-edit freeze
    if (editingDoctor && editingDoctor.id === doctor.id) return;
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name || '',
      password: '',
      specialization: doctor.specialization || '',
      phone: doctor.phone || '',
      cnic: (doctor as any).cnic || '',
      consultationFee: doctor.consultationFee ?? (doctor as any).fee ?? 0,
      commissionRate: typeof doctor.commissionRate === 'number' ? doctor.commissionRate : 0,
      username: doctor.username || ''
    });
    setShowFormDialog(true);
  };

  const handleCancelEdit = () => {
    setEditingDoctor(null);
    setFormData({ name: '', password: '', specialization: '', phone: '', cnic: '', consultationFee: 0, commissionRate: 0, username: '' });
    setShowFormDialog(false);
  };

  const handleDelete = (id: string) => {
    setDeleteDoctorId(id);
    setShowDeleteModal(true);
    setDeleteConfirmText('');
  };

  const confirmDeleteDoctor = () => {
    if (deleteDoctorId && deleteConfirmText === 'DELETE') {
      deleteDoctorMutation.mutate(deleteDoctorId, {
        onSuccess: () => {
          setShowDeleteModal(false);
          setDeleteDoctorId(null);
          setDeleteConfirmText('');
          setSuccessMessage('Doctor deleted successfully!');
          setShowSuccessModal(true);
        },
      });
    }
  }

  const generateUsername = async (name: string) => {
    const baseUsername = name.toLowerCase().replace(/\s+/g, '.');
    const suggestions = [baseUsername];
    
    // Check if username exists
    const exists = await checkUsernameExists(baseUsername);
    if (exists) {
      suggestions.push(
        `${baseUsername}${Math.floor(Math.random() * 100)}`,
        `${baseUsername}.md`,
        `${baseUsername}.dr`
      );
    }
    
    setSuggestedUsernames(suggestions);
    setUsername(suggestions[0]);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div 
          id="doctor-error"
          style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '1rem',
            marginBottom: '1rem',
            borderRadius: '4px',
            borderLeft: '4px solid #c62828',
            fontSize: '1.1rem'
          }}
        >
          ⚠️ {error}
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes flashError {
            0%, 100% { background-color: #ffebee; }
            50% { background-color: #ffcdd2; }
          }
        `
      }} />

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl px-8 py-7 max-w-xs w-full text-center relative border-2 border-green-600">
            <div className="text-green-600 text-3xl mb-2">✓</div>
            <div className="font-semibold text-lg mb-3 font-poppins">{successMessage}</div>
            <Button className="bg-green-600 hover:bg-green-700 text-white w-full font-poppins" onClick={() => setShowSuccessModal(false)}>OK</Button>
            <button
              className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-xl font-bold"
              onClick={() => setShowSuccessModal(false)}
              aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >×</button>
          </div>
        </div>
      )}

      {/* Delete Doctor Double-Check Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl px-8 py-7 max-w-md w-full text-center relative border-2 border-red-600">
            <div className="text-red-700 text-3xl mb-2 font-bold">⚠️</div>
            <div className="font-semibold text-xl mb-2 font-poppins text-red-800">This action is IRREVERSIBLE!</div>
            <div className="mb-4 text-gray-700 font-poppins">This doctor and all associated data will be <b>permanently deleted</b>.</div>
            <div className="mb-3">
              <span className="font-semibold text-red-700">Type <b>DELETE</b> to confirm:</span>
              <Input
                className="mt-2 border-red-400 focus:border-red-600 text-center font-poppins"
                placeholder="Write DELETE in capital letters"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                className="bg-red-600 hover:bg-red-700 text-white font-poppins flex-1"
                disabled={deleteConfirmText !== 'DELETE'}
                onClick={confirmDeleteDoctor}
              >
                Yes, Delete Doctor
              </Button>
              <Button
                className="bg-gray-200 text-gray-700 hover:bg-gray-300 font-poppins flex-1"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteDoctorId(null);
                  setDeleteConfirmText('');
                }}
              >Cancel</Button>
            </div>
            <button
              className="absolute top-2 right-3 text-gray-400 hover:text-gray-700 text-xl font-bold"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteDoctorId(null);
                setDeleteConfirmText('');
              }}
              aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >×</button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex justify-between mb-2">
        <Button
          onClick={() => {
            setEditingDoctor(null);
            setFormData({ name: '', password: '', specialization: '', phone: '', cnic: '', consultationFee: 0, commissionRate: 0, username: '' });
            setShowFormDialog(true);
          }}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Add Doctor
        </Button>
        <Button onClick={() => refetchDoctors()} size="sm" className="bg-green-600 hover:bg-green-700 text-white" disabled={isFetching}>
          {isFetching ? 'Refreshing...' : 'Refresh Stats'}
        </Button>
      </div>

      {/* Add/Edit Doctor Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center space-x-2 text-gray-700 font-poppins font-medium">
                  <Stethoscope className="h-4 w-4 text-blue-600" />
                  <span>Doctor Name</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onPaste={handlePaste}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  placeholder="Enter doctor's full name"
                  required
                  className="border-gray-300 focus:border-blue-500 font-poppins"
                />
              </div>
              
              {/* CNIC Field */}
              <div className="space-y-2">
                <Label htmlFor="cnic" className="flex items-center space-x-2 text-gray-700 font-poppins font-medium">
                  <IdCard className="h-4 w-4 text-purple-600" />
                  <span>CNIC</span>
                </Label>
                <Input
                  id="cnic"
                  name="cnic"
                  value={formData.cnic || ''}
                  onChange={handleChange}
                  onPaste={handlePaste}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  placeholder="13-digit CNIC (no dashes)"
                  className="border-gray-300 focus:border-blue-500 font-poppins"
                />
                {cnicError && <div className="text-xs text-red-600">{cnicError}</div>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center space-x-2 text-gray-700 font-poppins font-medium">
                  <Lock className="h-4 w-4 text-red-600" />
                  <span>Password</span>
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  onPaste={handlePaste}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  placeholder="Enter password"
                  required={!editingDoctor}
                  className="border-gray-300 focus:border-blue-500 font-poppins"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="specialization" className="font-poppins font-medium text-gray-700">Specialization</Label>
                <Input
                  id="specialization"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  onPaste={handlePaste}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  placeholder="e.g., Cardiologist, Gynecologist"
                  required
                  className="border-gray-300 focus:border-blue-500 font-poppins"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center space-x-2 text-gray-700 font-poppins font-medium">
                  <Phone className="h-4 w-4 text-green-600" />
                  <span>Phone Number</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onPaste={handlePaste}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  placeholder="Enter phone number"
                  required
                  className="border-gray-300 focus:border-blue-500 font-poppins"
                />
              </div>
              
              {/* Department ID removed */}
              
              <div className="space-y-2">
                <Label htmlFor="consultationFee" className="font-poppins font-medium text-gray-700">Consultation Fee (Rs.)</Label>
                <Input
                  id="consultationFee"
                  name="consultationFee"
                  type="number"
                  value={formData.consultationFee}
                  onChange={handleNumberChange}
                  onPaste={handleNumberPaste}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  placeholder="Enter consultation fee"
                  required
                  className="border-gray-300 focus:border-blue-500 font-poppins"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commissionRate" className="flex items-center space-x-2 text-gray-700 font-poppins font-medium">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span>Share Rate (%)</span>
                </Label>
                <Input
                  id="commissionRate"
                  name="commissionRate"
                  type="number"
                  value={formData.commissionRate}
                  onChange={handleNumberChange}
                  onPaste={handleNumberPaste}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  placeholder="Enter share percentage"
                  min="0"
                  max="100"
                  className="border-gray-300 focus:border-blue-500 font-poppins"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="font-poppins font-medium text-gray-700">Username</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  onPaste={handlePaste}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  placeholder="Enter username"
                  required
                  className="border-gray-300 focus:border-blue-500 font-poppins"
                />
              </div>
              {suggestedUsernames.length > 1 && (
                <div className="text-sm text-gray-500">
                  Suggested: {suggestedUsernames.join(', ')}
                </div>
              )}
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button 
                type="submit" 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-poppins font-semibold shadow-lg flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{editingDoctor ? 'Update Doctor' : 'Add Doctor'}</span>
              </Button>
              <Button 
                type="button"
                onClick={handleCancelEdit}
                variant="outline"
                className="font-poppins font-semibold flex items-center space-x-2"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Doctors Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold">
                  Rs. {doctors.reduce((sum, doc) => sum + (doc.totalRevenue || 0), 0).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Share</p>
                <p className="text-2xl font-bold">
                  Rs. {doctors.reduce((sum, doc) => sum + (doc.totalCommission || 0), 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Patients</p>
                <p className="text-2xl font-bold">
                  {doctors.reduce((sum, doc) => sum + (doc.patientsChecked || 0), 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Active Doctors</p>
                <p className="text-2xl font-bold">
                  {doctors.filter(doc => doc.isActive !== false).length}
                </p>
              </div>
              <Stethoscope className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Doctors List */}
      <Card className="border-t-4 border-t-green-600 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="text-green-800 font-poppins font-semibold flex items-center justify-between">
            <span>Doctor Performance Overview ({doctors.length})</span>
            <Button 
              onClick={() => refetchDoctors()}
              variant="outline"
              size="sm"
              className="font-poppins"
            >
              {isFetching ? 'Refreshing...' : 'Refresh Stats'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {doctors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Stethoscope className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-poppins">No doctors registered yet</p>
              <p className="font-poppins">Add your first doctor using the form above</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {doctors.map((doctor) => (
                <div key={doctor.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="space-y-4">
                    {/* Doctor Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800 font-poppins">Dr. {doctor.name}</h3>
                        <p className="text-sm text-gray-600 font-medium">{doctor.specialization}</p>
                      </div>
                      <div className="flex space-x-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => setSelectedDoctor(doctor)}
                              className="bg-green-500 hover:bg-green-600 text-white p-2"
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Manage Commission - Dr. {doctor.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div className="space-y-2">
                                <Label>Current Share Rate</Label>
                                <Input
                                  type="number"
                                  value={doctor.commissionRate || 0}
                                  onChange={(e) => handleCommissionUpdate(doctor.id, parseInt(e.target.value) || 0)}
                                  min="0"
                                  max="100"
                                />
                              </div>
                              <div className="text-sm text-gray-600">
                                <p>Current Revenue: Rs. {(doctor.totalRevenue || 0).toLocaleString()}</p>
                                <p>Current Commission: Rs. {(doctor.totalCommission || 0).toLocaleString()}</p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          onClick={() => handleEdit(doctor)}
                          className="bg-blue-500 hover:bg-blue-600 text-white p-2"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDelete(doctor.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Performance Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="text-xs text-green-600 font-medium">Revenue</span>
                        </div>
                        <p className="text-lg font-bold text-green-700">
                          Rs. {(doctor.totalRevenue || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          <span className="text-xs text-blue-600 font-medium">Share</span>
                        </div>
                        <p className="text-lg font-bold text-blue-700">
                          Rs. {(doctor.totalCommission || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-purple-600" />
                          <span className="text-xs text-purple-600 font-medium">Patients</span>
                        </div>
                        <p className="text-lg font-bold text-purple-700">
                          {doctor.patientsChecked || 0}
                        </p>
                      </div>

                      <div className="bg-orange-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-orange-600" />
                          <span className="text-xs text-orange-600 font-medium">Today</span>
                        </div>
                        <p className="text-lg font-bold text-orange-700">
                          {doctor.tokensToday || 0}
                        </p>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 font-poppins text-sm">
                      <p className="text-gray-600">
                        <span className="font-semibold">Fee:</span> Rs. {(doctor.consultationFee || 0).toLocaleString()}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-semibold">Share:</span> {doctor.commissionRate || 0}%
                      </p>
                      <p className="text-gray-600">
                        <span className="font-semibold">Phone:</span> {doctor.phone}
                      </p>
                      {(doctor as any).cnic && (
                        <p className="text-gray-600">
                          <span className="font-semibold">CNIC:</span> {(doctor as any).cnic}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorManagement;
