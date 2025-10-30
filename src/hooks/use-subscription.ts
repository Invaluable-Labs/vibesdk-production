/**
 * Subscription Hook
 * React hook for checking subscription status
 */

import { useState, useEffect } from 'react';
import { subscriptionClient, type SubscriptionStatus } from '@/lib/subscription-client';

export function useSubscription() {
    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        try {
            const subscriptionStatus = await subscriptionClient.getSubscriptionStatus();
            setStatus(subscriptionStatus);
            setError(null);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    const refetch = () => {
        setLoading(true);
        return loadStatus();
    };

    return {
        status,
        loading,
        error,
        hasActiveSubscription: status?.hasActiveSubscription ?? false,
        refetch,
    };
}
