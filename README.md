# Body Modification Simulator

A web-based body modification simulator that uses TensorFlow.js and BodyPix to segment people from images and apply various background effects.

## Features
- 🎨 Blur Background
- 🟢 Green Screen Effect
- ⚫ Black & White Background
- 🔲 Pixelate Background

## How to Use
1. Upload a photo
2. Select an effect from the dropdown
3. Click "Run Simulation"
4. Download your result

## Technology
- TensorFlow.js
- BodyPix Model
- HTML5 Canvas

## Local Development
Serve the directory with any static HTTP server:
```
python -m http.server 8000
```
Then open `http://localhost:8000` in a browser.

## Deployment
Deployed to GitHub Pages via GitHub Actions. Push to `main` triggers automatic deployment.

## Live Demo
Visit: https://airisedubai.github.io/body-mod-app/
