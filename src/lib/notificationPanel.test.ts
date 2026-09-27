import { describe, expect, it } from 'vitest';
import { clampNotificationPanelRight } from './notificationPanel';

describe('clampNotificationPanelRight', () => {
  it('aligns with the header edge when the full panel fits', () => {
    expect(
      clampNotificationPanelRight({
        triggerRight: 880,
        headerRight: 948,
        panelWidth: 340,
        viewportWidth: 960
      })
    ).toBe(-68);
  });

  it('keeps the panel inside the right gutter', () => {
    expect(
      clampNotificationPanelRight({
        triggerRight: 1016,
        headerRight: 1040,
        panelWidth: 340,
        viewportWidth: 1024
      })
    ).toBe(4);
  });

  it('keeps the panel inside the left gutter', () => {
    expect(
      clampNotificationPanelRight({
        triggerRight: 300,
        headerRight: 320,
        panelWidth: 340,
        viewportWidth: 1024
      })
    ).toBe(-52);
  });
});
