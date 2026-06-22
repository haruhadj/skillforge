export function TimerRing({ seconds, maxSeconds }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const pct = seconds / maxSeconds;
  const stroke = pct > 0.5 ? "#22c55e" : pct > 0.25 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={80} height={80} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={40}
        cy={40}
        r={r}
        fill="none"
        stroke="rgba(0,0,0,0.1)"
        strokeWidth={6}
      />
      <circle
        cx={40}
        cy={40}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={6}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
      />
      <text
        x={40}
        y={44}
        textAnchor="middle"
        fill={stroke}
        fontSize={18}
        fontWeight="bold"
        style={{ transform: "rotate(90deg)", transformOrigin: "40px 40px" }}
      >
        {seconds}
      </text>
    </svg>
  );
}
