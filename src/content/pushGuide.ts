export type PushGuideDevice = 'iphone' | 'android';

export type PushGuideSection = {
  title: string;
  steps?: PushGuideItem[];
  notes?: PushGuideItem[];
};

export type PushGuideItem = {
  text: string;
  bold?: string[];
};

export type PushGuide = {
  sections: PushGuideSection[];
};

/** Defaults to iPhone so the guide remains useful for unrecognised devices. */
export function detectPushGuideDevice(userAgent = '', maxTouchPoints = 0): PushGuideDevice {
  if (/Android/i.test(userAgent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) {
    return 'iphone';
  }
  return 'iphone';
}

export const pushGuide: Record<PushGuideDevice, PushGuide> = {
  iphone: {
    sections: [
      {
        title: '① ホーム画面に登録する',
        steps: [
          {
            text: 'Safari でこのサイトを開く（LINE などのアプリ内で開いている場合は、右下などのメニューから「Safari で開く」）',
            bold: ['Safari']
          },
          {
            text: '画面下の共有ボタン（四角から上向きの矢印）を押す',
            bold: ['共有ボタン']
          },
          {
            text: '「ホーム画面に追加」を選び、右上の「追加」を押す',
            bold: ['「ホーム画面に追加」', '「追加」']
          },
          {
            text: 'ホーム画面に追加された N×S_Diving のアイコンから開き直す',
            bold: ['N×S_Diving のアイコン']
          }
        ]
      },
      {
        title: '② 通知を受ける設定',
        steps: [
          { text: 'ホーム画面のアイコンから開いたまま、ログインする' },
          {
            text: 'マイページ →「通知」で「オン」を押す',
            bold: ['マイページ →「通知」', '「オン」']
          },
          { text: '「通知を送信します」と聞かれたら「許可」', bold: ['「許可」'] },
          { text: '「テスト通知を送る」で届くか確認する', bold: ['「テスト通知を送る」'] }
        ]
      },
      {
        title: 'うまくいかないとき',
        notes: [
          { text: 'iOS 16.4 以降が必要（設定 → 一般 → 情報 で確認できる）' },
          { text: 'Safari のタブのままでは通知を受け取れない。必ずホーム画面のアイコンから開く' },
          {
            text: '「許可しない」を押してしまったら：iPhone の 設定 → 通知 → N×S_Diving で「通知を許可」をオン',
            bold: ['設定 → 通知 → N×S_Diving']
          },
          { text: '集中モード（おやすみモード等）の間は通知が表示されないことがある' }
        ]
      }
    ]
  },
  android: {
    sections: [
      {
        title: '① ホーム画面に登録する（任意）',
        steps: [
          {
            text: 'Chrome でこのサイトを開く（LINE などのアプリ内で開いている場合は、メニューから「Chrome で開く」）',
            bold: ['Chrome']
          },
          {
            text: '右上の「︙」 → 「アプリをインストール」（または「ホーム画面に追加」）',
            bold: ['「︙」', '「アプリをインストール」']
          },
          {
            text: '「インストール」を押すと、ホーム画面に N×S_Diving のアイコンが追加される',
            bold: ['「インストール」']
          }
        ],
        notes: [{ text: '登録しなくても、Chrome のままで通知を受け取れる' }]
      },
      {
        title: '② 通知を受ける設定',
        steps: [
          {
            text: 'ログインして マイページ →「通知」で「オン」を押す',
            bold: ['マイページ →「通知」', '「オン」']
          },
          { text: '「通知の送信を許可しますか？」で「許可」', bold: ['「許可」'] },
          { text: '「テスト通知を送る」で届くか確認する', bold: ['「テスト通知を送る」'] }
        ]
      },
      {
        title: 'うまくいかないとき',
        notes: [
          {
            text: '端末の 設定 → アプリ → Chrome → 通知 がオンになっているか',
            bold: ['設定 → アプリ → Chrome → 通知']
          },
          {
            text: 'サイトの通知をブロックしてしまったら：Chrome でサイトを開き、アドレスバー左のアイコン → 権限 → 通知 → 許可',
            bold: ['権限 → 通知 → 許可']
          },
          {
            text: '通知が遅れる場合は 設定 → アプリ → Chrome → バッテリー を「制限なし」に',
            bold: ['設定 → アプリ → Chrome → バッテリー']
          },
          { text: 'Samsung Internet・Firefox でも受け取れる' }
        ]
      }
    ]
  }
};

export const pushGuideClosingNote =
  '通知の設定は端末ごとです。スマホとパソコンなど、受け取りたい端末それぞれでオンにしてください。';
