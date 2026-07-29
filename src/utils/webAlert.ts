import { Alert, AlertButton, Platform } from "react-native";

type BrowserDialogs = {
  alert: (message: string) => void;
  confirm: (message: string) => boolean;
};

type BrowserGlobal = typeof globalThis & Partial<BrowserDialogs>;

const messageText = (title: string, message?: string) =>
  [title, message].filter(Boolean).join("\n\n");

export const executeWebAlert = (
  title: string,
  message: string | undefined,
  buttons: AlertButton[] | undefined,
  dialogs: BrowserDialogs,
) => {
  const actions = buttons ?? [];
  const text = messageText(title, message);

  if (actions.length <= 1) {
    dialogs.alert(text);
    actions[0]?.onPress?.();
    return;
  }

  const cancel = actions.find((button) => button.style === "cancel") ?? actions[0];
  const confirm =
    actions.find((button) => button.style === "destructive") ??
    actions.find((button) => button !== cancel) ??
    actions[actions.length - 1];

  if (dialogs.confirm(text)) {
    confirm?.onPress?.();
  } else {
    cancel?.onPress?.();
  }
};

let installed = false;

export const installWebAlertPolyfill = () => {
  if (installed || Platform.OS !== "web") return;

  const browser = globalThis as BrowserGlobal;
  if (typeof browser.alert !== "function" || typeof browser.confirm !== "function") return;

  installed = true;
  Alert.alert = (title, message, buttons) =>
    executeWebAlert(title, message, buttons, {
      alert: browser.alert!.bind(browser),
      confirm: browser.confirm!.bind(browser),
    });
};
