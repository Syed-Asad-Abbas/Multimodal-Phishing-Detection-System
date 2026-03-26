const bcrypt = require('bcrypt');
const crypto = require('crypto');

const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

const verifyPassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = { hashPassword, verifyPassword, hashToken };
