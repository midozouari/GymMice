export type Story = {
  id: number;
  user: string;
  avatar: string;
  seen: boolean;
  slides: { bg: string; caption: string }[];
};

export type Post = {
  id: number;
  user: string;
  anon: boolean;
  avatar: string;
  time: string;
  text: string;
  tag?: string;       // optional label e.g. '📍 Check-in', '📊 Progress', '🏋️ Workout'
  imageBg?: string;   // optional colored image placeholder (hex)
  reactions: Record<string, number>;
  myReactions: Record<string, boolean>;
  comments: { id: number; user: string; avatar: string; text: string; time: string }[];
};

export type Convo = { name: string; last: string; time: string; unread: boolean };
export type Message = { from: 'me' | 'them'; text: string; time: string };

export const STORIES: Story[] = [
  { id: 1, user: 'You', avatar: 'M', seen: true, slides: [
    { bg: '#1D9E75', caption: 'Push day done 🔥' },
  ]},
  { id: 2, user: 'Youssef', avatar: 'YB', seen: false, slides: [
    { bg: '#E8692A', caption: '100kg bench PR today 🎉' },
    { bg: '#c0430a', caption: 'Never skipping again fr' },
    { bg: '#8B3000', caption: 'Grind never stops 💯' },
  ]},
  { id: 3, user: 'Hannah', avatar: 'HH', seen: false, slides: [
    { bg: '#3B8BD4', caption: 'Meal prep Sunday 🍱' },
    { bg: '#1a5fa0', caption: 'Macros on point this week' },
  ]},
  { id: 4, user: 'Ben', avatar: 'B', seen: false, slides: [
    { bg: '#7C3AED', caption: 'Morning run at 6am 😤' },
  ]},
  { id: 5, user: 'Paulo', avatar: 'P', seen: true, slides: [
    { bg: '#D94040', caption: 'New gym fit just dropped' },
    { bg: '#9a1a1a', caption: 'Ready for leg day' },
  ]},
];

