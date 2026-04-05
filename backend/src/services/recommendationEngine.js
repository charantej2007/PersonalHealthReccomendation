function calculateBmi(heightCm, weightKg) {
  const heightM = heightCm / 100;
  if (!heightM || !weightKg) return null;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

function classifyBmi(bmi) {
  if (bmi === null) return 'unknown';
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

function classifyVitals(vital) {
  const flags = [];

  if (vital.systolic >= 160 || vital.diastolic >= 100) flags.push('critical_bp');
  else if (vital.systolic >= 140 || vital.diastolic >= 90) flags.push('high_bp');
  else if (vital.systolic <= 90 || vital.diastolic <= 60) flags.push('low_bp');

  if (vital.sugarLevel >= 200) flags.push('critical_sugar');
  else if (vital.sugarLevel >= 126) flags.push('high_sugar');
  else if (vital.sugarLevel < 70) flags.push('low_sugar');

  return flags;
}

export function generateRecommendations(profile, latestVital) {
  const bmi = calculateBmi(profile.heightCm, profile.weightKg);
  const bmiClass = classifyBmi(bmi);
  const vitalFlags = latestVital ? classifyVitals(latestVital) : [];

  const exercises = [];
  const yoga = [];
  const food = [];
  const cautions = [];

  if (bmiClass === 'underweight') {
    exercises.push('Light resistance training 20-25 min, 4 days/week');
    yoga.push('Bhujangasana and Vajrasana for digestion and appetite support');
    food.push('Add calorie-dense healthy options: nuts, banana smoothies, paneer, eggs');
  } else if (bmiClass === 'overweight' || bmiClass === 'obese') {
    exercises.push('Brisk walk 40 min daily + strength training 3 days/week');
    yoga.push('Surya Namaskar 6-12 rounds and Trikonasana for mobility');
    food.push('High-fiber plate model: half vegetables, quarter protein, quarter whole grains');
  } else {
    exercises.push('Balanced routine: 30 min cardio + 15 min strength, 5 days/week');
    yoga.push('Anulom Vilom and Tadasana for stress and posture');
    food.push('Maintain Mediterranean-style balanced meals and hydration');
  }

  if (vitalFlags.includes('high_bp') || vitalFlags.includes('critical_bp')) {
    exercises.push('Avoid high-intensity bursts; choose moderate paced cardio');
    yoga.push('Shavasana and Bhramari breathing for blood pressure regulation');
    food.push('Reduce sodium intake, avoid packaged salty foods');
  }

  if (vitalFlags.includes('high_sugar') || vitalFlags.includes('critical_sugar')) {
    exercises.push('10-15 min post-meal walks to improve glucose handling');
    yoga.push('Mandukasana and Ardha Matsyendrasana for metabolic support');
    food.push('Low glycemic meals: legumes, oats, greens; avoid sugary drinks');
  }

  if (vitalFlags.includes('low_sugar')) {
    cautions.push('Risk of hypoglycemia. Keep quick glucose source available.');
  }

  if (vitalFlags.includes('critical_bp') || vitalFlags.includes('critical_sugar')) {
    cautions.push('Critical vitals detected. Seek medical review as soon as possible.');
  }

  return {
    bmi,
    bmiClass,
    vitalFlags,
    exercises,
    yoga,
    food,
    cautions,
    generatedAt: new Date().toISOString(),
  };
}

export function isSuspicious(recommendationResult) {
  return recommendationResult.vitalFlags.some((flag) =>
    ['critical_bp', 'critical_sugar', 'low_sugar'].includes(flag)
  );
}
