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
    } // Komma fjernet da dette er den sidste egenskab
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
        if (!file.type.startsWith('image/')) {
            console.log('Ignorerer ikke-billede:', file.name);
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                addImageToCanvas(img, file.name);
                drawAll(); // fx opdater canvas efter tilføjelse
            };
            img.onerror = function() {
                console.error('Fejl ved indlæsning af billede:', file.name);
            };
            img.src = event.target.result;
        };
        reader.onerror = function() {
            console.error('Fejl ved læsning af fil:', file.name);
        };
        reader.readAsDataURL(file);
    });
}



    function addImageToCanvas(img, filename) {
    const newImage = {
        element: img,  // Image objektet
        originalWidth: img.width,  // Original bredde
        originalHeight: img.height, // Original højde
        x: 50,  // Start x-position (kan ændres)
        y: 50,  // Start y-position (kan ændres)
        width: img.width,  // Start bredde
        height: img.height, // Start højde
        opacity: 1,  // Fuld synlighed (1 = 100%)
        mirrorOpacity: state.defaultMirrorSettings.opacity, // Standard spejlgennemsigtighed
        mirrorDistance: state.defaultMirrorSettings.distance, // Standard spejlhøjde
        flipped: false,  // Start uden spejlvending
        filename: filename,  // Filnavn
        number: state.images.length + 1  // Unikt nummer
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
    // 1. Beregn den nødvendige eksportstørrelse
   const sizeInput = document.getElementById("exportSizeInput").value.trim().toLowerCase();
let customWidth = null;
let customHeight = null;

if (sizeInput === "auto") {
    const bounds = calculateContentBounds();
    customWidth = bounds.width;
    customHeight = bounds.height;
} else if (/^\d+x\d+$/.test(sizeInput)) {
    const [w, h] = sizeInput.split("x").map(Number);
    customWidth = w;
    customHeight = h;
} else {
    alert("Skriv en gyldig størrelse som fx 800x600 eller 'auto'");
    return;
}

    
    // 2. Find alle dimensioner (inkl. spejleffekter)
    let bounds = calculateContentBounds();
    
    // 3. Skaleringsfaktor
    const scaleFactor = calculateScaleFactor(bounds, exportSizeValue);
    
    // 4. Opret eksport-canvas
    const exportCanvas = createExportCanvas(bounds, scaleFactor);
    const exportCtx = exportCanvas.getContext('2d');
    
    // 5. Tegn baggrund
    drawExportBackground(exportCtx, exportCanvas);
    
    // 6. Tegn alle elementer
    drawAllExportElements(exportCtx, bounds, scaleFactor, customWidth, customHeight);

    
    // 7. Trigger download
    triggerDownload(exportCanvas);
}

// Nye hjælpefunktioner til export:
function calculateContentBounds() {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    state.images.forEach(img => {
        const x = img.x;
        const y = img.y;
        const width = img.width;
        const height = img.height;

        const imgRight = x + width;
        const imgBottom = y + height;

        console.log('🖼️ Billede:', { x, y, width, height });
        console.log('   imgBottom:', imgBottom);

        // Inkluder original billedposition
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, imgRight);
        maxY = Math.max(maxY, imgBottom);

        // Inkluder spejlingen, hvis aktiv
        if (showMirror.checked && img.mirrorOpacity > 0 && img.mirrorDistance > 0) {
            const mirrorBottom = imgBottom + img.mirrorDistance + height;
            console.log('   🪞 mirrorBottom:', mirrorBottom);
            maxY = Math.max(maxY, mirrorBottom);
        }
    });

    // Sikring mod Infinity hvis ingen billeder
    if (minX === Infinity) minX = 0;
    if (minY === Infinity) minY = 0;
    if (maxX === -Infinity) maxX = 0;
    if (maxY === -Infinity) maxY = 0;

    const bounds = {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY
    };

    console.log('📐 Beregnede bounds:', bounds);
    return bounds;
}
    
function calculateScaleFactor(bounds, targetSize) {
    return Math.min(
        targetSize / bounds.width,
        targetSize / bounds.height
    );
}

