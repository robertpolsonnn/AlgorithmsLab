window.addEventListener("load", function() {
  // ---------- Глобальные переменные ----------
  let gridSize = 5;   // размер карты по умолчанию
  let grid = [];      // двумерный массив для хранения состояния клеток
  let cellSize = 50;  // размер клетки (в пикселях)
  
  const canvas = document.getElementById("mapCanvas");
  const ctx = canvas.getContext("2d");
  const statusMessage = document.getElementById("statusMessage");

  // Возможные состояния клетки: "empty", "obstacle", "start", "end", "path"
  let mode = "obstacle"; // текущий режим редактирования
  let startCell = null;
  let endCell = null;

  // Элементы управления
  const gridSizeInput = document.getElementById("gridSizeInput");
  const generateMapBtn = document.getElementById("generateMapBtn");
  const modeSelect = document.getElementById("modeSelect");
  const runAlgorithmBtn = document.getElementById("runAlgorithmBtn");

  // ---------- Слушатели событий ----------
  
  // Изменение режима редактирования
  modeSelect.addEventListener("change", function() {
    mode = modeSelect.value;
  });

  // Сгенерировать новую карту
  generateMapBtn.addEventListener("click", function() {
    gridSize = parseInt(gridSizeInput.value);
    // Подгоняем размер клетки под холст 500x500
    cellSize = Math.floor(500 / gridSize);
    canvas.width = cellSize * gridSize;
    canvas.height = cellSize * gridSize;

    // Инициализируем карту
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

  // Клик по холсту для редактирования
  canvas.addEventListener("click", function(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / cellSize);
    const y = Math.floor((event.clientY - rect.top) / cellSize);
    if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return;

    // В зависимости от режима, по-разному обрабатываем клик
    if (mode === "obstacle") {
      // Переключаем клетку на "obstacle" или обратно на "empty"
      // ВАЖНО: Вы можете добавить логику, чтобы препятствия не стирали старт/конец, если это нужно
      grid[y][x] = (grid[y][x] === "obstacle") ? "empty" : "obstacle";
      // Если пользователь хочет запретить стирать старт/конец, можно добавить проверку:
    } 
    else if (mode === "start") {
      // ВАЖНО: Запрещаем ставить начало, если здесь препятствие
      if (grid[y][x] === "obstacle") {
        statusMessage.textContent = "Нельзя ставить начало на препятствие!";
        return; 
      }
      // Очищаем старую стартовую клетку, если есть
      if (startCell) {
        grid[startCell.y][startCell.x] = "empty";
      }
      // Очищаем предыдущий маршрут
      clearPathCells();

      grid[y][x] = "start";
      startCell = { x, y };
    } 
    else if (mode === "end") {
      // ВАЖНО: Запрещаем ставить конец, если здесь препятствие
      if (grid[y][x] === "obstacle") {
        statusMessage.textContent = "Нельзя ставить конец на препятствие!";
        return;
      }
      // Очищаем старую конечную клетку, если есть
      if (endCell) {
        grid[endCell.y][endCell.x] = "empty";
      }
      // Очищаем предыдущий маршрут
      clearPathCells();

      grid[y][x] = "end";
      endCell = { x, y };
    }

    drawGrid();
  });

  // Кнопка "Найти маршрут" запускает алгоритм
  runAlgorithmBtn.addEventListener("click", function() {
    runPathFinding();
  });

  // ---------- Вспомогательные функции ----------

  // Функция для отрисовки карты
  function drawGrid() {
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        let state = grid[y][x];
        switch (state) {
          case "empty":
            ctx.fillStyle = "#ffffff";
            break;
          case "obstacle":
            ctx.fillStyle = "#000000";
            break;
          case "start":
            ctx.fillStyle = "#00ff00";
            break;
          case "end":
            ctx.fillStyle = "#ff0000";
            break;
          case "path":
            ctx.fillStyle = "#ffff00";
            break;
          default:
            ctx.fillStyle = "#ffffff";
        }
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        ctx.strokeStyle = "#cccccc";
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  // Функция для удаления клеток с состоянием "path"
  function clearPathCells() {
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (grid[y][x] === "path") {
          grid[y][x] = "empty";
        }
      }
    }
  }

  // Функция поиска пути (алгоритм A*)
  function runPathFinding() {
    if (!startCell || !endCell) {
      statusMessage.textContent = "Установите начальную и конечную клетку!";
      return;
    }
    // Стираем предыдущий маршрут
    clearPathCells();

    let path = findPathAStar();
    if (path) {
      statusMessage.textContent = "Маршрут найден!";
      // Отмечаем клетки маршрута (исключая старт и конец)
      for (let cell of path) {
        if ((cell.x === startCell.x && cell.y === startCell.y) ||
            (cell.x === endCell.x && cell.y === endCell.y)) continue;
        grid[cell.y][cell.x] = "path";
      }
    } else {
      statusMessage.textContent = "Маршрут не существует!";
    }
    drawGrid();
  }

  // Реализация алгоритма A* для поиска пути по сетке
  function findPathAStar() {
    // Функция для создания уникального ключа клетки
    function cellKey(cell) {
      return cell.x + "," + cell.y;
    }

    let openSet = [];
    let closedSet = new Set();

    // Манхэттенская эвристика
    function heuristic(a, b) {
      return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    let startNode = {
      x: startCell.x,
      y: startCell.y,
      g: 0,
      h: heuristic(startCell, endCell),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    while (openSet.length > 0) {
      // Узел с минимальным f
      openSet.sort((a, b) => a.f - b.f);
      let current = openSet.shift();

      if (current.x === endCell.x && current.y === endCell.y) {
        // Путь найден – восстанавливаем маршрут
        let path = [];
        let temp = current;
        while (temp) {
          path.push({ x: temp.x, y: temp.y });
          temp = temp.parent;
        }
        return path.reverse();
      }
      closedSet.add(cellKey(current));

      // Соседи (4 направления)
      let directions = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 }
      ];
      for (let dir of directions) {
        let nx = current.x + dir.x;
        let ny = current.y + dir.y;
        if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) continue;
        if (grid[ny][nx] === "obstacle") continue;

        let neighbor = { x: nx, y: ny };
        if (closedSet.has(cellKey(neighbor))) continue;

        let tentativeG = current.g + 1;
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
    // Путь не найден
    return null;
  }

  // При загрузке страницы генерируем карту по умолчанию
  generateMapBtn.click();
});
