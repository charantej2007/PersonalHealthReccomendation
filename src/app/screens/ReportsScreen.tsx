import { useEffect, useMemo, useState } from 'react';
import { BottomNavigation } from '../components/BottomNavigation';
import { Download, Calendar, TrendingUp, Activity, TrendingDown } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { getCurrentUserId } from '../services/sessionService';
import { getUserProfile, getVitalsHistory, type UserProfile, type VitalsEntry } from '../services/backendService';
import { buildRangeSeries, summarizeSeries, type AnalyticsRange } from '../services/healthAnalytics';
import { useNavigate } from 'react-router';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function ReportsScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [vitals, setVitals] = useState<VitalsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      navigate('/login');
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const [p, v] = await Promise.all([getUserProfile(userId), getVitalsHistory(userId, 180)]);
        setProfile(p);
        setVitals(v);
      } catch {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [navigate]);

  const range: AnalyticsRange = activeTab === 'weekly' ? '7days' : '1month';

  const series = useMemo(() => {
    if (!profile) return [];
    return buildRangeSeries(vitals, profile, range);
  }, [vitals, profile, range]);

  const currentStats = useMemo(() => summarizeSeries(series), [series]);

  const metricLabel = useMemo(
    () => (activeTab === 'weekly' ? 'Weekly Summary' : 'Monthly Summary'),
    [activeTab]
  );

  const downloadReportPdf = () => {
    const doc = new jsPDF();
    const title = `${metricLabel} - Health Report`;
    const generatedAt = new Date().toLocaleString();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(title, 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Patient: ${profile?.name ?? 'N/A'}`, 14, 28);
    doc.text(`Generated: ${generatedAt}`, 14, 34);
    doc.text(`Range: ${activeTab === 'weekly' ? 'Last 7 days' : 'Last 30 days'}`, 14, 40);

    autoTable(doc, {
      startY: 48,
      head: [['Metric', 'Value', 'Trend']],
      body: [
        ['Average BMI', String(currentStats.avgBMI), `${currentStats.bmiChange > 0 ? 'Up' : 'Down'} ${Math.abs(currentStats.bmiChange).toFixed(1)}`],
        ['Average BP', `${currentStats.avgSystolic}/${currentStats.avgDiastolic}`, `${currentStats.bpChange > 0 ? 'Up' : 'Down'} ${Math.abs(currentStats.bpChange)}`],
        ['Average Sugar', String(currentStats.avgSugar), `${currentStats.sugarChange > 0 ? 'Up' : 'Down'} ${Math.abs(currentStats.sugarChange)}`],
        ['Active Days', String(currentStats.activeDays), '-'],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [77, 184, 172] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Day', 'BMI', 'Systolic', 'Diastolic', 'Sugar']],
      body: series.map((point) => [
        point.label,
        point.bmi.toFixed(1),
        String(point.systolic),
        String(point.diastolic),
        String(point.sugar),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [91, 155, 213] },
    });

    const fileName = `${activeTab}-health-summary.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="h-full bg-gray-50 relative flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
      <div className="bg-white px-6 pt-12 pb-6 border-b border-gray-100">
        <BackButton className="mb-2" />
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-6 h-6 text-[#4DB8AC]" />
          <h1 className="text-2xl font-semibold text-gray-800">Health Reports</h1>
        </div>
        <p className="text-gray-500">Your progress summary</p>
        <p className="text-xs text-gray-400 mt-1">{metricLabel}</p>
      </div>

      <div className="px-6 py-6 space-y-4">
        {loading && <p className="text-sm text-gray-500">Loading report data...</p>}
        {!loading && !series.length && (
          <div className="bg-yellow-50 text-yellow-700 text-sm rounded-xl p-4">
            No vitals found for this period. Add daily health data to generate reports.
          </div>
        )}

        {/* Tab Switcher */}
        <div className="bg-white rounded-2xl p-1.5 shadow-sm flex">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'weekly'
                ? 'bg-[#4DB8AC] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Weekly Summary
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'monthly'
                ? 'bg-[#4DB8AC] text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Monthly Summary
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-[#4DB8AC]/10 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#4DB8AC]" />
              </div>
              <div className="flex items-center gap-1 text-[#4DB8AC] text-xs font-semibold">
                <TrendingDown className="w-4 h-4" />
                {currentStats.bmiChange > 0 ? '+' : ''}
                {currentStats.bmiChange.toFixed(1)}
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">Avg BMI</p>
            <p className="text-2xl font-semibold text-gray-800">{currentStats.avgBMI.toFixed(1)}</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-[#5B9BD5]/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#5B9BD5]" />
              </div>
              <div className="flex items-center gap-1 text-[#4DB8AC] text-xs font-semibold">
                <TrendingDown className="w-4 h-4" />
                {currentStats.bpChange > 0 ? '+' : ''}
                {currentStats.bpChange}
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">Avg BP</p>
            <p className="text-2xl font-semibold text-gray-800">{currentStats.avgSystolic}/{currentStats.avgDiastolic}</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-[#F59E75]/10 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#F59E75]" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold ${
                currentStats.sugarChange > 0 ? 'text-red-500' : 'text-[#4DB8AC]'
              }`}>
                {currentStats.sugarChange > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {currentStats.sugarChange > 0 ? '+' : ''}
                {currentStats.sugarChange}
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">Avg Sugar</p>
            <p className="text-2xl font-semibold text-gray-800">{currentStats.avgSugar}</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-[#9B72CB]/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#9B72CB]" />
              </div>
              <div className="flex items-center gap-1 text-[#4DB8AC] text-xs font-semibold">
                <TrendingUp className="w-4 h-4" />
                +2
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-1">Active Days</p>
            <p className="text-2xl font-semibold text-gray-800">{currentStats.activeDays}</p>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Health Metrics</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#4DB8AC]/10 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-[#4DB8AC]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Average BMI</p>
                  <p className="text-xs text-gray-500">Body Mass Index</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-800">{currentStats.avgBMI.toFixed(1)}</p>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  Normal
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#5B9BD5]/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#5B9BD5]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Average BP</p>
                  <p className="text-xs text-gray-500">Blood Pressure</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-800">{currentStats.avgSystolic}/{currentStats.avgDiastolic}</p>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  Normal
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#F59E75]/10 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-[#F59E75]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Average Sugar</p>
                  <p className="text-xs text-gray-500">Fasting Glucose</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-800">{currentStats.avgSugar}</p>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  Normal
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={downloadReportPdf}
          className="w-full py-4 bg-[#4DB8AC] text-white rounded-2xl font-semibold hover:bg-[#45A599] transition-colors shadow-lg shadow-[#4DB8AC]/20 flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download {activeTab === 'weekly' ? 'Weekly' : 'Monthly'} Report
        </button>

        {/* Health Insights */}
        <div className="bg-gradient-to-br from-[#4DB8AC] to-[#45A599] rounded-3xl p-6 shadow-sm">
          <h3 className="text-white font-semibold mb-3">📊 Health Insights</h3>
          <ul className="space-y-2 text-white/90 text-sm">
            <li>• BMI trend: {currentStats.bmiChange > 0 ? 'increased' : 'improved'} by {Math.abs(currentStats.bmiChange).toFixed(1)}</li>
            <li>• Average BP over period: {currentStats.avgSystolic}/{currentStats.avgDiastolic}</li>
            <li>• Average sugar: {currentStats.avgSugar} mg/dL</li>
            <li>• Active tracking days: {currentStats.activeDays}</li>
          </ul>
        </div>
      </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
