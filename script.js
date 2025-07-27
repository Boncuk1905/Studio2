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
        // Sorter billeder efter deres nummer (så den højeste vises øverst)
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
        
        if (img.flipped) {
            ctx.translate(img.x + img.width, img.y);
            ctx.scale(-1, 1);
            ctx.drawImage(img.element, 0, 0, img.width, img.height);
        } else {
            ctx.drawImage(img.element, img.x, img.y, img.width, img.height);
        }
        
        // Tegn spejleffekt hvis aktiveret
        if (showMirror.checked && img.mirrorOpacity > 0) {
            drawMirrorEffect(img);
        }
        
        ctx.restore();
    }

    function drawMirrorEffect(img) {
        ctx.save();
        ctx.setTransform(state.scale, 0, 0, state.scale, state.offsetX, state.offsetY);
        
        // Opret klipområde
        ctx.beginPath();
        ctx.rect(img.x, img.y + img.height, img.width, img.mirrorDistance);
        ctx.clip();
        
        // Tegn spejlbillede
        ctx.save();
        ctx.globalAlpha = img.mirrorOpacity;
        ctx.translate(0, img.y + img.height * 2 + img.mirrorDistance);
        ctx.scale(1, -1);
        ctx.drawImage(img.element, img.x, img.y, img.width, img.height);
        ctx.restore();
        
        // Tilføj gradient fade
        const gradient = ctx.createLinearGradient(
            img.x, img.y + img.height,
            img.x, img.y + img.height + img.mirrorDistance
        );
        gradient.addColorStop(0, `rgba(255,255,255,${img.mirrorOpacity})`);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = gradient;
        ctx.fillRect(img.x, img.y + img.height, img.width, img.mirrorDistance);
        
        ctx.restore();
    }

    function drawImageSelection(img) {
        ctx.save();
        ctx.setTransform(state.scale, 0, 0, state.scale, state.offsetX, state.offsetY);
        
        // Markering
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(img.x - 2, img.y - 2, img.width + 4, img.height + 4);
        
        // Ændrings-håndtag
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

        Array.from(files).forEach((file, index) => {
            if (!file.type.match('image.*')) {
                console.log('Ignorerer ikke-billede:', file.name);
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    addImageToCanvas(img, file.name, state.images.length + 1);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function addImageToCanvas(img, filename, number) {
        const newImage = {
            element: img,
            originalWidth: img.width,
            originalHeight: img.height,
            width: img.width,
            height: img.height,
            x: (canvas.width / 2 - img.width / 2 - state.offsetX) / state.scale,
            y: (canvas.height / 2 - img.height / 2 - state.offsetY) / state.scale,
            scale: 1,
            opacity: 1,
            mirrorOpacity: mirrorOpacitySlider.value / 100,
            mirrorDistance: parseInt(mirrorDistanceSlider.value),
            flipped: false,
            filename: filename,
            number: number
        };

        state.images.push(newImage);
        selectImage(newImage);
    }

    // ... (resten af dine funktioner for mouse events, zoom etc.) ...

    function exportLayout() {
        const exportCanvas = document.createElement('canvas');
        let size, scale;
        
        if (exportSize.value === 'auto') {
            // Beregn den nødvendige størrelse for at passe alt indhold
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            
            state.images.forEach(img => {
                minX = Math.min(minX, img.x);
                maxX = Math.max(maxX, img.x + img.width);
                minY = Math.min(minY, img.y);
                maxY = Math.max(maxY, img.y + img.height + (showMirror.checked ? img.mirrorDistance : 0));
            });
            
            const contentWidth = maxX - minX;
            const contentHeight = maxY - minY;
            const padding = 20; // Tilføj lidt padding
            
            size = Math.max(contentWidth, contentHeight) + padding * 2;
            scale = 1;
        } else {
            size = parseInt(exportSize.value.split('x')[0]);
            scale = size / Math.max(canvas.width, canvas.height);
        }
        
        exportCanvas.width = size;
        exportCanvas.height = size;
        const exportCtx = exportCanvas.getContext('2d');
        
        // Baggrund
        if (!transparentBg.checked) {
            exportCtx.fillStyle = bgColor.value;
            exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        }
        
        // Find centerpunkt for alle billeder
        let centerX = 0, centerY = 0;
        if (state.images.length > 0) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            
            state.images.forEach(img => {
                minX = Math.min(minX, img.x);
                maxX = Math.max(maxX, img.x + img.width);
                minY = Math.min(minY, img.y);
                maxY = Math.max(maxY, img.y + img.height + (showMirror.checked ? img.mirrorDistance : 0));
            });
            
            centerX = (minX + maxX) / 2;
            centerY = (minY + maxY) / 2;
        }
        
        // Tegn alle billeder centreret
        state.images.forEach(img => {
            exportCtx.save();
            exportCtx.globalAlpha = img.opacity;
            
            // Beregn position centreret på canvas
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
            
            // Tegn spejleffekt hvis aktiveret
            if (showMirror.checked && img.mirrorOpacity > 0) {
                exportCtx.save();
                exportCtx.globalAlpha = img.mirrorOpacity;
                
                // Spejlbillede
                exportCtx.translate(0, height + img.mirrorDistance * scale);
                exportCtx.scale(1, -1);
                exportCtx.drawImage(img.element, x, y, width, height);
                
                // Gradient fade
                const gradient = exportCtx.createLinearGradient(
                    x, y + height,
                    x, y + height + img.mirrorDistance * scale
                );
                gradient.addColorStop(0, `rgba(255,255,255,${img.mirrorOpacity})`);
                gradient.addColorStop(1, 'rgba(255,255,255,0)');
                
                exportCtx.globalCompositeOperation = 'destination-out';
                exportCtx.fillStyle = gradient;
                exportCtx.fillRect(x, y + height, width, img.mirrorDistance * scale);
                
                exportCtx.restore();
            }
            
            exportCtx.restore();
        });
        
        // Download
        const link = document.createElement('a');
        link.download = `design-${new Date().getTime()}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    }

    // Initialisering
    initialize();
});
