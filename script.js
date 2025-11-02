class AssignmentManager {
    constructor() {
        this.currentAssignment = 'quantization';
        this.initializeSwitcher();
    }

    initializeSwitcher() {
        const switcherButtons = document.querySelectorAll('.btn-switcher');
        
        switcherButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const assignment = e.target.dataset.assignment;
                this.switchAssignment(assignment);
            });
        });
    }

    switchAssignment(assignment) {
        // Обновляем активные кнопки
        document.querySelectorAll('.btn-switcher').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-assignment="${assignment}"]`).classList.add('active');

        // Скрываем все контенты
        document.querySelectorAll('.assignment-content').forEach(content => {
            content.classList.remove('active');
        });

        // Показываем выбранный контент
        document.getElementById(`${assignment}-content`).classList.add('active');

        // Очищаем результаты предыдущего задания
        this.clearPreviousResults(assignment);

        this.currentAssignment = assignment;
    }

    clearPreviousResults(newAssignment) {
        if (newAssignment === 'dichotomic') {
            // Очищаем результаты квантования
            this.clearQuantizationResults();
        } else {
            // Очищаем результаты дихотомического поиска
            this.clearDichotomicResults();
        }
    }

    clearQuantizationResults() {
        // Удаляем результаты анализа гармоник
        this.hideHarmonicResults();
    
        // Очищаем таблицу
        const tableBody = document.getElementById('harmonics-table-body');
        if (tableBody) {
            tableBody.innerHTML = '';
        }
    
        // Сбрасываем значения
        document.getElementById('sampling-rate-value').textContent = '-';
        document.getElementById('nyquist-frequency').textContent = '-';
        document.getElementById('harmonics-count').textContent = '0';
    
        // Очищаем графики
        const charts = ['originalChart', 'quantizedChart', 'sampledChart'];
        charts.forEach(chartId => {
            const canvas = document.getElementById(chartId);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        });
    
        // Скрываем ошибки
        const errorDiv = document.getElementById('error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    clearDichotomicResults() {
        // Очищаем результаты поиска
        const stepsContainer = document.getElementById('steps');
        const alphabetInfo = document.getElementById('alphabetInfo');
        const infoContainer = document.getElementById('info');
        
        if (stepsContainer) stepsContainer.innerHTML = '';
        if (alphabetInfo) alphabetInfo.innerHTML = '';
        if (infoContainer) infoContainer.innerHTML = '';
    }
}

class QuantizationApp {
    constructor() {
        this.originalChart = null;
        this.quantizedChart = null;
        this.sampledChart = null;
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
                return yValues.map(y => y >= lowerThreshold && y <= upperThreshold ? 0 : 0);
            
            case 'lowerOnly':
                return yValues.map(y => y < lowerThreshold ? -1 : 0);
            
            case 'upperMiddle':
                return yValues.map(y => y >= lowerThreshold ? 1 : 0);
            
            case 'lowerMiddle':
                return yValues.map(y => y <= upperThreshold ? -1 : 0);
            
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
        
        return {
            dominantHarmonics,
            nyquistFrequency,
            samplingRate
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

    analyzeHarmonics() {
        try {
            const samplingRate = parseFloat(document.getElementById('samplingRate').value);
        
            if (isNaN(samplingRate) || samplingRate <= 0) {
                throw new Error('Частота дискретизации должна быть положительным числом');
            }

            const functionStr = document.getElementById('function').value;
            const xMin = parseFloat(document.getElementById('xMin').value);
            const xMax = parseFloat(document.getElementById('xMax').value);
            const duration = xMax - xMin;

            const { sampledX, sampledY } = this.discretizeSignal(functionStr, xMin, duration, samplingRate);
        
            const analysisResults = this.analyzeSamplingEffects(sampledY, samplingRate);
        
            // Визуализация и показ результатов
            this.visualizeSampledSignal(sampledX, sampledY, xMin, xMax, functionStr);
            this.showHarmonicResults(analysisResults);
        
        } catch (error) {
            this.showError(error.message);
            this.hideHarmonicResults();
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
    
    showHarmonicResults(analysisResults) {
        const resultsSection = document.getElementById('harmonic-results-section');
        const tableBody = document.getElementById('harmonics-table-body');
    
        if (!resultsSection || !tableBody) {
            console.error('HTML elements for harmonic results not found');
            return;
        }
    
        // Заполняем данные
        document.getElementById('sampling-rate-value').textContent = analysisResults.samplingRate;
        document.getElementById('nyquist-frequency').textContent = analysisResults.nyquistFrequency.toFixed(2);
        document.getElementById('harmonics-count').textContent = analysisResults.dominantHarmonics.length;
    
        // Очищаем таблицу
        tableBody.innerHTML = '';
    
        // Заполняем таблицу гармониками
        analysisResults.dominantHarmonics.forEach((harmonic, index) => {
            const row = document.createElement('tr');
        
            // Вычисляем относительную мощность (в % от максимальной)
            const maxAmplitude = Math.max(...analysisResults.dominantHarmonics.map(h => h.amplitude));
            const relativePower = (harmonic.amplitude / maxAmplitude * 100).toFixed(1);
        
            row.innerHTML = `
                <td>${harmonic.frequency.toFixed(2)}</td>
                <td>${harmonic.amplitude.toFixed(4)}</td>
                <td>${relativePower}%</td>
            `;
        
            tableBody.appendChild(row);
        });
    
        // Показываем секцию
        resultsSection.style.display = 'block';
    
        // Прокручиваем к результатам
        resultsSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
    }

    hideHarmonicResults() {
        const resultsSection = document.getElementById('harmonic-results-section');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
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

