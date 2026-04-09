import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Dumbbell, Apple, Bell as BellIcon, CircleAlert, Sparkles } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import {
  getNotifications,
  markNotificationRead,
  type AppNotification,
} from '../services/backendService';
import { getCurrentUserId } from '../services/sessionService';

export function ReminderScreen() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      navigate('/login');
      return;
    }
    const activeUserId = userId;
    let isMounted = true;

    async function loadNotifications() {
      try {
        if (isMounted) setLoading(true);
        const data = await getNotifications(activeUserId);
        if (!isMounted) return;
        setNotifications(data);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Could not load notifications.');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }

    void loadNotifications();
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [navigate]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const handleMarkRead = async (notificationId: string) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch {
      // Keep UI stable even if this fails.
    }
  };

  const iconByKind = {
    exercise: Dumbbell,
    food: Apple,
    yoga: Sparkles,
    default: BellIcon,
  } as const;

  return (
    <div className="h-full bg-gray-50 overflow-y-auto pb-6">
      <div className="bg-white px-6 pt-12 pb-6">
        <BackButton className="mb-4" />
        <h1 className="text-2xl font-semibold text-gray-800">Notifications</h1>
        <p className="text-gray-500 mt-1">{unreadCount} unread alerts</p>
      </div>

      <div className="px-6 py-6 space-y-4">
        {loading && <p className="text-sm text-gray-500">Loading notifications...</p>}
        {!loading && error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-xl p-4">{error}</div>
        )}

        {/* Notifications Summary */}
        <div className="bg-gradient-to-br from-[#4DB8AC] to-[#45A599] rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <BellIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">{notifications.length} Notifications</p>
              <p className="text-white/80 text-sm">Diet, exercise and yoga reminders from your plan</p>
            </div>
          </div>
        </div>

        {!loading && notifications.length === 0 && (
          <div className="bg-yellow-50 text-yellow-700 text-sm rounded-xl p-4">
            No notifications yet. Update your BP and sugar to generate daily diet/exercise/yoga reminders.
          </div>
        )}

        {notifications.map((notification) => {
          const kind = notification.metadata?.kind;
          const Icon =
            kind === 'exercise'
              ? iconByKind.exercise
              : kind === 'food'
              ? iconByKind.food
              : kind === 'yoga'
              ? iconByKind.yoga
              : iconByKind.default;
          const tint =
            kind === 'exercise'
              ? '#5B9BD5'
              : kind === 'food'
              ? '#4DB8AC'
              : kind === 'yoga'
              ? '#9B72CB'
              : '#F59E75';

          return (
            <div key={notification.id} className="bg-white rounded-3xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${tint}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: tint }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{notification.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    {notification.dueAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Due: {new Date(notification.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
                {notification.read ? (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-600 font-semibold">
                    Read
                  </span>
                ) : (
                  <button
                    onClick={() => handleMarkRead(notification.id)}
                    className="text-xs px-2 py-1 rounded-full bg-[#4DB8AC]/10 text-[#4DB8AC] font-semibold"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <button
          onClick={() => navigate('/home')}
          className="w-full py-4 bg-[#4DB8AC] text-white rounded-2xl font-semibold hover:bg-[#45A599] transition-colors shadow-lg shadow-[#4DB8AC]/20 flex items-center justify-center gap-2"
        >
          <CircleAlert className="w-5 h-5" />
          Back to Home
        </button>
      </div>
    </div>
  );
}
