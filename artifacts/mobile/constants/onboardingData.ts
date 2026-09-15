// Central data + types for the onboarding flow. Keeping this in one place
// (rather than scattered literals inside app/onboarding.tsx) means future
// AI-powered workout generation can import `OnboardingData` and the raw
// answer values directly, with no refactor of the onboarding screen itself.

// Alphabetically organized, 50+ sports for the Athlete sport picker.
export const SPORTS: string[] = [
  'American Football',
  'Archery',
  'Athletics (Track & Field)',
  'Badminton',
  'Baseball',
  'Basketball',
  'Biathlon',
  'BMX',
  'Bobsled',
  'Bodybuilding',
  'Boxing',
  'Canoeing',
  'CrossFit',
  'Cricket',
  'Curling',
  'Cycling',
  'Darts',
  'Diving',
  'Equestrian',
  'Fencing',
  'Field Hockey',
  'Figure Skating',
  'Golf',
  'Gymnastics',
  'Handball',
  'Ice Hockey',
  'Judo',
  'Karate',
  'Kickboxing',
  'Lacrosse',
  'Motocross',
  'Mountain Biking',
  'Netball',
  'Olympic Weightlifting',
  'Padel',
  'Pickleball',
  'Powerlifting',
  'Rowing',
  'Rugby',
  'Sailing',
  'Skateboarding',
  'Skiing',
  'Snowboarding',
  'Soccer',
  'Softball',
  'Speed Skating',
  'Squash',
  'Surfing',
  'Swimming',
  'Table Tennis',
  'Taekwondo',
  'Tennis',
  'Track Cycling',
  'Triathlon',
  'Volleyball',
  'Water Polo',
  'Weightlifting',
  'Wrestling',
  'Yoga',
].sort((a, b) => a.localeCompare(b));

// One profile-type option ('Athlete') unlocks the sport picker. Kept as a
// named constant so the trigger condition isn't a magic string.
export const SPORT_SELECTOR_TRIGGER = 'Athlete';

// Shape of everything collected during onboarding. This is the contract
// future AI workout-generation features should read from — every field an
// onboarding step can produce lives here, including the ones (selectedSport,
// dreamPhysiqueUri) added specifically to prepare for that future work.
export interface OnboardingData {
  gender: string;
  heightCm: string;
  weightKg: string;
  describe: string;
  selectedSport: string;
  gymExperience: string;
  exercisePrefs: string[];
  daysPerWeek: number;
  goal: string;
  chronicIllnesses: string;
  dreamPhysiqueUri: string | null;
  paletteId: string;
  completed: boolean;
}

export const ONBOARDING_STORAGE_KEY = '@gymmice_onboarding';

export const EMPTY_ONBOARDING_DATA: OnboardingData = {
  gender: '',
  heightCm: '',
  weightKg: '',
  describe: '',
  selectedSport: '',
  gymExperience: '',
  exercisePrefs: [],
  daysPerWeek: 3,
  goal: '',
  chronicIllnesses: '',
  dreamPhysiqueUri: null,
  paletteId: 'default',
  completed: false,
};
