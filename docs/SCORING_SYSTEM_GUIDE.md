# SkillForge Scoring System Guide for AI Coding Agents

## Overview

This guide provides standardized scoring patterns for SkillForge educational games. All scoring systems should be:
- **Fair**: Reward skill, not luck
- **Transparent**: Players understand how points are earned
- **Motivating**: Encourage improvement and replayability
- **Consistent**: Similar games use similar scoring

---

## Core Scoring Components

### 1. Base Points
Every correct action earns base points:

| Action | Base Points | Examples |
|--------|-------------|----------|
| Correct answer | 100 | Vocab quiz, spelling correct |
| Partial credit | 50-75 | Close spelling (typos), hints used |
| Completion bonus | 200-500 | Finishing a round/level |
| Speed bonus | 0-100 | Based on time remaining |
| Streak bonus | +50 per streak | Consecutive correct answers |

### 2. Time Bonus Formula

```javascript
function calculateTimeBonus(timeLeft, maxTime, baseBonus = 50) {
  const percentage = timeLeft / maxTime;
  return Math.round(percentage * baseBonus);
}
```

**Example:**
- Max time: 15 seconds
- Time left: 8 seconds
- Bonus: (8/15) × 50 = 27 points

### 3. Streak Multiplier System

| Streak | Multiplier | Visual Indicator |
|--------|------------|------------------|
| 0-1 | 1.0x | - |
| 2-3 | 1.5x | 🔥 Small flame |
| 4-5 | 2.0x | 🔥🔥 Double flame |
| 6+ | 2.5x | 🔥🔥🔥 Max flame |

```javascript
function getStreakMultiplier(streak) {
  if (streak >= 6) return 2.5;
  if (streak >= 4) return 2.0;
  if (streak >= 2) return 1.5;
  return 1.0;
}
```

### 4. Final Score Calculation

```javascript
function calculateScore(basePoints, timeLeft, maxTime, streak, difficultyMultiplier = 1.0) {
  const timeBonus = Math.round((timeLeft / maxTime) * 50);
  const streakMultiplier = getStreakMultiplier(streak);
  const rawScore = (basePoints + timeBonus) * streakMultiplier;
  return Math.round(rawScore * difficultyMultiplier);
}

// Difficulty multipliers
const DIFFICULTY_MULTIPLIERS = {
  easy: 1.0,
  medium: 1.2,
  hard: 1.5,
  expert: 2.0
};
```

---

## Game-Specific Scoring Patterns

### Pattern A: Multiple Choice / Quiz Games

**Used in:** Vocabulary, Trivia, Grammar games

```javascript
// Per-question scoring
function scoreMultipleChoice(
  isCorrect,           // boolean
  timeSpentMs,         // time used
  maxTimeMs,           // time limit
  currentStreak,       // streak before this question
  difficulty           // 'easy' | 'medium' | 'hard' | 'expert'
) {
  if (!isCorrect) {
    return { 
      points: 0, 
      streakBroken: true,
      multiplier: 1.0 
    };
  }

  const base = 100;
  const timeLeft = maxTimeMs - timeSpentMs;
  const timeBonus = calculateTimeBonus(timeLeft, maxTimeMs);
  const multiplier = getStreakMultiplier(currentStreak + 1);
  const diffMult = DIFFICULTY_MULTIPLIERS[difficulty] || 1.0;
  
  const total = Math.round((base + timeBonus) * multiplier * diffMult);
  
  return {
    points: total,
    basePoints: base,
    timeBonus,
    multiplier,
    streakBonus: total - ((base + timeBonus) * diffMult),
    streakBroken: false
  };
}
```

**Visual Feedback:**
- Show `+150` popup with animation
- Flash multiplier badge ("2.0x") when streak active
- Time bar color changes: green (>50%) → yellow (>25%) → red (<25%)

---

### Pattern B: Spelling / Typing Games

**Used in:** Spelling Bee, Word Scramble, Typing games

