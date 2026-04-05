import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { User, Mail, Lock, Ruler, Weight, ChevronDown } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { createUserProfile, findOrCreateUserByGoogle } from '../services/backendService';
import { setCurrentUserId } from '../services/sessionService';
import { continueWithGoogle, getGoogleRedirectUser } from '../services/authService';
import { GoogleButton } from '../components/GoogleButton';

export function SignUpScreen() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    async function processGoogleRedirect() {
      try {
        const googleUser = await getGoogleRedirectUser();
        if (!googleUser) return;

        const user = await findOrCreateUserByGoogle(googleUser.email, googleUser.displayName);
        setCurrentUserId(user.id);
        navigate('/home');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Google sign-up failed';
        setError(message);
      }
    }

    processGoogleRedirect();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.age || !formData.gender || !formData.height || !formData.weight) {
      setError('Please fill all required profile fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await createUserProfile({
        name: formData.name,
        age: Number(formData.age),
        gender: formData.gender as 'male' | 'female' | 'other',
        heightCm: Number(formData.height),
        weightKg: Number(formData.weight),
        email: formData.email || undefined,
      });

      setCurrentUserId(user.id);
      navigate('/home');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create account.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleContinue = async () => {
    setError('');

    try {
      setIsGoogleLoading(true);
      await continueWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-up failed';
      setError(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="px-8 py-8 pb-24">
        <BackButton className="mb-6" />
        
        <h1 className="text-3xl font-semibold text-gray-800 mb-2">Create Account</h1>
        <p className="text-gray-500 mb-8">Fill in your health profile</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information Section */}
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
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your name"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#4DB8AC] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 mb-2 block font-medium">Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="Years"
                    className="w-full px-4 py-3.5 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#4DB8AC] transition-all"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600 mb-2 block font-medium">Gender</label>
                  <div className="relative">
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
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

          {/* Body Measurements Section */}
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
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    placeholder="kg"
                    className="w-full pl-10 pr-3 py-3.5 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#4DB8AC] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Account Details Section */}
          <div>
            <h3 className="text-xs font-semibold text-[#4DB8AC] uppercase tracking-wider mb-4">
              Account Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-2 block font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#4DB8AC] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-2 block font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Create password"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#4DB8AC] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-[#4DB8AC] text-white rounded-2xl font-semibold hover:bg-[#45A599] transition-colors shadow-lg shadow-[#4DB8AC]/20 mt-6"
          >
            {isSubmitting ? 'Creating...' : 'Create Account'}
          </button>

          <GoogleButton loading={isGoogleLoading} onClick={handleGoogleContinue}>
            Continue with Google
          </GoogleButton>

          {error && <p className="text-sm text-red-500 -mt-2">{error}</p>}
        </form>

        <div className="text-center mt-6">
          <span className="text-gray-500">Already have an account? </span>
          <button
            onClick={() => navigate('/login')}
            className="text-[#4DB8AC] font-semibold"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}