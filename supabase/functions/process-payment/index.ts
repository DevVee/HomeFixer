// Supabase Edge Function — PayMongo payment processing
// Deploy: supabase functions deploy process-payment
// Secrets: supabase secrets set PAYMONGO_SECRET_KEY=sk_test_...

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYMONGO_SECRET  = Deno.env.get("PAYMONGO_SECRET_KEY")!;
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYMONGO_BASE    = "https://api.paymongo.com/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function pmHeaders() {
  return {
    "Content-Type":  "application/json",
    "Authorization": `Basic ${btoa(PAYMONGO_SECRET + ":")}`,
  };
}

async function pmFetch(path: string, body?: object) {
  const res = await fetch(`${PAYMONGO_BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: pmHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errors?.[0]?.detail ?? "PayMongo error");
  return json.data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    const body = await req.json();
    const { action } = body;

    // ── Create GCash / Maya source ──────────────────────────
    if (action === "create_source") {
      const { bookingId, amount, method, redirectSuccess, redirectFailed } = body;
      const pmType = method === "gcash" ? "gcash" : "paymaya";

      const source = await pmFetch("/sources", {
        data: {
          attributes: {
            amount:   Math.round(amount * 100), // centavos
            currency: "PHP",
            type:     pmType,
            redirect: { success: redirectSuccess, failed: redirectFailed },
            billing:  { name: "HomeFixer Customer" },
          },
        },
      });

      await supabase.from("bookings").update({
        paymongo_source_id: source.id,
        payment_status: "pending",
      }).eq("id", bookingId);

      return json({
        sourceId:    source.id,
        checkoutUrl: source.attributes.redirect.checkout_url,
      });
    }

    // ── Create card payment intent ──────────────────────────
    if (action === "create_payment_intent") {
      const { bookingId, amount } = body;

      const intent = await pmFetch("/payment_intents", {
        data: {
          attributes: {
            amount:   Math.round(amount * 100),
            currency: "PHP",
            payment_method_allowed:  ["card"],
            payment_method_options:  { card: { request_three_d_secure: "any" } },
            capture_type: "automatic",
          },
        },
      });

      await supabase.from("bookings").update({
        paymongo_payment_intent_id: intent.id,
        payment_status: "pending",
      }).eq("id", bookingId);

      return json({
        intentId:  intent.id,
        clientKey: intent.attributes.client_key,
      });
    }

    // ── PayMongo webhook ────────────────────────────────────
    // Register at: PayMongo Dashboard → Developers → Webhooks
    // URL: https://<project>.supabase.co/functions/v1/process-payment
    if (action === "webhook") {
      const { type, data } = body;

      // Source became chargeable → charge it
      if (type === "source.chargeable") {
        const sourceId = data?.id;
        if (sourceId) {
          const payment = await pmFetch("/payments", {
            data: {
              attributes: {
                amount:      data.attributes.amount,
                currency:    "PHP",
                source:      { id: sourceId, type: "source" },
                description: "HomeFixer service payment",
              },
            },
          });
          if (payment.attributes?.status === "paid") {
            const { data: booking } = await supabase
              .from("bookings")
              .update({ payment_status: "paid", status: "paid" })
              .eq("paymongo_source_id", sourceId)
              .select("customer_id, provider_id")
              .single();

            if (booking) {
              await supabase.from("notifications").insert([
                {
                  user_id: booking.customer_id,
                  title:   "Payment confirmed",
                  body:    "Your payment was received. Job is now closed.",
                  type:    "payment",
                },
              ]);
            }
          }
        }
      }

      // Payment intent paid → update booking
      if (type === "payment.paid") {
        const intentId = data?.attributes?.payment_intent_id;
        if (intentId) {
          await supabase
            .from("bookings")
            .update({ payment_status: "paid", status: "paid" })
            .eq("paymongo_payment_intent_id", intentId);
        }
      }

      return json({ received: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