```javascript
// Per-word scoring with partial credit
function scoreSpelling(
  input,               // user's typed answer
  correctWord,         // target word
  timeSpentMs,
  maxTimeMs,
  hintsUsed,           // number of hints used (0, 1, 2...)
  currentStreak
) {
  const normalized = input.trim().toLowerCase();
  const target = correctWord.toLowerCase();
  
  // Exact match
  if (normalized === target) {
    const base = 100;
    const hintPenalty = hintsUsed * 25; // -25 per hint
    const timeBonus = calculateTimeBonus(maxTimeMs - timeSpentMs, maxTimeMs);
    const multiplier = getStreakMultiplier(currentStreak + 1);
    
    const total = Math.max(10, Math.round((base - hintPenalty + timeBonus) * multiplier));
    
    return {
      points: total,
      correct: true,
      exactMatch: true,
      hintPenalty,
      timeBonus,
      multiplier
    };
  }
  
  // Check for close miss (1-2 character difference)
  const distance = levenshteinDistance(normalized, target);
  if (distance <= 2 && normalized.length >= target.length - 1) {
    return {
      points: 25,  // Partial credit
      correct: false,
      closeMiss: true,
      message: `Close! The word was "${correctWord}"`,
      streakBroken: true
    };
  }
  
  // Wrong
  return {
    points: 0,
    correct: false,
    message: `The word was "${correctWord}"`,
    streakBroken: true
  };
}
```

**Levenshtein Distance Helper:**
```javascript
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i-1] === a[j-1]
        ? matrix[i-1][j-1]
        : Math.min(
            matrix[i-1][j-1] + 1, // substitution
            matrix[i][j-1] + 1,   // insertion
            matrix[i-1][j] + 1    // deletion
          );
    }
  }
  return matrix[b.length][a.length];
}
```

---

### Pattern C: Timed Challenge Games

**Used in:** Speed typing, Rapid fire quizzes, Memory games

```javascript
// Time-based scoring with combo system
function scoreTimedChallenge(
  correctCount,        // total correct answers
  wrongCount,          // total wrong answers
  averageResponseTime, // average time per answer (ms)
  timeLimitMs,         // total game time
  longestStreak        // best streak achieved
) {
  // Base score from correct answers
  const correctPoints = correctCount * 100;
  
  // Penalty for wrong answers
  const wrongPenalty = wrongCount * 25;
  
  // Speed bonus (faster = more points)
  const avgTimeSeconds = averageResponseTime / 1000;
  const speedBonus = avgTimeSeconds < 3 ? 200 
                   : avgTimeSeconds < 5 ? 100 
                   : avgTimeSeconds < 8 ? 50 
                   : 0;
  
  // Streak bonus
  const streakBonus = longestStreak >= 10 ? 500
                    : longestStreak >= 5 ? 250
                    : longestStreak >= 3 ? 100
                    : 0;
  
  const total = correctPoints - wrongPenalty + speedBonus + streakBonus;
  
  return {
    total: Math.max(0, total),
    breakdown: {
      correctPoints,
      wrongPenalty,
      speedBonus,
      streakBonus
    }
  };
}
```

---

### Pattern D: Puzzle / Strategy Games

**Used in:** Crosswords, Word search, Logic puzzles

```javascript
// Cumulative scoring with bonus milestones
function scorePuzzleGame(
  wordsFound,          // array of found words
  hintsUsed,
  timeSpentMs,
  difficulty
) {
  // Points per word based on length
  const wordPoints = wordsFound.reduce((sum, word) => {
    const lengthBonus = Math.max(0, (word.length - 3) * 10);
    return sum + 50 + lengthBonus;
  }, 0);
  
  // Completion bonus (found all words)
  const completionBonus = allWordsFound ? 500 : 0;
  
  // Hint penalties
  const hintPenalty = hintsUsed * 50;
  
  // Time bonus (finish faster = more points)
  const timeBonus = timeSpentMs < 60000 ? 300  // Under 1 min
                  : timeSpentMs < 120000 ? 150 // Under 2 min
                  : timeSpentMs < 300000 ? 50  // Under 5 min
                  : 0;
  
  const difficultyMult = DIFFICULTY_MULTIPLIERS[difficulty] || 1.0;
  const total = Math.round((wordPoints + completionBonus - hintPenalty + timeBonus) * difficultyMult);
  
  return {
    total: Math.max(0, total),
    wordsFound: wordPoints,
    completionBonus,
    hintPenalty,
    timeBonus,
    difficultyMultiplier: difficultyMult
  };
}
```

---

## Grade System (End-of-Game)

