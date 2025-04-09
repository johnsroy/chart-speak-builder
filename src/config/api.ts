
// API URLs for Edge Functions and External Services

// Base URL for Supabase Edge Functions
export const supabaseUrl = 'https://rehadpogugijylybwmoe.supabase.co';

// Data processing function URL
export const dataProcessorUrl = `${supabaseUrl}/functions/v1/data-processor`;

// Fallback data processor URL
export const dataProcessorFallbackUrl = `${supabaseUrl}/functions/v1/data-processor-fallback`;

// Health check URL
export const healthCheckUrl = `${supabaseUrl}/functions/v1/health`;
