import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { onAuthStateChanged } from 'firebase/auth';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { auth } from '../lib/firebase';
import { findUserByEmail } from '../services/backendService';
import { continueWithGoogle, getGoogleRedirectUser, type GoogleUser } from '../services/authService';
import { GoogleButton } from '../components/GoogleButton';

type SignUpLocationState = {
  googleUser?: GoogleUser;
};

export function SignUpScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as SignUpLocationState | null) ?? null;
  const googleUserFromLogin = locationState?.googleUser ?? null;
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const continueGoogleSignup = (googleUser: GoogleUser) => {
    navigate('/complete-profile', {
      state: {
        email: googleUser.email,
        name: googleUser.displayName,
        source: 'google',
        otpVerified: true,
      },
    });
  };

  const resolveGoogleSignup = async (googleUser: GoogleUser) => {
    const existingUser = await findUserByEmail(googleUser.email);
    if (existingUser) {
      navigate('/login', {
        state: {
          redirectedFromSignup: true,
        },
      });
      return;
    }

    continueGoogleSignup(googleUser);
  };

  useEffect(() => {
    let isCancelled = false;
    let hasHandledGoogleUser = false;

    const handleResolvedGoogleUser = async (googleUser: GoogleUser) => {
      if (isCancelled || hasHandledGoogleUser) return;
      hasHandledGoogleUser = true;

      try {
        setIsGoogleLoading(true);
        setError('');
        await resolveGoogleSignup(googleUser);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Google sign-up failed';
        setError(message);
      } finally {
        if (!isCancelled) {
          setIsGoogleLoading(false);
        }
      }
    };

    async function processGoogleRedirect() {
      try {
        const googleUser = await getGoogleRedirectUser();
        if (!googleUser) return;

        await handleResolvedGoogleUser(googleUser);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Google sign-up failed';
        setError(message);
      }
    }

    void processGoogleRedirect();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser?.email) return;

      void handleResolvedGoogleUser({
        email: firebaseUser.email,
        displayName: firebaseUser.displayName ?? 'Google User',
      });
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please enter email, password, and confirm password.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password and confirm password must match.');
      return;
    }

    try {
      setIsSubmitting(true);

      const existingUser = await findUserByEmail(formData.email);
      if (existingUser) {
        setError('An account already exists for this email. Please login instead.');
        return;
      }

      // OTP verification removed - navigating directly to profile completion.
      navigate('/complete-profile', {
        state: {
          email: formData.email,
          source: 'email',
          otpVerified: true,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not continue signup.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleContinue = async () => {
    setError('');

    try {
      setIsGoogleLoading(true);
      const googleUser = await continueWithGoogle();
      if (googleUser) {
        await resolveGoogleSignup(googleUser);
        setIsGoogleLoading(false);
        return;
      }
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
        <p className="text-gray-500 mb-8">Step 1 of 2: Create your account</p>

        {googleUserFromLogin && (
          <div className="mb-6 rounded-xl border border-[#4DB8AC]/30 bg-[#4DB8AC]/10 p-4">
            <p className="text-sm text-gray-700 mb-3">
              No account exists for <span className="font-semibold">{googleUserFromLogin.email}</span>.
            </p>
            <button
              type="button"
              onClick={() => continueGoogleSignup(googleUserFromLogin)}
              className="w-full py-3 bg-[#4DB8AC] text-white rounded-xl font-semibold hover:bg-[#45A599] transition-colors"
            >
              Continue Google Signup
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
                <label className="text-sm text-gray-600 mb-2 block font-medium">Create Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Create password"
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#4DB8AC] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-2 block font-medium">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm password"
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#4DB8AC] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-[#4DB8AC] text-white rounded-2xl font-semibold hover:bg-[#45A599] transition-colors shadow-lg shadow-[#4DB8AC]/20 mt-6"
          >
            {isSubmitting ? 'Verifying...' : 'Continue'}
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