type TelemetryNoticeProps = {
  value: boolean;
  onChange: (next: boolean) => Promise<void>;
  variant?: "default" | "compact";
};

export default function TelemetryNotice({
  value,
  onChange,
  variant = "default"
}: TelemetryNoticeProps): JSX.Element {
  const compact = variant === "compact";

  return (
    <div className={`telemetry-notice ${compact ? "telemetry-notice--compact" : ""}`.trim()}>
      <div className="telemetry-notice__copy">
        <strong>{compact ? "稳定性统计" : "匿名数据"}</strong>
        <p>{compact ? "仅记录匿名导入与稳定性质量信号" : "用于导入成功率、崩溃率和留存分析"}</p>
      </div>
      <label>
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => {
            void onChange(event.target.checked);
          }}
        />
        {compact ? "允许统计" : "允许匿名遥测"}
      </label>
    </div>
  );
}
