export function Notification({ notification }) {
  if (!notification) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        background:
          notification.type === "danger"
            ? "#fee2e2"
            : notification.type === "success"
              ? "#dcfce7"
              : "#dbeafe",
        color:
          notification.type === "danger"
            ? "#991b1b"
            : notification.type === "success"
              ? "#166534"
              : "#1e40af",
        padding: "12px 24px",
        borderRadius: 16,
        fontWeight: 700,
        zIndex: 1000,
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      }}
    >
      {notification.msg}
    </div>
  );
}
