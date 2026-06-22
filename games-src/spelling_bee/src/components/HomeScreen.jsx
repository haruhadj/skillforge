import { BeeMascot } from "./BeeMascot";
import { CoinBurst } from "./CoinBurst";
import { Notification } from "./Notification";
import { getGrade } from "../utils/styles";

export function HomeScreen({
  styles,
  theme,
  activeAccessories,
  coins,
  doubleCoinsActive,
  showCoinBurst,
  notification,
  dailyScore,
  boosts,
  timeFreezeLeft,
  onStartGame,
  onDaily,
  onShop,
  onStats,
  stats,
}) {
  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}
        .bee-float{animation:float 3s ease-in-out infinite}
        .btn-hover:hover{transform:scale(1.04);box-shadow:0 4px 20px rgba(0,0,0,0.15)}
      `}</style>
      <CoinBurst show={showCoinBurst} />
      <Notification notification={notification} />
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div className="bee-float" style={{ fontSize: 80 }}>
          <BeeMascot mood="idle" accessories={activeAccessories} />
        </div>
        <h1
          style={{
            fontSize: 48,
            fontWeight: 900,
            color: "#92400e",
            margin: "8px 0 4px",
            textShadow: "0 2px 8px rgba(146,64,14,0.2)",
            letterSpacing: -1,
          }}
        >
          SkillBee
        </h1>
        <p
          style={{
            color: "#b45309",
            fontWeight: 600,
            fontSize: 16,
            margin: 0,
          }}
        >
          The Ultimate Spelling Adventure
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 12,
          }}
        >
          <span
            style={{
              background: "#fef9c3",
              border: "2px solid #fde047",
              borderRadius: 20,
              padding: "4px 16px",
              fontWeight: 800,
              color: "#713f12",
              fontSize: 16,
            }}
          >
            🪙 {coins} coins
          </span>
          {doubleCoinsActive && (
            <span
              style={{
                background: "#fef3c7",
                border: "2px solid #f59e0b",
                borderRadius: 20,
                padding: "4px 12px",
                fontWeight: 700,
                color: "#92400e",
                fontSize: 13,
              }}
            >
              🧲 2× ACTIVE
            </span>
          )}
        </div>
      </div>

      <div style={{ ...styles.card, marginBottom: 16 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <button
            className="btn-hover"
            onClick={() => onStartGame(false)}
            style={{
              ...styles.btn(),
              fontSize: 20,
              padding: "16px",
              borderRadius: 18,
              letterSpacing: 0.5,
            }}
          >
            🐝 Start Game
          </button>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
            }}
          >
            <button
              className="btn-hover"
              onClick={onDaily}
              style={{ ...styles.btn(theme.accent, true), fontSize: 14 }}
            >
              📅 Daily Challenge
            </button>
            <button
              className="btn-hover"
              onClick={onShop}
              style={{ ...styles.btn("#7c3aed", true), fontSize: 14 }}
            >
              🏪 Coin Shop
            </button>
            <button
              className="btn-hover"
              onClick={onStats}
              style={{ ...styles.btn("#2563eb", true), fontSize: 14 }}
            >
              📊 Stats
            </button>
          </div>
        </div>
      </div>

      {dailyScore !== null && (
        <div
          style={{
            ...styles.card,
            textAlign: "center",
            background: "rgba(254,243,199,0.95)",
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, color: "#92400e" }}>
            📅 Today's Score: {dailyScore?.score}/{dailyScore?.total} ·{" "}
            {getGrade((dailyScore?.score / dailyScore?.total) * 100)}
          </p>
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {boosts.hint_boost > 0 && (
          <span
            style={{
              background: "#fef9c3",
              borderRadius: 12,
              padding: "4px 12px",
              fontSize: 13,
              fontWeight: 700,
              color: "#713f12",
            }}
          >
            💡 ×{boosts.hint_boost} hints
          </span>
        )}
        {timeFreezeLeft > 0 && (
          <span
            style={{
              background: "#dbeafe",
              borderRadius: 12,
              padding: "4px 12px",
              fontSize: 13,
              fontWeight: 700,
              color: "#1e40af",
            }}
          >
            ❄️ ×{timeFreezeLeft} freezes
          </span>
        )}
        {boosts.double_coins > 0 && (
          <span
            style={{
              background: "#fce7f3",
              borderRadius: 12,
              padding: "4px 12px",
              fontSize: 13,
              fontWeight: 700,
              color: "#9d174d",
            }}
          >
            🧲 ×{boosts.double_coins} coin boosts
          </span>
        )}
      </div>
    </div>
  );
}
