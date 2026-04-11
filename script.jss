// Global variables
let net = null;
let isModelLoaded = false;
const statusEl = document.getElementById('status');
const runButton = document.getElementById('runButton');
const downloadButton = document.getElementById('downloadButton');
const imageUpload = document.getElementById('imageUpload');
const inputImage = document.getElementById('inputImage');
const inputCanvas = document.getElementById('inputCanvas');
const outputCanvas = document.getElementById('outputCanvas');

// Effect controls (add these to your HTML if you want options)
let currentEffect = 'blur'; // Options: 'blur', 'green', 'bw', 'pixelate'

// Load the BodyPix model when page loads
async function loadModel() {
    try {
        statusEl.textContent = 'Loading BodyPix model... (this may take 15-30 seconds first time)';
        statusEl.className = 'loading';
        
        // Load the pre-trained BodyPix model
        net = await bodyPix.load({
            architecture: 'MobileNetV1',
            outputStride: 16,
            multiplier: 0.75,
            quantBytes: 2
        });
        
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

// Apply body modification effect
async function applyEffect(segmentation, originalImage) {
    const canvas = outputCanvas;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match original image
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    
    // Draw original image
    ctx.drawImage(originalImage, 0, 0);
    
    // Get image data for pixel manipulation
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply effect based on segmentation mask
    for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = i / 4;
        const x = pixelIndex % canvas.width;
        const y = Math.floor(pixelIndex / canvas.width);
        
        // Check if this pixel is part of a person (value > 0)
        const isPerson = segmentation.data[pixelIndex] > 0;
        
        if (!isPerson) {
            // Apply effect to background (non-person pixels)
            switch(currentEffect) {
                case 'blur':
                    // Blur effect is applied separately
                    break;
                case 'green':
                    // Replace background with green
                    data[i] = 0;       // Red
                    data[i+1] = 255;    // Green
                    data[i+2] = 0;      // Blue
                    break;
                case 'bw':
                    // Make background black and white
                    const gray = (data[i] + data[i+1] + data[i+2]) / 3;
                    data[i] = gray;
                    data[i+1] = gray;
                    data[i+2] = gray;
                    break;
                case 'pixelate':
                    // Pixelate effect applied separately
                    break;
            }
        }
    }
    
    if (currentEffect === 'green' || currentEffect === 'bw') {
        ctx.putImageData(imageData, 0, 0);
    } else if (currentEffect === 'blur') {
        // Use BodyPix's built-in blur function
        await bodyPix.drawMask(
            canvas, originalImage, segmentation,
            { maskOpacity: 0, backgroundBlurAmount: 15 }
        );
    } else if (currentEffect === 'pixelate') {
        // Pixelate background
        pixelateBackground(ctx, segmentation, 10);
    }
}

// Helper function to pixelate background
function pixelateBackground(ctx, segmentation, pixelSize) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    
    for (let y = 0; y < height; y += pixelSize) {
        for (let x = 0; x < width; x += pixelSize) {
            // Check if this block is in background
            const pixelIndex = (y * width + x) * 4;
            const isPerson = segmentation.data[y * width + x] > 0;
            
            if (!isPerson) {
                // Get average color of this block
                let r = 0, g = 0, b = 0, count = 0;
                for (let dy = 0; dy < pixelSize && y + dy < height; dy++) {
                    for (let dx = 0; dx < pixelSize && x + dx < width; dx++) {
                        const idx = ((y + dy) * width + (x + dx)) * 4;
                        r += imageData.data[idx];
                        g += imageData.data[idx + 1];
                        b += imageData.data[idx + 2];
                        count++;
                    }
                }
                
                // Fill block with average color
                r = Math.floor(r / count);
                g = Math.floor(g / count);
                b = Math.floor(b / count);
                
                for (let dy = 0; dy < pixelSize && y + dy < height; dy++) {
                    for (let dx = 0; dx < pixelSize && x + dx < width; dx++) {
                        const idx = ((y + dy) * width + (x + dx)) * 4;
                        imageData.data[idx] = r;
                        imageData.data[idx + 1] = g;
                        imageData.data[idx + 2] = b;
                    }
                }
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
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
        
        // Segment the person from the image
        const segmentation = await net.segmentPerson(inputImage, {
            internalResolution: 'medium',
            segmentationThreshold: 0.7
        });
        
        // Apply the selected effect
        await applyEffect(segmentation, inputImage);
        
        // Enable download
        downloadButton.style.display = 'inline-block';
        
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
    link.download = 'body_mod_result.jpg';
    link.href = outputCanvas.toDataURL('image/jpeg', 0.9);
    link.click();
    
    statusEl.textContent = 'Result downloaded!';
});
// Add this after the variable declarations
const effectSelect = document.getElementById('effectSelect');
if (effectSelect) {
    effectSelect.addEventListener('change', function(e) {
        currentEffect = e.target.value;
    });
}
// Load model on page start
loadModel();
