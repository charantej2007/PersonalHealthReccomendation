import { useEffect, useState } from 'react';
import { continueWithGoogle, getGoogleRedirectUser, signOutGoogleSession } from '../services/authService';
import { AlertCircle, CheckCircle2, Loader2, LogOut, ArrowLeft } from 'lucide-react';

export function MobileAuthBridge() {
  const [status, setStatus] = useState<'initial' | 'checking' | 'success' | 'error'>('initial');
  const [error, setError] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const APP_SCHEME = 'personalhealth';

  const handleLogout = async () => {
    try {
      await signOutGoogleSession();
      window.location.href = window.location.pathname + '?flow=start';
    } catch (err) {
      window.location.reload();
    }
  };

  useEffect(() => {
    const handleLogin = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const flow = urlParams.get('flow');
        
        setStatus('checking');
        
        const user = await getGoogleRedirectUser();
        
        if (user) {
          console.log('[Bridge] User found, leaping back to app...');
          setStatus('success');
          
          const params = new URLSearchParams({
            email: user.email,
            displayName: user.displayName,
            source: 'google'
          });

          const finalUrl = `${APP_SCHEME}://auth-success?${params.toString()}`;
          setRedirectUrl(finalUrl);
          
          setTimeout(() => {
            window.location.href = finalUrl;
            
            setTimeout(() => {
              setStatus('error');
              setError('Could not open the app automatically. Please use the button below or go back to the app manually.');
            }, 5000);
          }, 1500);
          
          return;
        }

        if (flow === 'start') {
          setStatus('initial');
          await continueWithGoogle();
          return;
        }

        setTimeout(() => {
          setStatus('error');
          setError('Sign-in session timed out. Please try again from the app.');
        }, 10000);
        
      } catch (err) {
        console.error('[Bridge] Error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };

    void handleLogin();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-xl border border-gray-100 flex flex-col items-center">
        <div className="w-20 h-20 bg-[#4DB8AC]/10 rounded-full flex items-center justify-center mb-8">
          {status === 'success' ? (
            <CheckCircle2 className="w-10 h-10 text-[#4DB8AC]" />
          ) : status === 'error' ? (
            <AlertCircle className="w-10 h-10 text-red-500" />
          ) : (
            <Loader2 className="w-10 h-10 text-[#4DB8AC] animate-spin" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {status === 'success' ? 'Authenticated!' : 
           status === 'error' ? 'Something went wrong' : 
           'Logging you in...'}
        </h1>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          {status === 'success' ? 'Redirecting you back to the app...' : 
           status === 'error' ? error : 
           'Please complete the Google Sign-in in the specialized window.'}
        </p>

        {status === 'success' && redirectUrl && (
          <a
            href={redirectUrl}
            className="w-full py-4 bg-[#4DB8AC] text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-[#45A599] transition-colors shadow-lg shadow-[#4DB8AC]/20 mb-4"
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
          <div className="text-sm text-[#4DB8AC] font-medium animate-pulse">
            App should open shortly...
          </div>
        )}
      </div>
      
      <p className="mt-8 text-xs text-gray-400">
        Personalized Health Recommendation • Secure Environment
      </p>
    </div>
  );
}
