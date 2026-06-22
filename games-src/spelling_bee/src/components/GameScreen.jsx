import { BeeMascot } from "./BeeMascot";
import { CoinBurst } from "./CoinBurst";
import { TimerRing } from "./TimerRing";
import { GameSettings } from "./GameSettings";
import { CATEGORY_INFO } from "../data/constants";

export function GameScreen({
  styles,
  theme,
  config,
  setConfig,
  coins,
  activeAccessories,
  mood,
  streak,
  maxStreak,
  score,
  doubleCoinsActive,
  showCoinBurst,
  notification,
  currentWord,
  currentIdx,
  wordList,
  inputVal,
  setInputVal,
  inputRef,
  timeLeft,
  frozen,
  feedback,
  shake,
  hintLevel,
  hintText,
  boosts,
  timeFreezeLeft,
  showSettings,
  results,
  timerRef,
  onSubmit,
  onSpeak,
  onBuyHint,
  onTimeFreeze,
  onQuit,
  onShowSettings,
  onHideSettings,
  onLaunchRound,
}) {
  if (showSettings) {
    const gameInProgress = wordList.length > 0 && currentIdx < wordList.length && results.length > 0;
    return (
      <GameSettings
        config={config}
        setConfig={setConfig}
        styles={styles}
        theme={theme}
        coins={coins}
        onBack={() => { if (gameInProgress) { onHideSettings(); } else { onQuit(); } }}
        onStart={() => onLaunchRound(false)}
        gameInProgress={gameInProgress}
        onResume={onHideSettings}
      />
    );
  }

  if (!currentWord) {
    return (
      <div style={{ ...styles.app, justifyContent: "center" }}>
        <button
          onClick={() => {
            clearInterval(timerRef.current);
            onQuit();
          }}
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            background: "rgba(255,255,255,0.8)",
            border: "none",
            borderRadius: 12,
            padding: "8px 14px",
            fontWeight: 700,
            cursor: "pointer",
            color: "#78350f",
          }}
        >
          ✕ Exit
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 80, animation: "spin 1s linear infinite" }}>🐝</div>
          <p style={{ color: "#92400e", fontWeight: 700, fontSize: 20 }}>Gathering words…</p>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  const pct = (currentIdx / wordList.length) * 100;
  const hintCosts = [0, 5, 10, 15, 20];

  return (
    <div style={{ ...styles.app, justifyContent: "flex-start" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap');
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        .shake{animation:shake 0.5s ease}
        .pulse{animation:pulse 0.4s ease}
      `}</style>
      <CoinBurst show={showCoinBurst} />
      {notification && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#dbeafe",
            color: "#1e40af",
            padding: "10px 20px",
            borderRadius: 14,
            fontWeight: 700,
            zIndex: 1000,
          }}
        >
          {notification.msg}
        </div>
      )}

      <div style={{ width: "100%", maxWidth: 520 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                clearInterval(timerRef.current);
                onQuit();
              }}
              style={{
                background: "rgba(255,255,255,0.8)",
                border: "none",
                borderRadius: 12,
                padding: "8px 14px",
                fontWeight: 700,
                cursor: "pointer",
                color: "#78350f",
              }}
            >
              ✕ Quit
            </button>
            <button
              onClick={() => {
                clearInterval(timerRef.current);
                onShowSettings();
              }}
              style={{
                background: "rgba(255,255,255,0.8)",
                border: "none",
                borderRadius: 12,
                padding: "8px 14px",
                fontWeight: 700,
                cursor: "pointer",
                color: "#78350f",
              }}
            >
              ⚙️
            </button>
          </div>
          <div style={{ textAlign: "center" }}>
            <BeeMascot mood={mood} accessories={activeAccessories} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, color: "#92400e", fontSize: 18 }}>
              🪙 {coins}
            </div>
            {streak >= 3 && (
              <div
                style={{ fontSize: 13, fontWeight: 700, color: "#ea580c" }}
              >
                🔥 {streak} streak!
              </div>
            )}
            {doubleCoinsActive && (
              <div
                style={{ fontSize: 11, color: "#9d174d", fontWeight: 700 }}
              >
                🧲 2× ON
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.5)",
            borderRadius: 12,
            height: 8,
            marginBottom: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: theme.accent,
              borderRadius: 12,
              transition: "width 0.5s ease",
            }}
          />
        </div>
        <div
          style={{
            textAlign: "center",
            color: "#78350f",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          Word {currentIdx + 1} of {wordList.length}
        </div>

        <div style={{ ...styles.card, marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#9ca3af",
                  fontWeight: 600,
                }}
              >
                Spell this word
              </p>
              {currentWord.partOfSpeech && (
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    marginTop: 4,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      background: "#e0e7ff",
                      borderRadius: 8,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#4338ca",
                    }}
                  >
                    {CATEGORY_INFO[currentWord.partOfSpeech]?.emoji || "📝"}{" "}
                    {currentWord.partOfSpeech}
                  </span>
                  {currentWord.topic &&
                    currentWord.topic !== "general" && (
                      <span
                        style={{
                          background: "#fce7f3",
                          borderRadius: 8,
                          padding: "2px 8px",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#9d174d",
                        }}
                      >
                        {CATEGORY_INFO[currentWord.topic]?.emoji || "📌"}{" "}
                        {currentWord.topic}
                      </span>
                    )}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <span
                  style={{
                    background: "#fef9c3",
                    borderRadius: 8,
                    padding: "2px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#92400e",
                  }}
                >
                  ✅ {score}
                </span>
                {maxStreak > 0 && (
                  <span
                    style={{
                      background: "#fff7ed",
                      borderRadius: 8,
                      padding: "2px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#c2410c",
                    }}
                  >
                    🔥 Best: {maxStreak}
                  </span>
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <TimerRing
                seconds={timeLeft}
                maxSeconds={config.timerSeconds}
              />
              {frozen && (
                <span
                  style={{ fontSize: 11, color: "#3b82f6", fontWeight: 700 }}
                >
                  FROZEN
                </span>
              )}
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <button
              onClick={() => onSpeak(currentWord.word)}
              style={{
                background: `${theme.accent}22`,
                border: `2px solid ${theme.accent}`,
                borderRadius: 16,
                padding: "14px 32px",
                fontSize: 18,
                fontWeight: 800,
                cursor: "pointer",
                color: "#92400e",
                width: "100%",
              }}
            >
              🔊 Hear the Word
            </button>
          </div>

          <div className={shake ? "shake" : ""}>
            <input
              ref={inputRef}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputVal.trim() && !feedback)
                  onSubmit();
              }}
              placeholder="Type spelling here…"
              disabled={!!feedback}
              style={{
                ...styles.input,
                borderColor: feedback
                  ? feedback.type === "correct"
                    ? "#22c55e"
                    : "#ef4444"
                  : theme.accent,
              }}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              autoCapitalize="off"
            />
          </div>

          {feedback && (
            <div
              style={{
                textAlign: "center",
                marginTop: 12,
                padding: "12px",
                borderRadius: 14,
                background:
                  feedback.type === "correct" ? "#dcfce7" : "#fee2e2",
                color: feedback.type === "correct" ? "#15803d" : "#991b1b",
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              {feedback.msg}
            </div>
          )}

          {!feedback && (
            <button
              onClick={onSubmit}
              disabled={!inputVal.trim()}
              style={{
                ...styles.btn(),
                width: "100%",
                marginTop: 12,
                fontSize: 18,
                padding: "14px",
                opacity: inputVal.trim() ? 1 : 0.5,
              }}
            >
              Submit ✓
            </button>
          )}
        </div>

        <div style={{ ...styles.card, padding: "16px 20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: hintText ? 10 : 0,
            }}
          >
            <span style={{ fontWeight: 700, color: "#78350f", fontSize: 14 }}>
              💡 Hints ({4 - hintLevel} left)
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {timeFreezeLeft > 0 && (
                <button
                  onClick={onTimeFreeze}
                  style={{
                    ...styles.btn("#3b82f6", true),
                    fontSize: 12,
                    padding: "6px 12px",
                  }}
                >
                  ❄️ Freeze ×{timeFreezeLeft}
                </button>
              )}
              {hintLevel < 4 && !feedback && (
                <button
                  onClick={onBuyHint}
                  style={{
                    ...styles.btn(theme.accent, true),
                    fontSize: 12,
                    padding: "6px 12px",
                  }}
                >
                  Buy hint{" "}
                  {boosts.hint_boost > 0
                    ? "(free)"
                    : `🪙 ${hintCosts[hintLevel + 1]}`}
                </button>
              )}
            </div>
          </div>
          {hintText && (
            <div
              style={{
                background: "#fef9c3",
                borderRadius: 12,
                padding: "10px 14px",
                fontSize: 14,
                color: "#78350f",
                fontWeight: 600,
                borderLeft: `3px solid ${theme.accent}`,
              }}
            >
              {
                [
                  "Part of speech",
                  "Definition",
                  "Example sentence",
                  "First & last letters",
                ][hintLevel - 1]
              }
              : {hintText}
            </div>
          )}
          {hintLevel > 0 && hintLevel < 4 && (
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {[1, 2, 3, 4].map((l) => (
                <div
                  key={l}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 4,
                    background: l <= hintLevel ? theme.accent : "#e5e7eb",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
