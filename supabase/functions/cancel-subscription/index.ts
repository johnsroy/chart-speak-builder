
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header is required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user from the authorization header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the Stripe secret key
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the request body to get the subscription ID
    const { subscriptionId } = await req.json();
    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ error: "Subscription ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user's subscription data
    const { data: subscriptionData, error: subError } = await supabaseClient
      .from('user_subscriptions')
      .select('stripeSubscriptionId, stripeCustomerId')
      .eq('userId', user.id)
      .single();

    if (subError || !subscriptionData) {
      console.error('Error getting user subscription:', subError);
      return new Response(
        JSON.stringify({ error: "Could not retrieve user subscription data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the subscription ID belongs to this user
    if (subscriptionData.stripeSubscriptionId !== subscriptionId) {
      return new Response(
        JSON.stringify({ error: "Subscription ID does not match user records" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Cancel the subscription (at the end of the current period)
    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      { cancel_at_period_end: true }
    );

    // Get the current period end date
    const currentPeriodEnd = new Date(updatedSubscription.current_period_end * 1000).toISOString();
    
    // Update the subscription record in the database
    await supabaseClient
      .from('user_subscriptions')
      .update({ 
        cancelAtPeriodEnd: true,
        currentPeriodEnd
      })
      .eq('userId', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Subscription will be canceled at the end of the current period",
        currentPeriodEnd
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
