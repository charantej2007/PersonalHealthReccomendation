import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { findUserByEmail } from '../services/backendService';
import { setCurrentUserId } from '../services/sessionService';
import { continueWithGoogle, getGoogleRedirectUser, type GoogleUser } from '../services/authService';
import { GoogleButton } from '../components/GoogleButton';

export function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    const state = location.state as { passwordResetSuccess?: boolean; redirectedFromSignup?: boolean } | null;
    if (state?.passwordResetSuccess) {
      setInfoMessage('Password reset successful. Please login with your new password.');
      return;
    }

    if (state?.redirectedFromSignup) {
      setInfoMessage('This Google email is already registered. Please continue from login.');
    }
  }, [location.state]);

  const completeGoogleSignIn = async (googleUser: GoogleUser) => {
    const user = await findUserByEmail(googleUser.email);
    if (user) {
      setCurrentUserId(user.id);
      navigate('/home');
      return;
    }

    navigate('/signup', {
      state: {
        googleUser,
      },
    });
  };

  useEffect(() => {
    async function processGoogleRedirect() {
      try {
        const googleUser = await getGoogleRedirectUser();
        if (!googleUser) return;

        await completeGoogleSignIn(googleUser);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Google sign-in failed';
        setError(message);
      }
    }

    processGoogleRedirect();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email.');
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await findUserByEmail(email);

      if (!user) {
        setError('No account found for this email. Please sign up first.');
        return;
      }

      setCurrentUserId(user.id);
      navigate('/home');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
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
        await completeGoogleSignIn(googleUser);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="h-full bg-white flex flex-col overflow-y-auto">
      <div className="bg-[#4DB8AC] px-8 pt-14 pb-24 rounded-b-[40px] relative">
        <BackButton className="mb-6 hover:bg-white/20" iconClassName="text-white" />
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 ring-2 ring-white/30 overflow-hidden">
          <img src="/image.png" alt="App logo" className="w-14 h-14 rounded-full object-cover" />
        </div>
        <h1 className="text-3xl font-semibold text-white mb-2">Welcome Back</h1>
        <p className="text-white/80">Sign in to your health account</p>
      </div>

      <div className="flex-1 px-8 -mt-16 pb-6">
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-sm text-gray-600 mb-2 block font-medium">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#4DB8AC] focus:bg-white outline-none transition-all text-gray-800"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-2 block font-medium">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-12 pr-12 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#4DB8AC] focus:bg-white outline-none transition-all text-gray-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-sm text-[#4DB8AC] font-medium ml-auto block"
          >
            Forgot Password?
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-[#4DB8AC] text-white rounded-2xl font-semibold hover:bg-[#45A599] transition-colors shadow-lg shadow-[#4DB8AC]/20 mt-8"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>

          <GoogleButton loading={isGoogleLoading} onClick={handleGoogleContinue}>
            Continue with Google
          </GoogleButton>

          {infoMessage && <p className="text-sm text-[#4DB8AC] -mt-2">{infoMessage}</p>}
          {error && <p className="text-sm text-red-500 -mt-2">{error}</p>}

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-sm text-gray-400">secure sign in</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>
        </form>
      </div>

      <div className="text-center pb-8 px-8">
        <span className="text-gray-500">Don't have an account? </span>
        <button
          onClick={() => navigate('/signup')}
          className="text-[#4DB8AC] font-semibold"
        >
          Create Account
        </button>
      </div>
    </div>
  );
}