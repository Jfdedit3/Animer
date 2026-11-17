import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_ANIMER_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_ANIMER_SUPABASE_PUBLISHABLE_KEY?.trim();

export const accountClient = url && key?.startsWith("sb_publishable_")
  ? createClient(url, key, {
      auth: { storageKey: "animer:account:v1", detectSessionInUrl: false },
    })
  : null;
