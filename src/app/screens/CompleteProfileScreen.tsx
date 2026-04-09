import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { User, Ruler, Weight, ChevronDown, CalendarDays } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { createUserProfile, type UserProfile } from '../services/backendService';
import { setCurrentUserId } from '../services/sessionService';

type CompleteProfileState = {
  email?: string;
  name?: string;
  source?: 'email' | 'google';
  otpVerified?: boolean;
};

export function CompleteProfileScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as CompleteProfileState | null) ?? null;

  const signupEmail = state?.email?.trim() ?? '';
  const signupSource = state?.source ?? 'email';
  const otpVerified = Boolean(state?.otpVerified);

  const [formData, setFormData] = useState({
    name: state?.name?.trim() ?? '',
    age: '',
    gender: '',
    height: '',
    weight: '',
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const title = useMemo(
    () => (signupSource === 'google' ? 'Complete Google Signup' : 'Complete Signup'),
    [signupSource]
  );

  if (!signupEmail || !otpVerified) {
    return (
      <div className="h-full bg-white flex flex-col items-center justify-center px-8 text-center">
        <h2 className="text-xl font-semibold text-gray-800">Verification required</h2>
        <p className="text-gray-500 mt-2">Please complete signup verification first.</p>
        <button
          onClick={() => navigate('/signup')}
          className="mt-6 px-5 py-3 bg-[#4DB8AC] text-white rounded-xl font-semibold"
        >
          Go to Signup
        </button>
      </div>
    );
  }

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.age || !formData.gender || !formData.height || !formData.weight) {
      setError('Please fill all required profile fields.');
      return;
    }

    try {
      setIsSaving(true);
      const user: UserProfile = await createUserProfile({
        name: formData.name,
        age: Number(formData.age),
        gender: formData.gender as 'male' | 'female' | 'other',
        heightCm: Number(formData.height),
        weightKg: Number(formData.weight),
        email: signupEmail,
        conditions: [],
      });

      setCurrentUserId(user.id);
      navigate('/home');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not complete signup.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="px-8 py-8 pb-24">
        <BackButton className="mb-6" />

        <h1 className="text-3xl font-semibold text-gray-800 mb-2">{title}</h1>
        <p className="text-gray-500 mb-2">Step 2 of 2: Fill your personal health profile</p>
        <p className="text-sm text-[#4DB8AC] mb-8">Account verified for: {signupEmail}</p>

        <form onSubmit={handleComplete} className="space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-[#4DB8AC] uppercase tracking-wider mb-4">
              Personal Information
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-2 block font-medium">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Your name"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#4DB8AC] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 mb-2 block font-medium">Age</label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData((prev) => ({ ...prev, age: e.target.value }))}
                      placeholder="Years"
                      className="w-full pl-10 pr-3 py-3.5 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#4DB8AC] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-600 mb-2 block font-medium">Gender</label>
                  <div className="relative">
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
                      className="w-full px-4 py-3.5 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#4DB8AC] transition-all appearance-none"
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-[#4DB8AC] uppercase tracking-wider mb-4">
              Body Measurements
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-2 block font-medium">Height (cm)</label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData((prev) => ({ ...prev, height: e.target.value }))}
                    placeholder="cm"
                    className="w-full pl-10 pr-3 py-3.5 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#4DB8AC] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-2 block font-medium">Weight (kg)</label>
                <div className="relative">
                  <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={(e) => setFormData((prev) => ({ ...prev, weight: e.target.value }))}
                    placeholder="kg"
                    className="w-full pl-10 pr-3 py-3.5 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#4DB8AC] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-4 bg-[#4DB8AC] text-white rounded-2xl font-semibold hover:bg-[#45A599] transition-colors shadow-lg shadow-[#4DB8AC]/20 mt-6"
          >
            {isSaving ? 'Saving...' : 'Complete Signup'}
          </button>

          {error && <p className="text-sm text-red-500 -mt-2">{error}</p>}
        </form>
      </div>
    </div>
  );
}
