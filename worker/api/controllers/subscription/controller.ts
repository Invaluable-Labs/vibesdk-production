/**
 * Subscription Controller
 * Handles Stripe subscription-related API endpoints
 */

import { z } from 'zod';
import { StripeService } from '../../../services/stripe/StripeService';
import { BaseController } from '../baseController';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../../database/schema';

// Validation schemas
const createCheckoutSessionSchema = z.object({
    priceId: z.string(),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
});

export class SubscriptionController extends BaseController {
    /**
     * Create Stripe checkout session
     * POST /api/subscription/create-checkout-session
     */
    static async createCheckoutSession(
        request: Request,
        env: Env,
        _ctx: ExecutionContext,
        routeContext: RouteContext
    ): Promise<Response> {
        try {
            if (!routeContext.user) {
                return SubscriptionController.createErrorResponse('Unauthorized', 401);
            }

            const bodyResult = await SubscriptionController.parseJsonBody(request);
            if (!bodyResult.success) {
                return bodyResult.response!;
            }

            const validatedData = createCheckoutSessionSchema.parse(bodyResult.data);
            
            // Get base URLs
            const url = new URL(request.url);
            const baseUrl = `${url.protocol}//${url.host}`;
            
            const successUrl = validatedData.successUrl || `${baseUrl}/billing?success=true`;
            const cancelUrl = validatedData.cancelUrl || `${baseUrl}/billing?canceled=true`;

            const db = drizzle(env.DB, { schema });
            const stripeService = new StripeService(env.STRIPE_SECRET_KEY, db);

            const session = await stripeService.createCheckoutSession(
                routeContext.user.id,
                routeContext.user.email,
                validatedData.priceId,
                successUrl,
                cancelUrl
            );

            return SubscriptionController.createSuccessResponse({
                sessionId: session.id,
                url: session.url,
            });
        } catch (error) {
            return SubscriptionController.handleError(error, 'create checkout session');
        }
    }

    /**
     * Create billing portal session
     * POST /api/subscription/create-portal-session
     */
    static async createPortalSession(
        request: Request,
        env: Env,
        _ctx: ExecutionContext,
        routeContext: RouteContext
    ): Promise<Response> {
        try {
            if (!routeContext.user) {
                return SubscriptionController.createErrorResponse('Unauthorized', 401);
            }

            const db = drizzle(env.DB, { schema });
            const stripeService = new StripeService(env.STRIPE_SECRET_KEY, db);

            // Get user's subscription to find customer ID
            const subscription = await stripeService.getUserSubscription(routeContext.user.id);
            if (!subscription) {
                return SubscriptionController.createErrorResponse('No active subscription found', 404);
            }

            // Get base URL
            const url = new URL(request.url);
            const returnUrl = `${url.protocol}//${url.host}/billing`;

            const session = await stripeService.createBillingPortalSession(
                subscription.stripeCustomerId,
                returnUrl
            );

            return SubscriptionController.createSuccessResponse({
                url: session.url,
            });
        } catch (error) {
            return SubscriptionController.handleError(error, 'create portal session');
        }
    }

    /**
     * Get user's subscription status
     * GET /api/subscription/status
     */
    static async getSubscriptionStatus(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        routeContext: RouteContext
    ): Promise<Response> {
        try {
            if (!routeContext.user) {
                return SubscriptionController.createErrorResponse('Unauthorized', 401);
            }

            const db = drizzle(env.DB, { schema });
            const stripeService = new StripeService(env.STRIPE_SECRET_KEY, db);

            const subscription = await stripeService.getUserSubscription(routeContext.user.id);

            return SubscriptionController.createSuccessResponse({
                hasActiveSubscription: subscription !== null,
                subscription: subscription ? {
                    id: subscription.id,
                    status: subscription.status,
                    currentPeriodEnd: subscription.currentPeriodEnd,
                    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                } : null,
            });
        } catch (error) {
            return SubscriptionController.handleError(error, 'get subscription status');
        }
    }

    /**
     * Cancel subscription
     * POST /api/subscription/cancel
     */
    static async cancelSubscription(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        routeContext: RouteContext
    ): Promise<Response> {
        try {
            if (!routeContext.user) {
                return SubscriptionController.createErrorResponse('Unauthorized', 401);
            }

            const db = drizzle(env.DB, { schema });
            const stripeService = new StripeService(env.STRIPE_SECRET_KEY, db);

            const subscription = await stripeService.getUserSubscription(routeContext.user.id);
            if (!subscription) {
                return SubscriptionController.createErrorResponse('No active subscription found', 404);
            }

            await stripeService.cancelSubscription(subscription.id);

            return SubscriptionController.createSuccessResponse({
                message: 'Subscription will be canceled at the end of the billing period',
            });
        } catch (error) {
            return SubscriptionController.handleError(error, 'cancel subscription');
        }
    }

    /**
     * Reactivate subscription
     * POST /api/subscription/reactivate
     */
    static async reactivateSubscription(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        routeContext: RouteContext
    ): Promise<Response> {
        try {
            if (!routeContext.user) {
                return SubscriptionController.createErrorResponse('Unauthorized', 401);
            }

            const db = drizzle(env.DB, { schema });
            const stripeService = new StripeService(env.STRIPE_SECRET_KEY, db);

            const subscription = await stripeService.getUserSubscription(routeContext.user.id);
            if (!subscription) {
                return SubscriptionController.createErrorResponse('No active subscription found', 404);
            }

            await stripeService.reactivateSubscription(subscription.id);

            return SubscriptionController.createSuccessResponse({
                message: 'Subscription reactivated successfully',
            });
        } catch (error) {
            return SubscriptionController.handleError(error, 'reactivate subscription');
        }
    }

    /**
     * Get available pricing plans
     * GET /api/subscription/prices
     */
    static async getPrices(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        _routeContext: RouteContext
    ): Promise<Response> {
        try {
            const db = drizzle(env.DB, { schema });
            const stripeService = new StripeService(env.STRIPE_SECRET_KEY, db);

            const prices = await stripeService.getPrices();

            return SubscriptionController.createSuccessResponse({
                prices: prices.map(price => ({
                    id: price.id,
                    product: price.product,
                    unitAmount: price.unit_amount,
                    currency: price.currency,
                    interval: price.recurring?.interval,
                    intervalCount: price.recurring?.interval_count,
                })),
            });
        } catch (error) {
            return SubscriptionController.handleError(error, 'get prices');
        }
    }
}
