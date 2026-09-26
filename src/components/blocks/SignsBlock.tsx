import { useState } from 'react';
import type { EquipmentSection, Severity } from '../../types';
import { filterSectionsBySeverity } from '../../lib/logic';

const assetPath = (icon: string) => `${import.meta.env.BASE_URL}img/${icon}.png`;

export function SignsBlock({
  sections,
  preview = false
}: {
  sections: EquipmentSection[];
  preview?: boolean;
}) {
  const [filter, setFilter] = useState<Severity | 'all'>('all');
  const [open, setOpen] = useState<number[]>(() =>
    preview || window.innerWidth >= 600
      ? sections.map((section) => section.no)
      : [sections[0]?.no ?? 0]
  );
  const visible = filterSectionsBySeverity(sections, filter);
  const toggle = (number: number) =>
    setOpen((items) =>
      items.includes(number) ? items.filter((item) => item !== number) : [...items, number]
    );

  return (
    <section className="signs-block" aria-label="機材の劣化・寿命のサイン">
      <div className="legend" aria-label="症状の凡例">
        <span className="stop-dot">● 使用を中止してすぐ点検・交換</span>
        <span className="check-dot">● 早めに点検・交換を検討</span>
      </div>
      <div className="filter-row" aria-label="症状を絞り込む">
        <button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>
          すべて
        </button>
        <button
          className={filter === 'stop' ? 'selected danger-choice' : ''}
          onClick={() => setFilter('stop')}
        >
          <span className="always-red">●</span> 即中止のみ
        </button>
      </div>
      <div className="equipment-grid">
        {visible.map((section) => (
          <EquipmentPanel
            key={section.no}
            section={section}
            isOpen={open.includes(section.no)}
            onToggle={() => toggle(section.no)}
          />
        ))}
      </div>
      {filter === 'stop' && visible.length === 0 && (
        <p className="empty">即中止の症状はありません。</p>
      )}
    </section>
  );
}

export function EquipmentPanel({
  section,
  isOpen,
  onToggle
}: {
  section: EquipmentSection;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <section id={`equipment-${section.no}`} className="panel equipment">
      <button className="equipment-toggle" onClick={onToggle} aria-expanded={isOpen}>
        <img src={assetPath(section.icon)} alt="" />
        <span>
          <b>{`${section.no}. ${section.name}`}</b>
          <small>{section.sub}</small>
        </span>
        <span className="chevron" aria-hidden="true">
          {isOpen ? '−' : '+'}
        </span>
      </button>
      {isOpen && (
        <div className="equipment-body">
          <ul className="sign-list">
            {section.signs.map((sign, index) => (
              <li key={`${sign.sign}-${index}`} className={sign.level}>
                <p>
                  <span aria-hidden="true">●</span>
                  <strong>{sign.sign}</strong>
                </p>
                <p className="why">→ {sign.why}</p>
              </li>
            ))}
          </ul>
          <div className="guideline">
            <b>交換・点検の目安</b>
            <p>{section.guideline}</p>
          </div>
        </div>
      )}
    </section>
  );
}
