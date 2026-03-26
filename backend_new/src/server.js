require('dotenv').config();
const app = require('./app');
const logger = require('./config/logger');
const { connectDB } = require('./config/database');

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection! Shutting down...');
    logger.error(err);
    server.close(() => {
        process.exit(1);
    });
});
