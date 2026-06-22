import { BeeMascot } from "./BeeMascot";
import { CATEGORY_INFO } from "../data/constants";
import { getGrade } from "../utils/styles";

export function ResultsScreen({
  styles,
  theme,
  activeAccessories,
  score,
  results,
  maxStreak,
  coinsEarned,
  wordList,
  dailyCompleted,
  dailyScore,
  getDailyWords,
  setDailyCompleted,
  setDailyScore,
  onReplay,
  onSettings,
  onHome,
}) {
  const pct = Math.round((score / results.length) * 100);
  const grade = getGrade(pct);
  const gradeColor =
    pct >= 80 ? "#16a34a" : pct >= 60 ? "#ca8a04" : "#dc2626";
  const isDailyMode =
    wordList.length === 5 &&
    wordList.every((w) => getDailyWords().some((d) => d.word === w.word));
  if (isDailyMode && !dailyCompleted) {
    setDailyCompleted(true);
    setDailyScore({ score, total: results.length });
  }

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap');
        @keyframes pop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
        .pop{animation:pop 0.5s ease forwards}
      `}</style>
      <div style={{ ...styles.card, maxWidth: 540 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <BeeMascot mood="celebrating" accessories={activeAccessories} />
          <h2
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: "#92400e",
              margin: "12px 0 4px",
            }}
          >
            Round Complete!
          </h2>
          <div
            className="pop"
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: gradeColor,
              lineHeight: 1,
            }}
          >
            {grade}
          </div>
          <p style={{ color: "#78350f", fontWeight: 600, margin: "4px 0" }}>
            {pct}% accuracy
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 10,
            marginBottom: 24,
          }}
        >
          {[
            { label: "Correct", value: score, color: "#16a34a" },
            {
              label: "Wrong",
              value: results.length - score,
              color: "#dc2626",
            },
            {
              label: "Best Streak",
              value: `🔥 ${maxStreak}`,
              color: "#ea580c",
            },
            {
              label: "Coins Earned",
              value: `🪙 ${coinsEarned}`,
              color: "#d97706",
            },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "#f9fafb",
                borderRadius: 14,
                padding: "12px 8px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                  fontWeight: 600,
                  marginTop: 2,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <CategoryBreakdown results={results} />

        <div style={{ marginBottom: 20 }}>
          {results.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 12px",
                borderRadius: 10,
                marginBottom: 6,
                background: r.correct ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${r.correct ? "#bbf7d0" : "#fecaca"}`,
              }}
            >
              <span style={{ fontSize: 16, marginRight: 10 }}>
                {r.correct ? "✅" : "❌"}
              </span>
              <span style={{ fontWeight: 700, color: "#1f2937", flex: 1 }}>
                {r.word}
              </span>
              {!r.correct && r.userInput !== "(timeout)" && (
                <span style={{ color: "#9ca3af", fontSize: 12 }}>
                  you wrote: "{r.userInput}"
                </span>
              )}
              {r.userInput === "(timeout)" && (
                <span style={{ color: "#9ca3af", fontSize: 12 }}>
                  time's up
                </span>
              )}
            </div>
          ))}
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}
        >
          <button
            onClick={onReplay}
            style={{ ...styles.btn(), fontSize: 15, padding: "14px" }}
          >
            🔄 Replay
          </button>
          <button
            onClick={onSettings}
            style={{
              ...styles.btn("#7c3aed", true),
              fontSize: 15,
              padding: "14px",
            }}
          >
            ⚙️ Settings
          </button>
          <button
            onClick={onHome}
            style={{
              ...styles.btn(theme.accent, true),
              fontSize: 15,
              padding: "14px",
            }}
          >
            🏠 Home
          </button>
        </div>

        {isDailyMode && (
          <div
            style={{
              marginTop: 12,
              background: "#fef9c3",
              borderRadius: 14,
              padding: "14px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                fontWeight: 700,
                color: "#92400e",
                fontSize: 14,
              }}
            >
              📋 Daily Result: {score}/{results.length} · Grade: {grade} ·{" "}
              {coinsEarned} coins
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryBreakdown({ results }) {
  const byCategory = {};
  results.forEach((r) => {
    const pos = r.partOfSpeech || "unknown";
    if (!byCategory[pos]) byCategory[pos] = { correct: 0, total: 0 };
    byCategory[pos].total++;
    if (r.correct) byCategory[pos].correct++;
    const topic = r.topic;
    if (topic && topic !== "general") {
      const key = `topic:${topic}`;
      if (!byCategory[key]) byCategory[key] = { correct: 0, total: 0 };
      byCategory[key].total++;
      if (r.correct) byCategory[key].correct++;
    }
  });
  const entries = Object.entries(byCategory);
  if (entries.length <= 1) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <p
        style={{
          fontWeight: 800,
          color: "#78350f",
          fontSize: 14,
          marginBottom: 8,
        }}
      >
        📊 Category Breakdown
      </p>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {entries.map(([key, { correct, total }]) => {
          const isTopicKey = key.startsWith("topic:");
          const id = isTopicKey ? key.slice(6) : key;
          const info = CATEGORY_INFO[id];
          return (
            <div
              key={key}
              style={{
                background: "#f9fafb",
                borderRadius: 12,
                padding: "8px 14px",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#374151",
                }}
              >
                {info?.emoji || "📝"} {info?.label || id}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: correct === total ? "#16a34a" : "#d97706",
                }}
              >
                {correct}/{total}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
