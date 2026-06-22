import { WORD_CATEGORIES, AGE_CONFIG } from "../data/constants";

export function ConfigScreen({ styles, theme, config, setConfig, onBack }) {
  return (
    <div style={styles.app}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap');`}</style>
      <div style={{ ...styles.card, maxWidth: 540 }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            fontSize: 22,
            cursor: "pointer",
            marginBottom: 8,
          }}
        >
          ← Back
        </button>
        <h2
          style={{
            color: "#92400e",
            fontWeight: 900,
            marginTop: 0,
            fontSize: 28,
          }}
        >
          ⚙️ Game Settings
        </h2>

        <label
          style={{
            display: "block",
            fontWeight: 700,
            color: "#78350f",
            marginBottom: 6,
          }}
        >
          Age Group
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {Object.entries(AGE_CONFIG).map(([k, v]) => (
            <button
              key={k}
              onClick={() => {
                setConfig((c) => ({
                  ...c,
                  ageGroup: k,
                  timerSeconds: v.timerSeconds,
                  difficulty: v.difficulty,
                  wordsPerRound: v.words,
                }));
              }}
              style={{
                ...styles.btn(
                  config.ageGroup === k ? theme.accent : "#d1d5db",
                  config.ageGroup !== k,
                ),
                fontSize: 13,
                padding: "10px 8px",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        <label
          style={{
            display: "block",
            fontWeight: 700,
            color: "#78350f",
            marginBottom: 6,
          }}
        >
          Difficulty
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {["easy", "medium", "hard"].map((d) => (
            <button
              key={d}
              onClick={() => setConfig((c) => ({ ...c, difficulty: d, ageGroup: "custom" }))}
              style={{
                ...styles.btn(
                  config.difficulty === d ? theme.accent : "#d1d5db",
                  config.difficulty !== d,
                ),
                fontSize: 14,
                textTransform: "capitalize",
              }}
            >
              {d === "easy"
                ? "🌸 Easy"
                : d === "medium"
                  ? "🌿 Medium"
                  : "⛈️ Hard"}
            </button>
          ))}
        </div>

        <label
          style={{
            display: "block",
            fontWeight: 700,
            color: "#78350f",
            marginBottom: 4,
          }}
        >
          Timer:{" "}
          <span style={{ color: theme.accent }}>{config.timerSeconds}s</span>
        </label>
        <input
          type="range"
          min={8}
          max={60}
          step={2}
          value={config.timerSeconds}
          onChange={(e) =>
            setConfig((c) => ({ ...c, timerSeconds: +e.target.value, ageGroup: "custom" }))
          }
          style={{ width: "100%", marginBottom: 20 }}
        />

        <label
          style={{
            display: "block",
            fontWeight: 700,
            color: "#78350f",
            marginBottom: 4,
          }}
        >
          Words per Round:{" "}
          <span style={{ color: theme.accent }}>{config.wordsPerRound}</span>
        </label>
        <input
          type="range"
          min={3}
          max={20}
          step={1}
          value={config.wordsPerRound}
          onChange={(e) =>
            setConfig((c) => ({ ...c, wordsPerRound: +e.target.value, ageGroup: "custom" }))
          }
          style={{ width: "100%", marginBottom: 20 }}
        />

        <label
          style={{
            display: "block",
            fontWeight: 700,
            color: "#78350f",
            marginBottom: 6,
          }}
        >
          Word Categories{" "}
          <span
            style={{
              fontWeight: 400,
              fontSize: 12,
              color: "#9ca3af",
              marginLeft: 4,
            }}
          >
            {config.categories.length === 0
              ? "(All)"
              : `(${config.categories.length} selected)`}
          </span>
        </label>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {["single", "multi"].map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setConfig((c) => ({
                  ...c,
                  categoryMode: mode,
                  categories:
                    mode === "single" && c.categories.length > 1
                      ? [c.categories[0]]
                      : c.categories,
                }));
              }}
              style={{
                ...styles.btn(
                  config.categoryMode === mode ? theme.accent : "#d1d5db",
                  config.categoryMode !== mode,
                ),
                fontSize: 12,
                padding: "6px 14px",
                flex: 1,
              }}
            >
              {mode === "single" ? "Single Select" : "Multi Select"}
            </button>
          ))}
        </div>

        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#78350f",
            margin: "0 0 6px",
          }}
        >
          Part of Speech
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {WORD_CATEGORIES.partOfSpeech.items.map((cat) => {
            const selected = config.categories.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setConfig((c) => {
                    const has = c.categories.includes(cat.id);
                    if (c.categoryMode === "single") {
                      return {
                        ...c,
                        categories: has ? [] : [cat.id],
                        ageGroup: "custom",
                      };
                    }
                    return {
                      ...c,
                      categories: has
                        ? c.categories.filter((id) => id !== cat.id)
                        : [...c.categories, cat.id],
                      ageGroup: "custom",
                    };
                  });
                }}
                style={{
                  ...styles.btn(
                    selected ? theme.accent : "#e5e7eb",
                    !selected,
                  ),
                  fontSize: 13,
                  padding: "6px 14px",
                  borderRadius: 20,
                }}
              >
                {cat.emoji} {cat.label}
              </button>
            );
          })}
        </div>

        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#78350f",
            margin: "0 0 6px",
          }}
        >
          Topics
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 12,
          }}
        >
          {WORD_CATEGORIES.topic.items.map((cat) => {
            const selected = config.categories.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setConfig((c) => {
                    const has = c.categories.includes(cat.id);
                    if (c.categoryMode === "single") {
                      return {
                        ...c,
                        categories: has ? [] : [cat.id],
                        ageGroup: "custom",
                      };
                    }
                    return {
                      ...c,
                      categories: has
                        ? c.categories.filter((id) => id !== cat.id)
                        : [...c.categories, cat.id],
                      ageGroup: "custom",
                    };
                  });
                }}
                style={{
                  ...styles.btn(
                    selected ? theme.accent : "#e5e7eb",
                    !selected,
                  ),
                  fontSize: 13,
                  padding: "6px 14px",
                  borderRadius: 20,
                }}
              >
                {cat.emoji} {cat.label}
              </button>
            );
          })}
        </div>

        {config.categories.length > 0 && (
          <button
            onClick={() =>
              setConfig((c) => ({ ...c, categories: [] }))
            }
            style={{
              ...styles.btn("#6b7280", true),
              fontSize: 12,
              padding: "6px 14px",
              marginBottom: 12,
            }}
          >
            ✕ Clear All (Show All Words)
          </button>
        )}

        <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 16px" }}>
          Live words are served from the local proxy when configured;
          otherwise the game uses built-in word banks.
        </p>

        <button
          onClick={onBack}
          style={{ ...styles.btn(), width: "100%", fontSize: 16 }}
        >
          Save & Return 🐝
        </button>
      </div>
    </div>
  );
}
