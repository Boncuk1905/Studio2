document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    const imageUpload = document.getElementById('imageUpload');
    const downloadBtn = document.getElementById('downloadBtn');
    const bgColor = document.getElementById('bgColor');
    const transparentBg = document.getElementById('transparentBg');
    const exportSize = document.getElementById('exportSize');
    const snapToGrid = document.getElementById('snapToGrid');
    const showGuides = document.getElementById('showGuides');
    const showMirror = document.getElementById('showMirror');
    const imageProperties = document.getElementById('imageProperties');
    const scaleSlider = document.getElementById('scaleSlider');
    const scaleValue = document.getElementById('scaleValue');
    const mirrorOpacitySlider = document.getElementById('mirrorOpacitySlider');
    const mirrorOpacityValue = document.getElementById('mirrorOpacityValue');
    const mirrorDistanceSlider = document.getElementById('mirrorDistanceSlider');
    const mirrorDistanceValue = document.getElementById('mirrorDistanceValue');
    const flipBtn = document.getElementById('flipBtn');
    const centerBtn = document.getElementById('centerBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');

    // App state
    const state = {
        images: [],
        selectedImage: null,
        isDragging: false,
        isResizing: false,
        isPanning: false,
        showGuidesInExport: false,
        startX: 0,
        startY: 0,
        startLeft: 0,
        startTop: 0,
        startWidth: 0,
        startHeight: 0,
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        startPanX: 0,
        startPanY: 0,
        minScale: 0.1,
        maxScale: 3,
        mirrorVisible: true,
        grid: {
            size: 20,
            enabled: true,
            color: 'rgba(0, 0, 0, 0.1)',
            visible: true,
            snapThreshold: 5
        },
        defaultMirrorSettings: {
        opacity: 0.3,
        distance: 20
    }
};

    // Initialize the app
    function initialize() {
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }

        resizeCanvasToContainer();
        setupEventListeners();
        renderLoop();
    }

    function resizeCanvasToContainer() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    function renderLoop() {
        render();
        requestAnimationFrame(renderLoop);
    }

    function render() {
        clearCanvas();
        drawBackground();
        
        if (showGuides.checked) {
            drawGrid();
        }
        if (state.temporaryMarker) {
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, 10, 0, Math.PI*2);
    ctx.fillStyle = 'red';
    ctx.fill();
    
    // Fjern markøren efter 1 sekund
    setTimeout(() => {
        state.temporaryMarker = false;
    }, 1000);
}

        drawAllImages();
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function drawBackground() {
        if (!transparentBg.checked) {
            ctx.fillStyle = bgColor.value;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    function drawGrid() {
        const gridSize = state.grid.size;
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.strokeStyle = state.grid.color;
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    function drawAllImages() {
        // Sort by z-index (number property)
        const sortedImages = [...state.images].sort((a, b) => a.number - b.number);
        
        sortedImages.forEach(img => {
            drawSingleImage(img);
            
            if (img === state.selectedImage) {
                drawImageSelection(img);
            }
        });
    }

    function drawSingleImage(img) {
    ctx.save();
    ctx.setTransform(state.scale, 0, 0, state.scale, state.offsetX, state.offsetY);
    ctx.globalAlpha = img.opacity;

    // Tegn hovedbilledet
    if (img.flipped) {
        ctx.translate(img.x + img.width, img.y);
        ctx.scale(-1, 1);
        ctx.drawImage(img.element, 0, 0, img.width, img.height);
    } else {
        ctx.drawImage(img.element, img.x, img.y, img.width, img.height);
    }

    // Tegn spejleffekt hvis aktiveret
    if (showMirror.checked && img.mirrorOpacity > 0 && img.mirrorDistance > 0) {
        const mirrorY = img.y + img.height;
        const mirrorHeight = img.mirrorDistance;
        
        // 1. Tegn det spejlede billede
        ctx.save();
        ctx.globalAlpha = img.mirrorOpacity;
        
        // Anvend spejlingstransformation
        ctx.translate(0, mirrorY * 2 + mirrorHeight);
        ctx.scale(1, -1);
        ctx.drawImage(img.element, img.x, img.y, img.width, img.height);
        ctx.restore();
        
        // 2. Tilføj fade-effekt
        const gradient = ctx.createLinearGradient(
            img.x, mirrorY,
            img.x, mirrorY + mirrorHeight
        );
        gradient.addColorStop(0, `rgba(255,255,255,${img.mirrorOpacity})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = gradient;
        ctx.fillRect(img.x, mirrorY, img.width, mirrorHeight);
        
        // 3. Nulstil composite operation
        ctx.globalCompositeOperation = 'source-over';
    }
    
    ctx.restore();
}

    function drawMirrorEffect(img) {
    ctx.save();
    ctx.setTransform(state.scale, 0, 0, state.scale, state.offsetX, state.offsetY);
    
    // Beregn spejlingsposition
    const mirrorY = img.y + img.height;
    const mirrorDistance = img.mirrorDistance;
    
    // Opret clipping område
    ctx.beginPath();
    ctx.rect(img.x, mirrorY, img.width, mirrorDistance);
    ctx.clip();
    
    // Tegn spejlet billede
    ctx.save();
    ctx.translate(0, mirrorY * 2 + mirrorDistance);
    ctx.scale(1, -1);
    ctx.globalAlpha = img.mirrorOpacity;
    ctx.drawImage(img.element, img.x, img.y, img.width, img.height);
    ctx.restore();
    
    // Tilføj fade-effekt
    const gradient = ctx.createLinearGradient(
        img.x, mirrorY,
        img.x, mirrorY + mirrorDistance
    );
    gradient.addColorStop(0, `rgba(255,255,255,${img.mirrorOpacity})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = gradient;
    ctx.fillRect(img.x, mirrorY, img.width, mirrorDistance);
    
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
        ctx.fillRect(
            img.x + img.width - 8,
            img.y + img.height - 8,
            10, 10
        );
        
        ctx.restore();
    }

    function handleImageUpload(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            if (!file.type.match('image.*')) {
                console.log('Ignorerer ikke-billede:', file.name);
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
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

    function addImageToCanvas(img, filename) {
    const newImage = {
        element: img,
        originalWidth: img.width,
        originalHeight: img.height,
        width: img.width,
        height: img.height,
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        mirrorOpacity: state.defaultMirrorSettings.opacity,
        mirrorDistance: state.defaultMirrorSettings.distance,
        flipped: false,
        filename: filename,
        number: state.images.length + 1
    };
    
    state.images.push(newImage);
    selectImage(newImage);
}

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
        // Center i forhold til canvas midten (inkl. offset og zoom)
        const canvasCenterX = (canvas.width / 2 - state.offsetX) / state.scale;
        const canvasCenterY = (canvas.height / 2 - state.offsetY) / state.scale;
        
        // Juster billedposition til centrum
        state.selectedImage.x = canvasCenterX - state.selectedImage.width / 2;
        state.selectedImage.y = canvasCenterY - state.selectedImage.height / 2;
        
        // Hvis snapToGrid er aktiveret
        if (snapToGrid.checked) {
            state.selectedImage.x = snapToGridValue(state.selectedImage.x);
            state.selectedImage.y = snapToGridValue(state.selectedImage.y);
        }
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
        
       mirrorOpacitySlider.addEventListener('input', function(e) {
    if (state.selectedImage) {
        state.selectedImage.mirrorOpacity = e.target.value / 100;
        mirrorOpacityValue.textContent = e.target.value;
    }
});

mirrorDistanceSlider.addEventListener('input', function(e) {
    if (state.selectedImage) {
        state.selectedImage.mirrorDistance = parseInt(e.target.value);
        mirrorDistanceValue.textContent = e.target.value;
    }
});

showMirror.addEventListener('change', function() {
    // Force rerender når checkbox ændres
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
    if (state.images.length === 0) {
        alert('Ingen billeder at eksportere!');
        return;
    }

    // Debug output
    console.log("=== EKSPORT DEBUG ===");
    console.log("Show Mirror:", showMirror.checked);
    console.log("Billedindstillinger:", state.images.map(img => ({
        navn: img.filename,
        spejl: {
            opacity: img.mirrorOpacity,
            distance: img.mirrorDistance,
            aktiv: showMirror.checked && img.mirrorOpacity > 0 && img.mirrorDistance > 0
        },
        position: `(${img.x},${img.y})`,
        størrelse: `${img.width}x${img.height}`
    })));

    const exportCanvas = document.createElement('canvas');
    const padding = 40;
    const minSize = 500;
    const maxSize = 5000;

    // Beregn canvas størrelse
    let bounds = {
        left: Infinity,
        right: -Infinity,
        top: Infinity,
        bottom: -Infinity
    };

    // Beregn grænser inkl. spejleffekt
    state.images.forEach(img => {
        const bottomWithMirror = img.y + img.height + 
                              (showMirror.checked ? img.mirrorDistance : 0);
        
        bounds.left = Math.min(bounds.left, img.x);
        bounds.right = Math.max(bounds.right, img.x + img.width);
        bounds.top = Math.min(bounds.top, img.y);
        bounds.bottom = Math.max(bounds.bottom, bottomWithMirror);
    });

    const contentWidth = bounds.right - bounds.left;
    const contentHeight = bounds.bottom - bounds.top;
    
    // Beregn slutstørrelse med begrænsninger
    let size = Math.max(
        minSize,
        Math.min(
            maxSize,
            Math.max(contentWidth, contentHeight) + padding * 2
        )
    );
    
    exportCanvas.width = size;
    exportCanvas.height = size;
    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.imageSmoothingQuality = 'high';

    // Tegn baggrund (hvis ikke transparent)
    if (!transparentBg.checked) {
        exportCtx.fillStyle = bgColor.value;
        exportCtx.fillRect(0, 0, size, size);
    }

    // Beregn skalering og offset for centrering
    const scale = Math.min(
        (size - padding * 2) / contentWidth,
        (size - padding * 2) / contentHeight
    );
    
    const offsetX = (size - contentWidth * scale) / 2 - bounds.left * scale;
    const offsetY = (size - contentHeight * scale) / 2 - bounds.top * scale;

    // Tegn alle billeder med spejleffekt
    state.images.forEach(img => {
        const x = offsetX + img.x * scale;
        const y = offsetY + img.y * scale;
        const width = img.width * scale;
        const height = img.height * scale;

        // Tegn hovedbillede
        exportCtx.save();
        exportCtx.globalAlpha = img.opacity;
        
        if (img.flipped) {
            exportCtx.translate(x + width, y);
            exportCtx.scale(-1, 1);
            exportCtx.drawImage(img.element, 0, 0, width, height);
        } else {
            exportCtx.drawImage(img.element, x, y, width, height);
        }
        exportCtx.restore();

        // Tegn spejleffekt (optimert version)
        if (showMirror.checked && img.mirrorOpacity > 0 && img.mirrorDistance > 0) {
            const mirrorY = y + height;
            const mirrorHeight = img.mirrorDistance * scale;
            
            exportCtx.save();
            
            // 1. Tegn spejlbillede med maskering
            exportCtx.globalAlpha = img.mirrorOpacity;
            exportCtx.translate(0, mirrorY * 2 + mirrorHeight);
            exportCtx.scale(1, -1);
            exportCtx.drawImage(img.element, x, y, width, height);
            
            // 2. Tilføj fade-effekt
            const gradient = exportCtx.createLinearGradient(
                x, mirrorY,
                x, mirrorY + mirrorHeight
            );
            gradient.addColorStop(0, `rgba(255,255,255,${img.mirrorOpacity})`);
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            
            exportCtx.globalCompositeOperation = 'destination-out';
            exportCtx.fillStyle = gradient;
            exportCtx.fillRect(x, mirrorY, width, mirrorHeight);
            
            exportCtx.restore();
            
            // 3. Gendan standardindstillinger
            exportCtx.globalCompositeOperation = 'source-over';
        }
    });

    // Download
    try {
        const timestamp = new Date().toISOString()
            .replace(/[:.]/g, '-')
            .replace('T', '_');
        const filename = `design_${timestamp}.png`;
        
        const link = document.createElement('a');
        link.download = filename;
        link.href = exportCanvas.toDataURL('image/png', 1.0);
        link.click();
        
        console.log("Eksport fuldført:", filename);
    } catch (error) {
        console.error('Eksport fejlede:', error);
        alert('Der opstod en fejl under eksport. Prøv igen.');
    }
}
    

    
    // Initialize the app
    initialize();
});
