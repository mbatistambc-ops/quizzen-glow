export const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";

export const isDevBypassActive = (): boolean => {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS === "true";
};

export const logBypassStatus = () => {
  if (isDevBypassActive()) {
    console.warn("🔐 DEV BYPASS: Autenticação simulada ATIVA.");
    console.warn(`🆔 Mock User ID: ${MOCK_USER_ID}`);
  }
};
