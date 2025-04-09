window.addEventListener("load", function () {
  // Вспомогательные функции

  function drawCities(col, rad) {
    for (let i = 0; i < coords.x.length; i++) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 15;
      ctx.beginPath();
      ctx.arc(coords.x[i], coords.y[i], rad, 0, Math.PI * 2, false);
      ctx.closePath();
      ctx.stroke();
    }
  }

  function drawLine(thickness, opacity, startIdx, endIdx, lineCol) {
    ctx.lineWidth = thickness;
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = lineCol;
    ctx.beginPath();
    ctx.moveTo(coords.x[startIdx], coords.y[startIdx]);
    ctx.lineTo(coords.x[endIdx], coords.y[endIdx]);
    ctx.stroke();
    ctx.strokeStyle = "black";
    ctx.globalAlpha = 1;
  }

  function randInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }

  // Отрисовка маршрута: выделяем «лучшие» рёбра
  function refreshCanvas(population, goodW, goodOp, goodCol, badW, badOp, badCol) {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    drawCities(cityColor, cityRadius);

    let segMatrix = new Array(coords.x.length);
    for (let i = 0; i < coords.x.length; i++) {
      segMatrix[i] = new Array(coords.x.length);
    }
    segMatrix[0][population[0].arr[0]] = "1";
    segMatrix[0][population[0].arr[population[0].arr.length - 1]] = "1";
    for (let i = 0; i < population[0].arr.length - 1; i++) {
      segMatrix[Math.min(population[0].arr[i], population[0].arr[i + 1])][
        Math.max(population[0].arr[i], population[0].arr[i + 1])
      ] = "1";
    }

    for (let i = 0; i < coords.x.length; i++) {
      for (let j = i + 1; j < coords.x.length; j++) {
        if (segMatrix[i][j] === "1")
          drawLine(goodW, goodOp, i, j, goodCol);
        else
          drawLine(badW, badOp, i, j, badCol);
      }
    }
  }

  // Перерисовка холста
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
  function calcLength(route, matrix) {
    for (let i = 0; i < route.arr.length; i++) {
      if (i === 0 && route.arr.length !== 1)
        route.length += matrix[0][route.arr[0]];
      if (i === route.arr.length - 1 && route.arr.length !== 1)
        route.length += matrix[route.arr[route.arr.length - 1]][0];
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

  let appState = "init";
  let gaTimerId = null;

  const canvasEl = document.getElementById("myCanvas");
  const ctx = canvasEl.getContext("2d");
  ctx.lineCap = "round";

  let coords = { x: [], y: [] };
  let cityCounter = 0;

  // Элементы для вывода информации
  let cityCountOutput = document.getElementById("vertexNumberId");
  let bestRouteOutput = document.getElementById("bestPathId");
  let iterationOutput = document.getElementById("iterationId");

  // Логика кнопки Начать/Найти путь/Прервать
  document.getElementById("mainButton").onclick = function () {
    if (appState === "init" || appState === "finished") {
      // Новый сеанс
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

      const popSize = Math.pow(coords.x.length, 2);
      const mutationRate = 0.7;
      const maxGenerations = 100000;
      const maxNoImprove = Math.min(Math.pow(coords.x.length, 2), 300);
      const numPermutations = popSize;
      const mutationMode = 2;
      const offspringCount = popSize;

      // Формирование матрицы расстояний между городами
      let matrix = new Array(coords.x.length);
      for (let i = 0; i < coords.x.length; i++) {
        matrix[i] = new Array(coords.x.length);
        for (let j = 0; j < i; j++) {
          matrix[i][j] = Math.sqrt(Math.pow(coords.x[i] - coords.x[j], 2) +
                                      Math.pow(coords.y[i] - coords.y[j], 2));
        }
        matrix[i][i] = -Infinity;
        for (let j = i + 1; j < coords.x.length; j++) {
          matrix[i][j] = Math.sqrt(Math.pow(coords.x[i] - coords.x[j], 2) +
                                      Math.pow(coords.y[i] - coords.y[j], 2));
        }
      }

      let route = { arr: new Array(coords.x.length - 1), length: 0 };
      for (let i = 0; i < route.arr.length; i++) {
        route.arr[i] = i + 1;
      }
      calcLength(route, matrix);
      let population = [{ arr: route.arr.slice(), length: route.length }];
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

      gaTimerId = setInterval(function () {
        iter++;
        noImproveCount++;

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
          let idx = randInt(0, population.length);
          let parent1 = { arr: population[idx].arr.slice(), length: population[idx].length };
          idx = randInt(0, population.length);
          let parent2 = { arr: population[idx].arr.slice(), length: population[idx].length };

          let cutPoint = randInt(0, parent1.arr.length);
          let child1 = { arr: new Array(parent1.arr.length), length: 0 };
          let child2 = { arr: new Array(parent1.arr.length), length: 0 };
          let c1 = 0, c2 = 0;
          for (let i = 0; i < cutPoint; i++) {
            child1.arr[c1++] = parent1.arr[i];
            child2.arr[c2++] = parent2.arr[i];
          }
          for (let i = cutPoint; i < parent1.arr.length; i++) {
            if (!child1.arr.includes(parent2.arr[i]))
              child1.arr[c1++] = parent2.arr[i];
            if (!child2.arr.includes(parent1.arr[i]))
              child2.arr[c2++] = parent1.arr[i];
          }
          for (let i = cutPoint; i < parent1.arr.length; i++) {
            if (!child1.arr.includes(parent1.arr[i]))
              child1.arr[c1++] = parent1.arr[i];
            if (!child2.arr.includes(parent2.arr[i]))
              child2.arr[c2++] = parent2.arr[i];
          }

          if (Math.random() < mutationRate) {
            let pos1 = randInt(0, child1.arr.length);
            let pos2 = randInt(0, child1.arr.length);
            if (mutationMode === 1) {
              [child1.arr[pos1], child1.arr[pos2]] = [child1.arr[pos2], child1.arr[pos1]];
            } else if (mutationMode === 2) {
              child1.arr = child1.arr.slice(0, Math.min(pos1, pos2))
                .concat(child1.arr.slice(Math.min(pos1, pos2), Math.max(pos1, pos2) + 1).reverse(),
                        child1.arr.slice(Math.max(pos1, pos2) + 1));
            }
          }
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

          calcLength(child1, matrix);
          calcLength(child2, matrix);
          population.push({ arr: child1.arr.slice(), length: child1.length });
          population.push({ arr: child2.arr.slice(), length: child2.length });
        }

        population.sort(function (a, b) {
          return a.length - b.length;
        });
        population = population.slice(0, popSize);

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
    if (
      e.buttons === 1 &&
      xCoord >= 0 && yCoord >= 0 &&
      xCoord <= canvasEl.width && yCoord <= canvasEl.height &&
      cityCounter < maxCities
    ) {
      let uniquePoint = true;
      for (let i = 0; i < coords.x.length; i++) {
        if (coords.x[i] === xCoord && coords.y[i] === yCoord) {
          uniquePoint = false;
          break;
        }
      }
      if (uniquePoint) {
        cityCounter++;
        cityCountOutput.textContent = cityCounter.toString();
        ctx.strokeStyle = cityColor;
        ctx.lineWidth = 15;
        ctx.beginPath();
        ctx.arc(xCoord, yCoord, cityRadius, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.stroke();
        ctx.lineWidth = defaultEdgeWidth;
        for (let i = 0; i < coords.x.length; i++) {
          ctx.globalAlpha = defaultEdgeOpacity;
          ctx.strokeStyle = defaultEdgeColor;
          ctx.beginPath();
          ctx.moveTo(coords.x[i], coords.y[i]);
          ctx.lineTo(xCoord, yCoord);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        coords.x.push(xCoord);
        coords.y.push(yCoord);
      }
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
