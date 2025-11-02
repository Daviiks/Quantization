class ShannonFanoCoder {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('encodeBtn').addEventListener('click', () => {
            this.encodeMessage();
        });
    }

    encodeMessage() {
        const message = document.getElementById('messageInput').value;
        
        if (!message) {
            alert('Введите сообщение для кодирования');
            return;
        }

        // Вычисляем частоты символов
        const frequencies = this.calculateFrequencies(message);
        
        // Строим код Шеннона-Фэно
        const codes = this.buildShannonFanoCodes(frequencies);
        
        // Кодируем сообщение
        const encodedMessage = this.encodeString(message, codes);
        
        // Визуализируем результаты
        this.visualizeResults(frequencies, codes, encodedMessage);
        
        // Показываем секцию результатов
        document.getElementById('shannon-results').style.display = 'block';
    }

    calculateFrequencies(message) {
        const freq = {};
        for (let char of message) {
            freq[char] = (freq[char] || 0) + 1;
        }

        // Преобразуем в массив и сортируем по убыванию частоты
        return Object.entries(freq)
            .map(([char, count]) => ({
                symbol: char,
                frequency: count / message.length,
                count: count
            }))
            .sort((a, b) => b.frequency - a.frequency);
    }

    buildShannonFanoCodes(symbols) {
        const codes = {};
        
        const assignCodes = (symbolsGroup, currentCode = '') => {
            if (symbolsGroup.length === 1) {
                codes[symbolsGroup[0].symbol] = currentCode;
                return;
            }

            // Находим оптимальное разделение
            const splitIndex = this.findOptimalSplit(symbolsGroup);
            
            // Левая группа - добавляем '0'
            assignCodes(symbolsGroup.slice(0, splitIndex), currentCode + '0');
            
            // Правая группа - добавляем '1'
            assignCodes(symbolsGroup.slice(splitIndex), currentCode + '1');
        };

        assignCodes(symbols);
        return codes;
    }

    findOptimalSplit(symbols) {
        let totalProbability = symbols.reduce((sum, s) => sum + s.frequency, 0);
        let currentSum = 0;
        let minDifference = Infinity;
        let bestIndex = 1;

        for (let i = 1; i < symbols.length; i++) {
            currentSum += symbols[i - 1].frequency;
            const difference = Math.abs(2 * currentSum - totalProbability);
            
            if (difference < minDifference) {
                minDifference = difference;
                bestIndex = i;
            }
        }

        return bestIndex;
    }

    encodeString(message, codes) {
        return message.split('').map(char => codes[char]).join('');
    }

    visualizeResults(frequencies, codes, encodedMessage) {
        this.displaySymbolsStats(frequencies);
        this.displayCodesTable(frequencies, codes);
        this.displayTree(frequencies, codes);
        this.displayEncodedMessage(encodedMessage);
    }

    displaySymbolsStats(frequencies) {
        const statsHtml = `
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Символ</th>
                        <th>Количество</th>
                        <th>Вероятность</th>
                    </tr>
                </thead>
                <tbody>
                    ${frequencies.map(symbol => `
                        <tr>
                            <td>${this.escapeHtml(symbol.symbol)}</td>
                            <td>${symbol.count}</td>
                            <td>${symbol.frequency.toFixed(4)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.getElementById('symbolsStats').innerHTML = statsHtml;
    }

    displayCodesTable(frequencies, codes) {
        const codesHtml = `
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Символ</th>
                        <th>Код</th>
                        <th>Длина кода</th>
                        <th>Вероятность</th>
                    </tr>
                </thead>
                <tbody>
                    ${frequencies.map(symbol => `
                        <tr>
                            <td>${this.escapeHtml(symbol.symbol)}</td>
                            <td><code>${codes[symbol.symbol]}</code></td>
                            <td>${codes[symbol.symbol].length}</td>
                            <td>${symbol.frequency.toFixed(4)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        document.getElementById('codesTable').innerHTML = codesHtml;
    }

    displayTree(frequencies, codes) {
        // Строим дерево из кодов
        const tree = this.buildTreeStructure(frequencies, codes);
        const treeHtml = this.renderTree(tree);
        document.getElementById('treeVisualization').innerHTML = treeHtml;
    }

    buildTreeStructure(frequencies, codes) {
        const root = { type: 'root', children: [] };
        
        frequencies.forEach(symbol => {
            let currentNode = root;
            const code = codes[symbol.symbol];
            
            for (let bit of code) {
                const direction = bit === '0' ? 'left' : 'right';
                if (!currentNode[direction]) {
                    currentNode[direction] = { type: 'node', bit: bit, children: [] };
                    currentNode.children.push(currentNode[direction]);
                }
                currentNode = currentNode[direction];
            }
            
            // Добавляем лист
            currentNode.symbol = symbol.symbol;
            currentNode.frequency = symbol.frequency;
            currentNode.type = 'leaf';
        });
        
        return root;
    }

    renderTree(node, depth = 0) {
        if (!node) return '';
        
        let html = '';
        const indent = '  '.repeat(depth);
        
        if (node.type === 'leaf') {
            html += `${indent}📄 "${node.symbol}" (${node.frequency.toFixed(3)})<br>`;
        } else if (node.type === 'node') {
            html += `${indent}${node.bit === '0' ? '↳0' : '↳1'}<br>`;
        }
        
        node.children?.forEach(child => {
            html += this.renderTree(child, depth + 1);
        });
        
        if (node.left) html += this.renderTree(node.left, depth + 1);
        if (node.right) html += this.renderTree(node.right, depth + 1);
        
        return html;
    }

    displayEncodedMessage(encodedMessage) {
        const messageHtml = `
            <div style="font-family: 'Courier New', monospace; background: #f5f5f5; padding: 15px; border-radius: 5px; word-break: break-all;">
                ${encodedMessage}
            </div>
            <p><strong>Длина закодированного сообщения:</strong> ${encodedMessage.length} бит</p>
            <p><strong>Эффективность кодирования:</strong> ${(encodedMessage.length / (encodedMessage.length / 8)).toFixed(2)}</p>
        `;
        document.getElementById('encodedMessage').innerHTML = messageHtml;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new ShannonFanoCoder();
});