---
name: game-leaderboard-scoring-model
description: How strategy/arcade games compute the bestScore they report for SkillForge leaderboards
metadata:
  type: project
---

Strategy games (gomoku, hex, hare-and-hounds-duel, renegade) report a **bounded best-match SKILL score** as `BEST_SCORE`, not a cumulative win counter. Formula: `200 × difficultyMult(easy/normal 1, med/hard 2, hard/amazing 3) + efficiencyBonus(0–400)`, only on a decisive human win vs the AI (0 otherwise). Efficiency term per game: gomoku=fewer black stones, hex=shorter winning path, hare-hounds=fewer plies, renegade=bigger disc margin. Max ≈ 1000.

**Why this shape:** the host stores scores write-if-higher (`saveBestScore` keeps only the max) and the global leaderboard max-normalizes each game's bestScore, so an Elo/rating that can go *down* won't work, and an unbounded cumulative counter just rewards grinding. A bounded per-match score → host keeps the player's single best game.

**How to apply:** `GAME_STATS` must NOT contain score-like keys (`bestScore`/`score`/`lastScore`) — the host's GAME_STATS handler runs `extractScore` on it and would count the match a second time (this was a latent double-count in the old code). Put only progress/analytics fields in GAME_STATS; put the leaderboard number in BEST_SCORE. merge-2048 reports final run score; smartle reports sprintScore×60 or `max(50, 400−elapsed×3)` for single-puzzle solves. Source lives in `games-src/<id>/`; rebuild with `npm run game:build <id>`. See [[skillforge-score-write-paths]].
