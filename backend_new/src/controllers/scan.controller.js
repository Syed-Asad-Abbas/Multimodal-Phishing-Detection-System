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
        if (isPhishing && mlResponse.ip_metadata) {
            await prisma.maliciousIpObservation.create({
                data: {
                    scan_id: scan.id,
                    ip_address: mlResponse.ip_metadata.ip,
                    geo_lat: mlResponse.ip_metadata.geo?.lat,
                    geo_long: mlResponse.ip_metadata.geo?.long,
                    country: mlResponse.ip_metadata.geo?.country
                }
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
