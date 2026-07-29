type AlertButtonLike = {
  text?: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: (value?: string) => void;
};

type AlertApi = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButtonLike[],
    options?: unknown,
  ) => void;
};

type BrowserDialogs = {
  alert: (message: string) => void;
  confirm: (message: string) => boolean;
};

type BrowserGlobal = {
  alert?: (message?: unknown) => void;
  confirm?: (message?: string) => boolean;
};

const messageText = (title: string, message?: string) =>
  [title, message].filter(Boolean).join("\n\n");

export const executeWebAlert = (
  title: string,
  message: string | undefined,
  buttons: AlertButtonLike[] | undefined,
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

export const installWebAlertPolyfill = (
  alertApi: object,
  isWeb: boolean,
  browser: BrowserGlobal = globalThis as BrowserGlobal,
) => {
  if (
    installed ||
    !isWeb ||
    typeof browser.alert !== "function" ||
    typeof browser.confirm !== "function"
  ) {
    return;
  }

  installed = true;
  const mutableAlertApi = alertApi as AlertApi;
  mutableAlertApi.alert = (title, message, buttons) =>
    executeWebAlert(title, message, buttons, {
      alert: (text) => browser.alert?.(text),
      confirm: (text) => browser.confirm?.(text) ?? false,
    });
};
