/**
 * Pricing Page
 * Displays subscription plans and handles checkout
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { subscriptionClient, type PriceInfo } from '@/lib/subscription-client';
import { useAuth } from '@/contexts/auth-context';
import { motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Pricing() {
	const [prices, setPrices] = useState<PriceInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
	const { user } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		loadPrices();
	}, []);

	const loadPrices = async () => {
		try {
			const pricesList = await subscriptionClient.getPrices();
			setPrices(pricesList);
		} catch (error) {
			console.error('Failed to load prices:', error);
			toast.error('Failed to load pricing plans');
		} finally {
			setLoading(false);
		}
	};

	const handleSubscribe = async (priceId: string) => {
		if (!user) {
			toast.error('Please sign in to subscribe');
			navigate('/auth/login?redirect=/pricing');
			return;
		}

		setCheckoutLoading(priceId);
		try {
			const session = await subscriptionClient.createCheckoutSession(priceId);
			// Redirect to Stripe Checkout
			window.location.href = session.url;
		} catch (error) {
			console.error('Failed to create checkout session:', error);
			toast.error('Failed to start checkout. Please try again.');
			setCheckoutLoading(null);
		}
	};

	const formatPrice = (amount: number | null, currency: string) => {
		if (amount === null) return 'Custom';
		const price = amount / 100;
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase(),
		}).format(price);
	};

	const formatInterval = (interval: string | null, count: number | null) => {
		if (!interval) return '';
		if (count === 1) return `per ${interval}`;
		return `per ${count} ${interval}s`;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Loader2 className="size-8 animate-spin text-accent" />
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-16 max-w-7xl">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="text-center mb-16"
			>
				<h1 className="text-5xl font-bold text-text-primary mb-4">
					Choose Your Plan
				</h1>
				<p className="text-xl text-text-secondary max-w-2xl mx-auto">
					Build HIPAA-compliant healthcare applications with AI-powered tools
				</p>
			</motion.div>

			{/* Pricing Cards */}
			<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
				{prices.map((price, index) => (
					<motion.div
						key={price.id}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.1 }}
						className="relative bg-bg-4 dark:bg-bg-2 rounded-2xl border border-border-primary p-8 hover:border-accent/50 transition-all duration-200 hover:shadow-lg"
					>
						{/* Plan Name - derived from product */}
						<div className="mb-6">
							<h3 className="text-2xl font-bold text-text-primary mb-2">
								{typeof price.product === 'string' ? 'Professional' : 'Plan'}
							</h3>
							<div className="flex items-baseline gap-2">
								<span className="text-4xl font-bold text-accent">
									{formatPrice(price.unitAmount, price.currency)}
								</span>
								<span className="text-text-secondary">
									{formatInterval(price.interval, price.intervalCount)}
								</span>
							</div>
						</div>

						{/* Features */}
						<ul className="space-y-4 mb-8">
							<li className="flex items-start gap-3">
								<Check className="size-5 text-accent flex-shrink-0 mt-0.5" />
								<span className="text-text-secondary">
									Unlimited app creation
								</span>
							</li>
							<li className="flex items-start gap-3">
								<Check className="size-5 text-accent flex-shrink-0 mt-0.5" />
								<span className="text-text-secondary">
									AI-powered code generation
								</span>
							</li>
							<li className="flex items-start gap-3">
								<Check className="size-5 text-accent flex-shrink-0 mt-0.5" />
								<span className="text-text-secondary">
									HIPAA-compliant infrastructure
								</span>
							</li>
							<li className="flex items-start gap-3">
								<Check className="size-5 text-accent flex-shrink-0 mt-0.5" />
								<span className="text-text-secondary">
									Priority support
								</span>
							</li>
							<li className="flex items-start gap-3">
								<Check className="size-5 text-accent flex-shrink-0 mt-0.5" />
								<span className="text-text-secondary">
									Custom domain support
								</span>
							</li>
						</ul>

						{/* Subscribe Button */}
						<button
							onClick={() => handleSubscribe(price.id)}
							disabled={checkoutLoading !== null}
							className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
						>
							{checkoutLoading === price.id ? (
								<>
									<Loader2 className="size-5 animate-spin" />
									<span>Loading...</span>
								</>
							) : (
								<span>Subscribe Now</span>
							)}
						</button>
					</motion.div>
				))}
			</div>

			{/* Free Trial Notice */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.4 }}
				className="text-center mt-12"
			>
				<p className="text-text-tertiary">
					All plans include a 14-day free trial. Cancel anytime.
				</p>
			</motion.div>
		</div>
	);
}
