export class NeuralNetwork
{
    constructor(inputNodes, hiddenNodes, outputNodes, learningRate)
    {
        this.inodes = inputNodes;
        this.hnodes = hiddenNodes;
        this.onodes = outputNodes;

        this.wih = this.#randomNormalMatrix(this.hnodes, this.inodes + 1, Math.pow(this.inodes + 1, -0.5));
        this.who = this.#randomNormalMatrix(this.onodes, this.hnodes + 1, Math.pow(this.hnodes + 1, -0.5));

        this.lr = learningRate;
        this.activationFunction = (x) => 1 / (1 + Math.exp(-x));
    }

    #randomNormalMatrix(rows, cols, stdDev)
    {
        const matrix = [];
        for (let i = 0; i < rows; i++)
        {
            const row = [];
            for (let j = 0; j < cols; j++)
            {
                const u1 = Math.random();
                const u2 = Math.random();
                const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                row.push(z * stdDev);
            }
            matrix.push(row);
        }
        return matrix;
    }

    train(inputsList, targetsList)
    {
        const inputs = this.#arrayToColumn([...inputsList, 1]);
        const targets = this.#arrayToColumn(targetsList);

        const hiddenInputs = this.#dotProduct(this.wih, inputs);
        const hiddenOutputs = this.#mapMatrix(hiddenInputs, this.activationFunction);
        const hiddenOutputsWithBias = [...hiddenOutputs, [1]];

        const finalInputs = this.#dotProduct(this.who, hiddenOutputsWithBias);
        const finalOutputs = this.#mapMatrix(finalInputs, this.activationFunction);

        const outputErrors = this.#subtractMatrices(targets, finalOutputs);

        const hiddenErrors = this.#dotProduct(
            this.#transposeMatrix(this.who.map(row => row.slice(0, -1))),
            outputErrors
        );

        const outputGradient = this.#elementwiseMultiply(
            outputErrors,
            this.#elementwiseMultiply(finalOutputs, this.#mapMatrix(finalOutputs, x => 1 - x))
        );
        const whoDeltas = this.#dotProduct(outputGradient, this.#transposeMatrix(hiddenOutputsWithBias));
        this.who = this.#addMatrices(this.who, this.#scaleMatrix(whoDeltas, this.lr));

        const hiddenGradient = this.#elementwiseMultiply(
            hiddenErrors,
            this.#elementwiseMultiply(hiddenOutputs, this.#mapMatrix(hiddenOutputs, x => 1 - x))
        );
        const wihDeltas = this.#dotProduct(hiddenGradient, this.#transposeMatrix(inputs));
        this.wih = this.#addMatrices(this.wih, this.#scaleMatrix(wihDeltas, this.lr));
    }

    query(inputsList)
    {
        const inputs = this.#arrayToColumn([...inputsList, 1]);

        const hiddenInputs = this.#dotProduct(this.wih, inputs);
        const hiddenOutputs = this.#mapMatrix(hiddenInputs, this.activationFunction);
        const hiddenOutputsWithBias = [...hiddenOutputs, [1]];

        const finalInputs = this.#dotProduct(this.who, hiddenOutputsWithBias);
        const finalOutputs = this.#mapMatrix(finalInputs, this.activationFunction);

        return finalOutputs.map(row => row[0]);
    }

    async importWeights(url)
    {
        const response = await fetch(url);
        const weights = await response.json();
        this.wih = weights.wih;
        this.who = weights.who;
    }


    #addMatrices(a, b)
    {
        return a.map((row, i) => row.map((val, j) => val + b[i][j]));
    }

    #scaleMatrix(matrix, scalar)
    {
        return matrix.map(row => row.map(val => val * scalar));
    }

    #arrayToColumn(arr)
    {
        return arr.map(value => [value]);
    }

    #dotProduct(a, b)
    {
        const result = [];
        for (let i = 0; i < a.length; i++)
        {
            result[i] = [];
            for (let j = 0; j < b[0].length; j++)
            {
                let sum = 0;
                for (let k = 0; k < a[0].length; k++)
                {
                    sum += a[i][k] * b[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    }

    #mapMatrix(matrix, func)
    {
        return matrix.map(row => row.map(val => func(val)));
    }

    #transposeMatrix(matrix)
    {
        return matrix[0].map((_, j) => matrix.map(row => row[j]));
    }

    #subtractMatrices(a, b)
    {
        return a.map((row, i) => row.map((val, j) => val - b[i][j]));
    }

    #elementwiseMultiply(a, b)
    {
        return a.map((row, i) => row.map((val, j) => val * b[i][j]));
    }
}