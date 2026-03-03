document.addEventListener('DOMContentLoaded', () => {
    const industryInput = document.getElementById('industry-input');
    const industryList = document.getElementById('industry-list');
    const refreshBtn = document.getElementById('refresh-btn');
    const riskValue = document.getElementById('risk-value');
    const riskLabel = document.getElementById('risk-label');
    const riskStatus = document.getElementById('risk-status');
    const forecastValue = document.getElementById('forecast-value');
    const insightText = document.getElementById('insight-text');
    const exportBtn = document.getElementById('export-btn');

    let trendsChart, volumeChart, riskRadarChart;

    const API_BASE_URL = 'https://market-shck-ai.onrender.com/api';

    async function loadIndustries() {
        try {
            const res = await fetch(`${API_BASE_URL}/industries`);
            const industries = await res.json();

            industryList.innerHTML = industries.map(ind =>
                `<option value="${ind}">`
            ).join('');

            // Set default value if empty
            if (industries.length > 0 && !industryInput.value) {
                industryInput.value = industries[0];
                updateDashboard();
            }
        } catch (err) {
            console.error('Error loading industries:', err);
        }
    }

    async function updateDashboard() {
        const industry = industryInput.value.trim();
        if (!industry) return;

        try {
            const res = await fetch(`${API_BASE_URL}/predict?industry=${encodeURIComponent(industry)}`);
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            // 1. Update Core Metrics
            const rScore = Math.round(data.shock_risk_score || 0);
            riskValue.textContent = `${rScore}%`;
            const riskLvl = data.risk_level || 'Stable';
            riskLabel.textContent = riskLvl;

            // 2. Dynamic Coloring Logic
            let colorClass = 'primary'; // Default green
            let textColor = 'text-primary';
            let bgColor = 'bg-primary';

            if (riskLvl.toLowerCase() === 'high') {
                colorClass = 'red-500';
                textColor = 'text-red-500';
                bgColor = 'bg-red-500';
                riskStatus.className = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter animate-pulse';
            } else if (riskLvl.toLowerCase() === 'medium') {
                colorClass = 'yellow-500';
                textColor = 'text-yellow-500';
                bgColor = 'bg-yellow-500';
                riskStatus.className = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter';
            } else {
                riskStatus.className = 'bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter';
            }

            // Update icon colors based on risk
            const riskIconContainer = riskValue.closest('.glass-card').querySelector('.material-symbols-outlined').parentElement;
            riskIconContainer.className = `size-12 rounded-2xl ${bgColor}/10 flex items-center justify-center ${textColor} transition-colors`;

            // 3. Growth Velocity & Trend Flip
            const velocity = data.forecast && data.forecast.length > 0
                ? Math.round((data.forecast[0] / data.historical[data.historical.length - 1] - 1) * 100)
                : 0;
            forecastValue.textContent = velocity;

            const trendIcon = forecastValue.closest('.glass-card').querySelector('.material-symbols-outlined');
            if (velocity < 0) {
                trendIcon.textContent = 'trending_down';
                trendIcon.parentElement.className = 'text-red-500 animate-bounce';
                forecastValue.nextElementSibling.className = 'text-xl font-black text-red-500';
            } else {
                trendIcon.textContent = 'trending_up';
                trendIcon.parentElement.className = 'text-primary animate-bounce';
                forecastValue.nextElementSibling.className = 'text-xl font-black text-primary';
            }

            // 4. Augmentation Details
            if (data.adjustments) {
                const adj = data.adjustments;

                // Layoffs
                const layoffVal = document.getElementById('layoff-impact-val');
                const layoffPoints = document.getElementById('layoff-points');
                const layoffBar = document.getElementById('layoff-bar');

                layoffVal.textContent = adj.layoff_impact_count.toLocaleString();
                layoffPoints.textContent = `+${adj.layoff_adjustment} pts`;
                layoffBar.style.width = `${Math.min(100, (adj.layoff_impact_count / 20000) * 100)}%`;

                // AI Impact
                const aiVal = document.getElementById('ai-impact-val');
                const aiPoints = document.getElementById('ai-points');
                const aiBar = document.getElementById('ai-bar');

                aiVal.textContent = `${Math.round(adj.ai_automation_probability * 100)}% Prob.`;
                aiPoints.textContent = `${adj.ai_adjustment >= 0 ? '+' : ''}${adj.ai_adjustment} pts`;
                aiPoints.className = adj.ai_adjustment >= 0 ? 'text-[9px] font-black text-blue-400' : 'text-[9px] font-black text-green-400';
                aiBar.style.width = `${adj.ai_automation_probability * 100}%`;
            }

            // 5. Stability Insight Text
            let insightHTML = `
                <div class="space-y-4">
                    <div class="flex items-start gap-3">
                        <span class="text-xs font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 ${textColor}">${riskLvl.toUpperCase()}</span>
                        <p class="text-sm font-medium text-slate-600 dark:text-slate-400">${data.description || ''}</p>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Impact Outlook</p>
                            <p class="text-xs font-bold text-slate-900 dark:text-slate-100">${data.future_scope || 'N/A'}</p>
                        </div>
                        <div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">ARIMA Forecast</p>
                            <p class="text-xs font-bold text-slate-900 dark:text-slate-100">${data.arima_text || 'Stable trajectory.'}</p>
                        </div>
                    </div>
                    <div class="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="material-symbols-outlined text-primary text-sm">lightbulb</span>
                            <p class="text-[10px] font-black text-primary uppercase tracking-widest">Resilience Strategy</p>
                        </div>
                        <p class="text-xs font-bold text-slate-700 dark:text-slate-300">${data.how_to_solve_risk || 'Continuous upskilling.'}</p>
                    </div>
                </div>
            `;
            insightText.innerHTML = insightHTML;

            // 6. Update Charts
            renderTrendsChart(data.historical, data.forecast);
            renderVolumeChart(data.historical);
            renderRiskRadarChart(data.radar_data);

        } catch (err) {
            console.error('Error updating dashboard:', err);
            insightText.textContent = 'Failed to load analysis.';
        }
    }

    function renderTrendsChart(historical, forecast) {
        const canvas = document.getElementById('trendsChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (trendsChart) trendsChart.destroy();

        const labels = [...historical.map((_, i) => `W${i + 1}`), ...forecast.map((_, i) => `F${i + 1}`)];
        const data = [...historical, ...forecast];

        trendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Trend',
                    data: data,
                    borderColor: '#13ec92',
                    backgroundColor: 'rgba(19, 236, 146, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }

    function renderVolumeChart(historical) {
        const canvas = document.getElementById('volumeChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (volumeChart) volumeChart.destroy();

        volumeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: historical.map((_, i) => `W${i + 1}`),
                datasets: [{
                    label: 'Volume',
                    data: historical,
                    backgroundColor: 'rgba(19, 236, 146, 0.6)',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } }
                }
            }
        });
    }

    function renderRiskRadarChart(radarData) {
        const canvas = document.getElementById('riskRadarChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (riskRadarChart) riskRadarChart.destroy();

        riskRadarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Demand', 'Comp.', 'Auto.', 'Invest.', 'Stab.'],
                datasets: [{
                    data: radarData || [50, 50, 50, 50, 50],
                    backgroundColor: 'rgba(19, 236, 146, 0.2)',
                    borderColor: '#13ec92',
                    pointBackgroundColor: '#13ec92',
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255,255,255,0.1)' },
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        pointLabels: { color: '#94a3b8', font: { size: 9 } },
                        ticks: { display: false },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                }
            }
        });
    }

    function exportToPDF() {
        const element = document.getElementById('analysis-report');
        const industryName = industryInput.value || 'Analysis';

        // Configuration for html2pdf
        const opt = {
            margin: 10,
            filename: `MarketShock_Report_${industryName.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#f6f8f7'
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Add a temporary class for PDF specific styling
        element.classList.add('pdf-export-mode');

        // Generate PDF
        html2pdf().set(opt).from(element).save().then(() => {
            element.classList.remove('pdf-export-mode');
        });
    }

    refreshBtn.addEventListener('click', updateDashboard);
    industryInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') updateDashboard();
    });
    exportBtn.addEventListener('click', exportToPDF);
    loadIndustries();
});
