window.addEventListener("load", function () {
  // Вспомогательные функции

  // Рисует все города (точки) на холсте
  // col – цвет контура, rad – радиус круга
  function drawCities(col, rad) {
    for (let i = 0; i < coords.x.length; i++) {
      ctx.strokeStyle = col;   // цвет обводки
      ctx.lineWidth = 15;      // толщина линий для точек
      ctx.beginPath();
      // рисуем круг в координатах coords.x[i], coords.y[i]
      ctx.arc(coords.x[i], coords.y[i], rad, 0, Math.PI * 2, false);
      ctx.closePath();
      ctx.stroke();
    }
  }
  
  // Рисует линию между двумя городами
  // thickness – толщина, opacity – прозрачность, startIdx/endIdx – индексы городов
  function drawLine(thickness, opacity, startIdx, endIdx, lineCol) {
    ctx.lineWidth = thickness;
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = lineCol;
    ctx.beginPath();
    ctx.moveTo(coords.x[startIdx], coords.y[startIdx]);   // старт
    ctx.lineTo(coords.x[endIdx], coords.y[endIdx]);       // финиш
    ctx.stroke();
    // Восстанавливаем стандартные параметры
    ctx.strokeStyle = "black";
    ctx.globalAlpha = 1;
  }

  // Возвращает случайное целое между min (включительно) и max (исключительно)
  function randInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }

  // Отрисовка маршрута: выделяем лучшие рёбра
  // population – массив кандидатов, первый элемент – лучший путь
  // goodW, goodOp, goodCol – стиль «хороших» ребер
  // badW, badOp, badCol – стиль «остальных» ребер
  function refreshCanvas(population, goodW, goodOp, goodCol, badW, badOp, badCol) {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    drawCities(cityColor, cityRadius);   // рисуем города заново
    // Собираем матрицу смежности для лучшего маршрута
    let segMatrix = new Array(coords.x.length);
    for (let i = 0; i < coords.x.length; i++) {
      segMatrix[i] = new Array(coords.x.length);
    }
    // Пометка ребра от точки 0 к первому и последнему городу
    segMatrix[0][population[0].arr[0]] = "1";
    segMatrix[0][population[0].arr[population[0].arr.length - 1]] = "1";
    // Помечаем все последовательные ребра в лучшем пути
    for (let i = 0; i < population[0].arr.length - 1; i++) {
      segMatrix[Math.min(population[0].arr[i], population[0].arr[i + 1])][
        Math.max(population[0].arr[i], population[0].arr[i + 1])
      ] = "1";
    }
    // Теперь пролистываем все пары городов i < j
    for (let i = 0; i < coords.x.length; i++) {
      for (let j = i + 1; j < coords.x.length; j++) {
        // Если ребро в лучшем пути, рисуем хорошее, иначе обычное
        if (segMatrix[i][j] === "1")
          drawLine(goodW, goodOp, i, j, goodCol);
        else
          drawLine(badW, badOp, i, j, badCol);
      }
    }
  }

  // Рисует фоновые рёбра между всеми городами (при изменении настроек)
  function updateCanvas() {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    drawCities(cityColor, cityRadius);
    for (let i = 0; i < coords.x.length; i++) {
      for (let j = i + 1; j < coords.x.length; j++) {
        drawLine(defaultEdgeWidth, defaultEdgeOpacity, i, j, defaultEdgeColor);
      }
    }
  }

  // Подсчёт длины маршрута
  // route.arr – массив последовательных городов (без точки 0)
  // matrix – матрица расстояний
  function calcLength(route, matrix) {
    for (let i = 0; i < route.arr.length; i++) {
      // От точки 0 к первому городу
      if (i === 0 && route.arr.length !== 1)
        route.length += matrix[0][route.arr[0]];
      // От последнего города обратно в точку 0
      if (i === route.arr.length - 1 && route.arr.length !== 1)
        route.length += matrix[route.arr[route.arr.length - 1]][0];
        // Между промежуточными городами
      else if (route.arr.length !== 1)
        route.length += matrix[route.arr[i]][route.arr[i + 1]];
    }
  }

  // Глобальные настройки 
  let defaultEdgeOpacity = 0.15,
      defaultEdgeColor = "#999999",
      defaultEdgeWidth = 2;
  let cityRadius = 7,
      cityColor = "#000000",
      resultEdgeOpacity = 1,
      resultEdgeColor = "#00ff00";
  let highlightEdgeWidth = 4,
      highlightEdgeColor = "#ffff00",
      highlightEdgeOpacity = 1,
      maxCities = 50;

  let appState = "init";    // Состояния: init → building → searching → finished
  let gaTimerId = null;     // Для clearInterval

  const canvasEl = document.getElementById("myCanvas");
  const ctx = canvasEl.getContext("2d");
  ctx.lineCap = "round";    // Скруглённые концы линий


  let coords = { x: [], y: [] };   // Массивы координат городов
  let cityCounter = 0;     // Счётчик добавленных городов

  // Элементы для вывода информации (HTML)
  let cityCountOutput = document.getElementById("vertexNumberId");
  let bestRouteOutput = document.getElementById("bestPathId");
  let iterationOutput = document.getElementById("iterationId");

  // Логика кнопки Начать/Найти путь/Прервать
  document.getElementById("mainButton").onclick = function () {
    if (appState === "init" || appState === "finished") {
      // Новый сеанс (сброс)
      cityCounter = 0;
      coords.x = [];
      coords.y = [];
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      document.getElementById("mainButton").textContent = "Найти путь";
      cityCountOutput.textContent = "Вершины";
      bestRouteOutput.textContent = "Длина";
      iterationOutput.textContent = "Итерация";
      appState = "building";
    } else if (appState === "building") {
      // Если точек меньше двух, то поиск невозможен
      if (coords.x.length < 2) {
        alert("Нужно как минимум 2 города для поиска маршрута!");
        return;
      }
      // Запускаем генетический алгоритм
      document.getElementById("mainButton").textContent = "Прервать";
      appState = "searching";
      // Параметры 
      const popSize = Math.pow(coords.x.length, 2);
      const mutationRate = 0.7;
      const maxGenerations = 100000;
      const maxNoImprove = Math.min(Math.pow(coords.x.length, 2), 300);
      const numPermutations = popSize;
      const mutationMode = 2;
      const offspringCount = popSize;

      // Строим матрицу расстояний
      let matrix = new Array(coords.x.length);
      for (let i = 0; i < coords.x.length; i++) {
        matrix[i] = new Array(coords.x.length);
        for (let j = 0; j < i; j++) {
          // Симметричная матрица: расстояние между i и j
          matrix[i][j] = Math.sqrt(Math.pow(coords.x[i] - coords.x[j], 2) +
                                      Math.pow(coords.y[i] - coords.y[j], 2));
        }
        matrix[i][i] = -Infinity;
        for (let j = i + 1; j < coords.x.length; j++) {
          matrix[i][j] = Math.sqrt(Math.pow(coords.x[i] - coords.x[j], 2) +
                                      Math.pow(coords.y[i] - coords.y[j], 2));
        }
      }
      // Инициализация первого маршрута (последовательные города 1…n-1)
      let route = { arr: new Array(coords.x.length - 1), length: 0 };
      for (let i = 0; i < route.arr.length; i++) {
        route.arr[i] = i + 1;
      }
      // Начальная популяция
      calcLength(route, matrix);
      let population = [{ arr: route.arr.slice(), length: route.length }];
      // Случайные перестановки для остальных особей
      for (let i = 1; i < popSize; i++) {
        for (let j = 0; j < numPermutations; j++) {
          let idx1 = randInt(0, route.arr.length);
          let idx2 = randInt(0, route.arr.length);
          [route.arr[idx1], route.arr[idx2]] = [route.arr[idx2], route.arr[idx1]];
        }
        route.length = 0;
        calcLength(route, matrix);
        population.push({ arr: route.arr.slice(), length: route.length });
      }

      let iter = 0;
      let noImproveCount = 0;
      let bestLength = Infinity;

      //  Основной цикл алгоритма
      
      gaTimerId = setInterval(function () {
        iter++;
        noImproveCount++;
        // Условия остановки
        if (appState !== "searching" || iter > maxGenerations || noImproveCount > maxNoImprove) {
          clearInterval(gaTimerId);
          // Завершение алгоритма
          appState = "finished";
          document.getElementById("mainButton").textContent = "Начать";
          // Оставляем финальный маршрут на экране до следующего нового сеанса
          return;
        }

        // Генетический алгоритм: скрещивание, мутация, отбор
        for (let count = 0; count < offspringCount; count += 2) {
          // Выбираем случайных родителей
          let idx = randInt(0, population.length);
          let parent1 = { arr: population[idx].arr.slice(), length: population[idx].length };
          idx = randInt(0, population.length);
          let parent2 = { arr: population[idx].arr.slice(), length: population[idx].length };
          // Определяем точку разреза для одноточечного кроссовера
          let cutPoint = randInt(0, parent1.arr.length);
          // Создаём «пустые» массивы для двух детей той же длины, что и у родителей
          let child1 = { arr: new Array(parent1.arr.length), length: 0 };
          let child2 = { arr: new Array(parent1.arr.length), length: 0 };
          let c1 = 0, c2 = 0;
          // Копируем в начало каждого ребёнка префикс от соответствующего родителя
          for (let i = 0; i < cutPoint; i++) {
            child1.arr[c1++] = parent1.arr[i];
            child2.arr[c2++] = parent2.arr[i];
          }
          // Дозаполняем оставшуюся часть ребёнка генами из другого родителя (без дубликатов)
          for (let i = cutPoint; i < parent1.arr.length; i++) {
            if (!child1.arr.includes(parent2.arr[i]))
              child1.arr[c1++] = parent2.arr[i];
            if (!child2.arr.includes(parent1.arr[i]))
              child2.arr[c2++] = parent1.arr[i];
          }
          // На случай, если какая-то позиция осталась пустой, заполняем её недостающими генами родителя
          for (let i = cutPoint; i < parent1.arr.length; i++) {
            if (!child1.arr.includes(parent1.arr[i]))
              child1.arr[c1++] = parent1.arr[i];
            if (!child2.arr.includes(parent2.arr[i]))
              child2.arr[c2++] = parent2.arr[i];
          }
          // Мутация первого ребёнка с вероятностью mutationRate
          if (Math.random() < mutationRate) {
            let pos1 = randInt(0, child1.arr.length);
            let pos2 = randInt(0, child1.arr.length);
            if (mutationMode === 1) {
              // Swap-мутация: меняем местами два случайных гена
              [child1.arr[pos1], child1.arr[pos2]] = [child1.arr[pos2], child1.arr[pos1]];
            } else if (mutationMode === 2) {
              // Реверс-мутация: переворачиваем сегмент между pos1 и pos2
              child1.arr = child1.arr.slice(0, Math.min(pos1, pos2))
                .concat(child1.arr.slice(Math.min(pos1, pos2), Math.max(pos1, pos2) + 1).reverse(),
                        child1.arr.slice(Math.max(pos1, pos2) + 1));
            }
          }
          // Мутация второго ребёнка (аналогично первому)
          if (Math.random() < mutationRate) {
            let pos1 = randInt(0, child2.arr.length);
            let pos2 = randInt(0, child2.arr.length);
            if (mutationMode === 1) {
              [child2.arr[pos1], child2.arr[pos2]] = [child2.arr[pos2], child2.arr[pos1]];
            } else if (mutationMode === 2) {
              child2.arr = child2.arr.slice(0, Math.min(pos1, pos2))
                .concat(child2.arr.slice(Math.min(pos1, pos2), Math.max(pos1, pos2) + 1).reverse(),
                        child2.arr.slice(Math.max(pos1, pos2) + 1));
            }
          }
          // Вычисляем длину маршрутов для обоих детей
          calcLength(child1, matrix);
          calcLength(child2, matrix);
          // Добавляем новых потомков в популяцию
          population.push({ arr: child1.arr.slice(), length: child1.length });
          population.push({ arr: child2.arr.slice(), length: child2.length });
        }
        // Сортируем всех особей по возрастанию длины пути
        population.sort(function (a, b) {
          return a.length - b.length;
        });
        // Оставляем в популяции лишь popSize лучших особей
        population = population.slice(0, popSize);
        // Если новый лучший маршрут короче прежнего — обновляем отрисовку и счётчики
        if (population[0].length < bestLength) {
          bestLength = population[0].length;
          noImproveCount = 0;
          refreshCanvas(
            population,
            highlightEdgeWidth, highlightEdgeOpacity, highlightEdgeColor,
            defaultEdgeWidth, defaultEdgeOpacity, defaultEdgeColor
          );
          bestRouteOutput.textContent = Math.floor(bestLength).toString();
          iterationOutput.textContent = iter.toString();
        }
      }, 0);

    } else if (appState === "searching") {
      // Если алгоритм запущен и нажата кнопка Прервать, то прерываем его
      clearInterval(gaTimerId);
      appState = "init";
      document.getElementById("mainButton").textContent = "Начать";
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      coords.x = [];
      coords.y = [];
      cityCounter = 0;
      cityCountOutput.textContent = "Вершины";
      bestRouteOutput.textContent = "Длина";
      iterationOutput.textContent = "Итерация";
    }
  };

  // Настройки
  document.getElementById("showSettingsModalWindow").onclick = function () {
    document.getElementById("maxCitiesNumberInputId").value = maxCities;
    document.getElementById("maxCitiesNumberOutputId").textContent = maxCities;
    document.getElementById("shadowSettings").style.display = "block";
  };
  document.getElementById("saveSettings").onclick = function () {
    maxCities = document.getElementById("maxCitiesNumberInputId").value;
    document.getElementById("shadowSettings").style.display = "none";
  };
  // Окно настроек графики (цвета/прозрачность)
  document.getElementById("showGraphicsModalWindow").onclick = function () {
    document.getElementById("citiesColorId").value = cityColor;
    document.getElementById("otherEdgesColorId").value = defaultEdgeColor;
    document.getElementById("mainEdgesColorId").value = highlightEdgeColor;
    document.getElementById("resultEdgesColorId").value = resultEdgeColor;
    document.getElementById("otherEdgesOpacityInputId").value = defaultEdgeOpacity.toString();
    document.getElementById("otherEdgesOpacityOutputId").textContent = defaultEdgeOpacity.toString();
    document.getElementById("shadowGraphics").style.display = "block";
  };
  document.getElementById("saveGraphics").onclick = function () {
    cityColor = document.getElementById("citiesColorId").value;
    defaultEdgeColor = document.getElementById("otherEdgesColorId").value;
    highlightEdgeColor = document.getElementById("mainEdgesColorId").value;
    resultEdgeColor = document.getElementById("resultEdgesColorId").value;
    defaultEdgeOpacity = Number(document.getElementById("otherEdgesOpacityInputId").value);
    if (appState === "building") {
      updateCanvas();
    }
    document.getElementById("shadowGraphics").style.display = "none";
  };

  // Добавление городов
  canvasEl.onmousedown = function (e) {
    if (appState !== "building") return; // точки можно добавлять только в режиме построения
    let xCoord = e.offsetX;
    let yCoord = e.offsetY;
    // проверяем, что внутри холста и не превышен лимит городов
    if (
      e.buttons === 1 &&
      xCoord >= 0 && yCoord >= 0 &&
      xCoord <= canvasEl.width && yCoord <= canvasEl.height &&
      cityCounter < maxCities
    ) {
      // Проверяем, что по этим координатам ещё нет существующего города
      let uniquePoint = true;
      for (let i = 0; i < coords.x.length; i++) {
        if (coords.x[i] === xCoord && coords.y[i] === yCoord) {
          uniquePoint = false;
          break;
        }
      }
      // Если точка уникальна — добавляем её
      if (uniquePoint) {
        cityCounter++;                                          // увеличиваем счётчик городов
        cityCountOutput.textContent = cityCounter.toString();   // обновляем отображение счётчика
        // Рисуем новую точку (город)
        ctx.strokeStyle = cityColor;                            // цвет из настроек
        ctx.lineWidth = 15;                                     // толщина обводки для города
        ctx.beginPath();
        ctx.arc(xCoord, yCoord, cityRadius, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.stroke();
        // Рисуем рёбра от нового города ко всем ранее добавленным
        ctx.lineWidth = defaultEdgeWidth;                       // возвращаем толщину для рёбер
        for (let i = 0; i < coords.x.length; i++) {
          ctx.globalAlpha = defaultEdgeOpacity;                 // прозрачность для фона
          ctx.strokeStyle = defaultEdgeColor;                   // цвет «фонового» ребра
          ctx.beginPath();
          ctx.moveTo(coords.x[i], coords.y[i]);                 // от старого города
          ctx.lineTo(xCoord, yCoord);                           // к новому
          ctx.stroke();
          ctx.globalAlpha = 1;                                  // сбрасываем прозрачность
        }
        // Сохраняем координаты нового города для будущих расчётов
        coords.x.push(xCoord);
        coords.y.push(yCoord);
      }
    // Если достигли максимума городов — сообщаем об этом
    } else if (
      e.buttons === 1 &&
      xCoord >= 0 && yCoord >= 0 &&
      xCoord <= canvasEl.width && yCoord <= canvasEl.height &&
      cityCounter >= maxCities
    ) {
      alert("Максимальное количество городов уже построено");
    }
  };
});
