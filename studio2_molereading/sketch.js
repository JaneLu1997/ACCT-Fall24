let video;
let inferEngine;
let workerId;
const MODEL_NAME = "physiognomy-piercing"; // Replace with your model's name
const MODEL_VERSION = "3"; // Replace with your model's version
const PUBLISHABLE_KEY = "rf_38YYB0CW00XAvADls5klzMVkz1q2"; // Replace with your Roboflow publishable key

function setup() {
    createCanvas(640, 480);
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();

    video.on('loadeddata', () => {
        console.log('Webcam feed is active.');
    });

    // Initialize the inference engine
    inferEngine = new InferenceEngine();

    // Start the worker with your model
    inferEngine.startWorker(MODEL_NAME, MODEL_VERSION, PUBLISHABLE_KEY)
        .then(id => {
            workerId = id;
            console.log("Model loaded successfully.");
        })
        .catch(err => {
            console.error("Error loading model:", err);
        });
}


function draw() {
    background(220);
    image(video, 0, 0);

    if (workerId) {
        // Perform inference on the current video frame
        inferEngine.infer(workerId, video.elt)
            .then(predictions => {
                // Draw bounding boxes for each prediction
                predictions.forEach(pred => {
                    noFill();
                    stroke(255, 0, 0);
                    rect(pred.x, pred.y, pred.width, pred.height);
                    fill(255);
                    textSize(16);
                    text(`${pred.class} (${nf(pred.confidence * 100, 2, 1)}%)`, pred.x, pred.y - 10);
                });
            })
            .catch(err => {
                console.error("Error during inference:", err);
            });
    }
}
