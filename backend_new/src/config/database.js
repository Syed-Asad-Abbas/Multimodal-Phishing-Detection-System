const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient({
    log: [
        {
            emit: 'event',
            level: 'query',
        },
        {
            emit: 'stdout',
            level: 'error',
        },
        {
            emit: 'stdout',
            level: 'info',
        },
        {
            emit: 'stdout',
            level: 'warn',
        },
    ],
});

prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Duration: ${e.duration}ms`);
});

const connectDB = async () => {
    try {
        await prisma.$connect();
        logger.info('Database Connected Successfully');
    } catch (error) {
        logger.error('Database Connection Failed', error);
        process.exit(1);
    }
};

module.exports = { prisma, connectDB };