export const INIT_POSTS: Post[] = [
  {
    id: 1, user: 'Youssef B.', anon: false, avatar: 'YB', time: '2m ago',
    text: 'New PR on bench today! 100kg finally 🔥💪 Four months of grinding paid off. Never stop showing up.',
    reactions: { '💪': 18, '🔥': 14, '❤️': 7, '😂': 3 }, myReactions: {},
    comments: [
      { id: 1, user: 'Hannah H.', avatar: 'HH', text: "Let's gooo! Proud of you 🎉", time: '1m ago' },
      { id: 2, user: 'Mido', avatar: 'M', text: 'Insane bro, you worked for this 💯', time: '1m ago' },
      { id: 3, user: 'Ben', avatar: 'B', text: 'Next stop 120kg 👀', time: '30s ago' },
    ],
  },
  {
    id: 2, user: 'Anonymous', anon: true, avatar: '?', time: '15m ago',
    text: "Does anyone else get anxious asking for help at the gym? Just started and I don't know what I'm doing lol",
    reactions: { '💪': 34, '🔥': 12, '❤️': 29, '😂': 4 }, myReactions: {},
    comments: [
      { id: 1, user: 'Mido', avatar: 'M', text: '100% normal, everyone starts somewhere 🙏', time: '14m ago' },
      { id: 2, user: 'Hannah H.', avatar: 'HH', text: 'I felt the exact same way. Gets easier!', time: '13m ago' },
      { id: 3, user: 'Paulo', avatar: 'P', text: 'Just ask, most people are happy to help', time: '12m ago' },
    ],
  },
  {
    id: 3, user: 'Hannah H.', anon: false, avatar: 'HH', time: '1h ago',
    tag: '📸 Photo',
    imageBg: '#3B8BD4',
    text: 'Post-workout salmon & quinoa. Hitting those macros 💯 Meal prep is a game changer — 2 hours on Sunday saves the whole week.',
    reactions: { '💪': 8, '🔥': 11, '❤️': 15, '😂': 2 }, myReactions: {},
    comments: [
      { id: 1, user: 'Mido', avatar: 'M', text: 'Recipe? 👀', time: '58m ago' },
      { id: 2, user: 'Youssef B.', avatar: 'YB', text: 'Looks fire 🔥', time: '50m ago' },
      { id: 3, user: 'Sami C.', avatar: 'SC', text: 'The macros breakdown please!', time: '40m ago' },
    ],
  },
  {
    id: 4, user: 'Ben K.', anon: false, avatar: 'BK', time: '2h ago',
    tag: '📍 Check-in',
    text: '6am club checking in 🌅 Ran 5km before most people even set an alarm. Day 23 of my morning streak — the early hours hit different.',
    reactions: { '💪': 22, '🔥': 19, '❤️': 6, '😂': 1 }, myReactions: {},
    comments: [
      { id: 1, user: 'Leila R.', avatar: 'LR', text: 'You make me want to wake up earlier 😤', time: '1h ago' },
      { id: 2, user: 'Mido', avatar: 'M', text: 'Respect, 6am is no joke', time: '55m ago' },
    ],
  },
  {
    id: 5, user: 'Kieron D.', anon: false, avatar: 'KD', time: '3h ago',
    tag: '🏋️ Gym Update',
    text: "California Gym just opened a brand new cable zone — full setup, dual adjustable pulleys, free access all month. Go claim your spot before it gets packed 🏋️",
    reactions: { '💪': 41, '🔥': 28, '❤️': 9, '😂': 0 }, myReactions: {},
    comments: [
      { id: 1, user: 'Paulo', avatar: 'P', text: 'Already been, it is unreal 🔥', time: '2h ago' },
      { id: 2, user: 'Youssef B.', avatar: 'YB', text: 'Going Saturday!', time: '1h ago' },
      { id: 3, user: 'Mido', avatar: 'M', text: 'Finally, the old one was always busy', time: '45m ago' },
    ],
  },
  {
    id: 6, user: 'Anonymous', anon: true, avatar: '?', time: '4h ago',
    tag: '📊 Progress',
    text: '8 weeks in. Down 4kg. Not where I want to be yet — but the mirror is starting to tell a different story. Stay consistent, it compounds.',
    reactions: { '💪': 63, '🔥': 31, '❤️': 47, '😂': 2 }, myReactions: {},
    comments: [
      { id: 1, user: 'Hannah H.', avatar: 'HH', text: '4kg in 8 weeks is solid progress, be proud!', time: '3h ago' },
      { id: 2, user: 'Ben K.', avatar: 'BK', text: 'Keep going! The first months are the hardest', time: '2h ago' },
      { id: 3, user: 'Mido', avatar: 'M', text: 'That mindset is going to take you far 💯', time: '1h ago' },
    ],
  },
  {
    id: 7, user: 'Paulo', anon: false, avatar: 'P', time: '5h ago',
    tag: '📸 Photo',
    imageBg: '#D94040',
    text: 'Leg day fit check before the suffering begins 😤 New shorts just dropped. Never skip legs — your upper body depends on it.',
    reactions: { '💪': 15, '🔥': 33, '❤️': 12, '😂': 7 }, myReactions: {},
    comments: [
      { id: 1, user: 'Youssef B.', avatar: 'YB', text: 'Clean fit bro 🔥', time: '4h ago' },
      { id: 2, user: 'Kieron D.', avatar: 'KD', text: 'Looking jacked already 😭', time: '3h ago' },
    ],
  },
  {
    id: 8, user: 'Leila R.', anon: false, avatar: 'LR', time: '7h ago',
    text: "Rest day yoga session 🧘 Recovery is training too. Your muscles grow when you rest, not just when you grind. Don't neglect this part.",
    reactions: { '💪': 9, '🔥': 7, '❤️': 24, '😂': 0 }, myReactions: {},
    comments: [
      { id: 1, user: 'Hannah H.', avatar: 'HH', text: 'So true. I skip rest days too often', time: '6h ago' },
      { id: 2, user: 'Mido', avatar: 'M', text: 'Needed to hear this today 🙏', time: '5h ago' },
    ],
  },
  {
    id: 9, user: 'Anonymous', anon: true, avatar: '?', time: '9h ago',
    text: 'I cried in the car after my first gym session 2 years ago. Today I helped coach my first beginner. The turnaround is real. Never give up on yourself.',
    reactions: { '💪': 92, '🔥': 44, '❤️': 118, '😂': 0 }, myReactions: {},
    comments: [
      { id: 1, user: 'Ben K.', avatar: 'BK', text: 'This made my day. Thank you for sharing 🙏', time: '8h ago' },
      { id: 2, user: 'Leila R.', avatar: 'LR', text: 'Actual tears reading this. So proud of you!', time: '7h ago' },
      { id: 3, user: 'Youssef B.', avatar: 'YB', text: 'This community is everything 💯', time: '6h ago' },
      { id: 4, user: 'Mido', avatar: 'M', text: 'Real one. Respect 🤝', time: '5h ago' },
    ],
  },
  {
    id: 10, user: 'Sami C.', anon: false, avatar: 'SC', time: '11h ago',
    tag: '🏋️ Workout',
    text: 'Leg press personal best today — 200kg for 8 reps 🦵 Started at 60kg six months ago. Slow and steady progression beats ego lifting every single time.',
    reactions: { '💪': 54, '🔥': 38, '❤️': 16, '😂': 3 }, myReactions: {},
    comments: [
      { id: 1, user: 'Kieron D.', avatar: 'KD', text: '200kg?! Absolute UNIT 😭', time: '10h ago' },
      { id: 2, user: 'Paulo', avatar: 'P', text: 'The progression from 60 to 200 is insane bro', time: '9h ago' },
      { id: 3, user: 'Mido', avatar: 'M', text: 'Goals. Logging this for motivation', time: '8h ago' },
    ],
  },
];

