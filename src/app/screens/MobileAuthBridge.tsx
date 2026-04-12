import { useEffect, useState, useCallback } from 'react';
import { continueWithGoogle, getGoogleRedirectUser, signOutGoogleSession } from '../services/authService';
import { AlertCircle, CheckCircle2, Loader2, LogOut, ArrowLeft, LogIn } from 'lucide-react';

export function MobileAuthBridge() {
  const [status, setStatus] = useState<'initial' | 'checking' | 'success' | 'error'>('initial');
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const APP_SCHEME = 'personalhealth';

  const handleLogout = async () => {
    try {
      await signOutGoogleSession();
      window.location.reload();
    } catch (err) {
      window.location.reload();
    }
  };

  const handleInitiateLogin = async () => {
    try {
      setError(null);
      setStatus('checking');
      console.log('[Bridge] Initiating login flow...');
      await continueWithGoogle();
    } catch (err) {
      console.error('[Bridge] Initiation Error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to start Google Sign-in');
    }
  };

  const checkRedirectResult = useCallback(async () => {
    try {
      setStatus('checking');
      const user = await getGoogleRedirectUser();
      
      if (user) {
        console.log('[Bridge] Success! User captured:', user.email);
        setStatus('success');
        
        const params = new URLSearchParams({
          email: user.email,
          displayName: user.displayName,
          source: 'google'
        });

        const finalUrl = `${APP_SCHEME}://auth-success?${params.toString()}`;
        setRedirectUrl(finalUrl);
        
        // Auto-redirect to app with delay
        setTimeout(() => {
          window.location.href = finalUrl;
          
          // Show manual button if auto-redirect fails
          setTimeout(() => {
            if (window.location.href !== finalUrl) {
              console.warn('[Bridge] Auto-jump might have failed.');
            }
          }, 5000);
        }, 1500);
      } else {
        // No user found, showing manual start UI
        console.log('[Bridge] No session found. Standing by for user action.');
        setStatus('initial');
      }
    } catch (err) {
      console.error('[Bridge] Redirect Check Error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Authentication failed during result capture');
    }
  }, []);

  useEffect(() => {
    // We ONLY check if we came back from a redirect. 
    // We NEVER auto-trigger the login here to avoid loops.
    void checkRedirectResult();
  }, [checkRedirectResult]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-xl border border-gray-100 flex flex-col items-center">
        <div className="w-20 h-20 bg-[#4DB8AC]/10 rounded-full flex items-center justify-center mb-8">
          {status === 'success' ? (
            <CheckCircle2 className="w-10 h-10 text-[#4DB8AC]" />
          ) : status === 'error' ? (
            <AlertCircle className="w-10 h-10 text-red-500" />
          ) : status === 'checking' ? (
            <Loader2 className="w-10 h-10 text-[#4DB8AC] animate-spin" />
          ) : (
            <LogIn className="w-10 h-10 text-[#4DB8AC]" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4 px-4">
          {status === 'success' ? 'Authenticated!' : 
           status === 'error' ? 'Something went wrong' : 
           status === 'checking' ? 'Please Wait' :
           'Connect with Google'}
        </h1>
        
        <p className="text-gray-600 mb-8 leading-relaxed text-sm">
          {status === 'success' ? 'Logging you in... Redirecting back to the app.' : 
           status === 'error' ? error : 
           status === 'checking' ? 'Processing your information...' :
           "Tap the button below to connect your Health Account securely."}
        </p>

        {status === 'initial' && (
          <button 
            onClick={handleInitiateLogin}
            className="w-full py-4 bg-[#4DB8AC] text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-[#45A599] transition-all shadow-lg shadow-[#4DB8AC]/20 active:scale-95"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
        )}

        {status === 'success' && redirectUrl && (
          <a
            href={redirectUrl}
            className="w-full py-4 bg-[#4DB8AC] text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-[#45A599] transition-all shadow-lg shadow-[#4DB8AC]/20 active:scale-95 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Return to App Now
          </a>
        )}

        {status === 'error' && (
          <div className="space-y-3 w-full">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-[#4DB8AC] text-white rounded-2xl font-semibold hover:bg-[#45A599] transition-colors"
            >
              Try Again
            </button>
            <button 
              onClick={handleLogout}
              className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign out and change account
            </button>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-sm text-[#4DB8AC] font-medium animate-pulse mt-2">
            Opening your app...
          </div>
        )}
      </div>
      
      <p className="mt-8 text-xs text-gray-400">
        Personalized Health Recommendation • Secure Environment
      </p>
    </div>
  );
}
