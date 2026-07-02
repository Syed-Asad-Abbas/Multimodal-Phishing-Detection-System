const Stripe = require('stripe');
const { prisma } = require('../config/database');
const logger = require('../config/logger');

// Initialize Stripe gracefully
const stripeSecret = process.env.STRIPE_SECRET_KEY;
let stripe;
if (stripeSecret) {
    stripe = new Stripe(stripeSecret);
} else {
    logger.warn('STRIPE_SECRET_KEY is not defined in .env. Payments will run in simulation/mock mode.');
}

exports.createCheckoutSession = async (req, res, next) => {
    try {
        const { tier } = req.body;
        const userId = req.user.id;
        const userEmail = req.user.email;

        if (!['PRO', 'PRO_MAX'].includes(tier)) {
            return res.status(400).json({ message: 'Invalid subscription tier selected' });
        }

        if (req.user.subscription_tier === tier) {
            return res.status(400).json({ message: `You are already actively subscribed to the ${tier} plan.` });
        }

        if (req.user.subscription_tier === 'PRO_MAX' && tier === 'PRO') {
            return res.status(400).json({ message: 'You already have the PRO_MAX plan, which includes all PRO features.' });
        }

        const clientBaseUrl = process.env.CLIENT_BASE_URL || 'http://localhost:5173';

        // Simulation/Mock Mode fallback if Stripe keys are not set
        if (!stripe) {
            logger.info(`[Billing Mock] Simulating Stripe Checkout for User: ${userId}, Tier: ${tier}`);
            
            // Directly update subscription in database for mock flow
            await prisma.user.update({
                where: { id: userId },
                data: { subscription_tier: tier }
            });

            return res.json({
                success: true,
                isMock: true,
                url: `${clientBaseUrl}/dashboard/pricing?success=true`
            });
        }

        // Stripe Live/Test Mode Checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: tier === 'PRO_MAX' ? 'PhishGuard Pro Max Plan' : 'PhishGuard Pro Plan',
                            description: tier === 'PRO_MAX' 
                                ? 'Unlimited phishing scans, priority ML models, and API key access.' 
                                : 'Standard developer API key access and high scan limits.',
                        },
                        unit_amount: tier === 'PRO_MAX' ? 4900 : 1900, // $49.00 / $19.00
                        recurring: {
                            interval: 'month',
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${clientBaseUrl}/dashboard/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${clientBaseUrl}/dashboard/pricing?canceled=true`,
            customer_email: userEmail,
            metadata: {
                userId,
                tier
            }
        });

        res.json({
            success: true,
            isMock: false,
            url: session.url
        });
    } catch (error) {
        logger.error(`[Stripe Checkout Error] ${error.message}`);
        next(error);
    }
};

exports.handleWebhook = async (req, res, next) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe) {
        return res.status(400).json({ message: 'Stripe is disabled on this server.' });
    }

    if (!sig || !webhookSecret) {
        logger.error('[Stripe Webhook Warning] Webhook received but signatures/secrets are missing.');
        return res.status(400).send('Webhook verification failed: Secret missing.');
    }

    let event;

    try {
        // Construct event using the raw body buffer to verify authenticity
        event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch (err) {
        logger.error(`[Stripe Webhook Error] Signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.metadata?.userId;
                const tier = session.metadata?.tier;
                const subscriptionId = session.subscription;
                const customerId = session.customer;

                if (userId && tier) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            subscription_tier: tier,
                            stripe_customer_id: customerId,
                            stripe_subscription_id: subscriptionId
                        }
                    });
                    logger.info(`[Stripe Webhook] Upgraded user ${userId} to subscription tier ${tier}`);
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const customerId = subscription.customer;
                const status = subscription.status;

                let tier = 'FREE';
                if (['active', 'trialing'].includes(status)) {
                    // Inspect item plan name/price to update tier if subscription details changed
                    const priceAmount = subscription.items?.data[0]?.price?.unit_amount;
                    tier = priceAmount === 4900 ? 'PRO_MAX' : 'PRO';
                }

                const user = await prisma.user.findFirst({
                    where: { stripe_customer_id: customerId }
                });

                if (user) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            subscription_tier: tier,
                            stripe_subscription_id: subscription.id
                        }
                    });
                    logger.info(`[Stripe Webhook] Updated subscription for customer ${customerId} to tier ${tier}`);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customerId = subscription.customer;

                const user = await prisma.user.findFirst({
                    where: { stripe_customer_id: customerId }
                });

                if (user) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            subscription_tier: 'FREE',
                            stripe_subscription_id: null
                        }
                    });
                    logger.info(`[Stripe Webhook] Subscription deleted. Downgraded customer ${customerId} to FREE.`);
                }
                break;
            }

            default:
                logger.debug(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        logger.error(`[Stripe Webhook Processing Error] ${error.message}`);
        res.status(500).json({ error: 'Webhook processing failed.' });
    }
};
