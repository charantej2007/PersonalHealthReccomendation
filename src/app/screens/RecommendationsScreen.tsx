import { useNavigate, useSearchParams } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, CSSProperties } from 'react';
import { BottomNavigation } from '../components/BottomNavigation';
import { Apple, Dumbbell, Sparkles, Bell } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import {
  getLatestRecommendation,
  getRecentVitals,
  type LatestRecommendationResponse,
} from '../services/backendService';
import { getCurrentUserId } from '../services/sessionService';

type SectionKey = 'diet' | 'exercise' | 'yoga' | 'reminders';

type DetailItem = {
  title: string;
  subtitle: string;
  detail: string;
  badge?: string;
};

function getValidSection(section: string | null): SectionKey {
  if (section === 'diet' || section === 'exercise' || section === 'yoga' || section === 'reminders') {
    return section;
  }
  return 'diet';
}

export function RecommendationsScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = getValidSection(searchParams.get('section'));
  const [recommendation, setRecommendation] = useState<LatestRecommendationResponse['recommendation'] | null>(null);
  const [latestVitals, setLatestVitals] = useState<{ systolic: number; diastolic: number; sugarLevel: number } | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      navigate('/login');
      return;
    }

    async function loadRecommendation() {
      try {
        setIsLoading(true);
        const [response, vitals] = await Promise.all([
          getLatestRecommendation(userId),
          getRecentVitals(userId),
        ]);
        setRecommendation(response.recommendation);
        if (vitals) {
          setLatestVitals({
            systolic: vitals.systolic,
            diastolic: vitals.diastolic,
            sugarLevel: vitals.sugarLevel,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load recommendations.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadRecommendation();
  }, [navigate]);

  const sectionCards = useMemo(() => {
    const bmi = recommendation?.bmi;
    const bmiClass = recommendation?.bmiClass ?? 'pending';
    const flags = recommendation?.vitalFlags ?? [];

    const diet: DetailItem[] = [
      {
        title: 'Breakfast (7:00 AM)',
        subtitle: 'Balanced start',
        detail: recommendation?.food?.[0] ?? 'Oats with protein + fruit for stable morning energy.',
        badge: 'Priority',
      },
      {
        title: 'Lunch (1:00 PM)',
        subtitle: 'Blood sugar control',
        detail:
          flags.includes('high_sugar') || flags.includes('critical_sugar')
            ? 'Low GI meal: legumes, salad, grilled protein, avoid sweet beverages.'
            : recommendation?.food?.[1] ?? 'High-fiber plate with lean protein and whole grains.',
      },
      {
        title: 'Evening Snack (4:00 PM)',
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
    ];

    const exercise: DetailItem[] = [
      {
        title: 'Cardio Session',
        subtitle: 'Daily movement',
        detail:
          flags.includes('high_bp') || flags.includes('critical_bp')
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
        title: 'Post-meal Walk',
        subtitle: 'Sugar support',
        detail:
          flags.includes('high_sugar') || flags.includes('critical_sugar')
            ? 'Take 10-15 min walk after major meals.'
            : recommendation?.exercises?.[0] ?? 'Short 10 min walk after lunch/dinner.',
      },
      {
        title: 'Recovery Day',
        subtitle: 'Injury prevention',
        detail: '1 rest day/week with light stretching and breathing work.',
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
        title: 'Night Relaxation',
        subtitle: 'Sleep quality',
        detail: '5-8 min guided relaxation before bed.',
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
        title: 'Follow-up Alert',
        subtitle: 'Clinical escalation',
        detail:
          flags.includes('critical_bp') || flags.includes('critical_sugar')
            ? 'Critical trend found: schedule doctor follow-up immediately.'
            : 'Review your trend every 7 days and adjust plan.',
      },
    ];

    return { diet, exercise, yoga, reminders, bmi, bmiClass };
  }, [recommendation]);

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
              BMI: {sectionCards.bmi ?? '--'} ({sectionCards.bmiClass ?? 'pending'})
              {latestVitals
                ? ` · BP ${latestVitals.systolic}/${latestVitals.diastolic} · Sugar ${latestVitals.sugarLevel}`
                : ''}
            </p>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {(['diet', 'exercise', 'yoga', 'reminders'] as SectionKey[]).map((section) => (
              <button
                key={section}
                onClick={() => setSearchParams({ section })}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  activeSection === section
                    ? 'bg-[#4DB8AC] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {section[0].toUpperCase() + section.slice(1)}
              </button>
            ))}
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

          {!!recommendation?.cautions?.length && (
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
