// To display predictions, this app has:
// 1. A video that shows a feed from the user's webcam
// 2. A canvas that appears over the video and shows predictions
// When the page loads, a user is asked to give webcam permission.
// After this happens, the model initializes and starts to make predictions
// On the first prediction, an initialiation step happens in detectFrame()
// to prepare the canvas on which predictions are displayed.

var messageElement = null;
var detectedMessages = new Set(); // Track which messages have been shown

var bounding_box_colors = {};
var user_confidence = 0.6;

// Replace the message mapping at the top with both messages and images
const objectResponses = {
    "too hot to handle": {
        type: "image",
        content: "/Users/janelu/Repository/ACCT-Fall24/studio2_molereading/businesscard/toohottohandle.png"  // Replace with your actual image path
    },
    "allergic to mediocrity": {
        type: "image",
        content: "/Users/janelu/Repository/ACCT-Fall24/studio2_molereading/businesscard/allergictomediocrity.png"
    },
    "main character energy": {
        type: "image",
        content: "/Users/janelu/Repository/ACCT-Fall24/studio2_molereading/businesscard/maincharacterenergy.png"
    },
    "passionate soul": {
        type: "image",
        content: "/Users/janelu/Repository/ACCT-Fall24/studio2_molereading/businesscard/passionatesoul.png"
    },
    "-sorry i-m in bali": {
        type: "image",
        content: "/Users/janelu/Repository/ACCT-Fall24/studio2_molereading/businesscard/sorryiminbali.png"
    },
    "keep it real": {
        type: "image",
        content: "/Users/janelu/Repository/ACCT-Fall24/studio2_molereading/businesscard/keepitreal.png"
    },
    "长命long live": {
        type: "image",
        content: "/Users/janelu/Repository/ACCT-Fall24/studio2_molereading/businesscard/eternalbaddie.png"
    },
    "rhinestone": {
        type: "image",
        content: "/Users/janelu/Repository/ACCT-Fall24/studio2_molereading/businesscard/divinenepotism.png"
    }
};

// Update the colors in this list to set the bounding box colors
var color_choices = [
    "#C7FC00",
    "#FF00FF",
    "#8622FF",
    "#FE0056",
    "#00FFCE",
    "#FF8000",
    "#00B7EB",
    "#FFFF00",
    "#0E7AFE",
    "#FFABAB",
    "#0000FF",
    "#CCCCCC",
];

var canvas_painted = false;
var canvas = document.getElementById("video_canvas");
var ctx = canvas.getContext("2d");
var model = null;

// Add this new function to create an image response
function createImageResponse(imageUrl) {
    const imageWrapper = document.createElement('div');
    imageWrapper.style.marginBottom = '10px';
    imageWrapper.style.width = '800px';
    imageWrapper.style.height = '600px';
    imageWrapper.style.overflow = 'hidden';
    imageWrapper.style.borderRadius = '10px';
    imageWrapper.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    
    const image = document.createElement('img');
    image.src = imageUrl;
    image.style.width = '100%';
    image.style.height = '100%';
    image.style.objectFit = 'cover';
    
    imageWrapper.appendChild(image);
    return imageWrapper;
}

function createMessageElement() {
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'detection-message';
        messageElement.style.textAlign = 'center';
        messageElement.style.marginTop = '20px';
        messageElement.style.fontSize = '18px';
        messageElement.style.fontWeight = 'bold';
        messageElement.style.color = '#6706ce';
        document.querySelector('.infer-widget').appendChild(messageElement);
    }
}

function detectFrame() {
    if (!model) return requestAnimationFrame(detectFrame);

    model.detect(video).then(function(predictions) {
        if (!canvas_painted) {
            var video_start = document.getElementById("video1");
            canvas.style.width = video_start.width + "px";
            canvas.style.height = video_start.height + "px";
            canvas.width = video_start.width;
            canvas.height = video_start.height;

            canvas.top = video_start.top;
            canvas.left = video_start.left;
            canvas.style.top = video_start.top + "px";
            canvas.style.left = video_start.left + "px";
            canvas.style.position = "absolute";
            video_start.style.display = "block";
            canvas.style.display = "absolute";
            canvas_painted = true;

            var loading = document.getElementById("loading");
            loading.style.display = "none";
        }

        requestAnimationFrame(detectFrame);

        // Clear canvas and apply flipping
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (video) {
            // Flip horizontally
            ctx.save();
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);

            // Draw the video
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            ctx.restore();

            // Draw predictions after flipping is applied
            drawBoundingBoxes(predictions, ctx);
        }
    });
}

