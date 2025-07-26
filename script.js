document.addEventListener('DOMContentLoaded', function() {
    // DOM elements - TILFØJ KUN DE ELEMENTER DER FINDES I DIN HTML
    const canvas = document.getElementById('previewCanvas');
    const ctx = canvas.getContext('2d');
    const imageUpload = document.getElementById('imageUpload');
    const downloadBtn = document.getElementById('downloadBtn');
    const bgColor = document.getElementById('bgColor');
    const transparentBg = document.getElementById('transparentBg');
    const exportSize = document.getElementById('exportSize');
    const snapToGrid = document.getElementById('snapToGrid');
    const showGuides = document.getElementById('showGuides');
    const imageProperties = document.getElementById('imageProperties');
    const scaleSlider = document.getElementById('scaleSlider');
    const scaleValue = document.getElementById('scaleValue');
    const mirrorOpacitySlider = document.getElementById('mirrorOpacitySlider');
    const mirrorOpacityValue = document.getElementById('mirrorOpacityValue');
    const mirrorDistanceSlider = document.getElementById('mirrorDistanceSlider');
    const mirrorDistanceValue = document.getElementById('mirrorDistanceValue');
    const imageNumberInput = document.getElementById('imageNumberInput');
    const imageNumberValue = document.getElementById('imageNumberValue');
    const flipBtn = document.getElementById('flipBtn');
    const centerBtn = document.getElementById('centerBtn');
    const centerExportBtn = document.getElementById('centerExportBtn');
    const deleteBtn = document.getElementById('deleteBtn');

    // App state
    const state = {
        images: [],
        selectedImage: null,
        hoveredImage: null,
        isDragging: false,
        isResizing: false,
        isPanning: false,
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
        grid: {
            size: 20,
            enabled: true,
            color: 'rgba(0, 0, 0, 0.1)',
            visible: true,
            snapThreshold: 5
        }
    };

    // Initialize the app
    function initialize() {
        if (!canvas) {
            console.error('Canvas element ikke fundet');
            return;
        }
        
        resizeCanvasToContainer();
        setupEventListeners();
        render();
    }

    function resizeCanvasToContainer() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    function render() {
        clearCanvas();
        drawBackground();
        
        if (state.grid.visible && snapToGrid.checked) {
            drawGrid();
        }

        drawAllImages();
        requestAnimationFrame(render);
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
        state.images.forEach(img => {
            drawSingleImage(img);
            
            if (img === state.selectedImage) {
                drawImageSelection(img);
            }
        });
    }

    function drawSingleImage(img) {
        ctx.save();
        ctx.globalAlpha = img.opacity;
        
        if (img.flipped) {
            ctx.translate(img.x + img.width, img.y);
            ctx.scale(-1, 1);
            ctx.drawImage(img.element, 0, 0, img.width, img.height);
        } else {
            ctx.drawImage(img.element, img.x, img.y, img.width, img.height);
        }
        
        ctx.restore();
    }

    function drawImageSelection(img) {
        ctx.save();
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

        Array.from(files).forEach((file) => {
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
            x: (canvas.width - img.width) / 2,
            y: (canvas.height - img.height) / 2,
            scale: 1,
            opacity: 1,
            mirrorOpacity: 0.3,
            mirrorDistance: 20,
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
            
            state.selectedImage.x = state.startLeft + dx;
            state.selectedImage.y = state.startTop + dy;
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

    function setupEventListeners() {
        // File handling
        if (imageUpload) {
            imageUpload.addEventListener('change', handleImageUpload);
        } else {
            console.error('imageUpload element ikke fundet');
        }
        
        // Buttons - TILFØJ KUN FOR DE KNAPPER DER FINDES
        if (downloadBtn) downloadBtn.addEventListener('click', exportLayout);
        if (flipBtn) flipBtn.addEventListener('click', flipImage);
        if (centerBtn) centerBtn.addEventListener('click', centerImage);
        if (deleteBtn) deleteBtn.addEventListener('click', deleteImage);
        
        // Canvas interaction
        if (canvas) {
            canvas.addEventListener('mousedown', handleMouseDown);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        
        // Window resize
        window.addEventListener('resize', resizeCanvasToContainer);
    }

    function flipImage() {
        if (state.selectedImage) {
            state.selectedImage.flipped = !state.selectedImage.flipped;
        }
    }

    function centerImage() {
        if (state.selectedImage) {
            state.selectedImage.x = (canvas.width - state.selectedImage.width) / 2;
            state.selectedImage.y = (canvas.height - state.selectedImage.height) / 2;
        }
    }

    function deleteImage() {
        if (state.selectedImage) {
            state.images = state.images.filter(img => img !== state.selectedImage);
            selectImage(null);
        }
    }

    function exportLayout() {
        const exportCanvas = document.createElement('canvas');
        const size = exportSize.value === 'auto' ? 
            Math.max(canvas.width, canvas.height) : 
            parseInt(exportSize.value.split('x')[0]);
        
        exportCanvas.width = size;
        exportCanvas.height = size;
        const exportCtx = exportCanvas.getContext('2d');
        
        if (!transparentBg.checked) {
            exportCtx.fillStyle = bgColor.value;
            exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        }
        
        state.images.forEach(img => {
            exportCtx.save();
            exportCtx.globalAlpha = img.opacity;
            
            const scale = size / Math.max(canvas.width, canvas.height);
            const x = (img.x * scale) + (size/2 - (canvas.width/2 * scale));
            const y = (img.y * scale) + (size/2 - (canvas.height/2 * scale));
            const width = img.width * scale;
            const height = img.height * scale;
            
            if (img.flipped) {
                exportCtx.translate(x + width, y);
                exportCtx.scale(-1, 1);
                exportCtx.drawImage(img.element, 0, 0, width, height);
            } else {
                exportCtx.drawImage(img.element, x, y, width, height);
            }
            
            exportCtx.restore();
        });
        
        const link = document.createElement('a');
        link.download = `design-${new Date().getTime()}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    }

    initialize();
});