Standardized grading for all games:

```javascript
function calculateGrade(accuracy, totalScore, difficulty) {
  // Grade based primarily on accuracy
  const gradeTable = [
    { min: 100, grade: 'S', label: 'Perfect!', emoji: '👑', color: 'gold' },
    { min: 95, grade: 'A+', label: 'Outstanding!', emoji: '🌟', color: 'emerald' },
    { min: 90, grade: 'A', label: 'Excellent!', emoji: '✨', color: 'green' },
    { min: 80, grade: 'B+', label: 'Great job!', emoji: '💪', color: 'blue' },
    { min: 70, grade: 'B', label: 'Good work!', emoji: '👍', color: 'indigo' },
    { min: 60, grade: 'C', label: 'Nice effort!', emoji: '📚', color: 'yellow' },
    { min: 50, grade: 'D', label: 'Keep practicing!', emoji: '📝', color: 'orange' },
    { min: 0, grade: 'F', label: "Don't give up!", emoji: '💡', color: 'red' }
  ];
  
  const result = gradeTable.find(g => accuracy >= g.min);
  
  return {
    ...result,
    accuracy,
    totalScore,
    stars: Math.ceil(accuracy / 20) // 1-5 stars
  };
}
```

---

## Coin/Economy System

SkillForge uses a coin system for rewards:

```javascript
function calculateCoins(score, accuracy, difficulty, isDailyChallenge = false) {
  // Base coins from score (1 coin per 10 points, max 50)
  const baseCoins = Math.min(50, Math.floor(score / 10));
  
  // Accuracy bonus
  const accuracyBonus = accuracy >= 90 ? 20
                      : accuracy >= 70 ? 10
                      : accuracy >= 50 ? 5
                      : 0;
  
  // Difficulty multiplier
  const diffMultiplier = difficulty === 'expert' ? 2.0
                       : difficulty === 'hard' ? 1.5
                       : difficulty === 'medium' ? 1.2
                       : 1.0;
  
  // Daily challenge bonus
  const dailyBonus = isDailyChallenge ? 50 : 0;
  
  const total = Math.round((baseCoins + accuracyBonus) * diffMultiplier + dailyBonus);
  
  return {
    total: Math.max(5, total), // Minimum 5 coins
    breakdown: {
      baseCoins,
      accuracyBonus,
      difficultyMultiplier: diffMultiplier,
      dailyBonus
    }
  };
}
```

---

## Global Leaderboard Composite Score

The "All Games" leaderboard uses a **composite skill score** that rewards skill, diversity, and experience—not just grinding.

### Formula

```javascript
function calculateCompositeScore(userScores, userStats, globalMaxScores) {
  // 1. Normalize each game's score (0-100 relative to global max)
  let normalizedSum = 0;
  const gamesWithScores = Object.keys(userScores);
  
  gamesWithScores.forEach(gameId => {
    const userBest = userScores[gameId].bestScore;
    const globalMax = globalMaxScores[gameId] || 1;
    const normalized = (userBest / globalMax) * 100;
    normalizedSum += normalized;
  });
  
  const gamesPlayed = gamesWithScores.length;
  const avgNormalizedScore = normalizedSum / gamesPlayed;
  
  // 2. Calculate total matches across all games
  const totalMatchCount = Object.values(userStats)
    .reduce((sum, stats) => sum + (stats.totalMatchCount || 0), 0);
  
  // 3. Apply weighted formula
  const skillComponent = avgNormalizedScore * 0.7;        // 70% - core skill
  const diversityBonus = Math.min(gamesPlayed * 4, 20);   // 20% - game variety
  const experienceFactor = Math.min(Math.sqrt(totalMatchCount) * 2, 10); // 10%
  
  return Math.min(skillComponent + diversityBonus + experienceFactor, 100);
}
```

### Component Breakdown

| Component | Weight | Description | Max Value |
|-----------|--------|-------------|-----------|
| **Skill** | 70% | Average normalized best score across all games | 70 points |
| **Diversity** | 20% | Bonus for playing multiple games (4 pts per game) | 20 points |
| **Experience** | 10% | Logarithmic bonus based on total matches (√matches × 2) | 10 points |

### Tier System

Players are assigned a tier based on their composite score:

