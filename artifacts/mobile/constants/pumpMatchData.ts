// Curated MVP data for the Pump Match swipe feature. Per the redesign brief,
// this is a fixed set of exactly 10 fully hand-written profiles using
// real, high-quality royalty-free fitness photography (Pexels/Unsplash),
// rather than randomly generated names/photos — every field is unique and
// deliberately written, not template-filled.
import { OnboardingData } from '@/constants/onboardingData';

export interface PumpMatchProfile {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  city: string;
  country: string;
  verified: boolean;
  photos: string[];
  bio: string;
  goal: string;
  experience: string;
  heightCm: number;
  sport: string;
  musicTaste: string;
  interests: string[];
  lookingFor: string[];
  preferredSplit: string;
  preferredGym: string;
  trainingTime: string;
  workoutIntensity: string;
  compatibilityBase: number;
}

export const PUMP_MATCH_PROFILES: PumpMatchProfile[] = [
  {
    id: 'pm-paulo',
    name: 'Paulo',
    age: 29,
    gender: 'male',
    city: 'Tunis',
    country: 'Tunisia',
    verified: true,
    photos: [
      'https://images.pexels.com/photos/13562693/pexels-photo-13562693.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/1547248/pexels-photo-1547248.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/1978505/pexels-photo-1978505.jpeg?cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/10021281/pexels-photo-10021281.jpeg?cs=tinysrgb&dpr=1&w=900',
    ],
    bio: 'Software engineer, gym rat, coffee addict. Looking for a consistent lifting partner.',
    goal: 'Muscle Gain',
    experience: 'Intermediate',
    heightCm: 178,
    sport: 'Bodybuilding',
    musicTaste: 'Hip-Hop',
    interests: ['Hip-Hop', 'Coffee', 'Travel', 'Gaming'],
    lookingFor: ['Gym Buddy'],
    preferredSplit: 'Push Pull Legs',
    preferredGym: 'California Gym',
    trainingTime: 'Evenings',
    workoutIntensity: 'High',
    compatibilityBase: 92,
  },
  {
    id: 'pm-sarah',
    name: 'Sarah',
    age: 24,
    gender: 'female',
    city: 'Sousse',
    country: 'Tunisia',
    verified: true,
    photos: [
      'https://plus.unsplash.com/premium_photo-1698091422214-cf2fbf93e819?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA==&fm=jpg&q=60&w=1200',
      'https://images.unsplash.com/photo-1758684050600-f3bb20eb230d?fm=jpg&q=60&w=1200&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA==',
      'https://images.pexels.com/photos/17979529/pexels-photo-17979529/free-photo-of-woman-running-along-a-field-in-a-marathon.jpeg?cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/8567597/pexels-photo-8567597.jpeg?cs=tinysrgb&dpr=1&w=900',
    ],
    bio: 'Marathon in training, headphones always in. Looking for someone to match my early pace.',
    goal: 'Endurance',
    experience: 'Advanced',
    heightCm: 168,
    sport: 'Running',
    musicTaste: 'Pop',
    interests: ['Photography', 'Hiking', 'Cooking'],
    lookingFor: ['Running Partner', 'Accountability Partner'],
    preferredSplit: 'Full Body',
    preferredGym: "Gold's Gym",
    trainingTime: 'Early morning (5-7am)',
    workoutIntensity: 'Moderate',
    compatibilityBase: 89,
  },
  {
    id: 'pm-yassine',
    name: 'Yassine',
    age: 27,
    gender: 'male',
    city: 'Bizerte',
    country: 'Tunisia',
    verified: true,
    photos: [
      'https://images.pexels.com/photos/3253499/pexels-photo-3253499.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/9602278/pexels-photo-9602278.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/6388456/pexels-photo-6388456.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/4720231/pexels-photo-4720231.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
    ],
    bio: 'WODs before work. Competed twice at regionals — always chasing one more rep.',
    goal: 'Strength',
    experience: 'Advanced',
    heightCm: 181,
    sport: 'CrossFit',
    musicTaste: 'EDM',
    interests: ['Football', 'Cars', 'Music production'],
    lookingFor: ['Gym Buddy', 'Class Partner'],
    preferredSplit: 'CrossFit WOD',
    preferredGym: 'The Yard',
    trainingTime: 'Morning (7-10am)',
    workoutIntensity: 'Max effort',
    compatibilityBase: 94,
  },
  {
    id: 'pm-lina',
    name: 'Lina',
    age: 22,
    gender: 'female',
    city: 'Ariana',
    country: 'Tunisia',
    verified: false,
    photos: [
      'https://images.pexels.com/photos/1984457/pexels-photo-1984457.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/3902726/pexels-photo-3902726.jpeg?cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/8463037/pexels-photo-8463037.jpeg?cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/1638051/pexels-photo-1638051.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
    ],
    bio: 'Contemporary dancer who found strength training by accident and never left. Flexibility is my superpower.',
    goal: 'Toning',
    experience: 'Intermediate',
    heightCm: 164,
    sport: 'Yoga',
    musicTaste: 'R&B',
    interests: ['Dancing', 'Fashion', 'Movies'],
    lookingFor: ['Class Partner', 'Accountability Partner'],
    preferredSplit: 'Upper/Lower',
    preferredGym: 'FitZone',
    trainingTime: 'Afternoon (2-5pm)',
    workoutIntensity: 'Moderate',
    compatibilityBase: 85,
  },
  {
    id: 'pm-mehdi',
    name: 'Mehdi',
    age: 30,
    gender: 'male',
    city: 'Nabeul',
    country: 'Tunisia',
    verified: true,
    photos: [
      'https://images.pexels.com/photos/949134/pexels-photo-949134.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/12890944/pexels-photo-12890944.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/685530/pexels-photo-685530.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/1092877/pexels-photo-1092877.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
    ],
    bio: 'Powerlifting since 19. Total is 620kg and climbing. Need a reliable spotter for heavy squat days.',
    goal: 'Powerlifting Prep',
    experience: 'Competitive athlete',
    heightCm: 185,
    sport: 'Powerlifting',
    musicTaste: 'Metal',
    interests: ['Cars', 'Cooking', 'Chess'],
    lookingFor: ['Spotter', 'Powerlifting Partner'],
    preferredSplit: 'Powerlifting (SBD)',
    preferredGym: 'IronWorks',
    trainingTime: 'Evenings',
    workoutIntensity: 'Max effort',
    compatibilityBase: 91,
  },
  {
    id: 'pm-amira',
    name: 'Amira',
    age: 26,
    gender: 'female',
    city: 'Sfax',
    country: 'Tunisia',
    verified: true,
    photos: [
      'https://images.pexels.com/photos/4754133/pexels-photo-4754133.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/4754004/pexels-photo-4754004.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/5750867/pexels-photo-5750867.jpeg?cs=tinysrgb&dpr=1&w=900',
      'https://images.unsplash.com/photo-1731955138970-fc88fd48b80f?fm=jpg&q=60&w=1200&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA==',
    ],
    bio: 'Amateur boxer, three fights in. Conditioning is my weak point — looking to fix that with a training partner.',
    goal: 'Fat Loss',
    experience: 'Intermediate',
    heightCm: 170,
    sport: 'Boxing',
    musicTaste: 'Afrobeats',
    interests: ['Football', 'Travel', 'Photography'],
    lookingFor: ['Boxing Conditioning Partner'],
    preferredSplit: 'Full Body',
    preferredGym: 'Elite Fitness',
    trainingTime: 'Midday (11am-2pm)',
    workoutIntensity: 'High',
    compatibilityBase: 87,
  },
  {
    id: 'pm-karim',
    name: 'Karim',
    age: 25,
    gender: 'male',
    city: 'Monastir',
    country: 'Tunisia',
    verified: false,
    photos: [
      'https://images.pexels.com/photos/4803672/pexels-photo-4803672.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/10476477/pexels-photo-10476477.jpeg?cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/4803667/pexels-photo-4803667.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/12895247/pexels-photo-12895247.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
    ],
    bio: 'Calisthenics over machines, always. Working towards a full planche — park bars are my gym.',
    goal: 'General Fitness',
    experience: 'Advanced',
    heightCm: 176,
    sport: 'Calisthenics',
    musicTaste: 'Lo-fi',
    interests: ['Gaming', 'Photography', 'Reading'],
    lookingFor: ['Calisthenics Buddy', 'Weekend Workout Partner'],
    preferredSplit: 'Bro Split',
    preferredGym: 'CoreLab',
    trainingTime: 'Late night (8-11pm)',
    workoutIntensity: 'High',
    compatibilityBase: 88,
  },
  {
    id: 'pm-nour',
    name: 'Nour',
    age: 23,
    gender: 'female',
    city: 'Hammamet',
    country: 'Tunisia',
    verified: true,
    photos: [
      'https://images.pexels.com/photos/6285246/pexels-photo-6285246.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/6285247/pexels-photo-6285247.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/6285226/pexels-photo-6285226.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/416809/pexels-photo-416809.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
    ],
    bio: 'Just here for the endorphins and good playlists. Three sessions a week, no pressure, all fun.',
    goal: 'General Fitness',
    experience: 'Beginner',
    heightCm: 162,
    sport: 'Cycling',
    musicTaste: 'Pop',
    interests: ['Coffee', 'Movies', 'Fashion'],
    lookingFor: ['Gym Buddy'],
    preferredSplit: 'Full Body',
    preferredGym: 'FitZone',
    trainingTime: 'Afternoon (2-5pm)',
    workoutIntensity: 'Light & steady',
    compatibilityBase: 82,
  },
  {
    id: 'pm-walid',
    name: 'Walid',
    age: 31,
    gender: 'male',
    city: 'Gabès',
    country: 'Tunisia',
    verified: true,
    photos: [
      'https://images.pexels.com/photos/12742571/pexels-photo-12742571.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/12742525/pexels-photo-12742525.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/12742518/pexels-photo-12742518.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/5878697/pexels-photo-5878697.jpeg?cs=tinysrgb&dpr=1&w=900',
    ],
    bio: 'Ex-club rugby, now weekend warrior. Built for contact, training for longevity these days.',
    goal: 'Strength',
    experience: 'Advanced',
    heightCm: 188,
    sport: 'Rugby',
    musicTaste: 'Rock',
    interests: ['Football', 'Cars', 'Cooking'],
    lookingFor: ['Weekend Workout Partner', 'Gym Buddy'],
    preferredSplit: 'Upper/Lower',
    preferredGym: 'PowerHouse',
    trainingTime: 'Evenings',
    workoutIntensity: 'High',
    compatibilityBase: 90,
  },
  {
    id: 'pm-rania',
    name: 'Rania',
    age: 21,
    gender: 'female',
    city: 'Kairouan',
    country: 'Tunisia',
    verified: false,
    photos: [
      'https://images.pexels.com/photos/136410/pexels-photo-136410.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/3757376/pexels-photo-3757376.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/6285188/pexels-photo-6285188.jpeg?cs=tinysrgb&dpr=1&w=900',
      'https://images.pexels.com/photos/13965872/pexels-photo-13965872.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=900',
    ],
    bio: 'Six months into my transformation, down 8kg and stronger every week. Would love a buddy who gets it.',
    goal: 'Fat Loss',
    experience: 'Beginner',
    heightCm: 166,
    sport: 'Bodybuilding',
    musicTaste: 'Latin',
    interests: ['Cooking', 'Reading', 'Hiking'],
    lookingFor: ['Accountability Partner', 'Gym Buddy'],
    preferredSplit: 'Full Body',
    preferredGym: "Gold's Gym",
    trainingTime: 'Morning (7-10am)',
    workoutIntensity: 'Moderate',
    compatibilityBase: 86,
  },
];

export function getPumpMatchProfile(id: string): PumpMatchProfile | undefined {
  return PUMP_MATCH_PROFILES.find(p => p.id === id);
}

// Simple MVP compatibility score: starts from each profile's fixed baseline
// (curated to feel intentional rather than random) then adds bonus points
// for overlaps with the user's onboarding answers, when available.
export function computeCompatibility(profile: PumpMatchProfile, onboarding?: OnboardingData | null): number {
  let score = profile.compatibilityBase;

  if (onboarding && onboarding.completed) {
    if (onboarding.goal && profile.goal.toLowerCase().includes(onboarding.goal.toLowerCase())) score += 4;
    if (onboarding.gymExperience && onboarding.gymExperience === profile.experience) score += 3;
    if (onboarding.exercisePrefs?.some(p => profile.interests.includes(p) || profile.preferredSplit.includes(p))) score += 2;
    if (onboarding.selectedSport && onboarding.selectedSport === profile.sport) score += 4;
  }

  return Math.max(60, Math.min(99, score));
}
