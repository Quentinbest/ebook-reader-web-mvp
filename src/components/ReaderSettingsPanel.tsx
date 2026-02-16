import type { ReaderPreferences } from "../types/contracts";

type ReaderSettingsPanelProps = {
  preferences: ReaderPreferences;
  onChange: (next: ReaderPreferences) => void;
};

export default function ReaderSettingsPanel({ preferences, onChange }: ReaderSettingsPanelProps): JSX.Element {
  return (
    <section className="panel">
      <h3>阅读设置</h3>
      <label>
        主题
        <select
          value={preferences.theme}
          onChange={(event) => onChange({ ...preferences, theme: event.target.value as ReaderPreferences["theme"] })}
        >
          <option value="light">浅色</option>
          <option value="dark">深色</option>
          <option value="sepia">护眼</option>
        </select>
      </label>
      <label>
        字体
        <select
          value={preferences.fontFamily}
          onChange={(event) => onChange({ ...preferences, fontFamily: event.target.value as ReaderPreferences["fontFamily"] })}
        >
          <option value="serif">衬线</option>
          <option value="sans">无衬线</option>
        </select>
      </label>
      <label>
        字号 {preferences.fontSize}px
        <input
          type="range"
          min={14}
          max={30}
          value={preferences.fontSize}
          onChange={(event) => onChange({ ...preferences, fontSize: Number(event.target.value) })}
        />
      </label>
      <label>
        行距 {preferences.lineHeight.toFixed(1)}
        <input
          type="range"
          min={1.3}
          max={2.1}
          step={0.1}
          value={preferences.lineHeight}
          onChange={(event) => onChange({ ...preferences, lineHeight: Number(event.target.value) })}
        />
      </label>
      <label>
        页边距 {preferences.pageMargin}px
        <input
          type="range"
          min={12}
          max={48}
          value={preferences.pageMargin}
          onChange={(event) => onChange({ ...preferences, pageMargin: Number(event.target.value) })}
        />
      </label>
    </section>
  );
}
