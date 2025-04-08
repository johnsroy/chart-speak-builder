
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
    let isAdminUser = false;
    
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
        
        // Check if this is an admin user for testing
        isAdminUser = userEmail === 'admin@example.com';
        console.log(`User ${userEmail} identified, admin status: ${isAdminUser}`);
      }
    } 
    
    // Get request body for direct payment
    const requestBody = await req.json().catch(e => {
      console.error("Failed to parse request body:", e);
      return {};
    });
    
    const { email, tempPassword: password } = requestBody;
    
    if (email && !userEmail) {
      userEmail = email;
      tempPassword = password || null;
      
      // Check if this is an admin user from the request body
      isAdminUser = userEmail === 'admin@example.com';
      console.log(`Email ${userEmail} from request, admin status: ${isAdminUser}`);
    }
    
    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format (basic validation)
    const isValidEmail = typeof userEmail === 'string' && 
                        userEmail.includes('@') && 
                        userEmail.includes('.');
    
    if (!isValidEmail && !isAdminUser) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For admin user, return a mock checkout session to sandbox environment
    if (isAdminUser) {
      console.log("Creating test checkout session for admin user");
      
      // Return a mock checkout URL that points to the success page directly for admin testing
      const mockCheckoutUrl = `${req.headers.get("origin") || "https://genbi.app"}/payment-success?email=${encodeURIComponent(userEmail)}&test=true`;
      
      return new Response(JSON.stringify({ url: mockCheckoutUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
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
      try {
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
          if (signUpError.message && signUpError.message.includes('already registered')) {
            console.log("User already exists, proceeding with checkout");
          } else {
            return new Response(
              JSON.stringify({ error: signUpError.message || "Error creating user account" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else if (signUpData?.user) {
          userId = signUpData.user.id;
          console.log("Created new user:", userId);
          
          // Set up user subscription entry with trial - 1 DAY TRIAL
          try {
            // Calculate trial end date (1 day from now)
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 1);
            
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
      } catch (authError) {
        console.error("Auth error during signup:", authError);
        return new Response(
          JSON.stringify({ error: "Failed to process user authentication" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get customer id if user exists
    let customerId = null;
    if (userId) {
      try {
        const { data: subscriptionData } = await supabaseClient
          .from('user_subscriptions')
          .select('stripeCustomerId')
          .eq('userId', userId)
          .single();
        
        customerId = subscriptionData?.stripeCustomerId || null;
      } catch (err) {
        console.log("Could not retrieve subscription data, but continuing:", err);
      }
    }

    // If no customer ID from subscription table, try to find by email
    if (!customerId && userEmail) {
      try {
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        }
      } catch (err) {
        console.log("Error finding customer by email, but continuing:", err);
      }
    }

    // If still no customer ID, create one
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            supabaseUid: userId || "pending_registration"
          }
        });
        customerId = customer.id;

        // Update user subscription with Stripe customer ID if user exists
        if (userId) {
          try {
            await supabaseClient
              .from('user_subscriptions')
              .update({ stripeCustomerId: customerId })
              .eq('userId', userId);
          } catch (err) {
            console.log("Could not update subscription with customer ID, but continuing:", err);
          }
        }
      } catch (err) {
        console.error("Error creating Stripe customer:", err);
        return new Response(
          JSON.stringify({ error: "Failed to create customer record" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create a price on the fly
    try {
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
    } catch (stripeError) {
      console.error("Stripe error:", stripeError);
      return new Response(
        JSON.stringify({ error: stripeError.message || "Error processing payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
