import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Heart } from 'lucide-react';
import { getCurrentUserId } from '../services/sessionService';

export function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(getCurrentUserId() ? '/home' : '/login');
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="h-full bg-gradient-to-b from-white to-gray-50 flex flex-col items-center justify-center px-8 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-[#4DB8AC]/5 rounded-full blur-2xl"></div>
      <div className="absolute bottom-40 right-10 w-40 h-40 bg-[#4DB8AC]/5 rounded-full blur-2xl"></div>
      
      <div className="mb-8 relative">
        <div className="w-28 h-28 bg-[#4DB8AC] rounded-3xl flex items-center justify-center shadow-lg shadow-[#4DB8AC]/20">
          <Heart className="w-14 h-14 text-white" fill="white" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#4DB8AC]/30 rounded-full animate-pulse"></div>
      </div>
      
      <h1 className="text-2xl font-semibold text-gray-800 text-center mb-3 leading-tight">
        Personalized Health<br />Recommendation
      </h1>
      
      <p className="text-[#4DB8AC] text-center font-medium">
        Your Smart Health Companion
      </p>
      
      <div className="mt-16 flex gap-2">
        <div className="w-2 h-2 bg-[#4DB8AC] rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-[#4DB8AC] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-[#4DB8AC] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
      
      <p className="absolute bottom-8 text-xs text-gray-400 uppercase tracking-wider">
        Powered by AI · Healthcare
      </p>
    </div>
  );
}