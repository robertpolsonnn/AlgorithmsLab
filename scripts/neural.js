import {NeuralNetwork} from "./neuralNetwork.js";

class CanvasPainter extends EventTarget
{
    constructor()
    {
        super();
        
        this.initializeProperties();
        this.setupCanvas();
        this.initializeEventListeners();
    }

    initializeProperties()
    {
        this.canvas = document.getElementById("mainCanvas");
        this.context = this.canvas.getContext("2d", {
            willReadFrequently: true,
            imageSmoothingEnabled: false
        });

        this.gridCanvas = document.getElementById("gridCanvas");
        this.gridContext = this.gridCanvas.getContext("2d", {
            imageSmoothingEnabled: false
        });

        this.gridSize = 28;
        this.cellSize = 15;
        this.size = this.gridSize * this.cellSize;
        this.paintSize = 3;
        this.gridLineColor = "lightgray";
        this.gridLineWidth = 1;

        this.isDrawing = false;
        this.isErasing = false;
        
        this.updatedEvent = new Event("updated")
    }

    setupCanvas()
    {
        this.canvas.width = this.size;
        this.canvas.height = this.size;

        this.gridCanvas.width = this.size;
        this.gridCanvas.height = this.size;

        this.drawGrid();
        this.fillCanvas();
    }

    initializeEventListeners()
    {
        this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
        this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
        this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));

        document.getElementById("clear").addEventListener("click", this.handleClear.bind(this));
        document.getElementById("eraser").addEventListener("click", this.handleEraser.bind(this));
        document.getElementById("pen").addEventListener("click", this.handlePen.bind(this));
    }

    handleMouseDown(event)
    {
        this.isDrawing = true;
        this.draw(event);
    }

    handleMouseUp()
    {
        this.isDrawing = false;
    }

    handleMouseMove(event)
    {
        if (this.isDrawing)
        {
            this.draw(event);
        }
    }

    handleClear()
    {
        this.clear();
    }

    handleEraser()
    {
        this.isErasing = true;
    }

    handlePen()
    {
        this.isErasing = false;
    }

    draw(event)
    {
        const color = this.isErasing ? "white" : "black";
        const coordinates = this.getGridCoordinates(event);
        
        this.fillCell(coordinates.x, coordinates.y, color);
        
        this.dispatchEvent(this.updatedEvent);
    }

    getGridCoordinates(event)
    {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = (event.clientX - rect.x) * (this.canvas.width / rect.width);
        const canvasY = (event.clientY - rect.y) * (this.canvas.height / rect.height);

        return {
            x: Math.floor(canvasX / this.cellSize),
            y: Math.floor(canvasY / this.cellSize)
        };
    }

    fillCell(x, y, color)
    {
        this.context.fillStyle = color;
        this.context.fillRect(
            x * this.cellSize - this.cellSize,
            y * this.cellSize - this.cellSize,
            this.cellSize * this.paintSize,
            this.cellSize * this.paintSize
        );
    }

    drawGrid()
    {
        this.gridContext.fillStyle = this.gridLineColor;

        for (let i = 1; i < this.gridSize; i++)
        {
            const y = i * this.cellSize;
            this.gridContext.fillRect(0, y, this.size, this.gridLineWidth);
        }

        for (let i = 1; i < this.gridSize; i++)
        {
            const x = i * this.cellSize;
            this.gridContext.fillRect(x, 0, this.gridLineWidth, this.size);
        }
    }

    fillCanvas()
    {
        this.context.fillStyle = "white";
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.fillStyle = undefined;
    }

    clear()
    {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.fillCanvas();
        
        this.dispatchEvent(this.updatedEvent);
    }

    getImageData()
    {
        const grid = new Array(this.gridSize ** 2);

        const canvasData = this.context.getImageData(0, 0, this.size, this.size).data;

        const cellPixelCount = (this.cellSize ** 2) * 3; // 3, потому что не учитываем альфа канал
        
        for (let i = 0; i < this.gridSize; i++)
        {
            for (let j = 0; j < this.gridSize; j++)
            {
                let sum = 0;

                for (let y = i * this.cellSize; y < (i + 1) * this.cellSize; y++)
                {
                    for (let x = j * this.cellSize; x < (j + 1) * this.cellSize; x++)
                    {
                        const index = (y * this.size + x) * 4;
                        
                        sum += canvasData[index];
                        sum += canvasData[index + 1];
                        sum += canvasData[index + 2];
                    }
                }

                const average = sum / cellPixelCount;
                
                grid[(this.gridSize * i) + j] = 255 - average;
            }
        }
        
        return grid;
    }
}

const painter = new CanvasPainter();

const inputNodes = 768;
const hiddenNodes = Math.round(inputNodes / 20);
const outputNodes = 10;

const network = new NeuralNetwork(inputNodes, hiddenNodes, outputNodes);

await network.importWeights("../data/weights.json");

painter.addEventListener("updated", () =>
{
    const result = network.query(painter.getImageData());
    document.getElementById("result").innerText = result.indexOf(Math.max(...result))
});

