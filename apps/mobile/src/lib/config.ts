import Constants from 'expo-constants';

interface AppExtra {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiUrl: string;
}

/** app.json's `expo.extra` — client-safe config only (mirrors apps/web's VITE_ vars). */
export const appConfig = (Constants.expoConfig?.extra ?? {}) as Partial<AppExtra>;