export const CONVERSATIONS: Convo[] = [
  { name: 'Kieron D.', last: 'Ok, have a good trip!', time: '2m', unread: true },
  { name: 'Hannah H.', last: 'Thanks for the tip!', time: '15m', unread: false },
  { name: 'Youssef B.', last: 'New PR! 💪', time: '1h', unread: true },
  { name: 'Paulo', last: 'Wanna be gym buddies?', time: '3h', unread: false },
  { name: 'Anonymous', last: 'Thanks for the support', time: '5h', unread: false },
];

export const CONVO_HISTORY: Record<string, Message[]> = {
  'Kieron D.': [
    { from: 'them', text: 'Yo bro you hitting the gym today?', time: 'Mon 10:02' },
    { from: 'me', text: 'Yeah for sure, leg day 🦵', time: 'Mon 10:04' },
    { from: 'them', text: "Let's go together then", time: 'Mon 10:07' },
    { from: 'me', text: 'Say less, meet at the entrance', time: 'Mon 10:08' },
    { from: 'them', text: 'Bet 💪', time: 'Mon 10:09' },
    { from: 'me', text: 'Session was FIRE today bro 🔥', time: 'Mon 20:15' },
    { from: 'them', text: 'Deadlifts nearly killed me 💀', time: 'Mon 20:16' },
    { from: 'me', text: 'Same lmao but we showed up', time: 'Mon 20:17' },
    { from: 'them', text: 'Same time Thursday?', time: 'Mon 20:18' },
    { from: 'me', text: 'Thursday works 👊', time: 'Mon 20:19' },
    { from: 'them', text: 'Ok, have a good trip!', time: '2m ago' },
  ],
  'Hannah H.': [
    { from: 'them', text: 'Hey! Your post about the salmon recipe 😍', time: 'Sun 09:10' },
    { from: 'me', text: 'Haha glad you liked it!', time: 'Sun 09:12' },
    { from: 'them', text: "What's your macros split?", time: 'Sun 09:13' },
    { from: 'me', text: 'I do 40P / 35C / 25F roughly', time: 'Sun 09:15' },
    { from: 'them', text: "That's clean, I'm trying to lean out", time: 'Sun 09:16' },
    { from: 'me', text: 'Cut the refined carbs first, trust', time: 'Sun 09:18' },
    { from: 'me', text: "Consistency is key, you'll see results 🔥", time: 'Sun 11:05' },
    { from: 'them', text: 'Thanks for the tip!', time: '15m ago' },
  ],
  'Youssef B.': [
    { from: 'them', text: 'Bro I finally hit 100kg bench 😭🔥', time: 'Tue 19:00' },
    { from: 'me', text: "NO WAY that's insane 🎉", time: 'Tue 19:01' },
    { from: 'them', text: "I've been working on this for 4 months", time: 'Tue 19:02' },
    { from: 'me', text: "The grind paid off fr, I'm proud of you", time: 'Tue 19:03' },
    { from: 'them', text: 'Next goal is 120kg before summer', time: 'Tue 19:08' },
    { from: 'me', text: "Let's map out the progression", time: 'Tue 19:10' },
    { from: 'them', text: 'New PR! 💪', time: '1h ago' },
  ],
  'Paulo': [
    { from: 'them', text: 'Hey! I matched with you on Pump Match', time: 'Wed 14:00' },
    { from: 'me', text: 'Oh hey! You train at California Gym?', time: 'Wed 14:02' },
    { from: 'them', text: 'Yeah exactly, 3 years now', time: 'Wed 14:03' },
    { from: 'me', text: 'Same schedule actually lol', time: 'Wed 14:06' },
    { from: 'them', text: "That's perfect, we should train together", time: 'Wed 14:07' },
    { from: 'me', text: 'Bet 🤝', time: 'Wed 14:12' },
    { from: 'them', text: 'Wanna be gym buddies?', time: '3h ago' },
  ],
  'Anonymous': [
    { from: 'them', text: 'Hey, I saw your comment on my post', time: 'Thu 20:00' },
    { from: 'me', text: 'Your story really resonated', time: 'Thu 20:02' },
    { from: 'them', text: 'I was nervous to post it honestly', time: 'Thu 20:03' },
    { from: 'me', text: 'That took courage, seriously', time: 'Thu 20:04' },
    { from: 'them', text: 'The anonymous option made it possible', time: 'Thu 20:05' },
    { from: 'me', text: "That's exactly why it exists 🙏", time: 'Thu 20:06' },
    { from: 'me', text: 'Just kept showing up. It fades I promise', time: 'Thu 20:14' },
    { from: 'them', text: 'Thanks for the support', time: '5h ago' },
  ],
};

