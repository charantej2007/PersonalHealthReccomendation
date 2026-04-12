import { useEffect, useState } from 'react';
import { continueWithGoogle, getGoogleRedirectUser } from '../services/authService';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export function MobileAuthBridge() {
  const [status, setStatus] = useState<'initial' | 'checking' | 'success' | 'error'>('initial');
  const [error, setError] = useState<string | null>(null);

  const APP_SCHEME = 'com.personalized.health';

  useEffect(() => {
    const handleLogin = async () => {
      try {
        setStatus('checking');
        
        // 1. Check if we already have a redirect result (the "return" from Google)
        const user = await getGoogleRedirectUser();
        
        if (user) {
          console.log('[Bridge] User found, leaping back to app...');
          setStatus('success');
          
          // Encode data to pass back to app
          const params = new URLSearchParams({
            email: user.email,
            displayName: user.displayName,
            source: 'google'
          });

          // THE MAGIC LEAP: Redirect to the native app scheme
          const redirectUrl = `${APP_SCHEME}://auth-success?${params.toString()}`;
          
          // Small delay to show success UI before jumping
          setTimeout(() => {
            window.location.href = redirectUrl;
            
            // Fallback: If the jump fails (app not installed/wrong scheme), 
            // tell the user to go back manually.
            setTimeout(() => {
              setStatus('error');
              setError('Could not open the app automatically. Please go back to the app manually.');
            }, 3000);
          }, 1500);
          
          return;
        }

        // 2. If no user, trigger the Google flow
        setStatus('initial');
        await continueWithGoogle();
        
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

        {status === 'error' && (
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-[#4DB8AC] text-white rounded-2xl font-semibold hover:bg-[#45A599] transition-colors shadow-lg shadow-[#4DB8AC]/20"
          >
            Try Again
          </button>
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
