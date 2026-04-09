import { useEffect, useMemo, useState } from 'react';
import { BottomNavigation } from '../components/BottomNavigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingDown } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { getCurrentUserId, subscribeProfileUpdates } from '../services/sessionService';
import { getUserProfile, getVitalsHistory, type UserProfile, type VitalsEntry } from '../services/backendService';
import { buildRangeSeries, summarizeSeries, type AnalyticsRange } from '../services/healthAnalytics';
import { useNavigate } from 'react-router';

export function TrackingScreen() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<AnalyticsRange>('7days');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [vitals, setVitals] = useState<VitalsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      navigate('/login');
      return;
    }
    const activeUserId = userId;
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        const [p, v] = await Promise.all([getUserProfile(activeUserId), getVitalsHistory(activeUserId, 180)]);
        if (!isMounted) return;
        setProfile(p);
        setVitals(v);
      } catch {
        if (!isMounted) return;
        navigate('/login');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }

    void load();
    const unsubscribe = subscribeProfileUpdates(() => {
      void load();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigate]);

  const series = useMemo(() => {
    if (!profile) return [];
    return buildRangeSeries(vitals, profile, timeRange);
  }, [vitals, profile, timeRange]);

  const summary = useMemo(() => summarizeSeries(series), [series]);

  const bmiData = useMemo(() => series.map((p) => ({ date: p.label, value: p.bmi })), [series]);
  const bpData = useMemo(
    () => series.map((p) => ({ date: p.label, systolic: p.systolic, diastolic: p.diastolic })),
    [series]
  );
  const sugarData = useMemo(() => series.map((p) => ({ date: p.label, value: p.sugar })), [series]);

  const timeRanges = [
    { value: '7days' as const, label: '7 Days' },
    { value: '1month' as const, label: '1 Month' },
    { value: '3months' as const, label: '3 Months' },
  ];

  return (
    <div className="h-full bg-gray-50 relative flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
      <div className="bg-white px-6 pt-12 pb-6 border-b border-gray-100">
        <BackButton className="mb-2" />
        <h1 className="text-2xl font-semibold text-gray-800">Health Tracking</h1>
        <p className="text-gray-500 mt-1">
          {timeRange === '7days'
            ? 'Weekly trends - Last 7 days'
            : timeRange === '1month'
            ? 'Monthly trends - Last 30 days'
            : 'Long-term trends - Last 3 months'}
        </p>
      </div>

      <div className="px-6 py-4">
        <div className="flex gap-2">
          {timeRanges.map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                timeRange === range.value
                  ? 'bg-[#4DB8AC] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-6 space-y-4">
        {loading && <p className="text-sm text-gray-500">Loading historical data...</p>}
        {!loading && !series.length && (
          <div className="bg-yellow-50 text-yellow-700 text-sm rounded-xl p-4">
            No vitals history found for this range. Add daily BP and sugar values first.
          </div>
        )}

        {/* BMI Trend */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-800">BMI Trend</h3>
              <p className="text-xs text-gray-500 mt-1">Body Mass Index</p>
            </div>
            <div className="flex items-center gap-1 text-[#4DB8AC] bg-[#4DB8AC]/10 px-3 py-1.5 rounded-full">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-semibold">
                {summary.bmiChange > 0 ? '↑' : '↓'} {Math.abs(summary.bmiChange).toFixed(1)} this period
              </span>
            </div>
          </div>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={bmiData}>
                <defs>
                  <linearGradient id="bmiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4DB8AC" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4DB8AC" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#999' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e0e0e0' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#999' }}
                  tickLine={false}
                  axisLine={false}
                  domain={[20, 26]}
                />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#4DB8AC"
                  strokeWidth={3}
                  dot={{ fill: '#4DB8AC', r: 4, strokeWidth: 2, stroke: 'white' }}
                  activeDot={{ r: 6 }}
                  fill="url(#bmiGradient)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#4DB8AC] rounded-full"></div>
              <span className="text-gray-600">BMI</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-gray-300"></div>
              <span className="text-gray-500">Normal threshold</span>
            </div>
          </div>
        </div>

        {/* Blood Pressure Trend */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-800">Blood Pressure Trend</h3>
              <p className="text-xs text-gray-500 mt-1">Systolic / Diastolic</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">Latest</p>
              <p className="text-xs text-[#5B9BD5]">bp: {summary.avgSystolic}</p>
              <p className="text-xs text-[#4DB8AC]">dia: {summary.avgDiastolic}</p>
            </div>
          </div>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bpData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#999' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e0e0e0' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#999' }}
                  tickLine={false}
                  axisLine={false}
                  domain={[70, 130]}
                />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                  }}
                />
                <Bar dataKey="systolic" fill="#5B9BD5" radius={[8, 8, 0, 0]} />
                <Bar dataKey="diastolic" fill="#4DB8AC" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#5B9BD5] rounded"></div>
              <span className="text-gray-600">Systolic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#4DB8AC] rounded"></div>
              <span className="text-gray-600">Diastolic</span>
            </div>
          </div>
        </div>

        {/* Sugar Level Trend */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold text-gray-800">Blood Sugar Trend</h3>
              <p className="text-xs text-gray-500 mt-1">Fasting glucose level</p>
            </div>
            <div className="flex items-center gap-1 text-[#4DB8AC] bg-[#4DB8AC]/10 px-3 py-1.5 rounded-full">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-semibold">
                {summary.sugarChange > 0 ? '↑' : '↓'} {Math.abs(summary.sugarChange)} mg/dL
              </span>
            </div>
          </div>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={sugarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#999' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e0e0e0' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#999' }}
                  tickLine={false}
                  axisLine={false}
                  domain={[85, 105]}
                />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#4DB8AC"
                  strokeWidth={3}
                  dot={{ fill: '#4DB8AC', r: 4, strokeWidth: 2, stroke: 'white' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
