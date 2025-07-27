document.addEventListener('DOMContentLoaded', function () {
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');
const imageUpload = document.getElementById('imageUpload');
@@ -23,6 +24,7 @@ document.addEventListener('DOMContentLoaded', function () {
const zoomOutBtn = document.getElementById('zoomOutBtn');
const resetZoomBtn = document.getElementById('resetZoomBtn');

    // App state
const state = {
images: [],
selectedImage: null,
@@ -52,8 +54,13 @@ document.addEventListener('DOMContentLoaded', function () {
}
};

    // Initialize the app
function initialize() {
        if (!canvas) return console.error('Canvas not found');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }

resizeCanvasToContainer();
setupEventListeners();
renderLoop();
@@ -73,7 +80,11 @@ document.addEventListener('DOMContentLoaded', function () {
function render() {
clearCanvas();
drawBackground();
        if (showGuides.checked) drawGrid();
        
        if (showGuides.checked) {
            drawGrid();
        }

drawAllImages();
}

@@ -90,105 +101,141 @@ document.addEventListener('DOMContentLoaded', function () {

function drawGrid() {
const gridSize = state.grid.size;
        const width = canvas.width;
        const height = canvas.height;
        
ctx.strokeStyle = state.grid.color;
ctx.lineWidth = 1;

        for (let x = 0; x <= canvas.width; x += gridSize) {
        
        for (let x = 0; x <= width; x += gridSize) {
ctx.beginPath();
ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.lineTo(x, height);
ctx.stroke();
}

        for (let y = 0; y <= canvas.height; y += gridSize) {
        
        for (let y = 0; y <= height; y += gridSize) {
ctx.beginPath();
ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.lineTo(width, y);
ctx.stroke();
}
}

function drawAllImages() {
        // Sort by z-index (number property)
const sortedImages = [...state.images].sort((a, b) => a.number - b.number);
        
sortedImages.forEach(img => {
drawSingleImage(img);
            if (img === state.selectedImage) drawImageSelection(img);
            
            if (img === state.selectedImage) {
                drawImageSelection(img);
            }
});
}

function drawSingleImage(img) {
ctx.save();
ctx.setTransform(state.scale, 0, 0, state.scale, state.offsetX, state.offsetY);
ctx.globalAlpha = img.opacity;

        
if (img.flipped) {
ctx.translate(img.x + img.width, img.y);
ctx.scale(-1, 1);
ctx.drawImage(img.element, 0, 0, img.width, img.height);
} else {
ctx.drawImage(img.element, img.x, img.y, img.width, img.height);
}

        if (showMirror.checked && img.mirrorOpacity > 0) drawMirrorEffect(img);
        
        // Draw mirror effect if enabled
        if (showMirror.checked && img.mirrorOpacity > 0) {
            drawMirrorEffect(img);
        }
        
ctx.restore();
}

function drawMirrorEffect(img) {
ctx.save();
ctx.setTransform(state.scale, 0, 0, state.scale, state.offsetX, state.offsetY);
        const mirrorY = img.y + img.height;

        
        // Create clipping area
        ctx.beginPath();
        ctx.rect(img.x, img.y + img.height, img.width, img.mirrorDistance);
        ctx.clip();
        
        // Draw mirrored image
ctx.save();
        ctx.translate(0, mirrorY * 2 + img.mirrorDistance);
        ctx.scale(1, -1);
ctx.globalAlpha = img.mirrorOpacity;
        ctx.translate(0, img.y + img.height * 2 + img.mirrorDistance);
        ctx.scale(1, -1);
ctx.drawImage(img.element, img.x, img.y, img.width, img.height);
ctx.restore();

        
        // Apply fade effect
const gradient = ctx.createLinearGradient(
            img.x, mirrorY,
            img.x, mirrorY + img.mirrorDistance
            img.x, img.y + img.height,
            img.x, img.y + img.height + img.mirrorDistance
);
gradient.addColorStop(0, `rgba(255,255,255,${img.mirrorOpacity})`);
gradient.addColorStop(1, 'rgba(255,255,255,0)');

        
ctx.globalCompositeOperation = 'destination-out';
ctx.fillStyle = gradient;
        ctx.fillRect(img.x, mirrorY, img.width, img.mirrorDistance);
        ctx.fillRect(img.x, img.y + img.height, img.width, img.mirrorDistance);
        
ctx.restore();
}

function drawImageSelection(img) {
ctx.save();
ctx.setTransform(state.scale, 0, 0, state.scale, state.offsetX, state.offsetY);
        
        // Selection border
ctx.strokeStyle = '#3498db';
ctx.lineWidth = 2;
ctx.setLineDash([5, 5]);
ctx.strokeRect(img.x - 2, img.y - 2, img.width + 4, img.height + 4);
        
        // Draw resize handle
ctx.fillStyle = '#3498db';
        ctx.fillRect(img.x + img.width - 8, img.y + img.height - 8, 10, 10);
        ctx.fillRect(
            img.x + img.width - 8,
            img.y + img.height - 8,
            10, 10
        );
        
ctx.restore();
}

function handleImageUpload(e) {
const files = e.target.files;
        if (!files.length) return;
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            if (!file.type.match('image.*')) {
                console.log('Ignorerer ikke-billede:', file.name);
                return;
            }

        Array.from(files).forEach((file) => {
            if (!file.type.match('image.*')) return;
const reader = new FileReader();
            reader.onload = function (event) {
            reader.onload = function(event) {
const img = new Image();
                img.onload = function () {
                    addImageToCanvas(img, file.name, state.images.length + 1);
                img.onload = function() {
                    addImageToCanvas(img, file.name);
                };
                img.onerror = function() {
                    console.error('Fejl ved indlæsning af billede:', file.name);
};
img.src = event.target.result;
};
            reader.onerror = () => console.error('Fil læsefejl');
reader.readAsDataURL(file);
});
}

    function addImageToCanvas(img, filename, number) {
    function addImageToCanvas(img, filename) {
const newImage = {
element: img,
originalWidth: img.width,
@@ -203,110 +250,332 @@ document.addEventListener('DOMContentLoaded', function () {
mirrorDistance: parseInt(mirrorDistanceSlider.value),
flipped: false,
filename: filename,
            number: number
            number: state.images.length + 1
};

state.images.push(newImage);
selectImage(newImage);
}

    function selectImage(img) {
        state.selectedImage = img;
    function handleMouseDown(e) {
        e.preventDefault();
        const pos = getCanvasPosition(e);

        if (e.button === 1) { // Middle mouse button
            state.isPanning = true;
            state.startPanX = e.clientX;
            state.startPanY = e.clientY;
            canvas.style.cursor = 'grabbing';
            return;
        }

        if (state.selectedImage && isOverResizeHandle(pos, state.selectedImage)) {
            state.isResizing = true;
            state.startX = pos.x;
            state.startY = pos.y;
            state.startWidth = state.selectedImage.width;
            state.startHeight = state.selectedImage.height;
            return;
        }

        for (let i = state.images.length - 1; i >= 0; i--) {
            const img = state.images[i];
            if (isOverImage(pos, img)) {
                selectImage(img);
                state.isDragging = true;
                state.startX = pos.x;
                state.startY = pos.y;
                state.startLeft = img.x;
                state.startTop = img.y;
                return;
            }
        }

        selectImage(null);
    }

    function handleMouseMove(e) {
        const pos = getCanvasPosition(e);

        if (state.isPanning) {
            const dx = e.clientX - state.startPanX;
            const dy = e.clientY - state.startPanY;
            state.offsetX += dx;
            state.offsetY += dy;
            state.startPanX = e.clientX;
            state.startPanY = e.clientY;
            return;
        }

        if (state.isDragging && state.selectedImage) {
            const dx = pos.x - state.startX;
            const dy = pos.y - state.startY;
            
            if (snapToGrid.checked) {
                state.selectedImage.x = snapToGridValue(state.startLeft + dx);
                state.selectedImage.y = snapToGridValue(state.startTop + dy);
            } else {
                state.selectedImage.x = state.startLeft + dx;
                state.selectedImage.y = state.startTop + dy;
            }
            return;
        }

        if (state.isResizing && state.selectedImage) {
            const dx = pos.x - state.startX;
            const aspectRatio = state.startWidth / state.startHeight;
            
            state.selectedImage.width = Math.max(10, state.startWidth + dx);
            state.selectedImage.height = state.selectedImage.width / aspectRatio;
            return;
        }
    }

    function handleMouseUp() {
        state.isDragging = false;
        state.isResizing = false;
        state.isPanning = false;
        canvas.style.cursor = 'default';
    }

    function handleZoom(e) {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const wheelDelta = e.deltaY < 0 ? 1 : -1;
        const zoomFactor = 1 + (wheelDelta * zoomIntensity);
        
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;
        const mouseY = e.clientY - canvas.getBoundingClientRect().top;
        
        applyZoom(zoomFactor, mouseX, mouseY);
    }

    function applyZoom(zoomFactor, focusX, focusY) {
        const newScale = Math.max(state.minScale, Math.min(state.maxScale, state.scale * zoomFactor));
        state.offsetX = focusX - (focusX - state.offsetX) * (newScale / state.scale);
        state.offsetY = focusY - (focusY - state.offsetY) * (newScale / state.scale);
        state.scale = newScale;
    }

    function resetZoom() {
        state.scale = 1;
        state.offsetX = 0;
        state.offsetY = 0;
    }

    function getCanvasPosition(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - state.offsetX) / state.scale,
            y: (e.clientY - rect.top - state.offsetY) / state.scale
        };
    }

    function isOverImage(pos, img) {
        return pos.x >= img.x && pos.x <= img.x + img.width &&
               pos.y >= img.y && pos.y <= img.y + img.height;
    }

    function isOverResizeHandle(pos, img) {
        const handleSize = 10;
        return pos.x >= img.x + img.width - handleSize && 
               pos.x <= img.x + img.width &&
               pos.y >= img.y + img.height - handleSize && 
               pos.y <= img.y + img.height;
    }

    function snapToGridValue(value) {
        const gridSize = state.grid.size;
        return Math.round(value / gridSize) * gridSize;
    }

    function selectImage(image) {
        state.selectedImage = image;
        
        if (image) {
            imageProperties.style.display = 'block';
            updateImageControls(image);
        } else {
            imageProperties.style.display = 'none';
        }
    }

    function updateImageControls(img) {
        scaleSlider.value = img.scale * 100;
        scaleValue.textContent = Math.round(img.scale * 100);
        mirrorOpacitySlider.value = img.mirrorOpacity * 100;
        mirrorOpacityValue.textContent = Math.round(img.mirrorOpacity * 100);
        mirrorDistanceSlider.value = img.mirrorDistance;
        mirrorDistanceValue.textContent = img.mirrorDistance;
    }

    function setupEventListeners() {
        // File handling
        imageUpload.addEventListener('change', handleImageUpload);
        
        // Buttons
        downloadBtn.addEventListener('click', exportLayout);
        flipBtn.addEventListener('click', () => {
            if (state.selectedImage) {
                state.selectedImage.flipped = !state.selectedImage.flipped;
            }
        });
        centerBtn.addEventListener('click', () => {
            if (state.selectedImage) {
                state.selectedImage.x = (canvas.width / 2 - state.selectedImage.width / 2 - state.offsetX) / state.scale;
                state.selectedImage.y = (canvas.height / 2 - state.selectedImage.height / 2 - state.offsetY) / state.scale;
            }
        });
        deleteBtn.addEventListener('click', () => {
            if (state.selectedImage) {
                state.images = state.images.filter(img => img !== state.selectedImage);
                selectImage(null);
            }
        });
        
        // Zoom controls
        zoomInBtn.addEventListener('click', () => applyZoom(1.1, canvas.width/2, canvas.height/2));
        zoomOutBtn.addEventListener('click', () => applyZoom(0.9, canvas.width/2, canvas.height/2));
        resetZoomBtn.addEventListener('click', resetZoom);
        
        // Sliders
        scaleSlider.addEventListener('input', (e) => {
            if (state.selectedImage) {
                const scale = e.target.value / 100;
                state.selectedImage.scale = scale;
                state.selectedImage.width = state.selectedImage.originalWidth * scale;
                state.selectedImage.height = state.selectedImage.originalHeight * scale;
                scaleValue.textContent = e.target.value;
            }
        });
        
        mirrorOpacitySlider.addEventListener('input', (e) => {
            if (state.selectedImage) {
                state.selectedImage.mirrorOpacity = e.target.value / 100;
                mirrorOpacityValue.textContent = e.target.value;
            }
        });
        
        mirrorDistanceSlider.addEventListener('input', (e) => {
            if (state.selectedImage) {
                state.selectedImage.mirrorDistance = parseInt(e.target.value);
                mirrorDistanceValue.textContent = e.target.value;
            }
        });
        
        // Canvas interaction
        canvas.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('wheel', handleZoom, { passive: false });
        
        // Window resize
        window.addEventListener('resize', () => {
            resizeCanvasToContainer();
        });
}

function exportLayout() {
const exportCanvas = document.createElement('canvas');
let size, scale;

        
if (exportSize.value === 'auto') {
            // Calculate content bounds
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            
state.images.forEach(img => {
minX = Math.min(minX, img.x);
maxX = Math.max(maxX, img.x + img.width);
minY = Math.min(minY, img.y);
maxY = Math.max(maxY, img.y + img.height + (showMirror.checked ? img.mirrorDistance : 0));
});
            const padding = 20;
            
const contentWidth = maxX - minX;
const contentHeight = maxY - minY;
            const padding = 20; // Add some padding
            
size = Math.max(contentWidth, contentHeight) + padding * 2;
scale = 1;
} else {
size = parseInt(exportSize.value.split('x')[0]);
scale = size / Math.max(canvas.width, canvas.height);
}

        
exportCanvas.width = size;
exportCanvas.height = size;
const exportCtx = exportCanvas.getContext('2d');

        
        // Draw background
if (!transparentBg.checked) {
exportCtx.fillStyle = bgColor.value;
            exportCtx.fillRect(0, 0, size, size);
            exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
}

        
        // Find center of all content
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
state.images.forEach(img => {
minX = Math.min(minX, img.x);
maxX = Math.max(maxX, img.x + img.width);
minY = Math.min(minY, img.y);
maxY = Math.max(maxY, img.y + img.height + (showMirror.checked ? img.mirrorDistance : 0));
});

        
const centerX = (minX + maxX) / 2;
const centerY = (minY + maxY) / 2;

        
        // Draw all images centered
state.images.forEach(img => {
exportCtx.save();
exportCtx.globalAlpha = img.opacity;

            
            // Calculate centered position
const x = (img.x - centerX) * scale + size / 2;
const y = (img.y - centerY) * scale + size / 2;
const width = img.width * scale;
const height = img.height * scale;

            
if (img.flipped) {
exportCtx.translate(x + width, y);
exportCtx.scale(-1, 1);
exportCtx.drawImage(img.element, 0, 0, width, height);
} else {
exportCtx.drawImage(img.element, x, y, width, height);
}

            
            // Draw mirror effect if enabled
if (showMirror.checked && img.mirrorOpacity > 0) {
const mirrorY = y + height;

                
exportCtx.save();
                exportCtx.globalAlpha = img.mirrorOpacity;
exportCtx.translate(0, mirrorY * 2 + img.mirrorDistance * scale);
exportCtx.scale(1, -1);
                exportCtx.globalAlpha = img.mirrorOpacity;
exportCtx.drawImage(img.element, x, y, width, height);
exportCtx.restore();

                
                // Add fade effect
const gradient = exportCtx.createLinearGradient(
x, mirrorY,
x, mirrorY + img.mirrorDistance * scale
);
gradient.addColorStop(0, `rgba(255,255,255,${img.mirrorOpacity})`);
gradient.addColorStop(1, 'rgba(255,255,255,0)');

                
exportCtx.globalCompositeOperation = 'destination-out';
exportCtx.fillStyle = gradient;
exportCtx.fillRect(x, mirrorY, width, img.mirrorDistance * scale);
}

            
exportCtx.restore();
});

        
        // Trigger download
const link = document.createElement('a');
link.download = `design-${new Date().getTime()}.png`;
link.href = exportCanvas.toDataURL('image/png');
link.click();
}

    // EVENTS
    imageUpload.addEventListener('change', handleImageUpload);
    downloadBtn.addEventListener('click', exportLayout);

    // Init
    // Initialize the app
initialize();
});
