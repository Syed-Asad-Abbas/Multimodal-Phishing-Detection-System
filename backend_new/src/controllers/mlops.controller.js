const { prisma } = require('../config/database');
const axios = require('axios');
const logger = require('../config/logger');

const ML_API_URL = process.env.ML_API_BASE_URL || 'http://localhost:5000';

exports.triggerRetraining = async (req, res, next) => {
    try {
        const adminId = req.user.id;

        // 1. Log Job Start
        const job = await prisma.retrainingJob.create({
            data: {
                triggered_by: adminId,
                status: 'running',
                start_time: new Date()
            }
        });

        // 2. Call ML Service (Async)
        // We don't wait for completion here if it takes long, usually we return job ID.
        // But for simplicity/demo, let's assume it returns "Started".
        // If we want to simulate long running process, we just fire and forget or use a queue.
        // Code here assumes immediate response "Job Started".

        // Mock Implementation
        // await axios.post(`${ML_API_URL}/retrain`); 

        logger.info(`[MLOps] Retraining triggered by Admin ${adminId}`);

        res.json({ message: 'Retraining initiated', jobId: job.id });

        // Simulate async completion after response
        setTimeout(async () => {
            await prisma.retrainingJob.update({
                where: { id: job.id },
                data: {
                    status: 'completed',
                    end_time: new Date(),
                    metrics_summary: JSON.stringify({ accuracy: 0.98, f1: 0.97 })
                }
            });

            // Log Pipeline Health
            await prisma.pipelineHealthLog.create({
                data: {
                    service_name: 'retraining_pipeline',
                    status: 'healthy',
                    latency_ms: 1200,
                    timestamp: new Date()
                }
            });
        }, 5000); // 5 sec dummy delay

    } catch (error) {
        next(error);
    }
};

exports.getPipelineHealth = async (req, res, next) => {
    try {
        const logs = await prisma.pipelineHealthLog.findMany({
            orderBy: { timestamp: 'desc' },
            take: 10
        });

        // Mock Real-time check if no logs
        const status = {
            ml_service: 'up', // We could actually ping it here
            db: 'up',
            last_logs: logs
        };

        res.json(status);
    } catch (error) {
        next(error);
    }
};

exports.getRetrainingHistory = async (req, res, next) => {
    try {
        const jobs = await prisma.retrainingJob.findMany({
            orderBy: { start_time: 'desc' },
            take: 20
        });
        res.json(jobs);
    } catch (error) {
        next(error);
    }
};
