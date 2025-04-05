
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Admin credentials
const adminCredentials = {
  email: 'admin@genbi.com',
  password: 'admin123!',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client using environment variables
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log("Initializing admin user setup");
    
    // Check if admin exists
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', adminCredentials.email)
      .maybeSingle();

    if (userError) {
      console.error("Error checking if admin user exists:", userError.message);
    }
    
    if (userData) {
      console.log("Admin user already exists");
      return new Response(
        JSON.stringify({ success: true, message: 'Admin user already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin user with service role
    console.log("Creating admin user");
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: adminCredentials.email,
      password: adminCredentials.password,
      email_confirm: true,
      user_metadata: {
        name: 'Admin User',
        role: 'admin',
      },
    });

    if (error) {
      throw new Error(`Failed to create admin user: ${error.message}`);
    }

    console.log("Admin user created successfully");
    return new Response(
      JSON.stringify({ success: true, message: 'Admin user created successfully', userId: data.user.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error setting up admin user:", error.message);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
