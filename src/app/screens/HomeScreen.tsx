import { useNavigate } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { BottomNavigation } from '../components/BottomNavigation';
import { Apple, Dumbbell, Sparkles, Activity, TrendingUp, Bell } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import {
  getNotifications,
  getRecentVitals,
  getUserProfile,
  type UserProfile,
} from '../services/backendService';
import { getCurrentUserId } from '../services/sessionService';

export function HomeScreen() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [latestVitals, setLatestVitals] = useState<{ systolic: number; diastolic: number; sugarLevel: number } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      navigate('/login');
      return;
    }

    async function loadHomeData() {
      try {
        const [profile, vitals, notifications] = await Promise.all([
          getUserProfile(userId),
          getRecentVitals(userId),
          getNotifications(userId),
        ]);
        setUser(profile);
        if (vitals) {
          setLatestVitals({
            systolic: vitals.systolic,
            diastolic: vitals.diastolic,
            sugarLevel: vitals.sugarLevel,
          });
        }
        setUnreadCount(notifications.filter((n) => !n.read).length);
      } catch {
        navigate('/login');
      }
    }

    loadHomeData();
  }, [navigate]);

  const bmi = useMemo(() => {
    if (!user?.heightCm || !user?.weightKg) return '--';
    const heightM = user.heightCm / 100;
    return (user.weightKg / (heightM * heightM)).toFixed(1);
  }, [user]);

  const healthData = {
    bmi,
    bp: latestVitals ? `${latestVitals.systolic}/${latestVitals.diastolic}` : '--/--',
    sugar: latestVitals ? String(latestVitals.sugarLevel) : '--',
  };

  const quickActions = [
    { icon: Apple, label: 'Diet Plan', path: '/recommendations?section=diet', color: '#4DB8AC' },
    { icon: Dumbbell, label: 'Exercise', path: '/recommendations?section=exercise', color: '#5B9BD5' },
    { icon: Sparkles, label: 'Yoga', path: '/recommendations?section=yoga', color: '#9B72CB' },
    { icon: Bell, label: 'Reminders', path: '/reminders', color: '#F59E75' },
  ];

  return (
    <div className="h-full bg-gray-50 relative flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
      <div className="bg-[#4DB8AC] px-6 pt-14 pb-8 rounded-b-[30px]">
        <BackButton className="mb-2 hover:bg-white/20" iconClassName="text-white" />
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-white/80 text-sm mb-1">Good Morning</p>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
              {user?.name ?? 'Guest'} <span className="text-xl">👋</span>
            </h1>
          </div>
          <button
            onClick={() => navigate('/reminders')}
            className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors relative"
          >
            <Bell className="w-5 h-5 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-semibold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-6 -mt-4 pb-6 space-y-4">
        {/* Health Summary Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-800">Health Summary</h2>
            <span className="text-xs text-[#4DB8AC] bg-[#4DB8AC]/10 px-3 py-1.5 rounded-full font-medium">
              Today
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#4DB8AC]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 text-[#4DB8AC]" />
              </div>
              <p className="text-2xl font-semibold text-gray-800 mb-1">{healthData.bmi}</p>
              <p className="text-xs text-gray-500">BMI</p>
              <span className="inline-block mt-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Normal
              </span>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[#5B9BD5]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-[#5B9BD5]" />
              </div>
              <p className="text-2xl font-semibold text-gray-800 mb-1">{healthData.bp}</p>
              <p className="text-xs text-gray-500">BP</p>
              <span className="inline-block mt-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Normal
              </span>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[#F59E75]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-[#F59E75]" />
              </div>
              <p className="text-2xl font-semibold text-gray-800 mb-1">{healthData.sugar}<span className="text-sm text-gray-500"> mg</span></p>
              <p className="text-xs text-gray-500">Sugar</p>
              <span className="inline-block mt-2 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Normal
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ icon: Icon, label, path, color }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all text-left"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Update Health Data */}
        <button
          onClick={() => navigate('/enter-data')}
          className="w-full bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition-all border-2 border-dashed border-[#4DB8AC]/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#4DB8AC]/10 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#4DB8AC]" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Update Health Data</p>
                <p className="text-xs text-gray-500">Last updated: Today</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Health Tips */}
        <div className="bg-gradient-to-br from-[#4DB8AC] to-[#45A599] rounded-3xl p-6 shadow-sm">
          <h3 className="text-white font-semibold mb-2">💡 Health Tips</h3>
          <p className="text-white/90 text-sm leading-relaxed">
            Drink at least 8 glasses of water daily to stay hydrated and maintain optimal health.
          </p>
        </div>
      </div>
      </div>

      <BottomNavigation />
    </div>
  );
}