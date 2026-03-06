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
  return (
    <div className={`telemetry-notice ${variant === "compact" ? "telemetry-notice--compact" : ""}`.trim()}>
      <div className="telemetry-notice__copy">
        <strong>匿名数据</strong>
        <p>{variant === "compact" ? "仅用于稳定性与导入质量统计" : "用于导入成功率、崩溃率和留存分析"}</p>
      </div>
      <label>
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => {
            void onChange(event.target.checked);
          }}
        />
        允许匿名遥测
      </label>
    </div>
  );
}
