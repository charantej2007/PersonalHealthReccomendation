import { useNavigate, useSearchParams } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, CSSProperties } from 'react';
import { BottomNavigation } from '../components/BottomNavigation';
import { Apple, Dumbbell, Sparkles, Bell } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import {
  getLatestRecommendation,
  getRecentVitals,
  getUserProfile,
  type LatestRecommendationResponse,
  type UserProfile,
} from '../services/backendService';
import { getCurrentUserId, subscribeProfileUpdates } from '../services/sessionService';

type SectionKey = 'diet' | 'exercise' | 'yoga' | 'reminders';

type DetailItem = {
  title: string;
  subtitle: string;
  detail: string;
  badge?: string;
};

type ClusterSeverity = 'stable' | 'moderate' | 'high' | 'critical';

type PatientCluster = {
  key: string;
  title: string;
  summary: string;
  severity: ClusterSeverity;
  conditions: string[];
  focus: string[];
};

function severityPillClass(severity: ClusterSeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-700';
    case 'high':
      return 'bg-orange-100 text-orange-700';
    case 'moderate':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-green-100 text-green-700';
  }
}

function buildPatientClusters(
  flags: string[],
  latestVitals: { systolic: number; diastolic: number; sugarLevel: number } | null,
  bmi: number | null,
  bmiClass: string
): PatientCluster[] {
  const clusters: PatientCluster[] = [];

  const systolic = latestVitals?.systolic ?? null;
  const diastolic = latestVitals?.diastolic ?? null;
  const sugar = latestVitals?.sugarLevel ?? null;

  const criticalBp = flags.includes('critical_bp') || (systolic !== null && diastolic !== null && (systolic >= 160 || diastolic >= 100));
  const highBp = flags.includes('high_bp') || (systolic !== null && diastolic !== null && (systolic >= 140 || diastolic >= 90));
  const criticalSugar = flags.includes('critical_sugar') || (sugar !== null && sugar >= 250);
  const highSugar = flags.includes('high_sugar') || (sugar !== null && sugar >= 140);

  if (criticalBp || criticalSugar) {
    clusters.push({
      key: 'critical-triage',
      title: 'Critical Triage Cluster',
      summary: 'Immediate stabilization and clinician follow-up recommended.',
      severity: 'critical',
      conditions: [
        criticalBp ? 'Critical blood pressure pattern' : '',
        criticalSugar ? 'Critical glucose pattern' : '',
      ].filter(Boolean),
      focus: ['Urgent monitoring', 'Medication adherence', 'Clinician escalation'],
    });
  }

  if (highBp) {
    clusters.push({
      key: 'cardio-risk',
      title: 'Cardio Risk Cluster',
      summary: 'Plan emphasizes blood-pressure-safe routines.',
      severity: criticalBp ? 'high' : 'moderate',
      conditions: ['Elevated blood pressure trend'],
      focus: ['Low sodium diet', 'Moderate cardio', 'Stress reduction'],
    });
  }

  if (highSugar) {
    clusters.push({
      key: 'glycemic-control',
      title: 'Glycemic Control Cluster',
      summary: 'Plan prioritizes glucose stability and post-meal activity.',
      severity: criticalSugar ? 'high' : 'moderate',
      conditions: ['Elevated glucose trend'],
      focus: ['Low GI meals', 'Post-meal walks', 'Frequent sugar logging'],
    });
  }

  if (bmiClass === 'overweight' || bmiClass === 'obese' || (bmi !== null && bmi >= 25)) {
    clusters.push({
      key: 'weight-management',
      title: 'Weight Management Cluster',
      summary: 'Structured calorie quality and sustainable activity plan.',
      severity: bmiClass === 'obese' ? 'high' : 'moderate',
      conditions: ['High BMI profile'],
      focus: ['Portion control', 'Strength + cardio mix', 'Weekly trend review'],
    });
  }

  if (bmiClass === 'underweight' || (bmi !== null && bmi < 18.5)) {
    clusters.push({
      key: 'weight-recovery',
      title: 'Weight Recovery Cluster',
      summary: 'Nutrition-dense meals and muscle-preserving movement.',
      severity: 'moderate',
      conditions: ['Low BMI profile'],
      focus: ['Protein-rich meals', 'Resistance basics', 'Recovery sleep'],
    });
  }

  if (clusters.length === 0) {
    clusters.push({
      key: 'wellness-maintenance',
      title: 'Wellness Maintenance Cluster',
      summary: 'Continue preventive care with balanced routine.',
      severity: 'stable',
      conditions: ['Vitals within expected range'],
      focus: ['Consistency', 'Preventive tracking', 'Progress optimization'],
    });
  }

  return clusters;
}

