class QuantizationApp {
    constructor() {
        this.originalChart = null;
        this.quantizedChart = null;
        this.sampledChart = null;
        this.spectrumChart = null;
        this.initializeEventListeners();
        this.calculate();
    }

    initializeEventListeners() {
        const elements = ['function', 'xMin', 'xMax', 'points', 'calculateBtn', 'quantizationType'];
        
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(id === 'calculateBtn' ? 'click' : 'input', 
                    () => this.calculate());
            }
        });
        
        document.getElementById('calculateBtn').addEventListener('click', () => {
            this.calculate();
        });

        document.getElementById('analyzeBtn').addEventListener('click', () => {
            this.analyzeHarmonics();
        });

        document.getElementById('clearFunctionBtn').addEventListener('click', () => {
            this.clearFunctionField()
        });

        // Авторасчет при изменении параметров
        ['function', 'xMin', 'xMax', 'points'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.calculate();
            });
        });
    }

    clearFunctionField() {
        const functionInput = document.getElementById('function');
        functionInput.value = '';
        functionInput.focus();
        this.calculate();
    }

    calculate() {
        try {
            const functionStr = document.getElementById('function').value;
            const xMin = parseFloat(document.getElementById('xMin').value);
            const xMax = parseFloat(document.getElementById('xMax').value);
            const points = parseInt(document.getElementById('points').value);

            // Валидация
            if (isNaN(xMin) || isNaN(xMax) || isNaN(points)) {
                throw new Error('Проверьте правильность введенных чисел');
            }

            if (xMin >= xMax) {
                throw new Error('Минимальное значение x должно быть меньше максимального');
            }

            // Генерация данных
            const { xValues, yValues } = this.generateData(functionStr, xMin, xMax, points);
            
            // Квантование
            const quantized = this.quantizeSignal(yValues);
            
            // Визуализация
            this.visualizeResults(xValues, yValues, quantized);
            
            // Скрывает ошибку если есть
            this.hideError();

        } catch (error) {
            this.showError(error.message);
        }
    }

    generateData(functionStr, xMin, xMax, points) {
        const xValues = [];
        const yValues = [];
        
        for (let i = 0; i < points; i++) {
            const x = xMin + (xMax - xMin) * i / (points - 1);
            xValues.push(x);
            
            try {
                const y = this.evaluateFunction(functionStr, x);
                yValues.push(y);
            } catch (e) {
                throw new Error(`Ошибка в функции при x=${x.toFixed(2)}: ${e.message}`);
            }
        }
        
        return { xValues, yValues };
    }

    evaluateFunction(functionStr, x) {
        const mathFunctions = {
            'sin': 'Math.sin',
            'cos': 'Math.cos', 
            'tan': 'Math.tan',
            'sqrt': 'Math.sqrt',
            'log': 'Math.log',
            'log10': 'Math.log10',
            'exp': 'Math.exp',
            'pow': 'Math.pow',
            'abs': 'Math.abs',
            'PI': 'Math.PI',
            'E': 'Math.E'
        };

        let processedFunction = functionStr;
        for (const [key, value] of Object.entries(mathFunctions)) {
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            processedFunction = processedFunction.replace(regex, value);
        }

        processedFunction = processedFunction.replace(/\^/g, '**');

        const safeFunction = new Function('x', `
            'use strict';
            try {
                return ${processedFunction};
            } catch (e) {
                throw new Error('Неправильное математическое выражение: ' + e.message);
            }
        `);
        
        try {
            return safeFunction(x);
        } catch (e) {
            throw new Error(`Не удалось вычислить функцию: ${functionStr}. Ошибка: ${e.message}`);
        }
    }

    quantizeSignal(yValues) {
        const quantizationType = document.getElementById('quantizationType').value;
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);
        const range = yMax - yMin;
        
        const upperThreshold = yMin + 2 * range / 3;
        const lowerThreshold = yMin + range / 3;

        switch (quantizationType) {
            case 'upperOnly':
                return yValues.map(y => y > upperThreshold ? 1 : 0);
            
            case 'middleOnly':
                return yValues.map(y => y >= lowerThreshold && y <= upperThreshold ? 1 : 0);
            
            case 'lowerOnly':
                return yValues.map(y => y < lowerThreshold ? 1 : 0);
            
            case 'upperMiddle':
                return yValues.map(y => y >= lowerThreshold ? 1 : 0);
            
            case 'lowerMiddle':
                return yValues.map(y => y <= upperThreshold ? 1 : 0);
            
            case 'threeLevel':
            default:
                return yValues.map(y => y > upperThreshold ? 1 : y < lowerThreshold ? -1 : 0);
        }
    }

    discretizeSignal(functionStr, xMin, duration, samplingRate) {
        const samplingInterval = 1 / samplingRate;
        const sampledX = [];
        const sampledY = [];
        
        const N = Math.floor(duration * samplingRate);
        
        for (let n = 0; n < N; n++) {
            const t = xMin + n * samplingInterval;
            try {
                const value = this.evaluateFunction(functionStr, t);
                sampledX.push(t);
                sampledY.push(value);
            } catch (e) {
                throw new Error(`Ошибка при дискретизации в точке t=${t.toFixed(3)}: ${e.message}`);
            }
        }
        
        return { sampledX, sampledY };
    }

    analyzeSamplingEffects(sampledY, samplingRate, originalFrequencies = []) {
        const nyquistFrequency = samplingRate / 2;
        const { frequencies, magnitudes } = FourierAnalyzer.computeDFT(sampledY, samplingRate);
        
        // Находим основные гармоники в дискретизованном сигнале
        const dominantHarmonics = this.findDominantHarmonics(frequencies, magnitudes, 5);
        
        // Проверяем алиасинг
        const aliasingInfo = this.checkAliasing(dominantHarmonics, nyquistFrequency, originalFrequencies);
        
        return {
            dominantHarmonics,
            nyquistFrequency,
            samplingRate,
            aliasingInfo
        };
    }

    findDominantHarmonics(frequencies, magnitudes, count) {
        return magnitudes
            .map((magnitude, index) => ({
                frequency: frequencies[index],
                magnitude: magnitude,
                amplitude: 2 * magnitude // Для восстановления амплитуды
            }))
            .filter(h => h.frequency > 0) // Исключаем DC компоненту
            .sort((a, b) => b.magnitude - a.magnitude)
            .slice(0, count);
    }

    checkAliasing(harmonics, nyquistFrequency, originalFrequencies = []) {
        const aliasedHarmonics = harmonics.filter(h => h.frequency > nyquistFrequency);
        const hasAliasing = aliasedHarmonics.length > 0;
        
        let aliasDetails = [];
        if (hasAliasing) {
            aliasDetails = aliasedHarmonics.map(h => {
                const aliasFrequency = Math.abs(2 * nyquistFrequency - h.frequency);
                return {
                    original: h.frequency,
                    alias: aliasFrequency,
                    difference: Math.abs(h.frequency - aliasFrequency)
                };
            });
        }
        
        return {
            hasAliasing,
            aliasedHarmonics,
            aliasDetails,
            nyquistFrequency
        };
    }

    analyzeHarmonics() {
        try {
            const samplingRate = parseFloat(document.getElementById('samplingRate').value);
            const showSpectrum = document.getElementById('showSpectrum').checked;
            
            if (isNaN(samplingRate) || samplingRate <= 0) {
                throw new Error('Частота дискретизации должна быть положительным числом');
            }

            const functionStr = document.getElementById('function').value;
            const xMin = parseFloat(document.getElementById('xMin').value);
            const xMax = parseFloat(document.getElementById('xMax').value);
            const duration = xMax - xMin;

            const { sampledX, sampledY } = this.discretizeSignal(functionStr, xMin, duration, samplingRate);
            
            const analysisResults = this.analyzeSamplingEffects(sampledY, samplingRate);
            
            // Визуализация
            this.visualizeSampledSignal(sampledX, sampledY, xMin, xMax, functionStr);
            
            if (showSpectrum) {
                this.visualizeSpectrum(analysisResults.dominantHarmonics, analysisResults.nyquistFrequency);
            }
            
            this.showHarmonicResults(analysisResults);
            
        } catch (error) {
            this.showError(error.message);
        }
    }
    
    visualizeSampledSignal(sampledX, sampledY, xMin, xMax, functionStr) {
        // Создается плавный исходный сигнал для сравнения
        const smoothPoints = 1000;
        const smoothX = [];
        const smoothY = [];
        
        for (let i = 0; i < smoothPoints; i++) {
            const x = xMin + (xMax - xMin) * i / (smoothPoints - 1);
            smoothX.push(x);
            smoothY.push(this.evaluateFunction(functionStr, x));
        }

        const ctx = document.getElementById('sampledChart').getContext('2d');
        
        if (this.sampledChart) {
            this.sampledChart.destroy();
        }
        
        // Создаются данные для столбцов
        const stemData = [];
        sampledX.forEach((x, i) => {
            stemData.push({ x: x, y: 0 });
            stemData.push({ x: x, y: sampledY[i] });
            stemData.push({ x: x, y: null });
        });

        this.sampledChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Исходный аналоговый сигнал',
                        data: smoothY.map((y, i) => ({ x: smoothX[i], y })),
                        borderColor: 'rgba(102, 126, 234, 0.7)',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        pointRadius: 0,
                        showLine: true,
                        tension: 0.4
                    },
                    {
                        label: 'Дискретные отсчеты',
                        data: sampledY.map((y, i) => ({ x: sampledX[i], y })),
                        borderColor: '#e74c3c',
                        backgroundColor: '#e74c3c',
                        borderWidth: 3,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        showLine: false
                    },
                    {
                        label: 'Соединительные линии',
                        data: stemData,
                        borderColor: 'rgba(231, 76, 60, 0.4)',
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        pointRadius: 0,
                        showLine: true,
                        tension: 0
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Дискретизация сигнала'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 1) { // Дискретные отсчеты
                                    return `Отсчет: t=${context.parsed.x.toFixed(3)}, y=${context.parsed.y.toFixed(3)}`;
                                }
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(3);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'Время, с' }
                    },
                    y: {
                        title: { display: true, text: 'Амплитуда' }
                    }
                }
            }
        });
    }
    
    visualizeSpectrum(harmonics, nyquistFrequency) {
        const ctx = document.getElementById('spectrumChart').getContext('2d');
        
        if (this.spectrumChart) {
            this.spectrumChart.destroy();
        }
        
        const frequencies = harmonics.map(h => h.frequency);
        const magnitudes = harmonics.map(h => h.magnitude);
        
        this.spectrumChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: frequencies.map(f => f.toFixed(2)),
                datasets: [{
                    label: 'Амплитудный спектр',
                    data: magnitudes,
                    backgroundColor: frequencies.map(f => 
                        f > nyquistFrequency ? '#e74c3c' : '#3498db'
                    ),
                    borderColor: frequencies.map(f => 
                        f > nyquistFrequency ? '#c0392b' : '#2980b9'
                    ),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { 
                        display: true, 
                        text: 'Амплитудный спектр (красный - алиасинг)' 
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const freq = frequencies[context.dataIndex];
                                const aliasInfo = freq > nyquistFrequency ? 
                                    ` ⚠️ Алиасинг! Должно быть: ${(2*nyquistFrequency - freq).toFixed(2)} Гц` : '';
                                return `Частота: ${freq.toFixed(2)} Гц, Амплитуда: ${context.parsed.y.toFixed(4)}${aliasInfo}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Частота, Гц' }
                    },
                    y: {
                        title: { display: true, text: 'Амплитуда' }
                    }
                }
            }
        });
    }
    
    showHarmonicResults(analysisResults) {
        const existingResults = document.querySelector('.harmonic-results');
        if (existingResults) {
            existingResults.remove();
        }

        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'harmonic-results';
        resultsDiv.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        `;

        let html = `<h3>📊 Результаты анализа дискретизации:</h3>`;
        
        html += `<p><strong>Частота дискретизации:</strong> ${analysisResults.samplingRate} Гц</p>`;
        html += `<p><strong>Частота Найквиста:</strong> ${analysisResults.nyquistFrequency.toFixed(2)} Гц</p>`;
        
        if (analysisResults.aliasingInfo.hasAliasing) {
            html += `<p style="color: #e74c3c;"><strong>⚠️ Обнаружено наложение спектров (алиасинг)!</strong></p>`;
            analysisResults.aliasingInfo.aliasDetails.forEach(alias => {
                html += `<p style="color: #e74c3c;">Частота ${alias.original.toFixed(2)} Гц проявляется как ${alias.alias.toFixed(2)} Гц</p>`;
            });
        } else {
            html += `<p style="color: #27ae60;"><strong>✓ Алиасинга не обнаружено</strong></p>`;
        }
        
        html += `<h4>Основные гармоники:</h4>`;
        html += `<table style="width: 100%; border-collapse: collapse;">`;
        html += `<tr style="background: #34495e; color: white;">
                    <th style="padding: 8px; text-align: left;">Частота (Гц)</th>
                    <th style="padding: 8px; text-align: left;">Амплитуда</th>
                    <th style="padding: 8px; text-align: left;">Статус</th>
                 </tr>`;
        
        analysisResults.dominantHarmonics.forEach((harmonic, index) => {
            const status = harmonic.frequency > analysisResults.nyquistFrequency ? 
                '⚠️ Алиасинг' : '✓ Норма';
            const color = harmonic.frequency > analysisResults.nyquistFrequency ? '#e74c3c' : '#27ae60';
            
            html += `<tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 8px;">${harmonic.frequency.toFixed(2)}</td>
                        <td style="padding: 8px;">${harmonic.amplitude.toFixed(4)}</td>
                        <td style="padding: 8px; color: ${color};">${status}</td>
                     </tr>`;
        });
        html += `</table>`;

        resultsDiv.innerHTML = html;
        document.querySelector('.container').appendChild(resultsDiv);
    }

    visualizeResults(xValues, yValues, quantized) {
        this.renderOriginalChart(xValues, yValues);
        this.renderQuantizedChart(xValues, yValues, quantized);
    }

    renderOriginalChart(xValues, yValues) {
        const ctx = document.getElementById('originalChart').getContext('2d');
        
        if (this.originalChart) {
            this.originalChart.destroy();
        }
        
        this.originalChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: xValues.map(x => x.toFixed(2)),
                datasets: [{
                    label: 'Исходный сигнал',
                    data: yValues,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Исходный сигнал',
                        font: { size: 16 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }

    renderQuantizedChart(xValues, yValues, quantized) {
        const ctx = document.getElementById('quantizedChart').getContext('2d');
        
        if (this.quantizedChart) {
            this.quantizedChart.destroy();
        }
        
        this.quantizedChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: xValues.map(x => x.toFixed(2)),
                datasets: [
                    {
                        label: 'Исходный аналоговый сигнал',
                        data: yValues,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        borderWidth: 2,
                        tension: 0.1,
                        pointRadius: 0,
                        fill: false
                    },
                    {
                        label: 'Квантованный сигнал',
                        data: quantized,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.2)',
                        borderWidth: 3,
                        stepped: 'middle',
                        pointRadius: 0,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Сравнение аналогового и квантованного сигналов',
                        font: { size: 16 }
                    }
                }
            }
        });
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = `Ошибка: ${message}`;
        errorDiv.style.display = 'block';
    }

    hideError() {
        document.getElementById('error').style.display = 'none';
    }
}

class FourierAnalyzer {
    static computeDFT(signal, samplingRate) {
        const N = signal.length;
        const frequencies = [];
        const magnitudes = [];
        const phases = [];
        
        for (let k = 0; k < N; k++) {
            let real = 0;
            let imag = 0;
            
            for (let n = 0; n < N; n++) {
                const angle = 2 * Math.PI * k * n / N;
                real += signal[n] * Math.cos(angle);
                imag -= signal[n] * Math.sin(angle);
            }
            
            real /= N;
            imag /= N;
            
            const magnitude = Math.sqrt(real * real + imag * imag);
            const phase = Math.atan2(imag, real);
            const frequency = k * samplingRate / N;
            
            if (frequency <= samplingRate / 2) {
                frequencies.push(frequency);
                magnitudes.push(magnitude);
                phases.push(phase);
            }
        }
        
        return { frequencies, magnitudes, phases };
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    new QuantizationApp();
});