function createExportCanvas(bounds, scaleFactor) {
    const canvas = document.createElement('canvas');
canvas.width = customWidth;
canvas.height = customHeight;


const ctx = canvas.getContext('2d');

// Find midten
const centerX = exportWidth / 2;
const centerY = exportHeight / 2;

// Placer originalbilledet, så det er centreret
const x = centerX - img.width / 2;
const y = centerY - img.height / 2;

ctx.save();
ctx.globalAlpha = img.opacity;
ctx.drawImage(img.element, x, y, img.width, img.height);
ctx.restore();

// Tegn spejlingen, hvis aktiv – selv hvis den går ud over canvas
if (showMirror.checked && img.mirrorOpacity > 0 && img.mirrorDistance > 0) {
    ctx.save();
    ctx.translate(0, y + img.height + img.mirrorDistance);
    ctx.scale(1, -1); // flip Y
    ctx.globalAlpha = img.mirrorOpacity;
    ctx.drawImage(img.element, x, 0, img.width, img.height);
    ctx.restore();
}


function drawExportBackground(ctx, canvas) {
    if (!transparentBg.checked) {
        ctx.fillStyle = bgColor.value;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawAllExportElements(ctx, bounds, scaleFactor, customWidth, customHeight) {
    // Beregn forskydning for at centrere
    const offsetX = (customWidth - bounds.width * scaleFactor) / 2;
    const offsetY = (customHeight - bounds.height * scaleFactor) / 2;

    // Sorter billeder efter z-index
    const sortedImages = [...state.images].sort((a, b) => a.number - b.number);

    sortedImages.forEach(img => {
        const x = offsetX + (img.x - bounds.minX) * scaleFactor;
        const y = offsetY + (img.y - bounds.minY) * scaleFactor;
        const width = img.width * scaleFactor;
        const height = img.height * scaleFactor;

        ctx.save();
        ctx.globalAlpha = img.opacity;

        // Tegn hovedbilledet
        if (img.flipped) {
            ctx.translate(x + width, y);
            ctx.scale(-1, 1);
            ctx.drawImage(img.element, 0, 0, width, height);
        } else {
            ctx.drawImage(img.element, x, y, width, height);
        }

        // Tegn spejleffekt hvis aktiveret
        if (showMirror.checked && img.mirrorOpacity > 0 && img.mirrorDistance > 0) {
            const mirrorY = y + height;
            const mirrorHeight = (img.mirrorDistance * (height / img.height));

            ctx.save();
            ctx.globalAlpha = img.mirrorOpacity;
            ctx.translate(0, mirrorY * 2 + mirrorHeight);
            ctx.scale(1, -1);
            ctx.drawImage(img.element, x, y, width, height);
            ctx.restore();

            const gradient = ctx.createLinearGradient(
                x, mirrorY,
                x, mirrorY + mirrorHeight
            );
            gradient.addColorStop(0, `rgba(255,255,255,${img.mirrorOpacity})`);
            gradient.addColorStop(1, 'rgba(255,255,255,0)');

            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = gradient;
            ctx.fillRect(x, mirrorY, width, mirrorHeight);
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
    });
}


function drawExportImage(ctx, img, x, y, width, height) {
    ctx.save();
    ctx.globalAlpha = img.opacity;

    // Tegn hovedbilledet (spejlvendt hvis flipped)
    if (img.flipped) {
        ctx.translate(x + width, y);
        ctx.scale(-1, 1);
        ctx.drawImage(img.element, 0, 0, width, height);
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for spejling
    } else {
        ctx.drawImage(img.element, x, y, width, height);
    }

    // Tegn spejling under billedet hvis det skal med
    if (img.showMirror) {
        ctx.save();

        // Position spejlingen lige under billedet
        ctx.translate(x, y + height);

        // Spejl lodret
        ctx.scale(1, -1);

        // Sæt opacity for spejling
        ctx.globalAlpha = img.mirrorOpacity || 0.5;

        // Tegn spejlingen
        ctx.drawImage(img.element, 0, 0, width, height);

        // Lav gradient for at fade spejlingen ud
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 1)');

        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.restore();
    }

        ctx.restore();
}


function triggerDownload(canvas) {
    try {
        const link = document.createElement('a');
        link.download = `design-export-${new Date().getTime()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        // Ryd op for memory-leaks
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
    } catch (error) {
        console.error('Download fejlede:', error);
        alert('Der opstod en fejl under eksport. Prøv igen.');
    }
}
    
    // Initialize the app
     initialize();
});
