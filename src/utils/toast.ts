import { showMessage, hideMessage } from "react-native-flash-message";

export const toastSuccess = (title: string, description?: string) =>
  showMessage({
    message: title,
    description,
    type: "success",        // verde
    icon: "success",
    floating: true,         // card "solto" do topo
    duration: 3000,
  });

export const toastError = (title: string, description?: string) =>
  showMessage({
    message: title,
    description,
    type: "danger",         // vermelho
    icon: "danger",
    floating: true,
    duration: 4000,
  });

export const toastInfo = (title: string, description?: string) =>
  showMessage({
    message: title,
    description,
    type: "info",           // azul
    icon: "info",
    floating: true,
    duration: 3000,
  });

// se um dia quiser fechar programaticamente
export const toastHide = () => hideMessage();