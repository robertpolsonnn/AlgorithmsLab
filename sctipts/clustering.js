document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("canvas")
  const ctx = canvas.getContext("2d")
  const algorithmSelect = document.getElementById("algorithm")
  const runBtn = document.getElementById("run-btn")
  const clearBtn = document.getElementById("clear-btn")

  // Элементы управления алгоритмами
  const kmeansControls = document.getElementById("kmeans-controls")
  const dbscanControls = document.getElementById("dbscan-controls")
  const hierarchyControls = document.getElementById("hierarchy-controls")

  // Холст
  const canvasSize = Math.min(window.innerWidth * 0.8, 600)
  canvas.width = canvasSize
  canvas.height = canvasSize

  let points = []
  let clusters = []
  // Цвета для кластеров
  const colors = [
    "#FF5733",
    "#33FF57",
    "#3357FF",
    "#F3FF33",
    "#FF33F3",
    "#33FFF3",
    "#FF8C33",
    "#8C33FF",
    "#FF338C",
    "#338CFF"
  ]

  
  canvas.addEventListener("click", addPoint)
  algorithmSelect.addEventListener("change", toggleControls)
  runBtn.addEventListener("click", runClustering)
  clearBtn.addEventListener("click", clearPoints)

  // Функция меню для выбора алгоритма
  function toggleControls() {
    const algorithm = algorithmSelect.value

    // Скрывает все элементы управления
    kmeansControls.style.display = "none"
    dbscanControls.style.display = "none"
    hierarchyControls.style.display = "none"

    // Показ элементов управления только для выбранного алгоритма
    switch (algorithm) {
      case "kmeans":
        kmeansControls.style.display = "flex"
        break
      case "dbscan":
        dbscanControls.style.display = "flex"
        break
      case "hierarchy":
        hierarchyControls.style.display = "flex"
        break
    }
  }
  // Включение видимости стандартных элементов управления
  // В index.html это kmeans
  toggleControls()

  // Добавление точки при нажатии на холст
  function addPoint(e) {
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    points.push({ x, y })
    drawPoints()
    // Автоматический запуск кластеризации при нажатии
    runBtn.click()
  }

  // Функция прорисовки точк и кластеров
  function drawPoints() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Добавление точек на холст
    points.forEach((point) => {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = "gray"
      ctx.fill()
    })

    // Прорисовка точек в кластерах
    if (clusters.length > 0) {
      clusters.forEach((cluster, i) => {
        const color = colors[i % colors.length]

        // Высчитывается центр для прорисовки
        const center = calculateClusterCenter(cluster)

        //Прорисовка линии от центра до каждой точки
        cluster.forEach((pointIndex) => {
          const point = points[pointIndex]

          // Создание линии пути от центра до точки
          ctx.beginPath()
          ctx.moveTo(center.x, center.y)
          ctx.lineTo(point.x, point.y)
          ctx.strokeStyle = color
          ctx.lineWidth = 1
          ctx.stroke()

          // Рисование
          ctx.beginPath()
          ctx.arc(point.x, point.y, 5, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
          ctx.strokeStyle = "black"
          ctx.lineWidth = 1
          ctx.stroke()
        })

        // Прорисовка круга в цегре кластера
        ctx.beginPath()
        ctx.arc(center.x, center.y, 8, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = "black"
        ctx.lineWidth = 2
        ctx.stroke()
      })
    }
  }

  // Вычисление центров кластеров
  function calculateClusterCenter(cluster) {
    const center = { x: 0, y: 0 }
    // Добавление координат всех точек в массив
    cluster.forEach((pointIndex) => {
      center.x += points[pointIndex].x
      center.y += points[pointIndex].y
    })
    // Вычисляется средняя координата кластера
    center.x /= cluster.length
    center.y /= cluster.length

    return center
  }

  
  // Очистка точек и кластеров
  function clearPoints() {
    points = []
    clusters = []
    drawPoints()
  }

  function runClustering() {
    if (points.length === 0) {
      alert("Добавьте точки для кластеризации")
      return
    }

    const algorithm = algorithmSelect.value

    switch (algorithm) {
      case "kmeans":
        const k = Number.parseInt(document.getElementById("points-num").value)
        clusters = kMeans(points, k)
        break
      case "dbscan":
        const radius = Number.parseInt(document.getElementById("radius").value)
        const minPts = Number.parseInt(document.getElementById("min-pts").value)
        clusters = dbscan(points, radius, minPts)
        break
      case "hierarchy":
        const numClusters = Number.parseInt(document.getElementById("clusters-count").value)
        clusters = hierarchyClustering(points, numClusters)
        break
    }

    drawPoints()
  }

  // Функция k-means
  function kMeans(points, k) {
    if (points.length < k) {
      return []
    }

    const centres = []
    // Для предотвращения случайного выбора одной и той же точки
    const usedIndices = new Set()
    // Случайно выбираются центры кластеризации
    while (centres.length < k) {
      const randomIndex = Math.floor(Math.random() * points.length)
      // Проверка, повторилась ли точка при выборе 
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex)
        centres.push({ ...points[randomIndex] })
      }
    }

    let clusters = Array(k).fill().map(() => [])
    let iterations = 0
    let centresChanged = true

    // Повторяется 100 раз или пока центры не перестанут меняться
    while (centresChanged && iterations < 100) {
      // Очистка кластеров
      clusters = Array(k).fill().map(() => [])

      // Точки добавляются к кластеру с ближайшим центром
      points.forEach((point, pointIndex) => {
        let minDistance = Number.POSITIVE_INFINITY
        let closestCentreIndex = 0

        centres.forEach((centre, centreIndex) => {
          const distance = euclideanDistance(point, centre)
          if (distance < minDistance) {
            minDistance = distance
            closestCentreIndex = centreIndex
          }
        })

        clusters[closestCentreIndex].push(pointIndex)
      })

      // После добавления точек обновляются координаты центров
      centresChanged = false

      centres.forEach((centre, i) => {
        if (clusters[i].length === 0) return
        // Создаётся новый центр для проверки изменения кластера
        const newCentre = { x: 0, y: 0 }

        clusters[i].forEach((pointIndex) => {
          newCentre.x += points[pointIndex].x
          newCentre.y += points[pointIndex].y
        })
        // Вычисляется среднее значение координат всех точек кластера
        newCentre.x /= clusters[i].length
        newCentre.y /= clusters[i].length

        // Проверяется достаточно ли сильно изменился центр
        if (Math.abs(newCentre.x - centre.x) > 0.1 || Math.abs(newCentre.y - centre.y) > 0.1) {
          centresChanged = true
        }

        centres[i] = newCentre
      })

      iterations++
    }

    // Удаляются пустый кластеры
    return clusters.filter((cluster) => cluster.length > 0)
  }

  // Функция DBScan
  function dbscan(points, radius, minPts) {
    // Набор пройденных точек
    const visited = new Set()
    const clusters = []
    let currentCluster = []

    points.forEach((point, pointIndex) => {
      // Если точка уже проходилась, то она пропускается
      if (visited.has(pointIndex)) return

      // Добвыление точки в пройденные
      visited.add(pointIndex)

      // Для каждой точки находятся соседи - точки, на расстоянии <= радиусу поиска
      const neighbors = nearPoints(points, pointIndex, radius)

      // Если количество точек в кластере, включая начальную, меньше, 
      // чем минимальный порог, то точка не добавляется в кластер
      if (neighbors.length < minPts-1) return

      // Создаётся новый кластер
      currentCluster = [pointIndex]
      clusters.push(currentCluster)

      // Очередь соседних точек
      const neighborQueue = [...neighbors]

      // Добавление соседней точки в заданный кластер
      while (neighborQueue.length > 0) {
        const currentPoint = neighborQueue.shift()

        // Если точка ещё не посещалась, пропускк
        if (visited.has(currentPoint)) continue

        // Соседняя точкка добавляется в пройденные
        visited.add(currentPoint)
        currentCluster.push(currentPoint)

        // Находятся соседние к данной точки
        const currentNeighbors = nearPoints(points, currentPoint, radius)

        // Если достаточно точек найдено, то они добавляются в очередь
        if (currentNeighbors.length >= minPts) {
          currentNeighbors.forEach((neighbor) => {
            if (!visited.has(neighbor) && !neighborQueue.includes(neighbor)) {
              neighborQueue.push(neighbor)
            }
          })
        }
      }
    })

    return clusters
  }

  function hierarchyClustering(points, numClusters) {
    // Вначале каждая точка находится в отдельном кластере
    let clusters = points.map((_, i) => [i])

    // Измеряются дистанции между созданными кластерами
    let distances = []
    updateDistances(clusters, distances)

    // Ближайшие кластеры объединяются, пока их количество не станет рано заданному
    while (clusters.length > numClusters) {
      let minDistance = Number.POSITIVE_INFINITY
      let minI = 0
      let minJ = 0
      // Находятся ближайшие кластеры
      for (let i = 0; i < distances.length; i++) {
        for (let j = 0; j < distances[i].length; j++) {
          if (distances[i][j] < minDistance) {
            minDistance = distances[i][j]
            minI = i
            minJ = j
          }
        }
      }

      // Два ближайших кластера объединяются в 1
      const newCluster = clusters[minI].concat(clusters[minJ])

      // Из списка кластеров удаляются использованные при объединении
      const newClusters = clusters.filter((_, i) => i !== minI && i !== minJ)
      // В список добавляется кластер, получившийся после слияния
      newClusters.push(newCluster)

      // Обновление матрицы расстояний
      const newDistances = []
      updateDistances(newClusters, newDistances)

      clusters = newClusters
      distances = newDistances
    }

    return clusters
  }

  // Находится евклидово расстояние между точками
  function euclideanDistance(pointA, pointB) {
    return Math.sqrt(Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2))
  }
  // Добавление ближайших точек, находящихся в заданном радиусе, в массив соседних точек
  function nearPoints(points, pointIndex, radius) {
    const neighbors = []

    points.forEach((point, i) => {
      if (i !== pointIndex && euclideanDistance(points[pointIndex], point) <= radius) {
        neighbors.push(i)
      }
    })

    return neighbors
  }

  // Функция нахождения расстояния между кластерами
  function clusterDistance(clusterA, clusterB, points) {
    let minDistance = Number.POSITIVE_INFINITY

    // Находится расстояние между ближайшими точками в кластерах
    clusterA.forEach((indexA) => {
      clusterB.forEach((indexB) => {
        const distance = euclideanDistance(points[indexA], points[indexB])
        minDistance = Math.min(minDistance, distance)
      })
    })

    return minDistance
  }

  // Функция обновления матрицы расстояний между кластерами
  function updateDistances(clusters, distances){
    for (let i = 0; i < clusters.length; i++) {
      distances[i] = []
      for (let j = 0; j < clusters.length; j++) {
        if (i === j) {
          distances[i][j] = Number.POSITIVE_INFINITY
        } else {
          distances[i][j] = clusterDistance(clusters[i], clusters[j], points)
        }
      }
    }
  }
})

