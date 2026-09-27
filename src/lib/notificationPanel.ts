type NotificationPanelPosition = {
  triggerRight: number;
  headerRight: number;
  panelWidth: number;
  viewportWidth: number;
  gutter?: number;
};

/**
 * Returns the CSS `right` offset (relative to the bell) that aligns the panel
 * with the header's right edge without allowing either panel edge off-screen.
 */
export function clampNotificationPanelRight({
  triggerRight,
  headerRight,
  panelWidth,
  viewportWidth,
  gutter = 12
}: NotificationPanelPosition) {
  const maximumPanelRight = viewportWidth - gutter;
  const minimumPanelRight = Math.min(maximumPanelRight, panelWidth + gutter);
  const panelRight = Math.min(maximumPanelRight, Math.max(minimumPanelRight, headerRight));
  return triggerRight - panelRight;
}
