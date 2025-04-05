
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials not properly configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Admin user details
    const adminEmail = "admin@genbi.com";
    const adminPassword = "admin123!";
    
    // Check if admin user already exists
    const { data: existingUsers, error: searchError } = await supabase.auth.admin
      .listUsers({ 
        filter: { email: adminEmail } 
      });
    
    if (searchError) {
      console.error("Error checking for admin user:", searchError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to check for admin user", error: searchError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    let adminUser = existingUsers?.users?.find(user => user.email === adminEmail);
    
    if (adminUser) {
      // Admin user exists, ensure email is confirmed and role is set
      console.log("Updating existing admin user:", adminUser.id);
      
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        adminUser.id,
        { 
          email_confirm: true,
          user_metadata: { role: "admin", name: "Admin User" }
        }
      );
      
      if (updateError) {
        console.error("Error updating admin user:", updateError);
        return new Response(
          JSON.stringify({ success: false, message: "Failed to update admin user", error: updateError }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      console.log("Updated existing admin user");
      
      return new Response(
        JSON.stringify({ success: true, message: "Admin user already exists and has been updated" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    // Create new admin user if doesn't exist
    console.log("Creating new admin user");
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { role: "admin", name: "Admin User" }
    });
    
    if (createError) {
      console.error("Error creating admin user:", createError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to create admin user", error: createError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    console.log("Admin user created successfully");
    return new Response(
      JSON.stringify({ success: true, message: "Admin user created successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Server error:", error);
    
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
