import { useParams } from 'react-router-dom';
import { FixedPrintControls } from '../components/PrintControls';
import { useAppData } from '../context/AppDataContext';
import { accidentOutcomeMeta } from '../lib/logic';
import { usePageTitle } from '../lib/pageTitle';

export function AccidentPrintPage() {
  const { slug } = useParams();
  const { accidents, docs } = useAppData();
  const accident = accidents.find((item) => item.slug === slug);
  usePageTitle(accident ? `${accident.title}（印刷）` : '事故事例の印刷');

  if (!accident) {
    return (
      <main className="print-page print-page--missing">
        <p>事故事例が見つかりません。</p>
      </main>
    );
  }

  const outcome = accidentOutcomeMeta(accident.outcome);
  const related = docs.filter((doc) => accident.related_doc_slugs.includes(doc.slug));
  return (
    <main className="print-page print-page--full print-page--accident">
      <FixedPrintControls backLabel="事故事例に戻る" backTo={`/accidents/${accident.slug}`} />
      <article className="print-full print-accident">
        <span className={'outcome-badge ' + outcome.className}>{outcome.label}</span>
        <h1>{accident.title}</h1>
        <table className="fact-table">
          <tbody>
            <tr>
              <th>発生時期</th>
              <td>{accident.occurred_label || accident.occurred_on || '不明'}</td>
            </tr>
            <tr>
              <th>場所</th>
              <td>{accident.location || '不明'}</td>
            </tr>
            <tr>
              <th>スタイル</th>
              <td>{accident.dive_style || '不明'}</td>
            </tr>
            <tr>
              <th>結果</th>
              <td>{outcome.label}</td>
            </tr>
          </tbody>
        </table>
        <section>
          <h2>概要</h2>
          <p>{accident.summary}</p>
        </section>
        {accident.timeline.length > 0 && (
          <section>
            <h2>経過</h2>
            <div className="timeline">
              {accident.timeline.map((item, index) => (
                <div key={index}>
                  <b>{item.time}</b>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}
        {accident.causes.length > 0 && (
          <section>
            <h2>考えられる原因</h2>
            <ul>
              {accident.causes.map((cause, index) => (
                <li key={index}>{cause}</li>
              ))}
            </ul>
          </section>
        )}
        {accident.lessons.length > 0 && (
          <section className="lessons-panel">
            <h2>防ぐためのポイント</h2>
            <ul>
              {accident.lessons.map((lesson, index) => (
                <li key={index}>・{lesson}</li>
              ))}
            </ul>
          </section>
        )}
        {related.length > 0 && (
          <section>
            <h2>関連資料</h2>
            <ul>
              {related.map((doc) => (
                <li key={doc.slug}>{doc.title}</li>
              ))}
            </ul>
          </section>
        )}
        {accident.sources.length > 0 && (
          <section>
            <h2>出典</h2>
            <ul className="links-block">
              {accident.sources.map((source, index) => (
                <li key={index}>
                  <a href={source.url}>{source.label}</a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <aside className="disclaimer">
          事故事例は学びのために要約したものです。詳細は出典をご確認ください。
        </aside>
      </article>
    </main>
  );
}
