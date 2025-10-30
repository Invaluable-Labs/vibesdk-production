/**
 * Stripe Service
 * Handles all Stripe-related operations including subscriptions, payments, and customer management
 */

import Stripe from 'stripe';
import { eq, and } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { subscriptions, payments, type NewSubscription, type NewPayment } from '../../database/schema';

export class StripeService {
    private stripe: Stripe;
    private db: DrizzleD1Database<any>;

    constructor(secretKey: string, db: DrizzleD1Database<any>) {
        this.stripe = new Stripe(secretKey, {
            apiVersion: '2024-12-18.acacia',
            httpClient: Stripe.createFetchHttpClient(),
        });
        this.db = db;
    }

    /**
     * Create or retrieve a Stripe customer for a user
     */
    async getOrCreateCustomer(userId: string, email: string, name?: string): Promise<string> {
        // Check if user already has a customer ID in subscriptions
        const existingSub = await this.db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, userId))
            .limit(1);

        if (existingSub.length > 0 && existingSub[0].stripeCustomerId) {
            return existingSub[0].stripeCustomerId;
        }

        // Create new Stripe customer
        const customer = await this.stripe.customers.create({
            email,
            name,
            metadata: {
                userId,
            },
        });

        return customer.id;
    }

    /**
     * Create a checkout session for subscription
     */
    async createCheckoutSession(
        userId: string,
        email: string,
        priceId: string,
        successUrl: string,
        cancelUrl: string
    ): Promise<Stripe.Checkout.Session> {
        const customerId = await this.getOrCreateCustomer(userId, email);

        const session = await this.stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId,
            },
        });

        return session;
    }

    /**
     * Create a billing portal session for managing subscriptions
     */
    async createBillingPortalSession(
        customerId: string,
        returnUrl: string
    ): Promise<Stripe.BillingPortal.Session> {
        const session = await this.stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });

        return session;
    }

    /**
     * Get user's active subscription
     */
    async getUserSubscription(userId: string) {
        const userSubs = await this.db
            .select()
            .from(subscriptions)
            .where(
                and(
                    eq(subscriptions.userId, userId),
                    eq(subscriptions.status, 'active')
                )
            )
            .limit(1);

        return userSubs.length > 0 ? userSubs[0] : null;
    }

    /**
     * Check if user has an active subscription
     */
    async hasActiveSubscription(userId: string): Promise<boolean> {
        const sub = await this.getUserSubscription(userId);
        return sub !== null;
    }

    /**
     * Cancel a subscription at period end
     */
    async cancelSubscription(subscriptionId: string): Promise<void> {
        await this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });

        await this.db
            .update(subscriptions)
            .set({
                cancelAtPeriodEnd: true,
                updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, subscriptionId));
    }

    /**
     * Reactivate a canceled subscription
     */
    async reactivateSubscription(subscriptionId: string): Promise<void> {
        await this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
        });

        await this.db
            .update(subscriptions)
            .set({
                cancelAtPeriodEnd: false,
                updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, subscriptionId));
    }

    /**
     * Handle subscription created webhook
     */
    async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
        const userId = subscription.metadata.userId;
        if (!userId) {
            throw new Error('No userId in subscription metadata');
        }

        const newSub: NewSubscription = {
            id: subscription.id,
            userId,
            stripeCustomerId: subscription.customer as string,
            stripePriceId: subscription.items.data[0].price.id,
            stripeProductId: subscription.items.data[0].price.product as string,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await this.db.insert(subscriptions).values(newSub);
    }

    /**
     * Handle subscription updated webhook
     */
    async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
        await this.db
            .update(subscriptions)
            .set({
                status: subscription.status,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
                updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, subscription.id));
    }

    /**
     * Handle subscription deleted webhook
     */
    async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
        await this.db
            .update(subscriptions)
            .set({
                status: 'canceled',
                canceledAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, subscription.id));
    }

    /**
     * Handle invoice payment succeeded webhook
     */
    async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
        const userId = invoice.metadata?.userId || invoice.subscription_details?.metadata?.userId;
        if (!userId) {
            console.warn('No userId in invoice metadata');
            return;
        }

        const newPayment: NewPayment = {
            id: invoice.payment_intent as string || `pi_${invoice.id}`,
            userId,
            subscriptionId: invoice.subscription as string || null,
            stripeInvoiceId: invoice.id,
            stripeCustomerId: invoice.customer as string,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: 'succeeded',
            description: invoice.description || 'Subscription payment',
            receiptUrl: invoice.hosted_invoice_url,
            createdAt: new Date(),
            paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
        };

        await this.db.insert(payments).values(newPayment);
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string, webhookSecret: string): Stripe.Event {
        return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }

    /**
     * Get subscription prices
     */
    async getPrices(productId?: string): Promise<Stripe.Price[]> {
        const params: Stripe.PriceListParams = {
            active: true,
            expand: ['data.product'],
        };

        if (productId) {
            params.product = productId;
        }

        const prices = await this.stripe.prices.list(params);
        return prices.data;
    }

    /**
     * Get subscription products
     */
    async getProducts(): Promise<Stripe.Product[]> {
        const products = await this.stripe.products.list({
            active: true,
        });
        return products.data;
    }
}
