import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { appConfig } from './config.js';

/** Mobile counterpart of apps/web/src/lib/supabase.ts — see that file's doc comment for the three RLS-safe things this client is used for. */
export const supabase = createClient(appConfig.supabaseUrl ?? '', appConfig.supabaseAnonKey ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
