import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Mail, ShieldCheck } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { requestForgotPasswordOtp, verifyForgotPasswordOtp } from '../services/backendService';

type ForgotOtpState = {
  email?: string;
};

export function ForgotPasswordOtpScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as ForgotOtpState | null) ?? null;
  const email = state?.email?.trim().toLowerCase() ?? '';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
      return;
    }

    async function sendInitialOtp() {
      try {
        const response = await requestForgotPasswordOtp(email);
        setInfo(response.message);
        setCooldown(response.resendCooldownSeconds);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not send OTP.');
      }
    }

    void sendInitialOtp();
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const maskedEmail = useMemo(() => {
    if (!email.includes('@')) return email;
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) return `${localPart[0] ?? ''}***@${domain}`;
    return `${localPart.slice(0, 2)}***@${domain}`;
  }, [email]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^\d{4,8}$/.test(otp)) {
      setError('Enter a valid OTP code.');
      return;
    }

    try {
      setIsVerifying(true);
      await verifyForgotPasswordOtp(email, otp);
      navigate('/reset-password', {
        state: {
          email,
          otpVerified: true,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');

    try {
      setIsResending(true);
      const response = await requestForgotPasswordOtp(email);
      setInfo(response.message);
      setCooldown(response.resendCooldownSeconds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend OTP.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="px-8 py-8 pb-24">
        <BackButton className="mb-6" />

        <h1 className="text-3xl font-semibold text-gray-800 mb-2">Verify Reset OTP</h1>
        <p className="text-gray-500 mb-2">Step 2 of 3: Enter the OTP sent to your email</p>

        <div className="flex items-center gap-2 text-sm text-[#4DB8AC] mb-8">
          <Mail className="w-4 h-4" />
          <span>{maskedEmail}</span>
        </div>

        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label className="text-sm text-gray-600 mb-2 block font-medium">OTP Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Enter OTP"
              className="w-full px-4 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#4DB8AC] focus:bg-white outline-none transition-all text-gray-800 tracking-[0.35em] text-center text-lg"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full py-4 bg-[#4DB8AC] text-white rounded-2xl font-semibold hover:bg-[#45A599] transition-colors shadow-lg shadow-[#4DB8AC]/20"
          >
            {isVerifying ? 'Verifying...' : 'Verify OTP'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium disabled:opacity-60"
          >
            {isResending ? 'Resending...' : cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
          </button>

          {info && (
            <div className="text-sm text-[#4DB8AC] bg-[#4DB8AC]/10 rounded-xl p-3 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5" />
              <span>{info}</span>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>
      </div>
    </div>
  );
}
