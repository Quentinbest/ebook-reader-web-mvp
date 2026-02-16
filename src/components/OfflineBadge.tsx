import { useEffect, useState } from "react";

export default function OfflineBadge(): JSX.Element {
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

  return <span className={`offline-badge ${online ? "is-online" : "is-offline"}`}>{online ? "在线" : "离线可读"}</span>;
}
