# Stripe Payment Integration Setup Guide

## Overview
This guide will walk you through setting up Stripe payments for your HIPAA Studio platform.

## Prerequisites
- ✅ Stripe API keys added to Cloudflare Workers environment variables
- ✅ Stripe package installed (`stripe@17.7.0`)
- ✅ Database migration ready to run

## Step 1: Complete Database Migration ✅ (Next Step)
Run the migration to create subscription tables:
```bash
bun run db:migrate:remote
```

This creates three tables:
- `subscriptions` - Stores Stripe subscription data
- `payments` - Tracks payment history
- `usageRecords` - Tracks user usage for billing

## Step 2: Create Stripe Products & Prices

### In Your Stripe Dashboard:

1. **Go to Products** (https://dashboard.stripe.com/products)

2. **Create a Product** (e.g., "Professional Plan")
   - Name: `Professional Plan`
   - Description: `Full access to HIPAA-compliant app building`
   - Click "Add pricing"

3. **Set Up Pricing**
   - **Pricing model**: Standard pricing
   - **Price**: `$49.00` (or your desired amount)
   - **Billing period**: Monthly (or choose your preference)
   - **Optional**: Add a free trial (e.g., 14 days)
   - Click "Add pricing"

4. **Copy the Price ID**
   - After creating, you'll see a Price ID like `price_xxxxxxxxxxxxx`
   - Save this - you'll need it for testing

5. **Repeat for Additional Plans** (Optional)
   - Create Starter, Business, Enterprise plans
   - Each with different pricing

## Step 3: Configure Stripe Webhook

### Set Up Webhook Endpoint:

1. **Go to Webhooks** (https://dashboard.stripe.com/webhooks)

2. **Click "+ Add endpoint"**

3. **Endpoint URL**: 
   ```
   https://app.hipaa.studio/api/webhooks/stripe
   ```

4. **Events to send** - Select these events:
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.subscription.trial_will_end` (optional)

5. **Click "Add endpoint"**

6. **Reveal and Copy Webhook Secret**
   - Click "Reveal" next to "Signing secret"
   - Copy the value starting with `whsec_`
   - Add this to your Cloudflare Workers environment as `STRIPE_WEBHOOK_SECRET`

## Step 4: Verify Environment Variables

Ensure these are set in Cloudflare Workers:

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxx
```

**Note**: Start with test keys (`sk_test_` and `pk_test_`). Switch to live keys when ready for production.

## Step 5: Test the Integration

### Test Checkout Flow:

1. **Visit your pricing page**: `https://app.hipaa.studio/pricing`

2. **Click "Subscribe Now"** on a plan

3. **Use Stripe Test Cards**:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future expiration date
   - Any 3-digit CVC

4. **Complete checkout**

5. **Verify subscription**:
   - Check `/billing` page
   - Verify data in Stripe Dashboard
   - Check database tables for subscription record

### Test Webhook Delivery:

1. **Go to Stripe Dashboard > Webhooks**
2. **Click on your endpoint**
3. **View "Attempts" tab**
4. **Verify events are being received successfully** (200 status)

### Test Billing Portal:

1. **Go to `/billing`**
2. **Click "Manage Billing"**
3. **Verify Stripe Customer Portal opens**
4. **Test canceling/reactivating subscription**

## Step 6: Frontend Testing

### Features to Test:

1. **Pricing Page** (`/pricing`)
   - [ ] Plans load from Stripe
   - [ ] Checkout button works
   - [ ] Redirects to Stripe Checkout

2. **Billing Page** (`/billing`)
   - [ ] Subscription status displays correctly
   - [ ] Period end date shows
   - [ ] "Manage Billing" opens Stripe portal
   - [ ] Cancel/Reactivate buttons work

3. **App Creation** (`/` home page)
   - [ ] Blocks creation without subscription
   - [ ] Shows "View Plans" toast message
   - [ ] Allows creation with active subscription

## Step 7: Deploy to Production

### When Ready for Live Payments:

1. **Get Live API Keys** from Stripe Dashboard
   - Go to "Developers" > "API Keys"
   - Switch to "Production" mode
   - Copy live keys (`sk_live_` and `pk_live_`)

2. **Update Cloudflare Environment Variables**
   ```bash
   # Update to production keys
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxx
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxx
   ```

3. **Create Production Webhook**
   - Set up webhook endpoint in production mode
   - Use the production webhook secret

4. **Activate Products**
   - Make sure your products are "Active" in production mode

## Troubleshooting

### Webhook Not Receiving Events:
- Check webhook URL is correct
- Verify `STRIPE_WEBHOOK_SECRET` is set correctly
- Check Cloudflare Workers logs for errors
- Test webhook from Stripe Dashboard "Send test webhook"

### Checkout Session Not Creating:
- Verify API keys are correct
- Check browser console for errors
- Verify user is authenticated

### Subscription Not Showing:
- Check database for subscription record
- Verify webhook events processed
- Check API response at `/api/subscription/status`

## API Endpoints Reference

- `GET /api/subscription/prices` - Get available plans (public)
- `POST /api/subscription/create-checkout-session` - Create checkout (auth required)
- `POST /api/subscription/create-portal-session` - Open billing portal (auth required)
- `GET /api/subscription/status` - Get subscription status (auth required)
- `POST /api/subscription/cancel` - Cancel subscription (auth required)
- `POST /api/subscription/reactivate` - Reactivate subscription (auth required)
- `POST /api/webhooks/stripe` - Stripe webhook handler (public, signature verified)

## Database Schema

### subscriptions
- `id` - Stripe subscription ID
- `userId` - User ID
- `stripeCustomerId` - Stripe customer ID
- `status` - Subscription status (active, canceled, etc.)
- `currentPeriodEnd` - When current period ends

### payments
- `id` - Stripe payment intent ID
- `userId` - User ID
- `amount` - Payment amount in cents
- `status` - Payment status (succeeded, pending, failed)

### usageRecords
- `id` - Record ID
- `userId` - User ID
- `tokensIn`, `tokensOut` - Token usage
- `totalCost` - Cost for the period

## Support Resources

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Testing**: https://stripe.com/docs/testing
- **Webhook Testing**: https://dashboard.stripe.com/webhooks

## Security Notes

- ✅ Webhook signatures are verified
- ✅ API endpoints require authentication
- ✅ Subscription checks prevent unauthorized access
- ✅ Stripe handles PCI compliance
- ✅ No credit card data touches your servers

---

**Ready to accept payments!** 🎉
