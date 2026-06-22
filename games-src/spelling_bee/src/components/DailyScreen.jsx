import { getGrade } from "../utils/styles";

export function DailyScreen({
  styles,
  dailyWords,
  dailyCompleted,
  dailyScore,
  onBack,
  onStart,
}) {
  return (
    <div style={styles.app}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap');`}</style>
      <div style={styles.card}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
        <h2
          style={{
            color: "#92400e",
            fontWeight: 900,
            fontSize: 28,
            margin: "8px 0",
          }}
        >
          📅 Daily Challenge
        </h2>
        <p style={{ color: "#78350f", fontSize: 14 }}>
          Same 5 words for everyone today. Score resets at midnight!
        </p>
        <div
          style={{
            background: "#fef9c3",
            borderRadius: 16,
            padding: "16px",
            marginBottom: 20,
          }}
        >
          <p style={{ fontWeight: 700, color: "#92400e", margin: "0 0 8px" }}>
            Today's Theme: Mystery Words
          </p>
          {dailyWords.map((w, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 0",
                borderBottom:
                  i < dailyWords.length - 1 ? "1px solid #fde68a" : "none",
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  background: "#fde047",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 13,
                  color: "#713f12",
                }}
              >
                {i + 1}
              </span>
              <span style={{ color: "#78350f", fontWeight: 600 }}>
                {"_ ".repeat(w.word.length).trim()}
              </span>
              <span
                style={{ marginLeft: "auto", color: "#a16207", fontSize: 12 }}
              >
                {w.partOfSpeech}
              </span>
            </div>
          ))}
        </div>
        {dailyCompleted ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 24, fontWeight: 900, color: "#16a34a" }}>
              ✅ Completed!
            </p>
            <p style={{ color: "#374151" }}>
              Score: {dailyScore?.score}/{dailyScore?.total} · Grade:{" "}
              {getGrade((dailyScore?.score / dailyScore?.total) * 100)}
            </p>
          </div>
        ) : (
          <button
            onClick={onStart}
            style={{ ...styles.btn(), width: "100%", fontSize: 18 }}
          >
            Start Daily Challenge 📅
          </button>
        )}
      </div>
    </div>
  );
}
