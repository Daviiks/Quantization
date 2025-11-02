document.getElementById('searchBtn').addEventListener('click', function() {
    const message = document.getElementById('message').value;
    const target = document.getElementById('target').value;
    
    if (!message || !target) {
        alert('Пожалуйста, введите сообщение и букву для поиска');
        return;
    }
    
    performDichotomousSearch(message, target);
});

function performDichotomousSearch(message, target) {

    const ignoreSpaces = document.getElementById('ignoreSpaces').checked;
    const ignorePunctuation = document.getElementById('ignorePunctuation').checked;
    const caseSensitive = document.getElementById('caseSensitive').checked;
    
    let processedMessage = message;
    let processedTarget = target;
    
    // Регистр
    if (!caseSensitive) {
        processedMessage = processedMessage.toLowerCase();
        processedTarget = processedTarget.toLowerCase();
    }
    
    // Пробелы
    if (ignoreSpaces) {
        processedMessage = processedMessage.replace(/\s/g, '');
    }
    
    // Знаки препинания
    if (ignorePunctuation) {
        processedMessage = processedMessage.replace(/[.,!?;:()\-–—]/g, '');
    }
    
    // Проверяем, что после обработки остались символы
    if (!processedMessage) {
        alert('После фильтрации в сообщении не осталось символов для поиска');
        return;
    }
    
    if (!processedTarget) {
        alert('Введите символ для поиска');
        return;
    }
    
    // Здесь получим уникальные символы из сообщения и отсортируем их
    const uniqueChars = [...new Set(processedMessage)].sort();
    
    // Результаты
    showResultsSection();
    displayAlphabet(uniqueChars, processedTarget);
    
    // Если целевой символ отсутствует в сообщении
    if (!uniqueChars.includes(target)) {
        displayNotFoundMessage(target);
        clearHartleyInfo();
        return;
    }
    
    let steps = [];
    let left = 0;
    let right = uniqueChars.length - 1;
    let attempts = 0;
    
    // Основная логика дихотомического поиска. Деление пополам.
    while (left <= right) {
        attempts++;
        const mid = Math.floor((left + right) / 2);
        const midChar = uniqueChars[mid];
        
        if (midChar === target) {
            steps.push(createStep(attempts, `Найдена буква "${target}" на позиции ${mid + 1} в отсортированном алфавите.`, 
                left, right, mid, uniqueChars, true));
            break;
        } else if (midChar < target) {
            steps.push(createStep(attempts, `Буква "${target}" находится после "${midChar}" в алфавитном порядке. Сдвигаем левую границу.`, 
                left, right, mid, uniqueChars, false));
            left = mid + 1;
        } else {
            steps.push(createStep(attempts, `Буква "${target}" находится перед "${midChar}" в алфавитном порядке. Сдвигаем правую границу.`, 
                left, right, mid, uniqueChars, false));
            right = mid - 1;
        }
    }
    
    // Отображаем шаги поиска
    displaySearchSteps(steps, target);
    
    // Отображаем информацию по Хартли
    displayHartleyInfo(uniqueChars.length, attempts);
}

// Вспомогательные функции
function showResultsSection() {
    document.getElementById('dichotomic-result').style.display = 'block';
}

function hideResultsSection() {
    document.getElementById('dichotomic-result').style.display = 'none';
}

