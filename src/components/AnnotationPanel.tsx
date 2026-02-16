import { useState } from "react";
import type { FormEvent } from "react";
import type { Annotation, AnnotationColor } from "../types/contracts";

type AnnotationPanelProps = {
  currentLocator: string;
  annotations: Annotation[];
  onCreate: (payload: { locator: string; quote: string; note?: string; color: AnnotationColor }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLocate: (locator: string) => void;
};

export default function AnnotationPanel({
  currentLocator,
  annotations,
  onCreate,
  onDelete,
  onLocate
}: AnnotationPanelProps): JSX.Element {
  const [quote, setQuote] = useState("");
  const [note, setNote] = useState("");
  const [color, setColor] = useState<AnnotationColor>("yellow");
  const [busy, setBusy] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!quote.trim()) {
      return;
    }
    setBusy(true);
    try {
      await onCreate({
        locator: currentLocator,
        quote: quote.trim(),
        note: note.trim() || undefined,
        color
      });
      setQuote("");
      setNote("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h3>批注</h3>
      <form className="annotation-form" onSubmit={handleCreate}>
        <label>
          当前位置
          <input value={currentLocator} readOnly />
        </label>
        <label>
          引文
          <textarea value={quote} onChange={(event) => setQuote(event.target.value)} placeholder="粘贴或输入要标注的文本" />
        </label>
        <label>
          备注
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="可选" />
        </label>
        <label>
          颜色
          <select value={color} onChange={(event) => setColor(event.target.value as AnnotationColor)}>
            <option value="yellow">黄色</option>
            <option value="green">绿色</option>
            <option value="blue">蓝色</option>
            <option value="pink">粉色</option>
          </select>
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "保存中..." : "新增批注"}
        </button>
      </form>
      <ul className="annotation-list">
        {annotations.map((annotation) => (
          <li key={annotation.id}>
            <button type="button" onClick={() => onLocate(annotation.locator)}>
              {annotation.locator}
            </button>
            <p>{annotation.quote}</p>
            {annotation.note ? <small>{annotation.note}</small> : null}
            <div className="annotation-actions">
              <span className={`dot dot-${annotation.color}`} aria-hidden />
              <button type="button" onClick={() => onDelete(annotation.id)}>
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