export const BADGES = [
  { days: 7,   name: 'Squeaky Strong',            sub: 'Tiny but consistent. You showed up!',             color: '#5B9E4A', bg: '#E8F5E2', animal: '🐭', earned: true  },
  { days: 30,  name: 'Certified Good Boi',         sub: "A whole month? You're doing amazing, champ.",     color: '#4A90C4', bg: '#E0F0FF', animal: '🐶', earned: true  },
  { days: 60,  name: 'Sloth Level: Legend',         sub: 'Consistency, not speed. You get it.',            color: '#9B72CC', bg: '#F0E8FF', animal: '🦥', earned: false },
  { days: 90,  name: 'Trash Panda of Discipline',   sub: 'Undeniable. Unstoppable. A little chaotic.',     color: '#E8A020', bg: '#FFF3DC', animal: '🦝', earned: false },
  { days: 180, name: 'Built Different',             sub: 'Half a year of showing up? Absolute unit.',      color: '#D94040', bg: '#FFE8E8', animal: '🐔', earned: false },
  { days: 365, name: 'Gym Myth. Legend. Icon.',     sub: 'A full year. Unreal. Teach us your ways.',       color: '#E8B820', bg: '#FFF8DC', animal: '🦄', earned: false },
];

// Single source of truth for the user's current streak.
// Derived from BADGES so it can never drift out of sync with earned milestones.
export const CURRENT_STREAK: number = Math.max(
  0,
  ...BADGES.filter(b => b.earned).map(b => b.days),
);
