window.addEventListener("load", function () {
    let gridSize = 5;
    let grid = [];
    let cellSize = 50;

    const canvas = document.getElementById("mapCanvas");
    const ctx = canvas.getContext("2d");
    const statusMessage = document.getElementById("statusMessage");

    let mode = "obstacle";
    let startCell = null;
    let endCell = null;

    const gridSizeInput = document.getElementById("gridSizeInput");
    const generateMapBtn = document.getElementById("generateMapBtn");
    const modeSelect = document.getElementById("modeSelect");
    const runAlgorithmBtn = document.getElementById("runAlgorithmBtn");

    // Смена режима редактирования
    modeSelect.addEventListener("change", () => {
        mode = modeSelect.value;
    });

    // Генерация новой карты
    generateMapBtn.addEventListener("click", () => {
        gridSize = parseInt(gridSizeInput.value);
        cellSize = Math.floor(500 / gridSize);
        canvas.width = cellSize * gridSize;
        canvas.height = cellSize * gridSize;

        grid = [];
        for (let y = 0; y < gridSize; y++) {
            let row = [];
            for (let x = 0; x < gridSize; x++) {
                row.push("empty");
            }
            grid.push(row);
        }
        startCell = null;
        endCell = null;
        statusMessage.textContent = "Карта сгенерирована. Установите препятствия, начало и конец.";
        drawGrid();
    });

    // Клик по канвасу — установка препятствий/старта/финиша
    canvas.addEventListener("click", (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / cellSize);
        const y = Math.floor((event.clientY - rect.top) / cellSize);
        if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return;

        if (mode === "obstacle") {
            if (grid[y][x] === "start" || grid[y][x] === "end") return;
            grid[y][x] = (grid[y][x] === "obstacle") ? "empty" : "obstacle";

        } else if (mode === "start") {
            if (grid[y][x] === "obstacle") {
                statusMessage.textContent = "Нельзя ставить начало на препятствие!";
                return;
            }
            if (startCell) grid[startCell.y][startCell.x] = "empty";
            clearPathCells();
            grid[y][x] = "start";
            startCell = { x, y };

        } else if (mode === "end") {
            if (grid[y][x] === "obstacle") {
                statusMessage.textContent = "Нельзя ставить конец на препятствие!";
                return;
            }
            if (endCell) grid[endCell.y][endCell.x] = "empty";
            clearPathCells();
            grid[y][x] = "end";
            endCell = { x, y };
        }

        drawGrid();
    });

    // Запуск поиска пути
    runAlgorithmBtn.addEventListener("click", () => {
        if (!startCell || !endCell) {
            statusMessage.textContent = "Установите начальную и конечную клетку!";
            return;
        }
        clearPathCells();
        const path = findPathAStar();
        if (path) {
            statusMessage.textContent = "Маршрут найден!";
            for (let cell of path) {
                if ((cell.x === startCell.x && cell.y === startCell.y) ||
                    (cell.x === endCell.x && cell.y === endCell.y)) continue;
                grid[cell.y][cell.x] = "path";
            }
        } else {
            statusMessage.textContent = "Маршрут не существует!";
        }
        drawGrid();
    });

    // Рисуем всю сетку
    function drawGrid() {
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                switch (grid[y][x]) {
                    case "empty": ctx.fillStyle = "#ffffff"; break;
                    case "obstacle": ctx.fillStyle = "#000000"; break;
                    case "start": ctx.fillStyle = "#00ff00"; break;
                    case "end": ctx.fillStyle = "#ff0000"; break;
                    case "path": ctx.fillStyle = "#ffff00"; break;
                }
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
            openSet.sort((a, b) => a.f - b.f);
            let current = openSet.shift();
            if (current.x === endCell.x && current.y === endCell.y) {
                let path = [], node = current;
                while (node) {
                    path.push({ x: node.x, y: node.y });
                    node = node.parent;
                }
                return path.reverse();
            }
            closedSet.add(cellKey(current));

            const dirs = [
                { x: 0, y: -1 }, { x: 0, y: 1 },
                { x: -1, y: 0 }, { x: 1, y: 0 },
                { x: -1, y: -1 }, { x: 1, y: -1 },
                { x: -1, y: 1 }, { x: 1, y: 1 }
            ];
            for (let dir of dirs) {
                let nx = current.x + dir.x,
                    ny = current.y + dir.y;
                if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) continue;
                if (grid[ny][nx] === "obstacle") continue;

                let dx = Math.abs(dir.x), dy = Math.abs(dir.y);
                if (dx === 1 && dy === 1) {
                    if (grid[current.y][ny] === "obstacle" || grid[ny][current.x] === "obstacle") {
                        continue;
                    }
                }

                let neighbor = { x: nx, y: ny };
                if (closedSet.has(cellKey(neighbor))) continue;

                let cost = (dx && dy) ? Math.SQRT2 : 1;
                let tentativeG = current.g + cost;
                let existing = openSet.find(n => n.x === nx && n.y === ny);

                if (!existing) {
                    neighbor.g = tentativeG;
                    neighbor.h = heuristic(neighbor, endCell);
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = current;
                    openSet.push(neighbor);
                } else if (tentativeG < existing.g) {
                    existing.g = tentativeG;
                    existing.f = existing.g + existing.h;
                    existing.parent = current;
                }
            }
        }

        return null;
    }

    // Авто-генерация при загрузке
    document.getElementById("generateMapBtn").click();
});
