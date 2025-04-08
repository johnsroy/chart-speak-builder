
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

serve(async (req) => {
  if (!stripeSecretKey || !stripeWebhookSecret) {
    console.error("Missing Stripe environment variables");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Initialize Stripe
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
  });

  // Get the signature from the header
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(
      JSON.stringify({ error: "No signature provided" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Get the raw request body
    const body = await req.text();
    
    // Verify and construct the event
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeWebhookSecret
    );

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Handle the event based on its type
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (!customerId || !subscriptionId) {
          console.log("Missing customer ID or subscription ID in checkout session");
          break;
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // Calculate period start and end dates
        const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        // Get user from subscription
        const { data: subscriptionData, error: subError } = await supabaseClient
          .from('user_subscriptions')
          .select('userId')
          .eq('stripeCustomerId', customerId)
          .single();

        if (subError) {
          console.error("Error finding user for customer:", subError);
          break;
        }

        // Update user's subscription
        await supabaseClient
          .from('user_subscriptions')
          .update({
            isPremium: true,
            datasetQuota: 100,
            queryQuota: 1000,
            stripeSubscriptionId: subscriptionId,
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd: false
          })
          .eq('userId', subscriptionData.userId);
        
        break;
      }
      
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const subscriptionId = subscription.id;
        
        // Calculate period dates
        const currentPeriodStart = new Date(subscription.current_period_start * 1000).toISOString();
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;
        
        // Get user from subscription
        const { data: subscriptionData, error: subError } = await supabaseClient
          .from('user_subscriptions')
          .select('userId')
          .eq('stripeCustomerId', customerId)
          .single();

        if (subError) {
          console.error("Error finding user for customer:", subError);
          break;
        }

        // Update subscription details
        await supabaseClient
          .from('user_subscriptions')
          .update({
            currentPeriodStart,
            currentPeriodEnd,
            cancelAtPeriodEnd
          })
          .eq('userId', subscriptionData.userId);
          
        break;
      }
      
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Get user from subscription
        const { data: subscriptionData, error: subError } = await supabaseClient
          .from('user_subscriptions')
          .select('userId')
          .eq('stripeCustomerId', customerId)
          .single();

        if (subError) {
          console.error("Error finding user for customer:", subError);
          break;
        }

        // Downgrade user to free plan
        await supabaseClient
          .from('user_subscriptions')
          .update({
            isPremium: false,
            datasetQuota: 2,
            queryQuota: 10,
            stripeSubscriptionId: null,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false
          })
          .eq('userId', subscriptionData.userId);
        
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Error processing webhook:", err);
    return new Response(
      JSON.stringify({ error: "Webhook error" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});
