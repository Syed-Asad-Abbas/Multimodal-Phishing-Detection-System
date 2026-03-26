const { prisma } = require('../config/database');
const validation = require('../validations/review.validation');

// --- USER ACTIONS ---

// Submit a Review
exports.createReview = async (req, res, next) => {
    try {
        const { error } = validation.createReview.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const { rating, comment } = req.body;
        const userId = req.user.id;

        const review = await prisma.review.create({
            data: {
                user_id: userId,
                rating,
                comment,
                status: 'PENDING',
            },
        });

        res.status(201).json({ message: 'Review submitted for approval', reviewId: review.id });
    } catch (error) {
        next(error);
    }
};

// Get My Reviews
exports.getMyReviews = async (req, res, next) => {
    try {
        const reviews = await prisma.review.findMany({
            where: { user_id: req.user.id },
            orderBy: { created_at: 'desc' },
        });
        res.json(reviews);
    } catch (error) {
        next(error);
    }
};

// --- PUBLIC ACTIONS ---

// Get Testimonials (Approved Reviews)
exports.getTestimonials = async (req, res, next) => {
    try {
        const testimonials = await prisma.testimonial.findMany({
            include: {
                review: {
                    include: {
                        user: {
                            select: { email: true } // Or name if we had it
                        }
                    }
                }
            },
            orderBy: { published_at: 'desc' }
        });

        // Transform for UI
        const data = testimonials.map(t => ({
            id: t.id,
            user_email: t.review.user.email.split('@')[0] + '***', // Mask email
            rating: t.review.rating,
            comment: t.display_text || t.review.comment,
            date: t.published_at
        }));

        res.json(data);
    } catch (error) {
        next(error);
    }
};

// --- ADMIN ACTIONS ---

// Get All Reviews (Admin)
exports.getAllReviews = async (req, res, next) => {
    try {
        const reviews = await prisma.review.findMany({
            include: {
                user: { select: { email: true } },
                testimonial: true
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(reviews);
    } catch (error) {
        next(error);
    }
};

// Update Review Status (Approve/Reject)
exports.updateStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { error } = validation.updateReviewStatus.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const { status } = req.body;

        const review = await prisma.review.update({
            where: { id },
            data: { status }
        });

        if (status === 'APPROVED') {
            // Create or Update Testimonial
            await prisma.testimonial.upsert({
                where: { review_id: review.id },
                update: { display_text: review.comment },
                create: {
                    review_id: review.id,
                    display_text: review.comment
                }
            });
        } else {
            // If rejected/pending, remove testimonial if exists
            await prisma.testimonial.deleteMany({
                where: { review_id: review.id }
            });
        }

        res.json({ message: `Review ${status}`, review });
    } catch (error) {
        next(error);
    }
};
