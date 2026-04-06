import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jboebcbmrvgessyoomco.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xAwrnESUpsJHNNbuK8X4sQ_CfKhSj5R';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }
});
