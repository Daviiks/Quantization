document.addEventListener('DOMContentLoaded', function() {
            const switcherButtons = document.querySelectorAll('.btn-switcher');
            const assignmentContents = document.querySelectorAll('.assignment-content');
            let currentAssignment = null;
            
            switcherButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const targetAssignment = this.getAttribute('data-assignment');
                    

                    // Если нажимаем на уже активное задание - скрываем его
                    if (currentAssignment === targetAssignment) {
                        hideCurrentAssignment();
                        currentAssignment = null;
                        return;
                    }
                    
                    if (currentAssignment) {
                        hideCurrentAssignment();
                    }
                    
                    // Обновляем активные кнопки
                    switcherButtons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                    
                    // Показываем соответствующее содержимое
                    assignmentContents.forEach(content => {
                        content.classList.remove('active');
                        if (content.id === `${targetAssignment}-content`) {
                            content.classList.add('active');
                        }
                    });
                });
            });

            function showAssignment(assignment) {
                const contentDiv = document.getElementById(`${assignment}-content`);
                contentDiv.innerHTML = assignmentTemplates[assignment];
                contentDiv.classList.add('active');
                
                // Инициализируем логику для выбранного задания
                if (assignment === 'dichotomic') {
                    initializeDichotomicCoding();
                } else if (assignment === 'quantization') {
                    // Здесь можно инициализировать логику квантования
                    initializeQuantization();
                }
            }

            function hideCurrentAssignment() {
                if (currentAssignment) {
                    const contentDiv = document.getElementById(`${currentAssignment}-content`);
                    contentDiv.classList.remove('active');
                    contentDiv.innerHTML = ''; // Очищаем содержимое
                }
                
                // Сбрасываем активные кнопки
                switcherButtons.forEach(btn => btn.classList.remove('active'));
                }

            
            // Инициализация логики дихотомического кодирования
            initializeDichotomicCoding();
        });