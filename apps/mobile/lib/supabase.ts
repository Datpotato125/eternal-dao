import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// React Native doesn't have the Web Locks API that @supabase/auth-js requires.
if (!globalThis.navigator?.locks) {
  (globalThis as any).navigator = {
    ...(globalThis.navigator ?? {}),
    locks: {
      request: async (_name: string, optionsOrCb: any, maybeCb?: any) => {
        const fn = typeof optionsOrCb === 'function' ? optionsOrCb : maybeCb!;
        return fn({ name: _name, mode: 'exclusive' });
      },
    },
  };
}

// In-memory fallback used when SecureStore is unavailable (some Android devices
// require a screen lock / hardware security module for SecureStore to work).
const memoryFallback: Record<string, string> = {};

const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    // Memory is always authoritative for the current session.
    if (key in memoryFallback) return memoryFallback[key];
    try {
      const val = await SecureStore.getItemAsync(key, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
      if (val !== null) memoryFallback[key] = val;
      return val;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    // Write to memory first so it's always retrievable this session.
    memoryFallback[key] = value;
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch {
      // already in memory — no-op
    }
  },
  removeItem: async (key: string): Promise<void> => {
    delete memoryFallback[key];
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage:            SecureStoreAdapter,
      autoRefreshToken:   true,
      persistSession:     true,
      detectSessionInUrl: false,
      flowType:           'pkce',
    },
  }
);
