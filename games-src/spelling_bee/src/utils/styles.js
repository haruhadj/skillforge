export function getStyles(theme) {
  return {
    app: {
      minHeight: "100vh",
      background: theme.bg,
      fontFamily: "'Nunito', 'Segoe UI', sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "20px 16px",
      position: "relative",
      transition: "background 0.8s ease",
    },
    card: {
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(12px)",
      borderRadius: 24,
      padding: "28px 32px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
      width: "100%",
      maxWidth: 520,
    },
    btn: (color = theme.accent, light = false) => ({
      background: light ? "transparent" : color,
      color: light ? "#374151" : "#fff",
      border: `2px solid ${color}`,
      borderRadius: 14,
      padding: "12px 24px",
      fontSize: 16,
      fontWeight: 700,
      cursor: "pointer",
      transition: "all 0.2s",
      fontFamily: "inherit",
    }),
    input: {
      width: "100%",
      fontSize: 28,
      fontWeight: 700,
      textAlign: "center",
      letterSpacing: 4,
      border: `3px solid ${theme.accent}`,
      borderRadius: 16,
      padding: "16px",
      background: "rgba(255,255,255,0.9)",
      outline: "none",
      boxSizing: "border-box",
      fontFamily: "inherit",
      color: "#1f2937",
    },
  };
}

export function getGrade(pct) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}
