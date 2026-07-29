export const ACTION_MENU_CLOSE_DELAY_MS = 200;

type Schedule = (callback: () => void, delay: number) => unknown;

export const runAfterActionMenuClose = (
  onClose: () => void,
  action: () => void,
  schedule: Schedule = setTimeout,
): void => {
  onClose();
  schedule(action, ACTION_MENU_CLOSE_DELAY_MS);
};