| Tier | Score Range | Color | Badge |
|------|-------------|-------|-------|
| **Master** | 80-100 | Purple | `bg-purple-600` |
| **Platinum** | 60-79 | Cyan | `bg-cyan-500` |
| **Gold** | 40-59 | Yellow | `bg-yellow-500` |
| **Silver** | 20-39 | Slate | `bg-slate-400` |
| **Bronze** | 0-19 | Amber | `bg-amber-700` |

### Example Calculations

**Player A (Skilled, Diverse):**
- Games: 4 (scores normalized: 95, 88, 92, 90)
- Avg normalized: 91.25
- Matches: 50
- Score: (91.25 × 0.7) + 16 + 7 = **87.9** → **Master**

**Player B (Grinder, One Game):**
- Games: 1 (score normalized: 100)
- Avg normalized: 100
- Matches: 500
- Score: (100 × 0.7) + 4 + 10 = **84** → **Master**

**Player C (Casual, Multiple Games):**
- Games: 3 (scores normalized: 60, 55, 65)
- Avg normalized: 60
- Matches: 20
- Score: (60 × 0.7) + 12 + 6 = **60** → **Platinum**

### Key Design Principles

1. **Skill Over Volume**: A player with high scores in few games outranks a grinder with mediocre scores
2. **Diversity Rewarded**: Playing multiple games gives significant bonus (up to 20 points)
3. **Diminishing Returns**: Experience uses √scale to prevent infinite grinding advantage
4. **Consistent Comparison**: All scores normalized per-game (0-100) for fair cross-game ranking
5. **Visual Progression**: Clear tier badges show achievement level at a glance

### API Usage

```typescript
// Fetch leaderboard with composite scores
const leaderboard = await getGlobalLeaderboard();
// Returns: [{ uid, compositeScore, tier, gamesPlayed, totalMatchCount, avgNormalizedScore }]

// Get single user's stats (for profile page)
const userStats = await getUserGlobalStats(uid, userScores, userGameStats);
// Returns: { uid, compositeScore, tier, gamesPlayed, totalMatchCount, avgNormalizedScore }
```

---

## Stats Tracking

Track these metrics for user profiles:

```javascript
const DEFAULT_STATS = {
  gamesPlayed: 0,
  totalScore: 0,
  highScore: 0,
  wordsCorrect: 0,
  wordsAttempted: 0,
  accuracy: 0,        // calculated: wordsCorrect / wordsAttempted
  bestStreak: 0,
  averageTime: 0,     // average response time
  totalTime: 0,      // total time played
  coinsEarned: 0,
  gamesByDifficulty: {
    easy: 0,
    medium: 0,
    hard: 0,
    expert: 0
  },
  grades: {          // count of each grade achieved
    S: 0, Aplus: 0, A: 0, Bplus: 0, B: 0, C: 0, D: 0, F: 0
  }
};

function updateStats(currentStats, gameResult) {
  return {
    ...currentStats,
    gamesPlayed: currentStats.gamesPlayed + 1,
    totalScore: currentStats.totalScore + gameResult.score,
    highScore: Math.max(currentStats.highScore, gameResult.score),
    wordsCorrect: currentStats.wordsCorrect + gameResult.correctCount,
    wordsAttempted: currentStats.wordsAttempted + gameResult.totalQuestions,
    bestStreak: Math.max(currentStats.bestStreak, gameResult.bestStreak),
    totalTime: currentStats.totalTime + gameResult.totalTime,
    gamesByDifficulty: {
      ...currentStats.gamesByDifficulty,
      [gameResult.difficulty]: currentStats.gamesByDifficulty[gameResult.difficulty] + 1
    },
    grades: {
      ...currentStats.grades,
      [gameResult.grade]: currentStats.grades[gameResult.grade] + 1
    }
  };
}
```

---

## Shareable Results Format

Standard format for sharing game results:

```javascript
function generateShareText(result) {
  const difficultyEmoji = {
    easy: '🌱',
    medium: '📖',
    hard: '🔥',
    expert: '😈'
  };
  
  const blocks = result.answers
    .map(a => a.correct ? '🟩' : '🟥')
    .join('');
  
  return [
    `📚 ${result.gameName}`,
    '',
    `${difficultyEmoji[result.difficulty]} ${result.difficulty.toUpperCase()} | Grade: ${result.grade}`,
    `Score: ${result.score} | ${result.correctCount}/${result.totalQuestions} correct`,
    result.bestStreak > 2 ? `Best Streak: ${result.bestStreak}🔥` : '',
    '',
    blocks,
    '',
    'Can you beat my score?',
    result.shareUrl || ''
  ].filter(Boolean).join('\n');
}
```

