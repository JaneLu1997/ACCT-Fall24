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

// Object to message mapping
const objectMessages = {
    "too hot to handle": "Today is good for: making your ex regret everything",
    "allergic to mediocrity": "Being better out of spite",
    "main character energy":"Having the barista fall in love with you (platonically)",
    "passionate soul":"Starting that art project that's been haunting your dreams",
    "-sorry i-m in bali":"Booking flights while in flight",
    "keep it real":"Giving unsolicited but needed advice"
    // Add more mappings here as needed
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

function drawBoundingBoxes(predictions, ctx) {
    // Create message element if it doesn't exist
    createMessageElement();
    
    for (var i = 0; i < predictions.length; i++) {
        var confidence = predictions[i].confidence;

        if (confidence < user_confidence) {
            continue;
        }

        // Check for specific object detection and add message if not already shown
        const objectClass = predictions[i].class.toLowerCase();
        if (objectMessages[objectClass] && !detectedMessages.has(objectClass)) {
            detectedMessages.add(objectClass);
            const newMessage = document.createElement('div');
            newMessage.style.marginBottom = '10px';
            newMessage.textContent = objectMessages[objectClass];
            messageElement.appendChild(newMessage);
            console.log("Added message for:", objectClass); // Debug log
        }

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

            ctx.scale(0.75, 0.75);

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
    user_confidence = document.getElementById("confidence").value / 100;
}

document.getElementById("confidence").addEventListener("input", changeConfidence);

webcamInference();