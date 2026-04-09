import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { resetForgotPassword } from '../services/backendService';

type ResetPasswordState = {
  email?: string;
  otpVerified?: boolean;
};

export function ResetPasswordScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as ResetPasswordState | null) ?? null;

  const email = state?.email?.trim().toLowerCase() ?? '';
  const otpVerified = Boolean(state?.otpVerified);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!email || !otpVerified) {
    return (
      <div className="h-full bg-white flex flex-col items-center justify-center px-8 text-center">
        <h2 className="text-xl font-semibold text-gray-800">Verification required</h2>
        <p className="text-gray-500 mt-2">Please complete forgot-password verification first.</p>
        <button
          onClick={() => navigate('/forgot-password')}
          className="mt-6 px-5 py-3 bg-[#4DB8AC] text-white rounded-xl font-semibold"
        >
          Go to Forgot Password
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and confirm password must match.');
      return;
    }

    try {
      setIsSubmitting(true);
      await resetForgotPassword(email, password, confirmPassword);
      navigate('/login', { state: { passwordResetSuccess: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="px-8 py-8 pb-24">
        <BackButton className="mb-6" />

        <h1 className="text-3xl font-semibold text-gray-800 mb-2">Reset Password</h1>
        <p className="text-gray-500 mb-8">Step 3 of 3: Set your new password</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm text-gray-600 mb-2 block font-medium">Create Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password"
                className="w-full pl-12 pr-12 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#4DB8AC] focus:bg-white outline-none transition-all text-gray-800"
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full pl-12 pr-12 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#4DB8AC] focus:bg-white outline-none transition-all text-gray-800"
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-[#4DB8AC] text-white rounded-2xl font-semibold hover:bg-[#45A599] transition-colors shadow-lg shadow-[#4DB8AC]/20"
          >
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      </div>
    </div>
  );
}
