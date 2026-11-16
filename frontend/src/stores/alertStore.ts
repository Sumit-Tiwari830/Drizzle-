import { create } from "zustand";

export interface AlertConfig {
  type?: "error" | "success" | "warning" | "info";
  title: string;
  message: string;
  buttonText?: string;
  onConfirm?: () => void;
}

interface AlertState {
  isOpen: boolean;
  config: AlertConfig | null;
  showAlert: (config: AlertConfig) => void;
  hideAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  isOpen: false,
  config: null,

  showAlert: (config: AlertConfig) => {
    set({
      isOpen: true,
      config,
    });
  },

  hideAlert: () => {
    const currentConfig = useAlertStore.getState().config;
    if (currentConfig?.onConfirm) {
      currentConfig.onConfirm();
    }
    set({
      isOpen: false,
      config: null,
    });
  },
}));

// Quick helper function for use anywhere without hook constraints
export const showAlert = (config: AlertConfig) => {
  useAlertStore.getState().showAlert(config);
};
