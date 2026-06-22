export function BeeMascot({ mood, accessories }) {
  const hasCrown = accessories.includes("bee_crown");
  const hasShades = accessories.includes("bee_shades");
  const faces = {
    happy: "😄",
    excited: "🤩",
    sad: "😢",
    nervous: "😰",
    thinking: "🤔",
    celebrating: "🥳",
    idle: "🙂",
  };
  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        fontSize: 56,
        lineHeight: 1,
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))",
        transition: "transform 0.3s",
        transform:
          mood === "celebrating"
            ? "rotate(-10deg) scale(1.2)"
            : mood === "sad"
              ? "rotate(10deg)"
              : "rotate(0deg)",
      }}
    >
      {hasCrown && (
        <div
          style={{
            position: "absolute",
            top: -18,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 24,
          }}
        >
          👑
        </div>
      )}
      🐝
      {hasShades && (
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 20,
          }}
        >
          🕶️
        </div>
      )}
      <div
        style={{
          position: "absolute",
          bottom: -8,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 28,
        }}
      >
        {faces[mood] || "🙂"}
      </div>
    </div>
  );
}
