export function CoinBurst({ show }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: "40%",
        left: "50%",
        transform: "translate(-50%,-50%)",
        pointerEvents: "none",
        zIndex: 999,
      }}
    >
      {["🪙", "✨", "🪙", "⭐", "🪙"].map((c, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            fontSize: 28,
            animation: `coinfly${i} 0.8s ease-out forwards`,
            left: `${(i - 2) * 30}px`,
            top: 0,
          }}
        >
          {c}
        </span>
      ))}
      <style>{`
        @keyframes coinfly0{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(-60px,-80px) scale(0.5);opacity:0}}
        @keyframes coinfly1{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(-30px,-100px) scale(0.5);opacity:0}}
        @keyframes coinfly2{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(0px,-90px) scale(0.5);opacity:0}}
        @keyframes coinfly3{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(30px,-100px) scale(0.5);opacity:0}}
        @keyframes coinfly4{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(60px,-80px) scale(0.5);opacity:0}}
      `}</style>
    </div>
  );
}
