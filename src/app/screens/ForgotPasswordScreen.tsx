import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Mail } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { requestForgotPasswordOtp } from '../services/backendService';

export function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }

    try {
      setIsSubmitting(true);
      await requestForgotPasswordOtp(email.trim().toLowerCase());
      navigate('/forgot-password-otp', {
        state: {
          email: email.trim().toLowerCase(),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="px-8 py-8 pb-24">
        <BackButton className="mb-6" />

        <h1 className="text-3xl font-semibold text-gray-800 mb-2">Forgot Password</h1>
        <p className="text-gray-500 mb-8">Step 1 of 3: Enter your registered email</p>

        <form onSubmit={handleContinue} className="space-y-5">
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-[#4DB8AC] text-white rounded-2xl font-semibold hover:bg-[#45A599] transition-colors shadow-lg shadow-[#4DB8AC]/20"
          >
            {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
          </button>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      </div>
    </div>
  );
}
