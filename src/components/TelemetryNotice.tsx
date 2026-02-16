type TelemetryNoticeProps = {
  value: boolean;
  onChange: (next: boolean) => Promise<void>;
};

export default function TelemetryNotice({ value, onChange }: TelemetryNoticeProps): JSX.Element {
  return (
    <div className="telemetry-notice">
      <p>匿名数据：用于导入成功率、崩溃率和留存分析</p>
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
