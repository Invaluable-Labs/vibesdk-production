/**
 * Subscription API Client
 * Handles all subscription and billing-related API calls
 */

export interface SubscriptionStatus {
    hasActiveSubscription: boolean;
    subscription: {
        id: string;
        status: string;
        currentPeriodEnd: Date;
        cancelAtPeriodEnd: boolean;
    } | null;
}

export interface PriceInfo {
    id: string;
    product: string;
    unitAmount: number | null;
    currency: string;
    interval: string | null;
    intervalCount: number | null;
}

export interface CheckoutSessionResponse {
    sessionId: string;
    url: string;
}

export interface PortalSessionResponse {
    url: string;
}

export class SubscriptionClient {
    private baseUrl: string;

    constructor(baseUrl: string = '/api') {
        this.baseUrl = baseUrl;
    }

    /**
     * Get user's subscription status
     */
    async getSubscriptionStatus(): Promise<SubscriptionStatus> {
        const response = await fetch(`${this.baseUrl}/subscription/status`, {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to fetch subscription status');
        }

        return response.json();
    }

    /**
     * Create checkout session for subscription
     */
    async createCheckoutSession(
        priceId: string,
        successUrl?: string,
        cancelUrl?: string
    ): Promise<CheckoutSessionResponse> {
        const response = await fetch(`${this.baseUrl}/subscription/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                priceId,
                successUrl,
                cancelUrl,
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to create checkout session');
        }

        return response.json();
    }

    /**
     * Create billing portal session
     */
    async createPortalSession(): Promise<PortalSessionResponse> {
        const response = await fetch(`${this.baseUrl}/subscription/create-portal-session`, {
            method: 'POST',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to create portal session');
        }

        return response.json();
    }

    /**
     * Cancel subscription at period end
     */
    async cancelSubscription(): Promise<void> {
        const response = await fetch(`${this.baseUrl}/subscription/cancel`, {
            method: 'POST',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to cancel subscription');
        }
    }

    /**
     * Reactivate a canceled subscription
     */
    async reactivateSubscription(): Promise<void> {
        const response = await fetch(`${this.baseUrl}/subscription/reactivate`, {
            method: 'POST',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to reactivate subscription');
        }
    }

    /**
     * Get available pricing plans
     */
    async getPrices(): Promise<PriceInfo[]> {
        const response = await fetch(`${this.baseUrl}/subscription/prices`, {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Failed to fetch prices');
        }

        const data = await response.json();
        return data.prices;
    }
}

// Export singleton instance
export const subscriptionClient = new SubscriptionClient();
