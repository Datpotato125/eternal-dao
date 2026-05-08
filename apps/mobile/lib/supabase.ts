import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// React Native doesn't have the Web Locks API that @supabase/auth-js requires.
// Provide a no-op shim so session management works without distributed locking.
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

const SecureStoreAdapter = {
  getItem:    (key: string) => SecureStore.getItemAsync(key),
  setItem:    (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
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
    },
  }
);
