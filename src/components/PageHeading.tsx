/* eslint-disable react-refresh/only-export-components */
import { useAppData } from '../context/AppDataContext';
import type { PageText } from '../types';

export const DEFAULT_PAGE_TEXTS: Record<PageText['key'], Omit<PageText, 'key'>> = {
  home: {
    kicker: 'ダイビング情報の共有サイト',
    title: '知って潜れば、海はもっと楽しい。',
    lead: '機材のこと、事故から学べること、仲間の経験。理解を深めて、安全に楽しく潜るための情報をここで共有します。'
  },
  docs: { kicker: '資料', title: '安全資料', lead: '潜る前に、仲間どうしで確認したい情報です。' },
  accidents: {
    kicker: '事故事例',
    title: '事故から学ぶ',
    lead: 'なぜ起きたか、どうすれば防げたかを考えるための事例です。'
  },
  board: { kicker: '掲示板', title: 'みんなの記録', lead: '' },
  news: { kicker: 'お知らせ', title: 'お知らせ', lead: '' },
  more: {
    kicker: 'その他',
    title: 'このサイトについて',
    lead: 'ダイビング情報の共有サイト。仲間どうしで知識や経験を共有し、より理解を深めて、安全に楽しく潜れるようにしたい。'
  }
};
export function usePageText(key: PageText['key']) {
  const { pageTexts } = useAppData();
  return pageTexts[key] ?? DEFAULT_PAGE_TEXTS[key];
}
export function PageHeading({ page, className }: { page: PageText['key']; className?: string }) {
  const text = usePageText(page);
  return (
    <div className={className}>
      <p className="kicker">{text.kicker}</p>
      <h1>{text.title}</h1>
      {text.lead && <p className="lead">{text.lead}</p>}
    </div>
  );
}
