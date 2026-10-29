// Vercel serverless function: starts a Stripe Checkout session for a donation.
//
// POST { appeal, amount, frequency } — amount in dollars, frequency "once" or
// "monthly" — and it answers { url } for Stripe's hosted checkout page. Card
// details are entered on Stripe's page and never reach this site. A plain HTML
// form post (no JavaScript) gets a 303 redirect to the same page instead.
//
// GET answers { enabled } so the page can tell whether online giving is on.
//
// Configure in Vercel → Project → Settings → Environment Variables:
//   STRIPE_SECRET_KEY  sk_live_… (or sk_test_… to try it with test cards)
//   SITE_URL           optional, e.g. https://www.example.org.au — where Stripe
//                      sends donors back to; defaults to the domain they came from.
// Without STRIPE_SECRET_KEY the endpoint answers 503 and the page falls back to
// the other ways to give.

import { APPEALS, CURRENCY, MIN_AMOUNT, MAX_AMOUNT } from "../assets/js/appeals.js";

const STRIPE_API = "https://api.stripe.com/v1/checkout/sessions";
const FREQUENCIES = new Set(["once", "monthly"]);
const DONATE_PATH = "/get-involved/donate.html";
const THANKS_PATH = "/get-involved/thank-you.html";

function siteOrigin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  const first = (value) => String(value || "").split(",")[0].trim();
  const proto = first(req.headers["x-forwarded-proto"]) || "https";
  const host = first(req.headers["x-forwarded-host"]) || first(req.headers.host);
  return `${proto}://${host}`;
}

// Reads the donation from a JSON body (fetch) or a form-encoded body (plain form).
function readDonation(req) {
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = Object.fromEntries(new URLSearchParams(body));
    }
  }
  body = body || {};
  // A plain form post sends both the chosen preset and the "other amount" box.
  const custom = String(body.custom_amount ?? "").trim();
  const amount = custom !== "" ? custom : body.amount;
  return {
    appeal: APPEALS.find((a) => a.id === body.appeal),
    frequency: FREQUENCIES.has(body.frequency) ? body.frequency : null,
    cents: Math.round(Number(amount) * 100),
  };
}

function validate({ appeal, frequency, cents }) {
  if (!appeal) return "Please choose an appeal.";
  if (!frequency) return "Please choose one-off or monthly.";
  if (!Number.isFinite(cents) || cents < MIN_AMOUNT * 100 || cents > MAX_AMOUNT * 100) {
    return `Please enter an amount between $${MIN_AMOUNT} and $${MAX_AMOUNT.toLocaleString("en-AU")}.`;
  }
  return null;
}

function sessionParams({ appeal, frequency, cents }, origin) {
  const monthly = frequency === "monthly";
  const p = new URLSearchParams();
  p.append("mode", monthly ? "subscription" : "payment");
  p.append("line_items[0][quantity]", "1");
  p.append("line_items[0][price_data][currency]", CURRENCY);
  p.append("line_items[0][price_data][unit_amount]", String(cents));
  p.append("line_items[0][price_data][product_data][name]", appeal.name);
  p.append(
    "line_items[0][price_data][product_data][description]",
    `${monthly ? "Monthly donation" : "Donation"} to Virgin Mary Mosque (Masjid Maryam)`,
  );
  if (monthly) {
    p.append("line_items[0][price_data][recurring][interval]", "month");
    p.append("subscription_data[description]", `${appeal.name} — monthly donation`);
    p.append("subscription_data[metadata][appeal]", appeal.id);
  } else {
    p.append("submit_type", "donate");
    p.append("customer_creation", "always");
    p.append("payment_intent_data[description]", `${appeal.name} — donation`);
    p.append("payment_intent_data[metadata][appeal]", appeal.id);
  }
  p.append("metadata[appeal]", appeal.id);
  p.append("metadata[frequency]", frequency);
  // Optional "on behalf of" field, e.g. a donation for a parent who has passed away.
  p.append("custom_fields[0][key]", "on_behalf_of");
  p.append("custom_fields[0][label][type]", "custom");
  p.append("custom_fields[0][label][custom]", "On behalf of (optional)");
  p.append("custom_fields[0][type]", "text");
  p.append("custom_fields[0][optional]", "true");
  p.append("custom_text[submit][message]", "JazakAllahu khayran. May Allah accept it from you.");
  p.append("success_url", `${origin}${THANKS_PATH}?appeal=${appeal.id}&session_id={CHECKOUT_SESSION_ID}`);
  p.append("cancel_url", `${origin}${DONATE_PATH}?appeal=${appeal.id}&cancelled=1#give`);
  return p;
}

export default async function handler(req, res) {
  const key = process.env.STRIPE_SECRET_KEY;

  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ enabled: Boolean(key) });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const wantsJson = String(req.headers["content-type"] || "").includes("application/json");
  const origin = siteOrigin(req);
  const donation = readDonation(req);
  const backToForm = (code) =>
    `${origin}${DONATE_PATH}?${donation.appeal ? `appeal=${donation.appeal.id}&` : ""}error=${code}#give`;

  const fail = (status, code, message) => {
    if (wantsJson) return res.status(status).json({ error: message, code });
    res.setHeader("Location", backToForm(code));
    return res.status(303).end();
  };

  if (!key) return fail(503, "not_configured", "Online giving isn't switched on yet.");
  const problem = validate(donation);
  if (problem) return fail(400, "invalid", problem);

  let session;
  try {
    const stripeRes = await fetch(STRIPE_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: sessionParams(donation, origin),
    });
    session = await stripeRes.json();
    if (!stripeRes.ok || !session.url) {
      console.error("Stripe checkout error", stripeRes.status, session && session.error);
      return fail(502, "stripe_error", "We couldn't reach the payment page. Please try again.");
    }
  } catch (err) {
    console.error("Stripe request failed", err);
    return fail(502, "stripe_error", "We couldn't reach the payment page. Please try again.");
  }

  res.setHeader("Cache-Control", "no-store");
  if (wantsJson) return res.status(200).json({ url: session.url });
  res.setHeader("Location", session.url);
  return res.status(303).end();
}
