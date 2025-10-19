function initializeDichotomicCoding() {
            const coder = {
                messages: [],
                codes: new Map(),
                
                addMessage(message, probability) {
                    this.messages.push({ message, probability });
                    this.messages.sort((a, b) => b.probability - a.probability);
                },
                
                calculateHartleyInformation(probability, totalProbability) {
                    if (probability <= 0) return Infinity;
                    return -Math.log2(probability / totalProbability);
                },
                
                buildDichotomicCodes() {
                    if (this.messages.length === 0) return new Map();
                    
                    const cumulativeProbs = [];
                    let total = 0;
                    
                    for (const msg of this.messages) {
                        total += msg.probability;
                        cumulativeProbs.push(total);
                    }
                    
                    this.codes = new Map();
                    
                    for (let i = 0; i < this.messages.length; i++) {
                        const currentProb = this.messages[i].probability;
                        const currentPos = i > 0 ? cumulativeProbs[i - 1] : 0;
                        
                        let code = '';
                        let lowerBound = 0;
                        let upperBound = 1;
                        
                        for (let bitPos = 0; bitPos < 20; bitPos++) {
                            const midpoint = (lowerBound + upperBound) / 2;
                            
                            if (currentPos < midpoint) {
                                code += '0';
                                upperBound = midpoint;
                            } else {
                                code += '1';
                                lowerBound = midpoint;
                            }
                            
                            if (Math.abs(currentPos - (lowerBound + upperBound) / 2) < currentProb / 4) {
                                break;
                            }
                        }
                        
                        this.codes.set(this.messages[i].message, code);
                    }
                    
                    return this.codes;
                },
                
                getResults() {
                    this.buildDichotomicCodes();
                    
                    const totalProbability = this.messages.reduce((sum, msg) => sum + msg.probability, 0);
                    const results = [];
                    let totalInformation = 0;
                    
                    for (const msg of this.messages) {
                        const information = this.calculateHartleyInformation(msg.probability, totalProbability);
                        const code = this.codes.get(msg.message);
                        const weightedInfo = information * (msg.probability / totalProbability);
                        totalInformation += weightedInfo;
                        
                        results.push({
                            message: msg.message,
                            probability: msg.probability,
                            information: information,
                            code: code,
                            weightedInfo: weightedInfo
                        });
                    }
                    
                    return {
                        results: results,
                        totalInformation: totalInformation,
                        totalProbability: totalProbability
                    };
                },
                
                clear() {
                    this.messages = [];
                    this.codes = new Map();
                }
            };
            
            // Обработчики событий
            document.getElementById('addMessageBtn').addEventListener('click', addMessage);
            document.getElementById('useExampleBtn').addEventListener('click', useExample);
            document.getElementById('clearMessagesBtn').addEventListener('click', clearMessages);
            document.getElementById('calculateCodingBtn').addEventListener('click', calculateCoding);
            
            function addMessage() {
                const messageInput = document.getElementById('messageInput');
                const probabilityInput = document.getElementById('probabilityInput');
                
                const message = messageInput.value.trim();
                const probability = parseFloat(probabilityInput.value);
                
                if (!message) {
                    showError('Введите сообщение');
                    return;
                }
                
                if (isNaN(probability) || probability <= 0 || probability > 1) {
                    showError('Введите корректную вероятность (0 < p ≤ 1)');
                    return;
                }
                
                coder.addMessage(message, probability);
                updateMessagesList();
                
                // Очищаем поля для следующего ввода
                messageInput.value = '';
                probabilityInput.value = '';
            }
            
            function useExample() {
                coder.clear();
                
                const exampleMessages = [
                    { message: 'A', probability: 0.4 },
                    { message: 'B', probability: 0.3 },
                    { message: 'C', probability: 0.15 },
                    { message: 'D', probability: 0.1 },
                    { message: 'E', probability: 0.05 }
                ];
                
                exampleMessages.forEach(msg => {
                    coder.addMessage(msg.message, msg.probability);
                });
                
                updateMessagesList();
            }
            
            function clearMessages() {
                coder.clear();
                updateMessagesList();
                document.getElementById('dichotomicResults').style.display = 'none';
            }
            
            function calculateCoding() {
                if (coder.messages.length === 0) {
                    showError('Добавьте хотя бы одно сообщение');
                    return;
                }
                
                const results = coder.getResults();
                displayResults(results);
            }
            
            function updateMessagesList() {
                const messagesBody = document.getElementById('messagesBody');
                
                if (coder.messages.length === 0) {
                    messagesBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Нет сообщений</td></tr>';
                    return;
                }
                
                messagesBody.innerHTML = coder.messages.map((msg, index) => `
                    <tr>
                        <td>${msg.message}</td>
                        <td>${msg.probability.toFixed(4)}</td>
                        <td>
                            <button class="btn btn-icon" onclick="removeMessage(${index})" 
                                    aria-label="Удалить сообщение">×</button>
                        </td>
                    </tr>
                `).join('');
            }
            
            function displayResults(data) {
                const resultsBody = document.getElementById('resultsBody');
                const summaryStats = document.getElementById('summaryStats');
                const resultsDiv = document.getElementById('dichotomicResults');
                
                // Заполняем таблицу результатов
                resultsBody.innerHTML = data.results.map(item => `
                    <tr>
                        <td>${item.message}</td>
                        <td>${item.probability.toFixed(4)}</td>
                        <td>${item.information.toFixed(4)} бит</td>
                        <td class="code-cell">${item.code}</td>
                    </tr>
                `).join('');
                
                // Отображаем сводку
                summaryStats.innerHTML = `
                    <p><strong>Сумма вероятностей:</strong> ${data.totalProbability.toFixed(4)}</p>
                    <p><strong>Среднее количество информации:</strong> ${data.totalInformation.toFixed(4)} бит</p>
                `;
                
                // Показываем блок результатов
                resultsDiv.style.display = 'block';
            }
            
            function showError(message) {
                const errorDiv = document.getElementById('error');
                errorDiv.textContent = message;
                errorDiv.style.display = 'block';
                setTimeout(() => {
                    errorDiv.style.display = 'none';
                }, 5000);
            }
            
            // Глобальная функция для удаления сообщений
            window.removeMessage = function(index) {
                coder.messages.splice(index, 1);
                updateMessagesList();
            };
            
            // Инициализация списка сообщений
            updateMessagesList();
        }