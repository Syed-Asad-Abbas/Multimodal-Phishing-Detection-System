const Joi = require('joi');

const createReview = Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(500).allow(null, ''),
});

const updateReviewStatus = Joi.object({
    status: Joi.string().valid('APPROVED', 'REJECTED', 'PENDING').required(),
});

module.exports = {
    createReview,
    updateReviewStatus,
};
