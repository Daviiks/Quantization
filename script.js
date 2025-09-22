class QuantizationApp {
    constructor() {
        this.originalChart = null;
        this.quantizedChart = null;
        this.initializeEventListeners();
        this.calculate(); // Автоматический расчет при загрузке
    }

    initializeEventListeners() {
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
        functionInput.focus(); // Возвращаем фокус на поле
        this.calculate(); // Пересчитываем с пустой функцией
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
            
            // Скрываем ошибку если есть
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
                // Безопасное вычисление функции
                const y = this.evaluateFunction(functionStr, x);
                yValues.push(y);
            } catch (e) {
                throw new Error(`Ошибка в функции при x=${x.toFixed(2)}: ${e.message}`);
            }
        }
        
        return { xValues, yValues };
    }

    evaluateFunction(functionStr, x) {
    // Заменяем все возможные математические функции
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
        const regex = new RegExp(`\\b${key}\\(`, 'g');
        processedFunction = processedFunction.replace(regex, `${value}(`);
    }

    const safeFunction = new Function('x', `
        'use strict';
        try {
            return ${processedFunction};
        } catch (e) {
            throw new Error('Неправильное математическое выражение');
        }
    `);
    
    try {
        return safeFunction(x);
    } catch (e) {
        throw new Error(`Не удалось вычислить функцию: ${functionStr}`);
    }
}

    quantizeSignal(yValues) {
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);
        const range = yMax - yMin;
        
        const upperThreshold = yMin + 2 * range / 3;
        const lowerThreshold = yMin + range / 3;
        
        return yValues.map(y => {
            if (y > upperThreshold) return -0; // Верхний уровень
            if (y < lowerThreshold) return -1; // Нижний уровень
            return 0; // Средний уровень
        });
    }

    discretizeSignal(xValues, yValues, samplingRate) {
        const samplingInterval = 1 / samplingRate;
        const sampledX = [];
        const sampledY = [];
        
        let currentX = xValues[0];
        const xMax = xValues[xValues.length - 1];
        
        while (currentX <= xMax) {
            // Находим ближайшую точку для дискретизации
            const index = this.findNearestIndex(xValues, currentX);
            sampledX.push(currentX);
            sampledY.push(yValues[index]);
            
            currentX += samplingInterval;
        }
        
        return { sampledX, sampledY };
    }
    
    findNearestIndex(array, value) {
        let left = 0;
        let right = array.length - 1;
        
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (array[mid] === value) return mid;
            if (array[mid] < value) left = mid + 1;
            else right = mid - 1;
        }
        
        return left < array.length ? left : array.length - 1;
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
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Сравнение аналогового и квантованного сигналов',
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const datasetLabel = context.dataset.label || '';
                            const value = context.parsed.y;
                            
                            if (datasetLabel.includes('Квантованный')) {
                                const levels = ['Нижний (0)', 'Средний (1)', 'Верхний (2)'];
                                return `${datasetLabel}: ${levels[value]}`;
                            }
                            return `${datasetLabel}: ${value.toFixed(3)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            const levels = ['Нижний', 'Средний', 'Верхний'];
                            return levels[value] || value.toFixed(2);
                        }
                    },
                    title: {
                        display: true,
                        text: 'Амплитуда / Уровни'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Время'
                    }
                }
            }
        }
    });
}
    

    analyzeHarmonics() {
        try {
            const samplingRate = parseFloat(document.getElementById('samplingRate').value);
            const showSpectrum = document.getElementById('showSpectrum').checked;
            
            // Получаем исходные данные
            const functionStr = document.getElementById('function').value;
            const xMin = parseFloat(document.getElementById('xMin').value);
            const xMax = parseFloat(document.getElementById('xMax').value);
            const points = parseInt(document.getElementById('points').value);
            
            const { xValues, yValues } = this.generateData(functionStr, xMin, xMax, points);
            
            // Дискретизация
            const { sampledX, sampledY } = this.discretizeSignal(xValues, yValues, samplingRate);
            
            // Анализ Фурье
            const { frequencies, magnitudes, phases } = 
                FourierAnalyzer.computeDFT(sampledY, samplingRate);
            
            // Находим основную гармонику
            const dominantHarmonic = FourierAnalyzer.findDominantHarmonic(frequencies, magnitudes);
            
            // Визуализация
            this.visualizeSampledSignal(sampledX, sampledY, xValues, yValues);
            
            if (showSpectrum) {
                this.visualizeSpectrum(frequencies, magnitudes, dominantHarmonic);
            }
            
            this.showHarmonicResults(dominantHarmonic, sampledY.length);
            
        } catch (error) {
            this.showError(error.message);
        }
    }
    
    visualizeSampledSignal(sampledX, sampledY, originalX, originalY) {
        const ctx = document.getElementById('sampledChart').getContext('2d');
        
        if (this.sampledChart) {
            this.sampledChart.destroy();
        }
        
        const stemData = [];
        sampledX.forEach((x, i) => {
            stemData.push({ x: x, y: 0 });    // Начало у оси
            stemData.push({ x: x, y: sampledY[i] }); // Вершина
            stemData.push({ x: x, y: null }); // Разрыв
        });
    
        this.sampledChart = new Chart(ctx, {
            type: 'scatter',
                data: {
                    datasets: [
                        {
                            label: 'Исходный сигнал',
                            data: originalY.map((y, i) => ({ x: originalX[i], y })),
                            borderColor: 'rgba(102, 126, 234, 0.5)',
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            pointRadius: 0,
                            showLine: true
                        },
                        {
                            label: 'Дискретные отсчеты',
                            data: sampledY.map((y, i) => ({ x: sampledX[i], y })),
                            borderColor: '#e74c3c',
                            backgroundColor: '#e74c3c',
                            borderWidth: 2,
                            pointRadius: 6,
                            pointHoverRadius: 8,
                            showLine: false
                        },
                        {
                            label: 'Столбцы',
                            data: stemData,
                            borderColor: 'rgba(231, 76, 60, 0.6)',
                            backgroundColor: 'transparent',
                            borderWidth: 2,
                            pointRadius: 0,
                            showLine: true,
                            tension: 0 // Прямые линии
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            type: 'linear',
                            title: { display: true, text: 'Время' }
                        },
                        y: {
                            title: { display: true, text: 'Амплитуда' }
                        }
                }
                }
        });
    }
    
    visualizeSpectrum(frequencies, magnitudes, dominantHarmonic) {
        const ctx = document.getElementById('spectrumChart').getContext('2d');
        
        if (this.spectrumChart) {
            this.spectrumChart.destroy();
        }
        
        this.spectrumChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: frequencies.map(f => f.toFixed(2)),
                datasets: [{
                    label: 'Амплитудный спектр',
                    data: magnitudes,
                    backgroundColor: frequencies.map((f, i) => 
                        dominantHarmonic && i === frequencies.indexOf(dominantHarmonic.frequency) ?
                        '#e74c3c' : '#3498db'
                    )
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Амплитудный спектр' }
                }
            }
        });
    }
    
    showHarmonicResults(dominantHarmonic, sampleCount) {
        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'harmonic-results';
        
        if (dominantHarmonic) {
            resultsDiv.innerHTML = `
                <h3>Результаты анализа:</h3>
                <p>Основная гармоника: ${dominantHarmonic.frequency.toFixed(2)} Гц</p>
                <p>Амплитуда: ${dominantHarmonic.amplitude.toFixed(4)}</p>
                <p>Количество отсчетов: ${sampleCount}</p>
            `;
        } else {
            resultsDiv.innerHTML = '<p>Не удалось определить основную гармонику</p>';
        }
        
        document.querySelector('.container').appendChild(resultsDiv);
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
        
        // Вычисляем DFT
        for (let k = 0; k < N; k++) {
            let real = 0;
            let imag = 0;
            
            for (let n = 0; n < N; n++) {
                const angle = 2 * Math.PI * k * n / N;
                real += signal[n] * Math.cos(angle);
                imag -= signal[n] * Math.sin(angle);
            }
            
            // Нормализация
            real /= N;
            imag /= N;
            
            const magnitude = Math.sqrt(real * real + imag * imag);
            const phase = Math.atan2(imag, real);
            const frequency = k * samplingRate / N;
            
            if (frequency <= samplingRate / 2) { // Теорема Найквиста
                frequencies.push(frequency);
                magnitudes.push(magnitude);
                phases.push(phase);
            }
        }
        
        return { frequencies, magnitudes, phases };
    }
    
    static findDominantHarmonic(frequencies, magnitudes) {
        let maxMagnitude = 0;
        let dominantIndex = -1;
        
        for (let i = 1; i < magnitudes.length; i++) { // Пропускаем DC компоненту
            if (magnitudes[i] > maxMagnitude) {
                maxMagnitude = magnitudes[i];
                dominantIndex = i;
            }
        }
        
        if (dominantIndex === -1) return null;
        
        return {
            frequency: frequencies[dominantIndex],
            magnitude: magnitudes[dominantIndex],
            amplitude: 2 * magnitudes[dominantIndex] // Для восстановления амплитуды
        };
    }
}

class FunctionParser {
    static parseFunction(functionStr, x) {
        try {
            // Создаем scope с переменными
            const scope = {
                x: x,
                // Математические константы
                pi: Math.PI,
                e: Math.E,
                // Дополнительные функции
                sinc: (x) => x === 0 ? 1 : Math.sin(x) / x,
                rect: (x) => Math.abs(x) <= 0.5 ? 1 : 0
            };
            
            // Парсим и вычисляем выражение
            return math.evaluate(functionStr, scope);
        } catch (error) {
            throw new Error(`Ошибка парсинга функции: ${error.message}`);
        }
    }
    
    static getAvailableFunctions() {
        return {
            'Основные': ['x', 'x^2', 'sin(x)', 'cos(x)', 'tan(x)', 'exp(x)', 'log(x)'],
            'Сложные': ['sin(x)*cos(2*x)', 'exp(-x^2)', 'sinc(x)', 'rect(x)'],
            'Составные': ['sin(x) + 0.5*cos(3*x)', 'x*sin(10*x)', 'pulse(x)']
        };
    }
}

// Запуск приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new QuantizationApp();
});

