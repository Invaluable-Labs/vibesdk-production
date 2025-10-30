/**
 * Billing Page
 * Manage subscription and view billing information
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { subscriptionClient, type SubscriptionStatus } from '@/lib/subscription-client';
import { useAuth } from '@/contexts/auth-context';
import { motion } from 'framer-motion';
import { 
	CreditCard, 
	Loader2, 
	CheckCircle, 
	XCircle, 
	Calendar,
	AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Billing() {
	const [searchParams] = useSearchParams();
	const [status, setStatus] = useState<SubscriptionStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [portalLoading, setPortalLoading] = useState(false);
	const [actionLoading, setActionLoading] = useState(false);
	const { user } = useAuth();

	useEffect(() => {
		// Check for success/cancel from Stripe checkout
		if (searchParams.get('success') === 'true') {
			toast.success('Subscription activated successfully!');
		} else if (searchParams.get('canceled') === 'true') {
			toast.error('Checkout canceled');
		}

		loadSubscriptionStatus();
	}, [searchParams]);

	const loadSubscriptionStatus = async () => {
		try {
			const subscriptionStatus = await subscriptionClient.getSubscriptionStatus();
			setStatus(subscriptionStatus);
		} catch (error) {
			console.error('Failed to load subscription:', error);
			toast.error('Failed to load subscription information');
		} finally {
			setLoading(false);
		}
	};

	const handleManageBilling = async () => {
		setPortalLoading(true);
		try {
			const session = await subscriptionClient.createPortalSession();
			window.location.href = session.url;
		} catch (error) {
			console.error('Failed to open billing portal:', error);
			toast.error('Failed to open billing portal');
			setPortalLoading(false);
		}
	};

	const handleCancelSubscription = async () => {
		if (!confirm('Are you sure you want to cancel your subscription? You will still have access until the end of your billing period.')) {
			return;
		}

		setActionLoading(true);
		try {
			await subscriptionClient.cancelSubscription();
			toast.success('Subscription will be canceled at the end of the billing period');
			await loadSubscriptionStatus();
		} catch (error) {
			console.error('Failed to cancel subscription:', error);
			toast.error('Failed to cancel subscription');
		} finally {
			setActionLoading(false);
		}
	};

	const handleReactivateSubscription = async () => {
		setActionLoading(true);
		try {
			await subscriptionClient.reactivateSubscription();
			toast.success('Subscription reactivated successfully!');
			await loadSubscriptionStatus();
		} catch (error) {
			console.error('Failed to reactivate subscription:', error);
			toast.error('Failed to reactivate subscription');
		} finally {
			setActionLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Loader2 className="size-8 animate-spin text-accent" />
			</div>
		);
	}

	const subscription = status?.subscription;
	const hasActiveSubscription = status?.hasActiveSubscription;

	return (
		<div className="container mx-auto px-4 py-16 max-w-4xl">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="mb-8"
			>
				<h1 className="text-4xl font-bold text-text-primary mb-2">
					Billing & Subscription
				</h1>
				<p className="text-text-secondary">
					Manage your subscription and billing information
				</p>
			</motion.div>

			{/* Subscription Status Card */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="bg-bg-4 dark:bg-bg-2 rounded-2xl border border-border-primary p-8 mb-6"
			>
				<div className="flex items-start justify-between mb-6">
					<div className="flex items-center gap-3">
						<CreditCard className="size-8 text-accent" />
						<div>
							<h2 className="text-2xl font-semibold text-text-primary">
								Subscription Status
							</h2>
							<div className="flex items-center gap-2 mt-1">
								{hasActiveSubscription ? (
									<>
										<CheckCircle className="size-4 text-green-500" />
										<span className="text-green-500 font-medium">Active</span>
									</>
								) : (
									<>
										<XCircle className="size-4 text-text-tertiary" />
										<span className="text-text-tertiary font-medium">No Active Subscription</span>
									</>
								)}
							</div>
						</div>
					</div>
				</div>

				{subscription && (
					<div className="space-y-4">
						{/* Subscription Details */}
						<div className="grid md:grid-cols-2 gap-4">
							<div className="flex items-center gap-3 p-4 bg-bg-3 dark:bg-bg-1 rounded-lg">
								<Calendar className="size-5 text-accent" />
								<div>
									<p className="text-sm text-text-tertiary">Current Period Ends</p>
									<p className="text-lg font-semibold text-text-primary">
										{format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
									</p>
								</div>
							</div>

							<div className="flex items-center gap-3 p-4 bg-bg-3 dark:bg-bg-1 rounded-lg">
								<AlertCircle className="size-5 text-accent" />
								<div>
									<p className="text-sm text-text-tertiary">Status</p>
									<p className="text-lg font-semibold text-text-primary capitalize">
										{subscription.status.replace('_', ' ')}
									</p>
								</div>
							</div>
						</div>

						{/* Cancellation Warning */}
						{subscription.cancelAtPeriodEnd && (
							<div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
								<AlertCircle className="size-5 text-yellow-500 flex-shrink-0 mt-0.5" />
								<div>
									<p className="font-medium text-yellow-500">Subscription Ending</p>
									<p className="text-sm text-text-secondary mt-1">
										Your subscription will end on {format(new Date(subscription.currentPeriodEnd), 'MMMM dd, yyyy')}. 
										You can reactivate it anytime before then.
									</p>
								</div>
							</div>
						)}

						{/* Action Buttons */}
						<div className="flex flex-wrap gap-3 pt-4">
							<button
								onClick={handleManageBilling}
								disabled={portalLoading}
								className="bg-accent hover:bg-accent/90 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
							>
								{portalLoading ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										<span>Loading...</span>
									</>
								) : (
									<span>Manage Billing</span>
								)}
							</button>

							{subscription.cancelAtPeriodEnd ? (
								<button
									onClick={handleReactivateSubscription}
									disabled={actionLoading}
									className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
								>
									{actionLoading ? (
										<>
											<Loader2 className="size-4 animate-spin" />
											<span>Loading...</span>
										</>
									) : (
										<span>Reactivate Subscription</span>
									)}
								</button>
							) : (
								<button
									onClick={handleCancelSubscription}
									disabled={actionLoading}
									className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
								>
									{actionLoading ? (
										<>
											<Loader2 className="size-4 animate-spin" />
											<span>Loading...</span>
										</>
									) : (
										<span>Cancel Subscription</span>
									)}
								</button>
							)}
						</div>
					</div>
				)}

				{!hasActiveSubscription && (
					<div className="text-center py-8">
						<p className="text-text-secondary mb-4">
							You don't have an active subscription
						</p>
						<a
							href="/pricing"
							className="inline-block bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200"
						>
							View Plans
						</a>
					</div>
				)}
			</motion.div>
		</div>
	);
}