// Modify the drawBoundingBoxes function to handle both image and text responses
function drawBoundingBoxes(predictions, ctx) {
    // Get the right column element
    const rightColumn = document.querySelector(".right-column");

    // Use a set to track previously displayed objects
    if (!window.detectedObjects) {
        window.detectedObjects = new Set();
    }

    for (var i = 0; i < predictions.length; i++) {
        var confidence = predictions[i].confidence;
        const objectClass = predictions[i].class.toLowerCase();

        // Skip if confidence is below the threshold but ensure it's already been detected
        if (confidence < user_confidence && !window.detectedObjects.has(objectClass)) {
            continue;
        }

        // Add the object to the set if it's newly detected
        if (!window.detectedObjects.has(objectClass)) {
            window.detectedObjects.add(objectClass);

            if (objectResponses[objectClass]) {
                if (objectResponses[objectClass].type === "image") {
                    // Create and append image response
                    const imageElement = createImageResponse(objectResponses[objectClass].content);
                    rightColumn.appendChild(imageElement);
                } else if (objectResponses[objectClass].type === "text") {
                    // Create and append text response
                    const textElement = document.createElement("div");
                    textElement.style.marginBottom = "5px";
                    textElement.textContent = objectResponses[objectClass].content;
                    textElement.style.padding = "5px";
                    textElement.style.borderRadius = "5px";
                    textElement.style.backgroundColor = "#f0f0f0";
                    textElement.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
                    rightColumn.appendChild(textElement);
                }
            }
        }

        // Draw bounding boxes on the canvas
        if (predictions[i].class in bounding_box_colors) {
            ctx.strokeStyle = bounding_box_colors[predictions[i].class];
        } else {
            var color = color_choices[Math.floor(Math.random() * color_choices.length)];
            ctx.strokeStyle = color;

            if (color_choices.length > 0) {
                color_choices.splice(color_choices.indexOf(color), 1);
                bounding_box_colors[predictions[i].class] = color;
            }
        }

        var prediction = predictions[i];
        var x = canvas.width - (prediction.bbox.x + prediction.bbox.width / 2);
        var y = prediction.bbox.y - prediction.bbox.height / 2;
        var width = prediction.bbox.width;
        var height = prediction.bbox.height;

        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.fillStyle = "rgba(0, 0, 0, 0)";
        ctx.fill();
        ctx.lineWidth = "2";
        ctx.strokeRect(x, y, width, height);

        ctx.font = "15px Arial";
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText(
            prediction.class + " " + Math.round(confidence * 100) + "%",
            x,
            y - 10
        );
    }
}



function webcamInference() {
    // Ask for webcam permissions, then run main application.
    var loading = document.getElementById("loading");
    loading.style.display = "block";

    navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" } })
        .then(function(stream) {
            video = document.createElement("video");
            video.srcObject = stream;
            video.id = "video1";

            // hide video until the web stream is ready
            video.style.display = "none";
            video.setAttribute("playsinline", "");

            document.getElementById("video_canvas").after(video);

            video.onloadeddata = function() {
                video.play();
            }

            // on full load, set the video height and width
            video.onplay = function() {
                height = video.videoHeight;
                width = video.videoWidth;

                // scale down video by 0.75
                height = height * 0.75;
                width = width * 0.75;

                width = Math.round(width);
                height = Math.round(height);

                video.setAttribute("width", width);
                video.setAttribute("height", height);
                video.style.width = width + "px";
                video.style.height = height + "px";

                canvas.style.width = width + "px";
                canvas.style.height = height + "px";
                canvas.width = width;
                canvas.height = height;

                document.getElementById("video_canvas").style.display = "block";
            };

            ctx.scale(1, 1);

            // Load the Roboflow model using the publishable_key set in index.html
            // and the model name and version set at the top of this file
            roboflow
                .auth({
                    publishable_key: publishable_key,
                })
                .load({
                    model: MODEL_NAME,
                    version: MODEL_VERSION,
                })
                .then(function(m) {
                    model = m;
                    // Images must have confidence > CONFIDENCE_THRESHOLD to be returned by the model
                    m.configure({ threshold: CONFIDENCE_THRESHOLD });
                    // Start inference
                    detectFrame();
                });
        })
        .catch(function(err) {
            console.log(err);
        });
}

function changeConfidence() {
    // Update the user confidence based on the slider's value
    user_confidence = document.getElementById("confidence").value / 100;

    // Ensure the model reconfigures with the updated confidence threshold
    if (model) {
        model.configure({ threshold: user_confidence });
        console.log(`Confidence threshold updated to: ${user_confidence}`);
    }
}

// Attach the changeConfidence function to the input event of the slider
document.getElementById("confidence").addEventListener("input", changeConfidence);

// Initialize webcam inference
webcamInference();
