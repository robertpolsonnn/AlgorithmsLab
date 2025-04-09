import fs from "fs";
import {NeuralNetwork} from "./neuralNetwork.js";

function runNeuralNetwork(trainingDataPath, testDataPath)
{
    const inputNodes = 784;
    const hiddenNodes = Math.round(inputNodes / 20);
    const outputNodes = 10;
    const learningRate = 0.1;

    const n = new NeuralNetwork(inputNodes, hiddenNodes, outputNodes, learningRate);

    function loadData(filePath)
    {
        try
        {
            const data = fs.readFileSync(filePath, "utf8");
            return data.split("\n");
        }
        catch (error)
        {
            console.error(`Error loading data from ${filePath}:`, error);
            return [];
        }
    }

    function trainNetwork()
    {
        console.log("Loading training data...");
        const trainingDataList = loadData(trainingDataPath);

        console.log("Training neural network...");
        const epochs = 3;

        for (let e = 0; e < epochs; e++)
        {
            console.log(`Training epoch ${e + 1}/${epochs}`);

            for (let i = 0; i < trainingDataList.length; i++)
            {
                const record = trainingDataList[i];
                if (!record.trim())
                {
                    continue;
                }

                const allValues = record.split(",");
                const inputs = allValues.slice(1).map(val =>
                {
                    const pixel = parseFloat(val);
                    const binaryPixel = pixel > 0 ? 255 : 0;
                    return (binaryPixel / 255.0 * 0.99) + 0.01;
                });

                const targets = Array(outputNodes).fill(0.01);
                targets[parseInt(allValues[0])] = 0.99;

                n.train(inputs, targets);
            }
        }

        console.log("Training complete!");
    }

    function testNetwork()
    {
        console.log("Loading test data...");
        const testDataList = loadData(testDataPath);

        console.log("Testing neural network...");
        const scorecard = [];

        for (let i = 0; i < testDataList.length; i++)
        {
            const record = testDataList[i];
            if (!record.trim())
            {
                continue;
            }

            const allValues = record.split(",");
            const correctLabel = parseInt(allValues[0]);

            const inputs = allValues.slice(1).map(val =>
            {
                const pixel = parseFloat(val);
                const binaryPixel = pixel;
                return (binaryPixel / 255.0 * 0.99) + 0.01;
            });

            const outputs = n.query(inputs);
            const label = outputs.indexOf(Math.max(...outputs));

            if (label === correctLabel)
            {
                scorecard.push(1);
            }
            else
            {
                scorecard.push(0);
            }
        }

        const scorecardSum = scorecard.reduce((sum, val) => sum + val, 0);
        const performance = scorecardSum / scorecard.length;
        console.log(`Performance = ${performance}`);
    }

    function exportWeights(filename)
    {
        const weights = {wih: n.wih, who: n.who};
        fs.writeFileSync(filename, JSON.stringify(weights));
    }

    trainNetwork();
    testNetwork();
    exportWeights("weights.json");
}

runNeuralNetwork("mnist_train.csv", "mnist_test.csv");