function getValidSection(section: string | null): SectionKey {
  if (section === 'diet' || section === 'exercise' || section === 'yoga' || section === 'reminders') {
    return section;
  }
  return 'diet';
}

function getBmiClass(bmi: number | null): string {
  if (bmi === null) return 'pending';
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

export function RecommendationsScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeSection = getValidSection(searchParams.get('section'));
  const [recommendation, setRecommendation] = useState<LatestRecommendationResponse['recommendation'] | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [latestVitals, setLatestVitals] = useState<{ systolic: number; diastolic: number; sugarLevel: number } | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      navigate('/login');
      return;
    }
    const activeUserId = userId;
    let isMounted = true;

    async function loadRecommendation() {
      try {
        setIsLoading(true);
        const [profileResult, vitalsResult, recommendationResult] = await Promise.allSettled([
          getUserProfile(activeUserId),
          getRecentVitals(activeUserId),
          getLatestRecommendation(activeUserId),
        ]);

        if (!isMounted) return;

        if (profileResult.status === 'fulfilled') {
          setProfile(profileResult.value);
        }

        if (vitalsResult.status === 'fulfilled' && vitalsResult.value) {
          setLatestVitals({
            systolic: vitalsResult.value.systolic,
            diastolic: vitalsResult.value.diastolic,
            sugarLevel: vitalsResult.value.sugarLevel,
          });
        } else {
          setLatestVitals(null);
        }

        if (recommendationResult.status === 'fulfilled') {
          setRecommendation(recommendationResult.value.recommendation);
          setError('');
        } else {
          setRecommendation(null);
          const message =
            recommendationResult.reason instanceof Error
              ? recommendationResult.reason.message
              : 'Could not load recommendations.';
          setError(message);
        }
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    }

    void loadRecommendation();
    const unsubscribe = subscribeProfileUpdates(() => {
      void loadRecommendation();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigate]);

  const liveBmi = useMemo(() => {
    if (!profile?.heightCm || !profile?.weightKg) return null;
    const heightM = profile.heightCm / 100;
    return Number((profile.weightKg / (heightM * heightM)).toFixed(1));
  }, [profile]);

  const liveBmiClass = useMemo(() => getBmiClass(liveBmi), [liveBmi]);

  const resolvedFlags = useMemo(() => {
    const flags = new Set(recommendation?.vitalFlags ?? []);
    if (!latestVitals) return Array.from(flags);

    if (latestVitals.systolic >= 160 || latestVitals.diastolic >= 100) flags.add('critical_bp');
    else if (latestVitals.systolic >= 140 || latestVitals.diastolic >= 90) flags.add('high_bp');

    if (latestVitals.sugarLevel >= 250) flags.add('critical_sugar');
    else if (latestVitals.sugarLevel >= 140) flags.add('high_sugar');

    return Array.from(flags);
  }, [recommendation, latestVitals]);

  const sectionCards = useMemo(() => {
    const bmi = liveBmi ?? recommendation?.bmi ?? null;
    const bmiClass = liveBmiClass !== 'pending' ? liveBmiClass : recommendation?.bmiClass ?? 'pending';
    const flags = resolvedFlags;
    const clusters = buildPatientClusters(flags, latestVitals, bmi, bmiClass);
    const primaryCluster = clusters[0];

    const diet: DetailItem[] = [
      {
        title: 'Early Breakfast (7:00 AM)',
        subtitle: 'Cluster-based opening meal',
        detail: recommendation?.food?.[0] ?? 'Oats with protein + fruit for stable morning energy.',
        badge: 'Core',
      },
      {
        title: 'Mid-Morning Booster (10:30 AM)',
        subtitle: 'Prevent energy dip',
        detail:
          primaryCluster.key === 'weight-recovery'
            ? 'Greek yogurt + banana + nuts for healthy calorie support.'
            : 'Sprouts or nuts + buttermilk to prevent late-morning cravings.',
      },
      {
        title: 'Lunch (1:00 PM)',
        subtitle: 'Cluster-calibrated plate',
        detail:
          flags.includes('high_sugar') || flags.includes('critical_sugar')
            ? 'Low GI meal: legumes, salad, grilled protein, avoid sweet beverages.'
            : recommendation?.food?.[1] ?? 'High-fiber plate with lean protein and whole grains.',
        badge: flags.includes('high_sugar') || flags.includes('critical_sugar') ? 'Sugar Focus' : undefined,
      },
      {
        title: 'Hydration + Electrolytes (2:30 PM)',
        subtitle: 'Circulation support',
        detail:
          primaryCluster.key === 'cardio-risk' || primaryCluster.key === 'critical-triage'
            ? 'Keep sodium low; prefer coconut water or lemon water without sugar.'
            : 'Track fluid intake and complete half-day hydration goal by afternoon.',
      },
      {
        title: 'Evening Snack (4:30 PM)',
        subtitle: 'Avoid spikes',
        detail:
          flags.includes('high_sugar')
            ? 'Choose nuts + cucumber slices; avoid biscuits/sugary snacks.'
            : recommendation?.food?.[2] ?? 'Fruit + nuts combo to sustain energy.',
      },
      {
        title: 'Dinner (7:30 PM)',
        subtitle: 'Light and early',
        detail:
          bmiClass === 'overweight' || bmiClass === 'obese'
            ? 'Keep dinner light: soup + vegetables + protein, low salt.'
            : recommendation?.food?.[3] ?? 'Moderate dinner with vegetables and quality protein.',
      },
      {
        title: 'Late-Night Rule (9:30 PM)',
        subtitle: 'Metabolic protection',
        detail:
          primaryCluster.key === 'glycemic-control' || primaryCluster.key === 'critical-triage'
            ? 'No sweet snacks post dinner. If hungry, choose warm milk or seeds.'
            : 'Avoid heavy meals after dinner; keep a 2-hour gap before sleep.',
      },
      {
        title: 'Weekly Diet Audit',
        subtitle: 'Cluster progression check',
        detail: `Review meal adherence based on ${primaryCluster.title} goals and update next-week macros.`,
        badge: 'Weekly',
      },
    ];

    const exercise: DetailItem[] = [
      {
        title: 'Cardio Foundation',
        subtitle: 'Daily movement',
        detail:
          primaryCluster.key === 'cardio-risk' || primaryCluster.key === 'critical-triage'
            ? '25-30 min brisk walk at moderate pace; avoid intense bursts.'
            : '30-40 min brisk walk/cycling based on comfort.',
        badge: 'Daily',
      },
      {
        title: 'Strength Training',
        subtitle: 'Muscle support',
        detail:
          bmiClass === 'underweight'
            ? 'Light resistance 3-4 days/week to build lean mass.'
            : 'Body-weight or resistance bands 3 days/week.',
      },
      {
        title: 'Mobility Block',
        subtitle: 'Joint safety',
        detail: '8-10 min hip, hamstring, thoracic and ankle mobility before workouts.',
      },
      {
        title: 'Post-meal Walk',
        subtitle: 'Sugar support',
        detail:
          flags.includes('high_sugar') || flags.includes('critical_sugar')
            ? 'Take 10-15 min walk after major meals.'
            : recommendation?.exercises?.[0] ?? 'Short 10 min walk after lunch/dinner.',
      },
      {
        title: 'Breathing Recovery Between Sets',
        subtitle: 'BP friendly conditioning',
        detail:
          primaryCluster.key === 'cardio-risk' || primaryCluster.key === 'critical-triage'
            ? 'Use 1:2 inhale/exhale pattern between rounds to avoid pressure spikes.'
            : 'Use controlled nasal breathing to improve endurance.',
      },
      {
        title: 'Step Count Target',
        subtitle: 'Consistency metric',
        detail:
          primaryCluster.key === 'critical-triage'
            ? 'Start with 5000-6500 daily steps and increase gradually.'
            : 'Maintain 7000-10000 daily steps depending on recovery.',
        badge: 'Tracker',
      },
      {
        title: 'Recovery Day',
        subtitle: 'Injury prevention',
        detail: '1 rest day/week with light stretching and breathing work.',
      },
      {
        title: 'Weekly Load Review',
        subtitle: 'Cluster-guided progression',
        detail: `Progress exercise load only if vitals stay stable for the ${primaryCluster.title} profile.`,
        badge: 'Weekly',
      },
    ];

    const yoga: DetailItem[] = [
      {
        title: 'Morning Yoga',
        subtitle: '10-15 min',
        detail: recommendation?.yoga?.[0] ?? 'Surya Namaskar with gentle warm-up.',
        badge: 'Morning',
      },
      {
        title: 'Joint Opening Flow',
        subtitle: '8-12 min',
        detail: 'Cat-cow, shoulder rolls, and gentle spinal mobility before intensive activity.',
      },
      {
        title: 'Stress Relief',
        subtitle: 'BP friendly',
        detail:
          flags.includes('high_bp') || flags.includes('critical_bp')
            ? 'Bhramari + Shavasana for calming blood pressure response.'
            : recommendation?.yoga?.[1] ?? 'Anulom Vilom and deep diaphragmatic breathing.',
      },
      {
        title: 'Metabolic Support',
        subtitle: 'Sugar regulation',
        detail:
          flags.includes('high_sugar') || flags.includes('critical_sugar')
            ? 'Add Mandukasana and seated spinal twist daily.'
            : recommendation?.yoga?.[2] ?? 'Twists and core activation for digestion support.',
      },
      {
        title: 'Balance Practice',
        subtitle: 'Neuromuscular control',
        detail: 'Tree pose and warrior variations for 5-8 min to improve stability and posture.',
      },
      {
        title: 'Back-Care Sequence',
        subtitle: 'Sedentary relief',
        detail: 'Include bridge pose and child pose to reduce stiffness from desk work.',
      },
      {
        title: 'Night Relaxation',
        subtitle: 'Sleep quality',
        detail: '5-8 min guided relaxation before bed.',
      },
      {
        title: 'Cluster Recovery Protocol',
        subtitle: 'Severity-adjusted yoga intensity',
        detail:
          primaryCluster.key === 'critical-triage'
            ? 'Use restorative poses only until vitals improve.'
            : `Use moderate flow progression aligned with ${primaryCluster.title}.`,
        badge: 'Safety',
      },
    ];

    const reminders: DetailItem[] = [
      {
        title: 'BP Check Reminder',
        subtitle: 'Morning + evening',
        detail:
          flags.includes('high_bp') || flags.includes('critical_bp')
            ? 'Measure BP twice daily and log immediately.'
            : 'Measure BP once daily at a fixed time.',
        badge: 'Important',
      },
      {
        title: 'Medication Reminder',
        subtitle: 'Adherence window',
        detail:
          primaryCluster.key === 'critical-triage'
            ? 'Use strict medicine alarms with confirmation check-ins.'
            : 'Set recurring medication reminders and mark completion.',
      },
      {
        title: 'Sugar Tracking',
        subtitle: 'Fasting preferred',
        detail:
          flags.includes('high_sugar') || flags.includes('critical_sugar')
            ? 'Track fasting sugar daily for the next 7 days.'
            : 'Track fasting sugar 3-4 times per week.',
      },
      {
        title: 'Hydration',
        subtitle: 'Every 2 hours',
        detail: 'Set water reminders to complete 8-10 glasses daily.',
      },
      {
        title: 'Meal Log Reminder',
        subtitle: 'Diet compliance',
        detail: 'Capture meal photos or short notes after each major meal for weekly review.',
      },
      {
        title: 'Activity Log Reminder',
        subtitle: 'Exercise compliance',
        detail: 'Log workout duration, intensity and perceived exertion after every session.',
      },
      {
        title: 'Sleep Reminder',
        subtitle: 'Recovery signal',
        detail: 'Enable bedtime reminder to maintain 7-8 hour regular sleep schedule.',
      },
      {
        title: 'Follow-up Alert',
        subtitle: 'Clinical escalation',
        detail:
          flags.includes('critical_bp') || flags.includes('critical_sugar')
            ? 'Critical trend found: schedule doctor follow-up immediately.'
            : 'Review your trend every 7 days and adjust plan.',
      },
      {
        title: 'Weekly Cluster Review',
        subtitle: 'Status migration tracking',
        detail: `Recompute your cluster every week and verify progress away from ${primaryCluster.title}.`,
        badge: 'Weekly',
      },
    ];

    return { diet, exercise, yoga, reminders, bmi, bmiClass, clusters, primaryCluster };
  }, [recommendation, latestVitals, liveBmi, liveBmiClass, resolvedFlags]);

  const sectionMeta: Record<
    SectionKey,
    {
      title: string;
      subtitle: string;
      icon: ComponentType<{ className?: string; style?: CSSProperties }>;
      color: string;
    }
  > = {
    diet: {
      title: 'Personalized Diet Plan',
      subtitle: 'Meal guidance based on your latest health summary',
      icon: Apple,
      color: '#4DB8AC',
    },
    exercise: {
      title: 'Personalized Exercise Plan',
      subtitle: 'Activity intensity tailored to your vitals',
      icon: Dumbbell,
      color: '#5B9BD5',
    },
    yoga: {
      title: 'Personalized Yoga Plan',
      subtitle: 'Breath and posture flow suited to your condition',
      icon: Sparkles,
      color: '#9B72CB',
    },
    reminders: {
      title: 'Personalized Reminder Plan',
      subtitle: 'Timely reminders to keep your routine on track',
      icon: Bell,
      color: '#F59E75',
    },
  };

  const meta = sectionMeta[activeSection];
  const ActiveIcon = meta.icon;
  const activeCards = sectionCards[activeSection];

  return (
    <div className="h-full bg-gray-50 relative flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="bg-white px-6 pt-12 pb-6 border-b border-gray-100">
          <BackButton className="mb-2" />
          <div className="flex items-center gap-2 mb-2">
            <ActiveIcon className="w-6 h-6" style={{ color: meta.color }} />
            <h1 className="text-2xl font-semibold text-gray-800">{meta.title}</h1>
          </div>
          <p className="text-gray-500">{meta.subtitle}</p>
          <div className="mt-3 inline-block bg-[#4DB8AC]/10 px-4 py-2 rounded-full">
            <p className="text-sm text-[#4DB8AC] font-semibold">
              BMI: {sectionCards.bmi !== null ? sectionCards.bmi.toFixed(1) : '--'} ({sectionCards.bmiClass ?? 'pending'})
              {latestVitals
                ? ` · BP ${latestVitals.systolic}/${latestVitals.diastolic} · Sugar ${latestVitals.sugarLevel}`
                : ''}
            </p>
          </div>

        </div>

        <div className="px-6 py-6 space-y-4">
          {isLoading && <p className="text-sm text-gray-500">Loading recommendations...</p>}
          {!isLoading && error && (
            <div className="bg-yellow-50 text-yellow-700 text-sm rounded-xl p-4">
              {error}. Please upload your daily vitals first.
              <button className="ml-2 underline" onClick={() => navigate('/enter-data')}>
                Add vitals
              </button>
            </div>
          )}

          {!isLoading && !error && (
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="font-semibold text-gray-800">Patient Cluster</h3>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${severityPillClass(sectionCards.primaryCluster.severity)}`}>
                  {sectionCards.primaryCluster.severity.toUpperCase()}
                </span>
              </div>

              <p className="text-sm text-gray-700 font-medium">{sectionCards.primaryCluster.title}</p>
              <p className="text-sm text-gray-600 mt-1">{sectionCards.primaryCluster.summary}</p>

              <div className="mt-3 grid grid-cols-1 gap-2">
                {sectionCards.clusters.map((cluster) => (
                  <div key={cluster.key} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">{cluster.title}</p>
                    <p className="text-xs text-gray-600 mt-1">Conditions: {cluster.conditions.join(', ')}</p>
                    <p className="text-xs text-gray-600 mt-1">Focus: {cluster.focus.join(' • ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeCards.map((item, index) => (
            <div key={`${activeSection}-${index}`} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{item.subtitle}</p>
                </div>
                {item.badge && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#4DB8AC]/10 text-[#4DB8AC]">
                    {item.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">{item.detail}</p>
            </div>
          ))}

          {activeSection === 'reminders' && !!recommendation?.cautions?.length && (
            <div className="bg-red-50 rounded-3xl p-6 shadow-sm border border-red-100">
              <h3 className="text-red-700 font-semibold mb-3">Caution Alerts</h3>
              <ul className="space-y-2 text-red-700 text-sm">
                {recommendation.cautions.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
