const { prisma } = require('../config/database');
const mlService = require('../services/ml.service');
const validation = require('../validations/scan.validation');
const logger = require('../config/logger');

exports.submitScan = async (req, res, next) => {
    try {
        const { error } = validation.submitScan.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { url } = req.body;
        const userId = req.user ? req.user.id : null;

        // 1. Create Scan Record (PENDING)
        const scan = await prisma.scan.create({
            data: {
                url,
                user_id: userId,
                status: 'PENDING',
            },
        });

        // 2. Trigger ML Service (Async or Await? Real-time means await usually)
        let mlResponse;
        try {
            mlResponse = await mlService.predictUrl(url);
        } catch (mlError) {
            // Update to FAILED
            await prisma.scan.update({
                where: { id: scan.id },
                data: { status: 'FAILED' }
            });
            throw mlError;
        }

        // 3. Persist Results
        // Prediction might be "Phishing" or "Benign"
        const isPhishing = mlResponse.prediction.toLowerCase() === 'phishing';

        const scanResult = await prisma.scanResult.create({
            data: {
                scan_id: scan.id,
                prediction: mlResponse.prediction,
                confidence_score: mlResponse.confidence,
                phishing_probability: mlResponse.fusion_probability_phishing,
            }
        });

        // SHAP Values
        if (mlResponse.shap_values) {
            const shapData = [];
            for (const [modality, features] of Object.entries(mlResponse.shap_values)) {
                for (const [feature, value] of Object.entries(features)) {
                    shapData.push({
                        scan_result_id: scanResult.id,
                        modality,
                        feature_name: feature,
                        shap_value: value
                    });
                }
            }
            if (shapData.length > 0) {
                await prisma.scanShapValue.createMany({ data: shapData });
            }
        }

        // Explanation
        if (mlResponse.explanation) {
            await prisma.scanExplanation.create({
                data: {
                    scan_result_id: scanResult.id,
                    llm_text: mlResponse.explanation
                }
            });
        }

        // Screenshot
        if (mlResponse.screenshot) {
            await prisma.scanScreenshot.create({
                data: {
                    scan_result_id: scanResult.id,
                    image_url: mlResponse.screenshot.startsWith('http') ? mlResponse.screenshot : null,
                    base64_data: !mlResponse.screenshot.startsWith('http') ? mlResponse.screenshot : null
                }
            });
        }

        // Malicious IP (if phishing)
        if (isPhishing && mlResponse.ip_metadata && mlResponse.ip_metadata.ip) {
            const maliciousIpData = {
                scan_id: scan.id,
                ip_address: mlResponse.ip_metadata.ip,
            };

            if (mlResponse.ip_metadata.geo) {
                if (mlResponse.ip_metadata.geo.lat != null) maliciousIpData.geo_lat = mlResponse.ip_metadata.geo.lat;
                if (mlResponse.ip_metadata.geo.long != null) maliciousIpData.geo_long = mlResponse.ip_metadata.geo.long;
                if (mlResponse.ip_metadata.geo.country != null) maliciousIpData.country = mlResponse.ip_metadata.geo.country;
            }

            await prisma.maliciousIpObservation.create({
                data: maliciousIpData
            });
        }

        // 4. Update Status to COMPLETED
        await prisma.scan.update({
            where: { id: scan.id },
            data: { status: 'COMPLETED' }
        });

        res.json({
            message: 'Scan completed successfully',
            scanId: scan.id,
            result: mlResponse
        });

    } catch (error) {
        next(error);
    }
};

exports.getScanById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const scan = await prisma.scan.findUnique({
            where: { id },
            include: {
                results: {
                    include: {
                        shap_values: true,
                        explanation: true,
                        screenshot: true
                    }
                },
                malicious_ip: true
            }
        });

        if (!scan) {
            return res.status(404).json({ message: 'Scan not found' });
        }

        if (scan.is_deleted) {
            return res.status(410).json({ message: 'This scan has been deleted' });
        }

        res.json(scan);
    } catch (error) {
        next(error);
    }
};

exports.getHistory = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Login required for history' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const scans = await prisma.scan.findMany({
            where: {
                user_id: req.user.id,
                is_deleted: false
            },
            orderBy: { created_at: 'desc' },
            skip,
            take: limit,
            include: {
                results: {
                    select: { prediction: true, phishing_probability: true, confidence_score: true }
                }
            }
        });

        const total = await prisma.scan.count({
            where: { user_id: req.user.id, is_deleted: false }
        });

        res.json({
            scans,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.getDashboardStats = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Login required for dashboard stats' });
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Scans This Month
        const scansThisMonth = await prisma.scan.count({
            where: {
                user_id: req.user.id,
                created_at: { gte: startOfMonth },
                is_deleted: false,
                status: 'COMPLETED'
            }
        });

        // Threats Blocked
        const threatsBlocked = await prisma.scanResult.count({
            where: {
                scan: {
                    user_id: req.user.id,
                    is_deleted: false
                },
                prediction: {
                    in: ['PHISHING', 'Phishing', 'phishing']
                }
            }
        });

        // Avg Risk Score
        const results = await prisma.scanResult.findMany({
            where: {
                scan: {
                    user_id: req.user.id,
                    is_deleted: false
                }
            },
            select: { phishing_probability: true, confidence_score: true }
        });

        let totalScore = 0;
        let count = 0;
        results.forEach(r => {
            if (r.phishing_probability !== null && r.phishing_probability !== undefined) {
                totalScore += r.phishing_probability * 100;
                count++;
            } else if (r.confidence_score !== null && r.confidence_score !== undefined) {
                totalScore += r.confidence_score * 100;
                count++;
            }
        });

        const avgRiskScore = count > 0 ? Math.round(totalScore / count) : 0;

        // Recent Activity
        const recentActivity = await prisma.scan.findMany({
            where: { user_id: req.user.id, is_deleted: false },
            orderBy: { created_at: 'desc' },
            take: 10,
            include: {
                results: { select: { prediction: true } }
            }
        });

        const formattedActivity = recentActivity.map(scan => {
            let hostname = scan.url;
            try {
                hostname = new URL(scan.url.startsWith('http') ? scan.url : `https://${scan.url}`).hostname;
            } catch (e) { }

            return {
                id: scan.id,
                url: hostname,
                status: scan.results ? (scan.results.prediction.toUpperCase() === 'PHISHING' ? 'Phishing' : 'Safe') : scan.status,
                date: scan.created_at,
            };
        });

        res.json({
            scansThisMonth,
            threatsBlocked,
            avgRiskScore,
            recentActivity: formattedActivity
        });

    } catch (error) {
        next(error);
    }
};
