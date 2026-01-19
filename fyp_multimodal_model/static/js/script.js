document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('urlInput');
    const scanBtn = document.getElementById('scanBtn');
    const errorMessage = document.getElementById('errorMessage');
    const loadingContainer = document.getElementById('loadingContainer');
    const resultsContainer = document.getElementById('resultsContainer');
    const steps = document.querySelectorAll('.step');

    // Result Elements
    const verdictBadge = document.getElementById('verdictBadge');
    const verdictText = document.getElementById('verdictText');
    const confidenceFill = document.getElementById('confidenceFill');
    const confidenceValue = document.getElementById('confidenceValue');
    const screenshotImg = document.getElementById('screenshotImg');
    const noImage = document.getElementById('noImage');
    const fusionProb = document.getElementById('fusionProb');
    const jsonContent = document.getElementById('jsonContent');
    const toggleDetails = document.getElementById('toggleDetails');
    const jsonViewer = document.getElementById('jsonViewer');

    // Modality Elements
    const modalities = ['url', 'dom', 'visual'];

    scanBtn.addEventListener('click', startScan);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startScan();
    });

    toggleDetails.addEventListener('click', () => {
        const isHidden = jsonViewer.style.display === 'none' || jsonViewer.style.display === '';
        jsonViewer.style.display = isHidden ? 'block' : 'none';
        toggleDetails.innerHTML = isHidden ?
            'Hide Technical Details <i class="fa-solid fa-chevron-up"></i>' :
            'Show Technical Details <i class="fa-solid fa-chevron-down"></i>';
    });

    async function startScan() {
        const url = urlInput.value.trim();

        if (!url) {
            showError('Please enter a valid URL');
            return;
        }

        if (!isValidUrl(url)) {
            showError('Invalid URL format. Must start with http:// or https://');
            return;
        }

        // Reset UI
        showError('');
        resultsContainer.style.display = 'none';
        loadingContainer.style.display = 'flex';
        scanBtn.disabled = true;

        // Simulate progress steps
        animateSteps();

        try {
            const response = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Scan failed');
            }

            displayResults(data);

        } catch (error) {
            showError(error.message);
        } finally {
            loadingContainer.style.display = 'none';
            scanBtn.disabled = false;
            resetSteps();
        }
    }

    function displayResults(data) {
        resultsContainer.style.display = 'flex';

        // 1. Verdict
        const isPhishing = data.prediction === 'PHISHING';
        verdictText.textContent = data.prediction;
        verdictBadge.className = `verdict-badge ${isPhishing ? 'phishing' : 'benign'}`;

        // 2. Confidence
        const confPercent = (data.confidence * 100).toFixed(2) + '%';
        confidenceValue.textContent = confPercent;
        confidenceFill.style.width = confPercent;
        confidenceFill.style.backgroundColor = isPhishing ? 'var(--danger)' : 'var(--success)';

        // 3. Modalities
        modalities.forEach(mod => {
            const score = data.modality_scores[mod];
            const available = data.modality_available[mod];
            const bar = document.getElementById(`${mod}ScoreBar`);
            const val = document.getElementById(`${mod}ScoreVal`);
            const status = document.getElementById(`${mod}Status`);

            if (available && score !== null) {
                const scorePercent = (score * 100).toFixed(1) + '%';
                bar.style.width = scorePercent;
                // Color gradient based on score (low=green, high=red)
                bar.style.backgroundColor = getColorForScore(score);
                val.textContent = score.toFixed(4);
                // Show Verdict
                const verdict = data.modality_verdicts ? data.modality_verdicts[mod] : (score > 0.5 ? 'PHISHING' : 'BENIGN');
                status.textContent = verdict;
                status.className = `status ${verdict.toLowerCase()}`; // Add class for styling if needed
            } else {
                bar.style.width = '0%';
                val.textContent = 'N/A';
                status.textContent = 'Inactive';
                status.className = 'status inactive';
            }
        });

        // 4. Fusion Probability
        const fusionP = data.fusion_probability_phishing;
        fusionProb.textContent = (fusionP * 100).toFixed(2) + '%';
        fusionProb.style.color = getColorForScore(fusionP);

        // 5. Screenshot
        if (data.page_info && data.page_info.screenshot_url) {
            screenshotImg.src = data.page_info.screenshot_url;
            screenshotImg.style.display = 'block';
            noImage.style.display = 'none';
        } else {
            screenshotImg.style.display = 'none';
            noImage.style.display = 'block';
        }

        // 6. JSON Dump
        jsonContent.textContent = JSON.stringify(data, null, 2);
    }

    function getColorForScore(score) {
        // Simple interpolation: Green -> Yellow -> Red
        if (score < 0.5) return '#10b981'; // Green
        if (score < 0.75) return '#f59e0b'; // Orange
        return '#ef4444'; // Red
    }

    function showError(msg) {
        errorMessage.textContent = msg;
    }

    function isValidUrl(string) {
        try {
            new URL(string);
            return string.startsWith('http');
        } catch (_) {
            return false;
        }
    }

    function animateSteps() {
        let current = 0;
        const interval = setInterval(() => {
            if (loadingContainer.style.display === 'none') {
                clearInterval(interval);
                return;
            }
            steps.forEach((s, i) => {
                s.classList.toggle('active', i === current);
            });
            current = (current + 1) % steps.length;
        }, 800);
    }

    function resetSteps() {
        steps.forEach(s => s.classList.remove('active'));
    }
});
