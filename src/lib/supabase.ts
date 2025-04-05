
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// Note: These should be environment variables in production
const supabaseUrl = 'https://your-supabase-url.supabase.co';
const supabaseKey = 'your-supabase-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
