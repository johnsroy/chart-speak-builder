
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

    // Check if request has authentication
    let userId = null;
    let userEmail = null;
    let tempPassword = null;
    
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      // Authenticated user flow
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

      if (userError) {
        console.error("Auth error:", userError);
      } else if (user) {
        userId = user.id;
        userEmail = user.email;
      }
    } 
    
    // Get request body for direct payment
    const { email, tempPassword: password } = await req.json();
    if (email && !userEmail) {
      userEmail = email;
      tempPassword = password || null;
    }
    
    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the Stripe secret key from environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: "Stripe key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Check if user exists
    if (!userId && tempPassword) {
      // Create user account if coming from direct payment
      const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
        email: userEmail,
        password: tempPassword,
        options: {
          emailRedirectTo: `${req.headers.get("origin") || "https://genbi.app"}/login`,
          data: {
            email_confirmed: true
          }
        }
      });

      if (signUpError) {
        console.log("Error creating user:", signUpError);
        // Check if user already exists
        if (signUpError.message.includes('already registered')) {
          console.log("User already exists, proceeding with checkout");
        } else {
          return new Response(
            JSON.stringify({ error: signUpError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (signUpData?.user) {
        userId = signUpData.user.id;
        console.log("Created new user:", userId);
        
        // Set up user subscription entry with trial
        try {
          // Calculate trial end date (14 days from now)
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 14);
          
          await supabaseClient.from('user_subscriptions').insert({
            userId: userId,
            isPremium: false,
            datasetQuota: 2,
            queryQuota: 10,
            datasetsUsed: 0,
            queriesUsed: 0,
            trialEndDate: trialEndDate.toISOString()
          });
        } catch (dbError) {
          console.error("Error setting up user subscription:", dbError);
        }
      }
    }

    // Get customer id if user exists
    let customerId = null;
    if (userId) {
      const { data: subscriptionData } = await supabaseClient
        .from('user_subscriptions')
        .select('stripeCustomerId')
        .eq('userId', userId)
        .single();
      
      customerId = subscriptionData?.stripeCustomerId;
    }

    // If no customer ID from subscription table, try to find by email
    if (!customerId && userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    // If still no customer ID, create one
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          supabaseUid: userId || "pending_registration"
        }
      });
      customerId = customer.id;

      // Update user subscription with Stripe customer ID if user exists
      if (userId) {
        await supabaseClient
          .from('user_subscriptions')
          .update({ stripeCustomerId: customerId })
          .eq('userId', userId);
      }
    }

    // Create a price on the fly
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: 5000, // $50.00
      recurring: {
        interval: 'month',
      },
      product_data: {
        name: 'GenBI Premium Subscription',
        description: 'Monthly subscription to GenBI Premium features',
      },
    });

    console.log("Created price:", price.id);

    // Create the checkout session using the newly created price
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin") || "https://genbi.app"}/payment-success?email=${encodeURIComponent(userEmail)}`,
      cancel_url: `${req.headers.get("origin") || "https://genbi.app"}/payment-cancelled`,
      subscription_data: {
        metadata: {
          userEmail: userEmail,
          userId: userId || "pending_registration"
        }
      }
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
