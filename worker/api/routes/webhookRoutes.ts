import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { handleStripeWebhook } from '../controllers/webhooks/stripeWebhook';

/**
 * Setup webhook routes
 * These routes are called by external services (Stripe) and should not require authentication
 */
export function setupWebhookRoutes(app: Hono<AppEnv>): void {
    // Stripe webhook endpoint (no auth - verified by signature)
    app.post('/api/webhooks/stripe', async (c) => {
        const env = c.env;
        const request = c.req.raw;
        
        const response = await handleStripeWebhook(request, env);
        return response;
    });
}