---

## UI/UX Guidelines

### Real-time Score Display

```jsx
// Score popup animation
<div className="relative">
  <span className="font-bold text-lg">{score}</span>
  {scorePopup && (
    <span className="absolute -top-6 right-0 text-emerald-500 font-bold text-sm animate-score-pop">
      +{scorePopup}
    </span>
  )}
</div>

// Streak indicator
{streak > 0 && (
  <span className="text-orange-500 font-medium animate-pulse">
    {'🔥'.repeat(Math.min(3, Math.floor(streak / 2) + 1))} {streak}
  </span>
)}

// Multiplier badge
{multiplier > 1 && (
  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-bold">
    {multiplier}x
  </span>
)}
```

### Timer Bar

```jsx
function TimerBar({ percentage, timeLeft }) {
  const color = percentage > 50 ? 'bg-emerald-500'
              : percentage > 25 ? 'bg-amber-500'
              : 'bg-red-500';
  
  return (
    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} 
           style={{ width: `${percentage}%` }} />
    </div>
  );
}
```

---

## Best Practices

### 1. Never Negative Scores
```javascript
// Always enforce minimum 0
return Math.max(0, calculatedScore);
```

### 2. Show Score Breakdown
Always show players how they earned points:
- Base points: 100
- Time bonus: +27
- Streak bonus: ×2.0
- **Total: 254**

### 3. Consistent Difficulty Naming
| Internal | Display | Color |
|----------|---------|-------|
| easy | Easy / Light | emerald |
| medium | Medium | amber |
| hard | Hard | orange |
| expert / devilish | Expert / Devilish | red |

### 4. Persist Stats Immediately
```javascript
// Save after each game
useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}, [stats]);
```

### 5. Graceful Degradation
If calculation fails, return safe defaults:
```javascript
try {
  return complexScoringLogic();
} catch (err) {
  console.error('Scoring error:', err);
  return { points: 10, correct: true }; // Safe fallback
}
```

---

## Testing Scoring

```javascript
// Unit test examples
describe('scoring', () => {
  test('perfect answer with max time', () => {
    const result = calculateScore(100, 15, 15, 0, 'easy');
    expect(result).toBe(150); // 100 base + 50 time bonus
  });
  
  test('streak multiplier at 6+', () => {
    const result = calculateScore(100, 10, 15, 6, 'medium');
    expect(result).toBeGreaterThan(300); // 2.5x multiplier applied
  });
  
  test('wrong answer returns 0', () => {
    const result = scoreMultipleChoice(false, 5000, 15000, 3, 'easy');
    expect(result.points).toBe(0);
    expect(result.streakBroken).toBe(true);
  });
});
```

---

## Summary for AI Agents

When implementing scoring for a new SkillForge game:

1. **Choose the pattern** that matches your game type (A, B, C, or D)
2. **Use base 100 points** for correct answers
3. **Add time bonus** (max 50 points for instant answer)
4. **Implement streak multipliers** (1.5x at 2, 2.0x at 4, 2.5x at 6+)
5. **Apply difficulty multipliers** (easy=1.0, medium=1.2, hard=1.5, expert=2.0)
6. **Show visual feedback** with animations for points, streaks, and multipliers
7. **Track stats** for user profiles and progress
8. **Generate share text** with emoji blocks
9. **Calculate grade** at end of game based on accuracy
10. **Award coins** based on score, accuracy, and difficulty

### Global Leaderboard Integration

All games contribute to the **composite skill score**:

```javascript
// Best scores are automatically normalized per-game
// Skill (70%) + Diversity (20%) + Experience (10%)
// Higher scores → better leaderboard ranking
```

- Save best scores via `saveBestScore(uid, gameId, score)`
- Track match counts via `saveGameStats(uid, gameId, stats)`
- Leaderboard auto-calculates from all user data

Scoring should feel rewarding and encourage players to improve their skills!
