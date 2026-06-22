import { Notification } from "./Notification";
import { SHOP_ITEMS } from "../data/constants";

export function ShopScreen({
  styles,
  theme,
  coins,
  owned,
  activeTheme,
  activeAccessories,
  notification,
  shopTab,
  setShopTab,
  onBack,
  onBuy,
  onEquip,
}) {
  return (
    <div style={styles.app}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap');`}</style>
      <Notification notification={notification} />
      <div style={{ ...styles.card, maxWidth: 560 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
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
              fontSize: 24,
              margin: 0,
            }}
          >
            🏪 Coin Shop
          </h2>
          <span
            style={{
              background: "#fef9c3",
              border: "2px solid #fde047",
              borderRadius: 20,
              padding: "4px 14px",
              fontWeight: 800,
              color: "#713f12",
              fontSize: 15,
            }}
          >
            🪙 {coins}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["cosmetic", "theme", "boost"].map((t) => (
            <button
              key={t}
              onClick={() => setShopTab(t)}
              style={{
                ...styles.btn(
                  shopTab === t ? theme.accent : "#e5e7eb",
                  shopTab !== t,
                ),
                fontSize: 13,
                padding: "8px 16px",
                textTransform: "capitalize",
                flex: 1,
              }}
            >
              {t === "cosmetic"
                ? "✨ Cosmetic"
                : t === "theme"
                  ? "🎨 Themes"
                  : "⚡ Boosts"}
            </button>
          ))}
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          {SHOP_ITEMS.filter((i) => i.category === shopTab).map((item) => {
            const isOwned = owned.includes(item.id);
            const isActive =
              activeTheme === item.id || activeAccessories.includes(item.id);
            return (
              <div
                key={item.id}
                style={{
                  background: isActive ? "#fef9c3" : "#f9fafb",
                  border: `2px solid ${isOwned ? "#86efac" : "#e5e7eb"}`,
                  borderRadius: 16,
                  padding: 16,
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>
                  {item.emoji}
                </div>
                <p
                  style={{
                    fontWeight: 800,
                    color: "#1f2937",
                    margin: "0 0 4px",
                    fontSize: 15,
                  }}
                >
                  {item.name}
                </p>
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: 12,
                    margin: "0 0 12px",
                  }}
                >
                  {item.desc}
                </p>
                {isOwned ? (
                  item.category !== "boost" ? (
                    <button
                      onClick={() => onEquip(item)}
                      style={{
                        ...styles.btn(
                          isActive ? "#16a34a" : "#6b7280",
                          !isActive,
                        ),
                        fontSize: 12,
                        padding: "8px 12px",
                        width: "100%",
                      }}
                    >
                      {isActive ? "✓ Equipped" : "Equip"}
                    </button>
                  ) : (
                    <span
                      style={{
                        background: "#dcfce7",
                        color: "#15803d",
                        borderRadius: 10,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "block",
                        textAlign: "center",
                      }}
                    >
                      ✓ In Inventory
                    </span>
                  )
                ) : (
                  <button
                    onClick={() => onBuy(item)}
                    style={{
                      ...styles.btn(
                        coins >= item.price ? theme.accent : "#d1d5db",
                        coins < item.price,
                      ),
                      fontSize: 13,
                      padding: "8px 12px",
                      width: "100%",
                      opacity: coins < item.price ? 0.6 : 1,
                    }}
                  >
                    🪙 {item.price} coins
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
