// Global variables
let tfliteModel = null;
let isModelLoaded = false;
const statusEl = document.getElementById('status');
const runButton = document.getElementById('runButton');
const downloadButton = document.getElementById('downloadButton');
const imageUpload = document.getElementById('imageUpload');
const inputImage = document.getElementById('inputImage');
const inputCanvas = document.getElementById('inputCanvas');
const outputCanvas = document.getElementById('outputCanvas');

// Load the TFLite model when page loads
async function loadModel() {
    try {
        statusEl.textContent = 'Loading model...';
        statusEl.className = 'loading';
        
        // Load the TFLite model from the same directory
        tfliteModel = await tflite.loadTFLiteModel('body_mod_model.tflite');
        
        isModelLoaded = true;
        statusEl.textContent = 'Model loaded! Upload an image to begin.';
        statusEl.className = 'success';
        
        // Enable run button if image is also loaded
        if (inputImage.src && inputImage.src !== window.location.href) {
            runButton.disabled = false;
        }
    } catch (error) {
        console.error('Failed to load model:', error);
        statusEl.textContent = 'Error loading model. Check console for details.';
        statusEl.className = 'error';
    }
}

// Handle image upload
imageUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        inputImage.src = event.target.result;
        inputImage.style.display = 'block';
        statusEl.textContent = 'Image uploaded. Ready to run simulation.';
        
        if (isModelLoaded) {
            runButton.disabled = false;
        }
    };
    reader.readAsDataURL(file);
});

// Preprocess image exactly like your Python code
async function preprocessImage(imgElement) {
    return tf.tidy(() => {
        // Draw image to canvas for pixel extraction
        const canvas = inputCanvas;
        const ctx = canvas.getContext('2d');
        
        // Resize canvas to 256x256 (like PIL resize)
        canvas.width = 256;
        canvas.height = 256;
        ctx.drawImage(imgElement, 0, 0, 256, 256);
        
        // Convert to tensor, normalize to [0,1], and add batch dimension
        const tensor = tf.browser.fromPixels(canvas)
            .expandDims(0)           // Add batch dimension
            .toFloat()
            .div(255.0);            // Normalize like your /255.0
        
        return tensor;
    });
}

// Run inference when button clicked
runButton.addEventListener('click', async function() {
    if (!isModelLoaded || !inputImage.src) {
        statusEl.textContent = 'Please wait for model to load and upload an image.';
        return;
    }
    
    try {
        statusEl.textContent = 'Processing image...';
        statusEl.className = 'loading';
        runButton.disabled = true;
        downloadButton.style.display = 'none';
        
        // Preprocess the image
        const inputTensor = await preprocessImage(inputImage);
        
        // Run inference (equivalent to interpreter.invoke())
        const outputTensor = tfliteModel.predict(inputTensor);
        
        // Post-process like your Python code: squeeze * 255.0 -> uint8
        const outputData = await tf.tidy(() => {
            return outputTensor
                .squeeze()           // Remove batch dimension
                .mul(255.0)          // Scale to 0-255
                .clipByValue(0, 255) // Ensure valid range
                .toInt();            // Convert to uint8 equivalent
        });
        
        // Display on canvas
        await tf.browser.toPixels(outputData, outputCanvas);
        
        // Enable download
        downloadButton.style.display = 'inline-block';
        
        // Clean up tensors
        tf.dispose([inputTensor, outputTensor, outputData]);
        
        statusEl.textContent = 'Simulation complete!';
        statusEl.className = 'success';
        runButton.disabled = false;
        
    } catch (error) {
        console.error('Error during inference:', error);
        statusEl.textContent = 'Error processing image. Check console.';
        statusEl.className = 'error';
        runButton.disabled = false;
    }
});

// Download the result image
downloadButton.addEventListener('click', function() {
    const link = document.createElement('a');
    link.download = 'simulated_result.jpg';
    link.href = outputCanvas.toDataURL('image/jpeg', 0.9);
    link.click();
    
    statusEl.textContent = 'Result downloaded!';
});

// Load model on page start
loadModel();
