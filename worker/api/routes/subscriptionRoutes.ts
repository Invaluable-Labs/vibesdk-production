import { SubscriptionController } from '../controllers/subscription/controller';
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

/**
 * Setup subscription and billing routes
 */
export function setupSubscriptionRoutes(app: Hono<AppEnv>): void {
    // Create Stripe checkout session (authenticated)
    app.post(
        '/api/subscription/create-checkout-session', 
        setAuthLevel(AuthConfig.authenticated), 
        adaptController(SubscriptionController, SubscriptionController.createCheckoutSession)
    );

    // Create billing portal session (authenticated)
    app.post(
        '/api/subscription/create-portal-session', 
        setAuthLevel(AuthConfig.authenticated), 
        adaptController(SubscriptionController, SubscriptionController.createPortalSession)
    );

    // Get subscription status (authenticated)
    app.get(
        '/api/subscription/status', 
        setAuthLevel(AuthConfig.authenticated), 
        adaptController(SubscriptionController, SubscriptionController.getSubscriptionStatus)
    );

    // Cancel subscription (authenticated)
    app.post(
        '/api/subscription/cancel', 
        setAuthLevel(AuthConfig.authenticated), 
        adaptController(SubscriptionController, SubscriptionController.cancelSubscription)
    );

    // Reactivate subscription (authenticated)
    app.post(
        '/api/subscription/reactivate', 
        setAuthLevel(AuthConfig.authenticated), 
        adaptController(SubscriptionController, SubscriptionController.reactivateSubscription)
    );

    // Get available prices (public)
    app.get(
        '/api/subscription/prices', 
        adaptController(SubscriptionController, SubscriptionController.getPrices)
    );
}
