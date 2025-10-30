/**
 * Stripe Webhook Controller
 * Handles incoming webhook events from Stripe
 */

import { StripeService } from '../../../services/stripe/StripeService';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../../database/schema';
import { createLogger } from '../../../logger';
import type Stripe from 'stripe';

const logger = createLogger('StripeWebhook');

/**
 * Handle Stripe webhook events
 * POST /api/webhooks/stripe
 */
export async function handleStripeWebhook(
    request: Request,
    env: Env
): Promise<Response> {
    try {
        // Get the raw body for signature verification
        const body = await request.text();
        const signature = request.headers.get('stripe-signature');

        if (!signature) {
            logger.error('Missing stripe-signature header');
            return new Response('Missing signature', { status: 400 });
        }

        // Verify webhook signature
        const db = drizzle(env.DB, { schema });
        const stripeService = new StripeService(env.STRIPE_SECRET_KEY, db);

        let event: Stripe.Event;
        try {
            event = stripeService.verifyWebhookSignature(
                body,
                signature,
                env.STRIPE_WEBHOOK_SECRET
            );
        } catch (err) {
            logger.error('Webhook signature verification failed', { error: err });
            return new Response('Invalid signature', { status: 400 });
        }

        logger.info('Processing Stripe webhook event', { type: event.type, id: event.id });

        // Handle different event types
        try {
            switch (event.type) {
                case 'customer.subscription.created':
                    await stripeService.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
                    logger.info('Subscription created', { subscriptionId: event.data.object.id });
                    break;

                case 'customer.subscription.updated':
                    await stripeService.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                    logger.info('Subscription updated', { subscriptionId: event.data.object.id });
                    break;

                case 'customer.subscription.deleted':
                    await stripeService.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                    logger.info('Subscription deleted', { subscriptionId: event.data.object.id });
                    break;

                case 'invoice.payment_succeeded':
                    await stripeService.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
                    logger.info('Invoice payment succeeded', { invoiceId: event.data.object.id });
                    break;

                case 'invoice.payment_failed':
                    logger.warn('Invoice payment failed', { invoiceId: event.data.object.id });
                    // You can add email notifications or other handling here
                    break;

                case 'customer.subscription.trial_will_end':
                    logger.info('Trial will end soon', { subscriptionId: event.data.object.id });
                    // You can add email notifications here
                    break;

                default:
                    logger.info('Unhandled webhook event type', { type: event.type });
            }

            return new Response(JSON.stringify({ received: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (error) {
            logger.error('Error processing webhook event', { 
                type: event.type, 
                id: event.id, 
                error 
            });
            // Return 200 to acknowledge receipt, but log the error
            return new Response(JSON.stringify({ received: true, error: 'Processing failed' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    } catch (error) {
        logger.error('Webhook handler error', { error });
        return new Response('Webhook handler error', { status: 500 });
    }
}
