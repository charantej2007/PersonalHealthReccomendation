import { useNavigate } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { BottomNavigation } from '../components/BottomNavigation';
import { User, Mail, Phone, Edit, LogOut, Star, Calendar } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { getUserProfile, updateUserProfile, type UserProfile } from '../services/backendService';
import { clearCurrentUserId, getCurrentUserId, markProfileUpdated } from '../services/sessionService';

export function ProfileScreen() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    age: '',
    heightCm: '',
    weightKg: '',
    email: '',
  });

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      navigate('/login');
      return;
    }
    const activeUserId = userId;

    async function loadProfile() {
      try {
        const user = await getUserProfile(activeUserId);
        setUserInfo(user);
        setEditForm({
          name: user.name,
          age: String(user.age),
          heightCm: String(user.heightCm),
          weightKg: String(user.weightKg),
          email: user.email ?? '',
        });
      } catch {
        navigate('/login');
      }
    }

    loadProfile();
  }, [navigate]);

  const bmi = useMemo(() => {
    if (!userInfo?.heightCm || !userInfo?.weightKg) return '--';
    const heightM = userInfo.heightCm / 100;
    return (userInfo.weightKg / (heightM * heightM)).toFixed(1);
  }, [userInfo]);

  const stats = [
    { label: 'BMI', value: bmi },
    { label: 'Days Active', value: '14' },
    { label: 'Goals Met', value: '87%' },
  ];

  const handleSaveProfile = async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      navigate('/login');
      return;
    }

    if (!editForm.name || !editForm.age || !editForm.heightCm || !editForm.weightKg) {
      setEditError('Please complete all required fields.');
      return;
    }

    try {
      setIsSaving(true);
      setEditError('');
      await updateUserProfile(userId, {
        name: editForm.name,
        age: Number(editForm.age),
        heightCm: Number(editForm.heightCm),
        weightKg: Number(editForm.weightKg),
        email: editForm.email || undefined,
      });

      const refreshed = await getUserProfile(userId);
      setUserInfo(refreshed);
      markProfileUpdated();
      setIsEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full bg-gray-50 relative flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
      <div className="bg-gradient-to-br from-[#4DB8AC] to-[#45A599] px-6 pt-14 pb-24 rounded-b-[40px] relative">
        <div className="mb-3">
          <BackButton iconClassName="text-white" className="hover:bg-white/20" />
        </div>
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-2xl font-semibold text-white">My Profile</h1>
          <button
            onClick={() => setIsEditing((prev) => !prev)}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            <Edit className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
            <User className="w-12 h-12 text-[#4DB8AC]" />
          </div>
          <h2 className="text-xl font-semibold text-white">{userInfo?.name ?? 'Loading...'}</h2>
          <p className="text-white/80 text-sm mt-1">Health Enthusiast</p>
          <div className="mt-3 flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-full">
            <Star className="w-4 h-4 text-white fill-white" />
            <span className="text-white text-xs font-medium">Premium Member</span>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-16 pb-6 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-2xl font-semibold text-gray-800">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h3 className="text-xs font-semibold text-[#4DB8AC] uppercase tracking-wider mb-4">
            Personal Information
          </h3>

          {isEditing && (
            <div className="mb-5 space-y-3">
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Name"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-[#4DB8AC]"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={editForm.age}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, age: e.target.value }))}
                  placeholder="Age"
                  type="number"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-[#4DB8AC]"
                />
                <input
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  type="email"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-[#4DB8AC]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={editForm.heightCm}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, heightCm: e.target.value }))}
                  placeholder="Height (cm)"
                  type="number"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-[#4DB8AC]"
                />
                <input
                  value={editForm.weightKg}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, weightKg: e.target.value }))}
                  placeholder="Weight (kg)"
                  type="number"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 outline-none focus:ring-2 focus:ring-[#4DB8AC]"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full py-3 bg-[#4DB8AC] text-white rounded-xl font-semibold"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              {editError && <p className="text-sm text-red-500">{editError}</p>}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-[#5B9BD5]/10 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#5B9BD5]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-gray-800 font-medium">{userInfo?.email ?? 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-[#F59E75]/10 rounded-xl flex items-center justify-center">
                <Phone className="w-5 h-5 text-[#F59E75]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm text-gray-800 font-medium">Not provided</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-[#9B72CB]/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#9B72CB]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Age</p>
                <p className="text-sm text-gray-800 font-medium">{userInfo?.age ?? '--'} years old</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Height</p>
                  <p className="text-sm text-gray-800 font-medium">{userInfo?.heightCm ?? '--'} cm</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Weight</p>
                  <p className="text-sm text-gray-800 font-medium">{userInfo?.weightKg ?? '--'} kg</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Profile Button */}
        <button
          onClick={() => setIsEditing((prev) => !prev)}
          className="w-full py-4 bg-[#4DB8AC] text-white rounded-2xl font-semibold hover:bg-[#45A599] transition-colors shadow-lg shadow-[#4DB8AC]/20 flex items-center justify-center gap-2"
        >
          <Edit className="w-5 h-5" />
          {isEditing ? 'Close Edit' : 'Edit Profile'}
        </button>

        {/* Logout Button */}
        <button
          onClick={() => {
            clearCurrentUserId();
            navigate('/login');
          }}
          className="w-full py-4 bg-white text-red-500 rounded-2xl font-semibold hover:bg-red-50 transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
