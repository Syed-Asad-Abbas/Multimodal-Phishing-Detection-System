const Joi = require('joi');

const createAdmin = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    name: Joi.string().optional()
});

const updateUserRole = Joi.object({
    role: Joi.string().valid('USER', 'ADMIN').required()
});

module.exports = {
    createAdmin,
    updateUserRole,
};
