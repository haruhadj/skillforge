export const WORD_CATEGORIES = {
  partOfSpeech: {
    label: "Part of Speech",
    items: [
      { id: "noun", label: "Nouns", emoji: "📗" },
      { id: "verb", label: "Verbs", emoji: "🔴" },
      { id: "adjective", label: "Adjectives", emoji: "🟡" },
      { id: "adverb", label: "Adverbs", emoji: "🔵" },
    ],
  },
  topic: {
    label: "Topics",
    items: [
      { id: "animals", label: "Animals", emoji: "🐾" },
      { id: "science", label: "Science", emoji: "🔬" },
      { id: "geography", label: "Geography", emoji: "🌍" },
      { id: "food", label: "Food & Cooking", emoji: "🍳" },
      { id: "music", label: "Music", emoji: "🎵" },
      { id: "sports", label: "Sports", emoji: "⚽" },
    ],
  },
};

export const CATEGORY_INFO = {};
[...WORD_CATEGORIES.partOfSpeech.items, ...WORD_CATEGORIES.topic.items].forEach(
  (item) => {
    CATEGORY_INFO[item.id] = item;
  },
);

export const POS_IDS = WORD_CATEGORIES.partOfSpeech.items.map((i) => i.id);
export const TOPIC_IDS = WORD_CATEGORIES.topic.items.map((i) => i.id);

export const SHOP_ITEMS = [
  {
    id: "bee_crown",
    name: "Royal Crown",
    desc: "Your bee wears a tiny crown",
    price: 150,
    emoji: "👑",
    category: "cosmetic",
  },
  {
    id: "bee_shades",
    name: "Cool Shades",
    desc: "Too cool for school",
    price: 100,
    emoji: "🕶️",
    category: "cosmetic",
  },
  {
    id: "bg_night",
    name: "Night Sky",
    desc: "Starry background theme",
    price: 200,
    emoji: "🌙",
    category: "theme",
  },
  {
    id: "bg_ocean",
    name: "Ocean Depths",
    desc: "Deep blue sea theme",
    price: 200,
    emoji: "🌊",
    category: "theme",
  },
  {
    id: "bg_forest",
    name: "Enchanted Forest",
    desc: "Lush green forest theme",
    price: 200,
    emoji: "🌲",
    category: "theme",
  },
  {
    id: "hint_boost",
    name: "Hint Boost Pack",
    desc: "+5 free hints for next round",
    price: 80,
    emoji: "💡",
    category: "boost",
  },
  {
    id: "time_freeze",
    name: "Time Freeze x3",
    desc: "Pause timer 3 times",
    price: 120,
    emoji: "❄️",
    category: "boost",
  },
  {
    id: "double_coins",
    name: "Coin Magnet",
    desc: "2× coins for next round",
    price: 175,
    emoji: "🧲",
    category: "boost",
  },
];

export const THEMES = {
  default: {
    bg: "linear-gradient(135deg, #FFF8E7 0%, #FEF3C7 50%, #FDE68A 100%)",
    accent: "#D97706",
    surface: "#FFFBEB",
  },
  bg_night: {
    bg: "linear-gradient(135deg, #0F0C29 0%, #302B63 50%, #24243e 100%)",
    accent: "#818CF8",
    surface: "#1E1B4B",
  },
  bg_ocean: {
    bg: "linear-gradient(135deg, #0C3547 0%, #0F6B8E 50%, #1A91B0 100%)",
    accent: "#22D3EE",
    surface: "#0C4A6E",
  },
  bg_forest: {
    bg: "linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)",
    accent: "#4ADE80",
    surface: "#14532d",
  },
};

export const AGE_CONFIG = {
  kids: {
    label: "Kids (6-10)",
    timerSeconds: 30,
    difficulty: "easy",
    words: 5,
    coinsPerCorrect: 10,
  },
  teens: {
    label: "Teens (11-17)",
    timerSeconds: 20,
    difficulty: "medium",
    words: 8,
    coinsPerCorrect: 15,
  },
  adults: {
    label: "Adults",
    timerSeconds: 15,
    difficulty: "hard",
    words: 10,
    coinsPerCorrect: 20,
  },
  custom: {
    label: "Custom",
    timerSeconds: 20,
    difficulty: "medium",
    words: 8,
    coinsPerCorrect: 15,
  },
};
