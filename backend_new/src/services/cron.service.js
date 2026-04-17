const cron = require('node-cron');
const { prisma } = require('../config/database');
const { sendMail } = require('./email.service');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

// Run every minute
cron.schedule('* * * * *', async () => {
    try {
        const pendingJobs = await prisma.queuedJob.findMany({
            where: { status: 'PENDING' },
            take: 10 // process 10 at a time to prevent overload
        });

        if (pendingJobs.length > 0) {
            logger.info(`[Cron Service] Found ${pendingJobs.length} PENDING queued jobs`);
        }

        for (const job of pendingJobs) {
            // Mark as processing
            await prisma.queuedJob.update({
                where: { id: job.id },
                data: { status: 'PROCESSING' }
            });

            try {
                const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
                const { email, code, subject } = payload;
                let htmlTemplate = '';

                if (job.job_type === 'send_forgot_pass_otp_email') {
                    htmlTemplate = fs.readFileSync(path.join(__dirname, '../views/forgot_pass_mail.html'), 'utf8')
                        .replace('{{OTP_CODE}}', code);
                } else if (job.job_type === 'send_2fa_otp_email') {
                    htmlTemplate = fs.readFileSync(path.join(__dirname, '../views/two_factor_mail.html'), 'utf8')
                        .replace('{{OTP_CODE}}', code);
                } else {
                    htmlTemplate = `<p>OTP Code: ${code}</p>`;
                }

                const result = await sendMail(email, subject || "Your OTP Code", htmlTemplate);

                if (result.success) {
                    await prisma.queuedJob.update({
                        where: { id: job.id },
                        data: { status: 'COMPLETED' }
                    });
                    logger.info(`[Cron Service] Job ${job.id} COMPLETED`);
                } else {
                    throw new Error(result.error || result.message);
                }

            } catch (jobError) {
                logger.error(`[Cron Service] Error processing job ${job.id}: ${jobError.message}`);
                await prisma.queuedJob.update({
                    where: { id: job.id },
                    data: { status: 'FAILED' }
                });
            }
        }
    } catch (error) {
        logger.error(`[Cron Service] Cron error: ${error.message}`);
    }
});

logger.info('[Cron Service] Initialized to run every minute.');

