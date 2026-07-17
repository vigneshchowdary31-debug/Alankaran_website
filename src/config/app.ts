import { APP_CONFIG } from "@/constants/app";

export const appConfig = {
  ...APP_CONFIG,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  baseUrl: import.meta.env.BASE_URL,
} as const;
