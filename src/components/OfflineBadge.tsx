import { useEffect, useState } from "react";

type OfflineBadgeProps = {
  variant?: "default" | "quiet";
  showOnline?: boolean;
};

export default function OfflineBadge({
  variant = "default",
  showOnline = true
}: OfflineBadgeProps): JSX.Element | null {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online && !showOnline) {
    return null;
  }

  const label = online ? "在线" : variant === "quiet" ? "离线" : "离线可读";
  const title = online ? "网络连接正常" : "当前离线，可继续阅读已缓存内容";

  return (
    <span className={`offline-badge offline-badge--${variant} ${online ? "is-online" : "is-offline"}`} title={title}>
      {label}
    </span>
  );
}
