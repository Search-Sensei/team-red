# Stripe Setup Guide

## Overview

Stripe is used for billing and subscription management. Subscriptions are **org-level** — one subscription per organisation. The custom-built billing page inside the Search Sensei customer portal handles plan display and invoice history. The public pricing page is on WordPress.

---

## 1. Products & Prices

Go to **Product Catalogue → Add Product** and create the following two products. Enterprise is custom/negotiated and does not go through Stripe Checkout.

### Product 1: Sensei Search Essentials

- **Name:** `Sensei Search Essentials`
- **Price 1:** `$149.00` · Monthly · Recurring
- **Price 2:** `$1,518.60` · Yearly · Recurring (billed upfront — $149 × 12 × 0.85)

### Product 2: Sensei AI Search

- **Name:** `Sensei AI Search`
- **Price 1:** `$399.00` · Monthly · Recurring
- **Price 2:** `$3,830.40` · Yearly · Recurring (billed upfront — $399 × 12 × 0.80)

### Adding a second price to a product

Stripe only lets you add one price on the creation screen. After creating the product:

1. Click into the product in **Product Catalogue**
2. Scroll to the **Pricing** section
3. Click **Add another price**
4. Fill in the second price and save

### Saving Price IDs

After creating each price, Stripe assigns it a unique ID like `price_1RBxyzABCDEFGH123456`. To find them:

- Click into a product → scroll to Pricing → the ID is shown under each price amount

Save all 4 IDs into `appsettings.development.json` (see [Section 6](#6-appsettingsjson-structure)).

---

## 2. API Keys

Go to **Developers → API Keys**

| Key | Where it goes |
|---|---|
| Secret key (`sk_test_...`) | Backend only — `appsettings.json`. Never expose to frontend. |
| Publishable key (`pk_test_...`) | Safe for frontend config if needed |

Make sure you are in **test mode** (toggle in the top left) until ready to go live. Test and live keys are separate.

---

## 3. Webhook Endpoint

### Production

When deployed to a real URL, register the endpoint in **Developers → Webhooks → Add endpoint**:

- **Endpoint type:** Your account *(not "Connected accounts" — that is for Stripe Connect marketplaces)*
- **URL:** `https://yourdomain.com/portal/api/billing/webhook`
- **Events to select:**

| Event | Purpose |
|---|---|
| `checkout.session.completed` | Payment succeeded → enable user in Keycloak, mark org subscription active |
| `checkout.session.expired` | Checkout expired without payment (backup to 24h cleanup service) |
| `customer.subscription.deleted` | Subscription cancelled → mark org as Cancelled |
| `customer.subscription.updated` | Plan change or renewal date update |
| `invoice.payment_succeeded` | Renewal payments → keep subscription Active |
| `invoice.payment_failed` | Renewal failed → flag on dashboard |

After saving, click **Reveal signing secret** and copy the `whsec_...` value into `appsettings.json`.

### Local Development (Stripe CLI)

The Stripe Dashboard requires a publicly accessible URL, so use the Stripe CLI for local testing instead.

**Install:**
```bash
brew install stripe/stripe-cli/stripe
```

**Login:**
```bash
stripe login
```

**Forward webhooks to your local server:**
```bash
stripe listen --forward-to https://localhost:5001/portal/api/billing/webhook
```

The CLI will print a **local signing secret** (`whsec_...`) — use this in `appsettings.development.json`. Leave the CLI running while testing; all Stripe events will be forwarded to your local endpoint and logged in the terminal.

---

## 4. Branding

Go to **Settings → Branding**

| Setting | Value |
|---|---|
| Logo | Search Sensei logo |
| Brand colour | `#1d5d66` |
| Accent / button colour | `#00c6b6` |

This ensures the Stripe-hosted Checkout page matches the Search Sensei theme.

---

## 5. Success & Cancel URLs

These are passed to Stripe when creating a Checkout Session:

| URL | Purpose |
|---|---|
| `https://yourdomain.com/billing/success` | User redirected here after successful payment |
| `https://yourdomain.com/register` | User redirected here if they cancel payment |

---

## 6. appsettings.json Structure

```json
"Stripe": {
  "SecretKey": "sk_test_...",
  "PublishableKey": "pk_test_...",
  "WebhookSecret": "whsec_...",
  "Prices": {
    "EssentialsMonthly": "price_xxx",
    "EssentialsAnnual":  "price_xxx",
    "AiSearchMonthly":   "price_xxx",
    "AiSearchAnnual":    "price_xxx"
  },
  "SuccessUrl": "https://yourdomain.com/billing/success",
  "CancelUrl":  "https://yourdomain.com/register"
}
```

For local development, put real values in `appsettings.development.json` (which is gitignored).

---

## 7. Org Metadata Convention

When the backend creates a Stripe Customer (one per org), attach this metadata so webhooks can be mapped back to the correct org:

```json
{
  "metadata": {
    "organisationId": "<keycloak-org-id>",
    "organisationName": "<org-name>"
  }
}
```

The Stripe Customer ID and Subscription ID are stored as **Keycloak organisation attributes**:

| Attribute | Value |
|---|---|
| `stripeCustomerId` | `cus_xxx` |
| `stripeSubscriptionId` | `sub_xxx` |

---

## 8. Onboarding Payment Flow

1. User completes organisation registration form
2. Backend creates the Keycloak user (**disabled**) and Keycloak organisation
3. Backend creates a Stripe Customer for the org with `organisationId` metadata
4. Backend creates a Stripe Checkout Session with the selected plan's Price ID
5. User is redirected to the Stripe Checkout page
6. On `checkout.session.completed` webhook:
   - Enable the user in Keycloak
   - Store `stripeCustomerId` and `stripeSubscriptionId` on the Keycloak org
   - Mark subscription as active
7. If no payment within **24 hours** — the existing cleanup service deletes the Keycloak user and org

---

## 9. Billing Page Access

The billing/subscription page inside the customer portal is accessible only to:

- `org-admin`
- `platform-admin`

It displays: current plan, subscription status (Active / Cancelled), next billing date, and invoice history (date, amount, status).
