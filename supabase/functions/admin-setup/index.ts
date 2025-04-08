
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
    
    // Check if this is a special action request
    let requestBody = {};
    try {
      requestBody = await req.json();
    } catch (e) {
      // If parsing fails, continue with empty request body
      requestBody = {};
    }
    
    // Handle confirm-email action if specified
    if (requestBody && requestBody.action === 'confirm-email' && requestBody.email) {
      console.log(`Confirming email for: ${requestBody.email}`);
      
      // Find the user by email
      const { data: users, error: searchError } = await supabase.auth.admin
        .listUsers();
      
      if (searchError) {
        console.error("Error searching for user:", searchError);
        return new Response(
          JSON.stringify({ success: false, message: "Failed to find user", error: searchError }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      const user = users?.users?.find(u => u.email === requestBody.email);
      
      if (!user) {
        console.error("User not found:", requestBody.email);
        return new Response(
          JSON.stringify({ success: false, message: "User not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        );
      }
      
      // Update the user to confirm their email
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      );
      
      if (updateError) {
        console.error("Error confirming user email:", updateError);
        return new Response(
          JSON.stringify({ success: false, message: "Failed to confirm email", error: updateError }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      console.log("Email confirmed successfully for:", requestBody.email);
      
      return new Response(
        JSON.stringify({ success: true, message: "Email confirmed successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    // Admin user details
    const adminEmail = "admin@genbi.com";
    const adminPassword = "admin123!";
    
    // Also set up standard admin user
    const standardAdminEmail = "admin@example.com";
    const standardAdminPassword = "password123";
    
    // Check if admin user already exists
    const { data: existingUsers, error: searchError } = await supabase.auth.admin
      .listUsers();
    
    if (searchError) {
      console.error("Error checking for admin user:", searchError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to check for admin user", error: searchError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    let adminUser = existingUsers?.users?.find(user => user.email === adminEmail);
    let standardAdmin = existingUsers?.users?.find(user => user.email === standardAdminEmail);
    
    // Process GenBI admin user
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
      
      console.log("Updated existing GenBI admin user");
    } else {
      // Create new GenBI admin user if doesn't exist
      console.log("Creating new GenBI admin user");
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { role: "admin", name: "Admin User" }
      });
      
      if (createError) {
        console.error("Error creating GenBI admin user:", createError);
        return new Response(
          JSON.stringify({ success: false, message: "Failed to create GenBI admin user", error: createError }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      console.log("GenBI admin user created successfully");
      adminUser = newUser?.user;
    }
    
    // Process standard admin user
    if (standardAdmin) {
      // Standard admin exists, ensure email is confirmed and role is set
      console.log("Updating existing standard admin user:", standardAdmin.id);
      
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        standardAdmin.id,
        { 
          email_confirm: true,
          user_metadata: { role: "admin", name: "Standard Admin User" }
        }
      );
      
      if (updateError) {
        console.error("Error updating standard admin user:", updateError);
        console.log("Continuing despite error...");
      } else {
        console.log("Updated existing standard admin user");
      }
    } else {
      // Create new standard admin user if doesn't exist
      console.log("Creating new standard admin user");
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: standardAdminEmail,
        password: standardAdminPassword,
        email_confirm: true,
        user_metadata: { role: "admin", name: "Standard Admin User" }
      });
      
      if (createError) {
        console.error("Error creating standard admin user:", createError);
        console.log("Continuing despite error...");
      } else {
        console.log("Standard admin user created successfully");
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin users configured successfully",
        genbiAdmin: !!adminUser,
        standardAdmin: !!standardAdmin
      }),
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
