window.addEventListener("load", function () {
    // --- Переменные для состояния карты ---
    let gridSize = 5;    // размер сетки n×n
    let grid = [];       // двумерный массив хранения состояний клеток
    let cellSize = 50;   // размер клетки в пикселяхэ
    
    // --- Получаем ссылки на элементы DOM ---
    const canvas = document.getElementById("mapCanvas");
    const ctx = canvas.getContext("2d");
    const statusMessage = document.getElementById("statusMessage");
    const gridSizeInput = document.getElementById("gridSizeInput");
    const generateMapBtn = document.getElementById("generateMapBtn");
    const modeSelect = document.getElementById("modeSelect");
    const runAlgorithmBtn = document.getElementById("runAlgorithmBtn");
    const clearMapBtn = document.getElementById("clearMapBtn");
    // --- Состояние редактирования ---
    let mode = "obstacle";   // режим: "obstacle" / "start" / "end"
    let startCell = null;    // координаты стартовой точки { x, y }
    let endCell = null;      // координаты конечной точки   { x, y }

    // Смена режима редактирования
    modeSelect.addEventListener("change", () => {
        mode = modeSelect.value;
    });

    // Генерация новой карты
    generateMapBtn.addEventListener("click", () => {
        gridSize = parseInt(gridSizeInput.value);    // Читаем введённый размер
        // Пересчитываем размер клетки, чтобы весь canvas оставался 500×500
        cellSize = Math.floor(500 / gridSize);
        canvas.width = cellSize * gridSize;
        canvas.height = cellSize * gridSize;

        // Создаём новую пустую сетку
        grid = [];
        for (let y = 0; y < gridSize; y++) {
            let row = [];
            for (let x = 0; x < gridSize; x++) {
                row.push("empty");   // все клетки изначально пустые
            }
            grid.push(row);
        }
        
        // Сбрасываем точки старта/финиша
        startCell = null;
        endCell = null;

        // Обновляем статус и отрисовываем пустую сетку
        statusMessage.textContent = "Карта сгенерирована. Установите препятствия, начало и конец.";
        drawGrid();
    });

    // Клик по канвасу — установка препятствий/старта/финиша
    canvas.addEventListener("click", (event) => {
        // Определяем координаты клика относительно сетки
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / cellSize);
        const y = Math.floor((event.clientY - rect.top) / cellSize);
        // Проверяем, что клик внутри области сетки
        if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return;

        if (mode === "obstacle") {
            // В режиме препятствий не трогаем старт и финиш
            if (grid[y][x] === "start" || grid[y][x] === "end") return;
            // Переключаем между "obstacle" и "empty"
            grid[y][x] = (grid[y][x] === "obstacle") ? "empty" : "obstacle";

        } else if (mode === "start") {
            // В режиме старта — нельзя ставить на препятствие
            if (grid[y][x] === "obstacle") {
                statusMessage.textContent = "Нельзя ставить начало на препятствие!";
                return;
            }
            // Стираем предыдущий старт, если был
            if (startCell) grid[startCell.y][startCell.x] = "empty";
            clearPathCells();
            grid[y][x] = "start";
            startCell = { x, y };

        } else if (mode === "end") {
            // Аналогично для финиша
            if (grid[y][x] === "obstacle") {
                statusMessage.textContent = "Нельзя ставить конец на препятствие!";
                return;
            }
            if (endCell) grid[endCell.y][endCell.x] = "empty";
            clearPathCells();
            grid[y][x] = "end";
            endCell = { x, y };
        }
        // После любого изменения — перерисовываем сетку
        drawGrid();
    });

    // Запуск поиска пути
    runAlgorithmBtn.addEventListener("click", () => {
        // Проверяем, что старт и финиш установлены
        if (!startCell || !endCell) {
            statusMessage.textContent = "Установите начальную и конечную клетку!";
            return;
        }
        clearPathCells();   // Удаляем предыдущий маршрут
        const path = findPathAStar();   // Запускаем поиск пути
        if (path) {
            statusMessage.textContent = "Маршрут найден!";
            // Отмечаем найденный путь (сохраняем старт и финиш)
            for (let cell of path) {
                if ((cell.x === startCell.x && cell.y === startCell.y) ||
                    (cell.x === endCell.x && cell.y === endCell.y)) continue;
                grid[cell.y][cell.x] = "path";
            }
        } else {
            statusMessage.textContent = "Маршрут не существует!";
        }
        drawGrid();   // Отображаем результат
    });

    // Очистка карты
    clearMapBtn.addEventListener("click", () => {                
        for (let y = 0; y < gridSize; y++) {                        
            for (let x = 0; x < gridSize; x++) {                    
                grid[y][x] = "empty";                                 
            }                                                          
        }                                                            
        startCell = null;                                                  
        endCell = null;                                                  
        statusMessage.textContent = "Карта очищена.";                      
        drawGrid();                                                        
    });    

    // Рисуем всю сетку
    function drawGrid() {
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                // Выбираем цвет по значению grid[y][x]
                switch (grid[y][x]) {
                    case "empty": ctx.fillStyle = "#ffffff"; break;
                    case "obstacle": ctx.fillStyle = "#000000"; break;
                    case "start": ctx.fillStyle = "#00ff00"; break;
                    case "end": ctx.fillStyle = "#ff0000"; break;
                    case "path": ctx.fillStyle = "#ffff00"; break;
                }
                // Рисуем клетку и её границу
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                ctx.strokeStyle = "#cccccc";
                ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }

    // Убираем предыдущий маршрут
    function clearPathCells() {
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (grid[y][x] === "path") grid[y][x] = "empty";
            }
        }
    }

    // A* с диагоналями и защитой от "углового переезда"
    function findPathAStar() {
        function cellKey(c) { return c.x + "," + c.y; }
        let openSet = [], closedSet = new Set();

        function heuristic(a, b) {
            return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        }

        // Инициализация старта
        let startNode = {
            x: startCell.x, y: startCell.y,
            g: 0,
            h: heuristic(startCell, endCell),
            f: 0,
            parent: null
        };
        startNode.f = startNode.g + startNode.h;
        openSet.push(startNode);

        while (openSet.length) {
            // Находим узел с наименьшим f
            openSet.sort((a, b) => a.f - b.f);
            let current = openSet.shift();
            // Проверка достигли цели
            if (current.x === endCell.x && current.y === endCell.y) {
                // Восстанавливаем путь, двигаясь по .parent
                let path = [], node = current;
                while (node) {
                    path.push({ x: node.x, y: node.y });
                    node = node.parent;
                }
                return path.reverse();
            }
            closedSet.add(cellKey(current));

            // Все 8 направлений (включая диагонали)
            const dirs = [
                { x: 0, y: -1 }, { x: 0, y: 1 },
                { x: -1, y: 0 }, { x: 1, y: 0 },
                { x: -1, y: -1 }, { x: 1, y: -1 },
                { x: -1, y: 1 }, { x: 1, y: 1 }
            ];
            for (let dir of dirs) {
                let nx = current.x + dir.x,
                    ny = current.y + dir.y;
                // Пропускаем за пределами и в препятствиях
                if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) continue;
                if (grid[ny][nx] === "obstacle") continue;
                // Блокировка прохода по диагонали через угол
                let dx = Math.abs(dir.x), dy = Math.abs(dir.y);
                if (dx === 1 && dy === 1) {
                    if (grid[current.y][ny] === "obstacle" || grid[ny][current.x] === "obstacle") {
                        continue;
                    }
                }

                let neighbor = { x: nx, y: ny };
                if (closedSet.has(cellKey(neighbor))) continue;
                // Вычисляем стоимость шага: 1 или √2
                let cost = (dx && dy) ? Math.SQRT2 : 1;
                let tentativeG = current.g + cost;
                // Проверка есть ли уже в открытом списке
                let existing = openSet.find(n => n.x === nx && n.y === ny);

                if (!existing) {
                    // Добавляем нового соседа
                    neighbor.g = tentativeG;
                    neighbor.h = heuristic(neighbor, endCell);
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = current;
                    openSet.push(neighbor);
                } else if (tentativeG < existing.g) {
                    // Улучшаем найденный путь к уже существующему узлу
                    existing.g = tentativeG;
                    existing.f = existing.g + existing.h;
                    existing.parent = current;
                }
            }
        }
        // Если openSet пуст и цель не найдена — пути нет
        return null;
    }

    // Авто-генерация при загрузке
    document.getElementById("generateMapBtn").click();
});
