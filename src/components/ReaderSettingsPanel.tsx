import type { ReaderPreferences } from "../types/contracts";

type ReaderSettingsPanelProps = {
  preferences: ReaderPreferences;
  pageLayout: "single" | "multi";
  onChange: (next: ReaderPreferences) => void;
  onPageLayoutChange: (next: "single" | "multi") => void;
};

export default function ReaderSettingsPanel({
  preferences,
  pageLayout,
  onChange,
  onPageLayoutChange
}: ReaderSettingsPanelProps): JSX.Element {
  return (
    <section className="settings-panel">
      <div className="settings-panel__group">
        <div className="settings-panel__label">Theme</div>
        <div className="settings-segmented" role="group" aria-label="主题">
          {[
            ["light", "浅色"],
            ["dark", "深色"],
            ["sepia", "护眼"]
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={preferences.theme === value ? "is-active" : undefined}
              onClick={() => onChange({ ...preferences, theme: value as ReaderPreferences["theme"] })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-panel__group">
        <div className="settings-panel__label">Layout</div>
        <div className="settings-segmented" role="group" aria-label="版式">
          <button
            type="button"
            className={pageLayout === "single" ? "is-active" : undefined}
            onClick={() => onPageLayoutChange("single")}
          >
            单页
          </button>
          <button
            type="button"
            className={pageLayout === "multi" ? "is-active" : undefined}
            onClick={() => onPageLayoutChange("multi")}
          >
            双页
          </button>
        </div>
      </div>

      <div className="settings-panel__group">
        <label className="settings-field">
          <span>Font family</span>
          <select
            value={preferences.fontFamily}
            onChange={(event) =>
              onChange({ ...preferences, fontFamily: event.target.value as ReaderPreferences["fontFamily"] })
            }
          >
            <option value="serif">衬线</option>
            <option value="sans">无衬线</option>
          </select>
        </label>
      </div>

      <div className="settings-panel__group">
        <label className="settings-field">
          <span>Font size {preferences.fontSize}px</span>
          <input
            type="range"
            min={14}
            max={30}
            value={preferences.fontSize}
            onChange={(event) => onChange({ ...preferences, fontSize: Number(event.target.value) })}
          />
        </label>
      </div>

      <div className="settings-panel__group">
        <label className="settings-field">
          <span>Line height {preferences.lineHeight.toFixed(1)}</span>
          <input
            type="range"
            min={1.3}
            max={2.1}
            step={0.1}
            value={preferences.lineHeight}
            onChange={(event) => onChange({ ...preferences, lineHeight: Number(event.target.value) })}
          />
        </label>
      </div>

      <div className="settings-panel__group">
        <label className="settings-field">
          <span>Page margin {preferences.pageMargin}px</span>
          <input
            type="range"
            min={12}
            max={48}
            value={preferences.pageMargin}
            onChange={(event) => onChange({ ...preferences, pageMargin: Number(event.target.value) })}
          />
        </label>
      </div>
    </section>
  );
}
