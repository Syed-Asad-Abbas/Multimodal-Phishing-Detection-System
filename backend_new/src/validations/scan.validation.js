const Joi = require('joi');

const submitScan = Joi.object({
    url: Joi.string().uri().required(),
});

module.exports = {
    submitScan,
};
