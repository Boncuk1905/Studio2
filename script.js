/* 
 * KOMPLET BILLEDEREDIGERINGSVÆRKTØJ (ZOOM FIXET)
 * Version: 2.2 (Med fungerende zoom og korrekt canvas-størrelse)
 */

document.addEventListener('DOMContentLoaded', function() {
    // ... (tidligere DOM elementer fra før) ...

    // Tilføj zoom-relaterede variabler
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');

    // Opdater init-funktion med korrekt canvas-størrelse
    function initialize() {
        if (!ctx) {
            console.error('Kunne ikke få canvas context');
            return;
        }

        // Sæt canvas til at fylde sin container
        resizeCanvasToContainer();
        setupEventListeners();
        requestAnimationFrame(renderLoop);
    }

    // Ny funktion til at håndtere canvas-størrelse
    function resizeCanvasToContainer() {
        const container = canvas.parentElement;
        const dpi = window.devicePixelRatio || 1;
        
        // Sæt canvas størrelse baseret på container
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        // Opdater faktiske canvas dimensioner
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpi;
        canvas.height = rect.height * dpi;
        
        // Skaler context til høj DPI
        ctx.scale(dpi, dpi);
        
        console.log('Canvas størrelse opdateret:', canvas.width, canvas.height);
    }

    // Tilføj zoom funktionalitet
    function handleZoom(e) {
        e.preventDefault();
        
        // Bestem zoom-retning (op/ned)
        const zoomIntensity = 0.1;
        const wheelDelta = e.deltaY < 0 ? 1 : -1;
        const zoomFactor = 1 + (wheelDelta * zoomIntensity);
        
        // Beregn musens position i canvas koordinater
        const mouseX = e.clientX - canvas.getBoundingClientRect().left;
        const mouseY = e.clientY - canvas.getBoundingClientRect().top;
        
        // Anvend zoom
        applyZoom(zoomFactor, mouseX, mouseY);
    }

    function applyZoom(zoomFactor, focusX = canvas.width/2, focusY = canvas.height/2) {
        // Begræns zoom-niveau
        const newScale = state.scale * zoomFactor;
        if (newScale < 0.1 || newScale > 10) return;
        
        // Beregn ny offset for at zoome mod musposition
        state.offsetX = focusX - (focusX - state.offsetX) * zoomFactor;
        state.offsetY = focusY - (focusY - state.offsetY) * zoomFactor;
        
        state.scale = newScale;
        console.log('Zoom niveau:', state.scale.toFixed(2));
    }

    // Tilføj knap-håndtering
    function setupZoomButtons() {
        zoomInBtn.addEventListener('click', () => applyZoom(1.1));
        zoomOutBtn.addEventListener('click', () => applyZoom(0.9));
        resetZoomBtn.addEventListener('click', () => {
            state.scale = 1;
            state.offsetX = 0;
            state.offsetY = 0;
        });
    }

    // Opdater event listeners
    function setupEventListeners() {
        // ... (tidligere event listeners) ...
        
        // Tilføj zoom-håndtering
        canvas.addEventListener('wheel', handleZoom, { passive: false });
        setupZoomButtons();
        
        // Håndter vinduesstørrelseændringer
        window.addEventListener('resize', () => {
            resizeCanvasToContainer();
            render();
        });
    }

    // Opdater getCanvasPosition for zoom-korrekt positionering
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
        if (!snapToGrid.checked) return value;
        const gridSize = state.grid.size;
        return Math.round(value / gridSize) * gridSize;
    }

    // =====================
    // SECTION 8: UI FUNCTIONS
    // =====================
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
        imageNumberInput.value = img.number;
        imageNumberValue.textContent = img.number;
    }

    // =====================
    // SECTION 9: EXPORT
    // =====================
    function exportLayout() {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const exportCtx = exportCanvas.getContext('2d');
        
        // Draw background
        if (!transparentBg.checked) {
            exportCtx.fillStyle = bgColor.value;
            exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        }
        
        // Draw all images
        state.images.forEach(img => {
            exportCtx.save();
            exportCtx.globalAlpha = img.opacity;
            exportCtx.drawImage(img.element, img.x, img.y, img.width, img.height);
            exportCtx.restore();
        });
        
        // Trigger download
        const link = document.createElement('a');
        link.download = 'design-export.png';
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    }

    // =====================
    // SECTION 10: EVENT SETUP
    // =====================
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
                const rect = canvas.getBoundingClientRect();
                state.selectedImage.x = (rect.width / 2 / state.scale) - (state.selectedImage.width / 2);
                state.selectedImage.y = (rect.height / 2 / state.scale) - (state.selectedImage.height / 2);
            }
        });
        deleteBtn.addEventListener('click', () => {
            if (state.selectedImage) {
                state.images = state.images.filter(img => img !== state.selectedImage);
                selectImage(null);
            }
        });
        
        // Canvas interaction
        canvas.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    // Initialize the app
    initialize();
});
