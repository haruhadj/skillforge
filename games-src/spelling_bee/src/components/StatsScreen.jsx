export function StatsScreen({ styles, theme, stats, coins, totalCoins, onBack }) {
  const avgAccuracy =
    stats.wordsSpelled > 0
      ? Math.round((stats.wordsCorrect / stats.wordsSpelled) * 100)
      : 0;

  const statItems = [
    { label: "Games Played", value: stats.gamesPlayed, emoji: "🎮", color: "#7c3aed" },
    { label: "Words Spelled", value: stats.wordsSpelled, emoji: "📝", color: "#2563eb" },
    { label: "Words Correct", value: stats.wordsCorrect, emoji: "✅", color: "#16a34a" },
    { label: "Avg Accuracy", value: `${avgAccuracy}%`, emoji: "🎯", color: "#ea580c" },
    { label: "Best Accuracy", value: `${stats.bestAccuracy}%`, emoji: "🏆", color: "#d97706" },
    { label: "Best Streak", value: stats.bestStreak, emoji: "🔥", color: "#dc2626" },
    { label: "Total Coins Earned", value: stats.totalCoinsEarned, emoji: "🪙", color: "#ca8a04" },
    { label: "Current Coins", value: coins, emoji: "💰", color: "#059669" },
  ];

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap');
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .stat-card{animation:fadeIn 0.3s ease forwards;opacity:0}
      `}</style>
      <div style={{ ...styles.card, maxWidth: 480 }}>
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.8)",
            border: "none",
            borderRadius: 12,
            padding: "8px 14px",
            fontWeight: 700,
            cursor: "pointer",
            color: "#78350f",
            marginBottom: 12,
          }}
        >
          ← Back
        </button>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48 }}>📊</div>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#92400e",
              margin: "8px 0 4px",
            }}
          >
            Your Statistics
          </h2>
          <p style={{ color: "#b45309", fontWeight: 600, fontSize: 14, margin: 0 }}>
            Track your spelling journey
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {statItems.map((s, i) => (
            <div
              key={s.label}
              className="stat-card"
              style={{
                background: "#f9fafb",
                borderRadius: 16,
                padding: "16px 14px",
                textAlign: "center",
                border: "1px solid #e5e7eb",
                animationDelay: `${i * 0.05}s`,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>{s.emoji}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  fontWeight: 700,
                  marginTop: 2,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