function displayAlphabet(chars, target, originalMessage) {
    const alphabetList = document.getElementById('alphabet-list');
    const alphabetInfo = document.getElementById('alphabetInfo').querySelector('h4');
    
    const ignoreSpaces = document.getElementById('ignoreSpaces').checked;
    const ignorePunctuation = document.getElementById('ignorePunctuation').checked;
    const caseSensitive = document.getElementById('caseSensitive').checked;
    
    let infoText = `Отсортированный алфавит уникальных символов (${chars.length} символов)`;
    
    // Добавляем информацию о примененных фильтрах
    const filters = [];
    if (!caseSensitive) filters.push('регистр не учитывается');
    if (ignoreSpaces) filters.push('пробелы удалены');
    if (ignorePunctuation) filters.push('знаки препинания удалены');
    
    if (filters.length > 0) {
        infoText += ` <small style="color: #666;">(фильтры: ${filters.join(', ')})</small>`;
    }
    
    alphabetInfo.innerHTML = infoText;
    
    // Очистка и заполнение алфавита
    alphabetList.innerHTML = '';
    chars.forEach((char, index) => {
        const charElement = document.createElement('div');
        charElement.className = `char-item ${char === target ? 'target' : ''}`;
        
        // Для специальных символов показываем их код
        let displayChar = char;
        if (char === ' ') displayChar = '␣'; // Символ пробела
        else if (char === '\t') displayChar = '→'; // Табуляция
        else if (char === '\n') displayChar = '↵'; // Новая строка
        
        charElement.textContent = `${displayChar} (${index + 1})`;
        charElement.title = `Символ: ${char}, Код: ${char.charCodeAt(0)}`;
        
        alphabetList.appendChild(charElement);
    });
}

function displayNotFoundMessage(target) {
    const stepsContainer = document.getElementById('steps');
    stepsContainer.innerHTML = '<h4>Шаги поиска:</h4>';
    
    const notFoundElement = document.createElement('div');
    notFoundElement.className = 'step';
    notFoundElement.innerHTML = `<p>Буква "${target}" не найдена в сообщении.</p>`;
    stepsContainer.appendChild(notFoundElement);
}

function clearHartleyInfo() {
    document.getElementById('unique-chars-count').textContent = '0';
    document.getElementById('information-bits').textContent = '0.00';
    document.getElementById('attempts-count').textContent = '0';
    document.getElementById('theoretical-questions').textContent = '0';
    document.getElementById('n-value').textContent = '0';
    document.getElementById('calculated-bits').textContent = '0.00';
}

function createStep(attempt, description, left, right, mid, chars, isCurrent) {
    return {
        description: `Шаг ${attempt}: ${description}`,
        isCurrent: isCurrent,
        left: left,
        right: right,
        mid: mid,
        chars: [...chars]
    };
}

function displaySearchSteps(steps, target) {
    const stepsContainer = document.getElementById('steps');
    stepsContainer.innerHTML = '<h4>Шаги поиска:</h4>';
    
    steps.forEach((step) => {
        const stepElement = document.createElement('div');
        stepElement.className = `step ${step.isCurrent ? 'current-step' : ''}`;
        
        // Визуализация алфавита для этого шага
        const alphabetVisualization = createAlphabetVisualization(step.chars, target, step.left, step.right, step.mid, step.isCurrent);
        
        // Добавляем информацию о диапазоне
        const rangeInfo = step.left <= step.right ? 
            `<p>Текущий диапазон поиска: <span class="search-range">${step.chars[step.left]} (${step.left + 1})</span> - <span class="search-range">${step.chars[step.right]} (${step.right + 1})</span></p>` :
            '';
        
        stepElement.innerHTML = `
            <p><strong>${step.description}</strong></p>
            ${rangeInfo}
            ${alphabetVisualization}
        `;
        
        stepsContainer.appendChild(stepElement);
    });
}

function createAlphabetVisualization(chars, target, left, right, mid, isCurrent) {
    let html = '<div class="alphabet-list">';
    
    chars.forEach((char, index) => {
        let className = 'char-item';
        
        if (char === target) {
            className += ' target';
        }
        
        if (index === mid && !isCurrent) {
            className += ' current';
        }
        
        if (index < left || index > right) {
            className += ' checked';
        }
        
        html += `<div class="${className}">${char} (${index + 1})</div>`;
    });
    
    html += '</div>';
    return html;
}

function displayHartleyInfo(uniqueCharsCount, attempts) {
    const I = Math.log2(uniqueCharsCount);
    
    document.getElementById('unique-chars-count').textContent = uniqueCharsCount;
    document.getElementById('information-bits').textContent = I.toFixed(2);
    document.getElementById('attempts-count').textContent = attempts;
    document.getElementById('theoretical-questions').textContent = Math.ceil(I);
    document.getElementById('n-value').textContent = uniqueCharsCount;
    document.getElementById('calculated-bits').textContent = I.toFixed(2);
}