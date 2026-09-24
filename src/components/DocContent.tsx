import { useState } from 'react';
import type { DivingDoc, EquipmentSection, Severity } from '../types';
import { filterSectionsBySeverity } from '../lib/logic';

const assetPath = (icon: string) => `${import.meta.env.BASE_URL}img/${icon}.png`;

export function DocContent({ doc, preview = false }: { doc: DivingDoc; preview?: boolean }) {
  const [filter, setFilter] = useState<Severity | 'all'>('all');
  const [open, setOpen] = useState<number[]>(() => (preview || window.innerWidth >= 600 ? doc.body.sections.map((section) => section.no) : [doc.body.sections[0]?.no ?? 0]));
  const sections = filterSectionsBySeverity(doc.body.sections, filter);
  const toggle = (number: number) => setOpen((items) => (items.includes(number) ? items.filter((item) => item !== number) : [...items, number]));
  return (
    <article className="doc-detail">
      <p className="kicker">{doc.category}</p>
      <h1>{doc.title}</h1>
      <p className="lead">{doc.body.intro}</p>
      <div className="legend" aria-label="症状の凡例">
        <span className="stop-dot">● 使用を中止してすぐ点検・交換</span>
        <span className="check-dot">● 早めに点検・交換を検討</span>
      </div>
      <nav className="anchor-chips" aria-label="機材を選ぶ">
        {doc.body.sections.map((section) => (
          <a href={`#equipment-${section.no}`} key={section.no}>{`${section.no}. ${section.name}`}</a>
        ))}
      </nav>
      <div className="filter-row" aria-label="症状を絞り込む">
        <button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>すべて</button>
        <button className={filter === 'stop' ? 'selected danger-choice' : ''} onClick={() => setFilter('stop')}>● 即中止のみ</button>
      </div>
      <div className="equipment-grid">
        {sections.map((section) => (
          <EquipmentPanel key={section.no} section={section} isOpen={open.includes(section.no)} onToggle={() => toggle(section.no)} />
        ))}
      </div>
      {filter === 'stop' && sections.length === 0 && <p className="empty">即中止の症状はありません。</p>}
      <section className="habits" aria-labelledby="habits-title">
        <p className="kicker">日々のケア</p>
        <h2 id="habits-title">機材を長持ちさせる 3つの習慣</h2>
        <div className="habit-grid">
          {doc.body.habits.map((habit, index) => (
            <div className="panel habit" key={`${habit.title}-${index}`}>
              <strong>{habit.title}</strong>
              <p>{habit.text}</p>
            </div>
          ))}
        </div>
      </section>
      <aside className="disclaimer">{doc.body.disclaimer}</aside>
    </article>
  );
}

export function EquipmentPanel({ section, isOpen, onToggle }: { section: EquipmentSection; isOpen: boolean; onToggle: () => void }) {
  return (
    <section id={`equipment-${section.no}`} className="panel equipment">
      <button className="equipment-toggle" onClick={onToggle} aria-expanded={isOpen}>
        <img src={assetPath(section.icon)} alt="" />
        <span><b>{`${section.no}. ${section.name}`}</b><small>{section.sub}</small></span>
        <span className="chevron" aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="equipment-body">
          <ul className="sign-list">
            {section.signs.map((sign, index) => (
              <li key={`${sign.sign}-${index}`} className={sign.level}>
                <p><span aria-hidden="true">●</span><strong>{sign.sign}</strong></p>
                <p className="why">→ {sign.why}</p>
              </li>
            ))}
          </ul>
          <div className="guideline"><b>交換・点検の目安</b><p>{section.guideline}</p></div>
        </div>
      )}
    </section>
  );
}

export function DocCard({ doc }: { doc: DivingDoc }) {
  const icon = doc.icon || doc.body.sections[0]?.icon || 'mask';
  return (
    <a className="panel doc-card" href={`${import.meta.env.BASE_URL}docs/${doc.slug}`}>
      <img src={assetPath(icon)} alt="" />
      <span><small className="kicker">{doc.category}</small><b>{doc.title}</b><p>{doc.summary}</p></span>
    </a>
  );
}
