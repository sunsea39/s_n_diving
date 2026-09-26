import { Link } from 'react-router-dom';
import type { PrintSettings } from '../lib/print';

const guidance =
  'PDF にするときは、印刷画面の送信先で「PDF として保存」を選んでください。iPhone は共有 → プリント → プレビューを 2 本指で広げると PDF になります。';

export function PrintControls({
  settings,
  onChange,
  backTo,
  backLabel
}: {
  settings: PrintSettings;
  onChange: (settings: PrintSettings) => void;
  backTo: string;
  backLabel: string;
}) {
  const update = <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <header className="print-controls">
      <div className="print-controls-options">
        <fieldset>
          <legend>形式</legend>
          <label>
            <input
              checked={settings.format === 'cards'}
              name="print-format"
              onChange={() => update('format', 'cards')}
              type="radio"
            />
            カード
          </label>
          <label>
            <input
              checked={settings.format === 'full'}
              name="print-format"
              onChange={() => update('format', 'full')}
              type="radio"
            />
            通し（全文）
          </label>
        </fieldset>
        {settings.format === 'cards' && (
          <>
            <fieldset>
              <legend>カードの大きさ</legend>
              <label>
                <input
                  checked={settings.cardSize === 'a6'}
                  name="print-card-size"
                  onChange={() => update('cardSize', 'a6')}
                  type="radio"
                />
                A6（はがき 105×148mm）
              </label>
              <label>
                <input
                  checked={settings.cardSize === 'a7'}
                  name="print-card-size"
                  onChange={() => update('cardSize', 'a7')}
                  type="radio"
                />
                A7（ポケット 74×105mm）
              </label>
            </fieldset>
            <fieldset>
              <legend>用紙</legend>
              <label>
                <input
                  checked={settings.paper === 'tiled'}
                  name="print-paper"
                  onChange={() => update('paper', 'tiled')}
                  type="radio"
                />
                A4 に並べて印刷（切り取り線つき）
              </label>
              <label>
                <input
                  checked={settings.paper === 'single'}
                  name="print-paper"
                  onChange={() => update('paper', 'single')}
                  type="radio"
                />
                カードの大きさで 1 枚ずつ
              </label>
            </fieldset>
            <fieldset>
              <legend>内容</legend>
              <label>
                <input
                  checked={settings.content === 'key'}
                  name="print-content"
                  onChange={() => update('content', 'key')}
                  type="radio"
                />
                要点のみ
              </label>
              <label>
                <input
                  checked={settings.content === 'full'}
                  name="print-content"
                  onChange={() => update('content', 'full')}
                  type="radio"
                />
                要点＋本文
              </label>
            </fieldset>
          </>
        )}
      </div>
      <div className="print-controls-actions">
        <button className="button" onClick={() => window.print()}>
          印刷・PDF 保存
        </button>
        <Link className="button-secondary" to={backTo}>
          {backLabel}
        </Link>
      </div>
      <p className="print-guidance">{guidance}</p>
    </header>
  );
}

export function FixedPrintControls({ backTo, backLabel }: { backTo: string; backLabel: string }) {
  return (
    <header className="print-controls print-controls--fixed">
      <p>通し（全文）・A4 で印刷します。</p>
      <div className="print-controls-actions">
        <button className="button" onClick={() => window.print()}>
          印刷・PDF 保存
        </button>
        <Link className="button-secondary" to={backTo}>
          {backLabel}
        </Link>
      </div>
      <p className="print-guidance">{guidance}</p>
    </header>
  );
}
