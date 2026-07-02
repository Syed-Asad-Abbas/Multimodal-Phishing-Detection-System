const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

/**
 * Middleware to authenticate requests via x-api-key header or JWT token,
 * and intercept requests based on the user's subscription tier.
 */
const apiKeyAuth = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers.authorization;

    let user = null;

    try {
        if (apiKey) {
            // Hash the incoming key to match database storage
            const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

            user = await prisma.user.findUnique({
                where: { api_key_hash: hashedKey }
            });

            if (!user) {
                return res.status(401).json({ message: 'Invalid API Key' });
            }
        } else if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (!token) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Query the database to get the latest subscription tier
            user = await prisma.user.findUnique({
                where: { id: decoded.id }
            });

            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }
        } else {
            return res.status(401).json({ message: 'Authentication required. Provide an API key or bearer token.' });
        }

        // Verify Subscription Tier
        if (user.subscription_tier === 'FREE') {
            return res.status(403).json({
                success: false,
                message: 'API access is disabled for free accounts. Please upgrade to Pro or Pro Max.'
            });
        }

        // Attach authenticated user to request object
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            subscription_tier: user.subscription_tier
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token Expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid Token' });
        }
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = apiKeyAuth;
