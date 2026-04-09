import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Weight, Activity, Save } from 'lucide-react';
import { BackButton } from '../components/BackButton';
import { getCurrentUserId, subscribeProfileUpdates } from '../services/sessionService';
import { getUserProfile, submitDailyVitals } from '../services/backendService';

export function EnterHealthDataScreen() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    sugarLevel: '',
  });
  const [profileData, setProfileData] = useState({
    height: '',
    weight: '',
  });
  const [bmi, setBmi] = useState<string>('');
  const [bmiCategory, setBmiCategory] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      navigate('/login');
      return;
    }
    const activeUserId = userId;
    let isMounted = true;

    async function prefill() {
      try {
        const profile = await getUserProfile(activeUserId);
        if (!isMounted) return;
        setProfileData({
          height: String(profile.heightCm),
          weight: String(profile.weightKg),
        });
      } catch {
        if (!isMounted) return;
        navigate('/login');
      }
    }

    void prefill();
    const unsubscribe = subscribeProfileUpdates(() => {
      void prefill();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (profileData.height && profileData.weight) {
      const heightInMeters = parseFloat(profileData.height) / 100;
      const weightInKg = parseFloat(profileData.weight);
      const calculatedBmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);
      setBmi(calculatedBmi);
      
      const bmiValue = parseFloat(calculatedBmi);
      if (bmiValue < 18.5) {
        setBmiCategory('Underweight: < 18.5');
      } else if (bmiValue < 25) {
        setBmiCategory('Normal: 18.5 - 24.9');
      } else if (bmiValue < 30) {
        setBmiCategory('Overweight: 25 - 29.9');
      } else {
        setBmiCategory('Obese: > 30');
      }
    } else {
      setBmi('');
      setBmiCategory('');
    }
  }, [profileData.height, profileData.weight]);

  const handleSave = async () => {
    setError('');
    const userId = getCurrentUserId();

    if (!userId) {
      navigate('/login');
      return;
    }

    const systolic = Number(formData.bloodPressureSystolic);
    const diastolic = Number(formData.bloodPressureDiastolic);
    const sugarLevel = Number(formData.sugarLevel);

    if (!systolic || !diastolic || !sugarLevel) {
      setError('Please enter BP and sugar values.');
      return;
    }

    try {
      setIsSaving(true);
      await submitDailyVitals(userId, {
        systolic,
        diastolic,
        sugarLevel,
      });

      navigate('/recommendations');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save health data';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full bg-gray-50 overflow-y-auto pb-6">
      <div className="bg-white px-6 pt-12 pb-6">
        <BackButton className="mb-4" />
        <h1 className="text-2xl font-semibold text-gray-800">Enter Health Data</h1>
        <p className="text-gray-500 mt-1">Update your daily BP and sugar</p>
      </div>

      <div className="px-6 py-6 space-y-4">
        {/* BMI Card with Auto-calculation */}
        {bmi && (
          <div className="bg-gradient-to-br from-[#4DB8AC] to-[#45A599] rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-sm">Auto-calculated BMI</p>
                <p className="text-3xl font-semibold text-white">{bmi}</p>
              </div>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <p className="text-white/90 text-sm">
                {bmiCategory.split(':')[0]}: <span className="font-semibold">{bmiCategory.split(':')[1]}</span>
              </p>
            </div>
          </div>
        )}

        {/* Height & Weight (read-only from profile) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-5 h-5 text-[#4DB8AC]" />
            <h3 className="font-semibold text-gray-800">Height & Weight</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600 mb-2 block font-medium">Height (cm)</label>
              <div className="w-full px-4 py-3 bg-gray-100 rounded-xl text-gray-700 font-medium">
                {profileData.height || '--'}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600 mb-2 block font-medium">Weight (kg)</label>
              <div className="w-full px-4 py-3 bg-gray-100 rounded-xl text-gray-700 font-medium">
                {profileData.weight || '--'}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            To change these values, use Edit Profile.
          </p>
        </div>

        {/* Blood Pressure */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-5 h-5 text-[#5B9BD5]" />
            <h3 className="font-semibold text-gray-800">Blood Pressure</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600 mb-2 block font-medium">Systolic (mmHg)</label>
              <input
                type="number"
                value={formData.bloodPressureSystolic}
                onChange={(e) =>
                  setFormData({ ...formData, bloodPressureSystolic: e.target.value })
                }
                placeholder="e.g. 120"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-[#4DB8AC] transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-2 block font-medium">Diastolic (mmHg)</label>
              <input
                type="number"
                value={formData.bloodPressureDiastolic}
                onChange={(e) =>
                  setFormData({ ...formData, bloodPressureDiastolic: e.target.value })
                }
                placeholder="e.g. 80"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-[#4DB8AC] transition-all"
              />
            </div>
          </div>
        </div>

        {/* Sugar Level */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Weight className="w-5 h-5 text-[#F59E75]" />
            <h3 className="font-semibold text-gray-800">Blood Sugar Level</h3>
          </div>
          
          <div>
            <label className="text-xs text-gray-600 mb-2 block font-medium">Fasting Sugar (mg/dL)</label>
            <input
              type="number"
              value={formData.sugarLevel}
              onChange={(e) => setFormData({ ...formData, sugarLevel: e.target.value })}
              placeholder="e.g. 95"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-[#4DB8AC] transition-all"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 bg-[#4DB8AC] text-white rounded-2xl font-semibold hover:bg-[#45A599] transition-colors shadow-lg shadow-[#4DB8AC]/20 flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Saving...' : 'Save Health Data'}
        </button>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
