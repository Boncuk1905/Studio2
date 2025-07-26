document.addEventListener('DOMContentLoaded', function() {
    // ===== DOM ELEMENTS =====
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

    // ===== APP STATE =====
    let images = [];
    let selectedImage = null;
    let hoveredImage = null;
    let isDragging = false;
    let isResizing = false;
    let isPanning = false;
    let startX, startY, startLeft, startTop, startWidth, startHeight;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    // ===== INITIALIZATION =====
    setupHighDPICanvas();
    setupEventListeners();
    requestAnimationFrame(renderLoop);

    function setupHighDPICanvas() {
        const dpi = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpi;
        canvas.height = rect.height * dpi;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.scale(dpi, dpi);
    }

    // ===== CORE FUNCTIONS =====
    function render() {
        // Clear canvas
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        if (!transparentBg.checked) {
            ctx.fillStyle = bgColor.value;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Apply transformations
        ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

        // Draw images (sorted by Z-index)
        [...images].sort((a, b) => b.number - a.number).forEach(img => {
            drawImageWithReflection(img);
        });

        ctx.restore();
    }

    function drawImageWithReflection(img) {
        ctx.save();
        ctx.translate(img.x, img.y);
        
        // Apply flip if needed
        if (img.flipped) {
            ctx.scale(-1, 1);
            ctx.translate(-img.width, 0);
        }

        // Main image
        ctx.globalAlpha = img.opacity;
        ctx.drawImage(img.element, 0, 0, img.originalWidth, img.originalHeight, 0, 0, img.width, img.height);

        // Reflection (ChatGPT's enhanced version)
        if (img.mirrorOpacity > 0) {
            ctx.save();
            ctx.globalAlpha = img.mirrorOpacity;
            ctx.scale(1, -1);
            ctx.drawImage(
                img.element,
                0, 0, img.originalWidth, img.originalHeight,
                0, -img.height * 2 - img.mirrorDistance, img.width, img.height
            );
            
            // Gradient fade
            const gradient = ctx.createLinearGradient(
                0, -img.height - img.mirrorDistance,
                0, -img.height * 2 - img.mirrorDistance
            );
            gradient.addColorStop(0, 'rgba(0,0,0,0.7)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalCompositeOperation = 'destination-in';
            ctx.fillStyle = gradient;
            ctx.fillRect(0, -img.height * 2 - img.mirrorDistance, img.width, img.height);
            ctx.restore();
        }

        // Selection highlight
        if (img === selectedImage) {
            ctx.strokeStyle = '#0066ff';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(0, 0, img.width, img.height);
            ctx.fillStyle = '#0066ff';
            ctx.fillRect(img.width - 15, img.height - 15, 15, 15); // Resize handle
        }

        // Hover effect
        if (img === hoveredImage && img !== selectedImage) {
            ctx.fillStyle = 'rgba(0, 102, 255, 0.2)';
            ctx.fillRect(0, 0, img.width, img.height);
        }

        // Image number
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.font = 'bold 16px Arial';
        ctx.strokeText(img.number.toString(), 10, 20);
        ctx.fillText(img.number.toString(), 10, 20);

        ctx.restore();
    }

    // ===== INTERACTION HANDLERS =====
    function handleImageUpload(e) {
        Array.from(e.target.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => addImageToCanvas(img, file.name);
                img.src = event.target.result;
            };
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
            x: (canvas.width/2/scale) - (img.width/2) - (offsetX/scale),
            y: (canvas.height/2/scale) - (img.height/2) - (offsetY/scale),
            scale: 1,
            opacity: 1,
            mirrorOpacity: 0.5,
            mirrorDistance: 20,
            flipped: false,
            filename: filename,
            number: images.length + 1
        };
        images.push(newImage);
        selectImage(newImage);
    }

    function handleMouseDown(e) {
        const pos = getCanvasPosition(e);
        
        // Check for resize handle
        if (selectedImage && isOverResizeHandle(pos, selectedImage)) {
            isResizing = true;
            startX = pos.x;
            startY = pos.y;
            startWidth = selectedImage.width;
            startHeight = selectedImage.height;
            return;
        }

        // Check image selection
        for (let i = images.length - 1; i >= 0; i--) {
            const img = images[i];
            if (isOverImage(pos, img)) {
                selectImage(img);
                isDragging = true;
                startX = pos.x;
                startY = pos.y;
                startLeft = img.x;
                startTop = img.y;
                return;
            }
        }

        selectImage(null);
    }

    function handleMouseMove(e) {
        const pos = getCanvasPosition(e);
        
        // Update hover state
        hoveredImage = null;
        for (let i = images.length - 1; i >= 0; i--) {
            if (isOverImage(pos, images[i])) {
                hoveredImage = images[i];
                canvas.style.cursor = isResizing ? 'nwse-resize' : 'move';
                break;
            }
        }
        if (!hoveredImage) canvas.style.cursor = isPanning ? 'grabbing' : 'grab';

        // Handle dragging/resizing
        if (isDragging && selectedImage) {
            selectedImage.x = startLeft + (pos.x - startX);
            selectedImage.y = startTop + (pos.y - startY);
            if (snapToGrid.checked) snapToGrid(selectedImage);
        } 
        else if (isResizing && selectedImage) {
            resizeImage(selectedImage, pos.x - startX, pos.y - startY, e.shiftKey);
        }
    }

    // ===== UTILITY FUNCTIONS =====
    function getCanvasPosition(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - offsetX) / scale,
            y: (e.clientY - rect.top - offsetY) / scale
        };
    }

    function isOverImage(pos, img) {
        return pos.x >= img.x && pos.x <= img.x + img.width &&
               pos.y >= img.y && pos.y <= img.y + img.height;
    }

    function isOverResizeHandle(pos, img) {
        return pos.x >= img.x + img.width - 20 && 
               pos.x <= img.x + img.width &&
               pos.y >= img.y + img.height - 20 && 
               pos.y <= img.y + img.height;
    }

    function snapToGrid(img) {
        const gridSize = 20;
        img.x = Math.round(img.x / gridSize) * gridSize;
        img.y = Math.round(img.y / gridSize) * gridSize;
    }

    function resizeImage(img, deltaX, deltaY, maintainAspect) {
        img.width = Math.max(20, startWidth + deltaX);
        img.height = Math.max(20, startHeight + deltaY);
        
        if (maintainAspect) {
            const aspect = img.originalWidth / img.originalHeight;
            if (img.width / img.height > aspect) {
                img.width = img.height * aspect;
            } else {
                img.height = img.width / aspect;
            }
        }
        img.scale = img.width / img.originalWidth;
    }

    // ===== UI FUNCTIONS =====
    function selectImage(image) {
        selectedImage = image;
        if (image) {
            imageProperties.style.display = 'block';
            scaleSlider.value = image.scale * 100;
            scaleValue.textContent = Math.round(image.scale * 100);
            mirrorOpacitySlider.value = image.mirrorOpacity * 100;
            mirrorOpacityValue.textContent = Math.round(image.mirrorOpacity * 100);
            mirrorDistanceSlider.value = image.mirrorDistance;
            mirrorDistanceValue.textContent = image.mirrorDistance;
            imageNumberInput.value = image.number;
            imageNumberValue.textContent = image.number;
        } else {
            imageProperties.style.display = 'none';
        }
    }

    function updateGuidesVisibility() {
        const guides = document.querySelectorAll('.guide-line, .guide-center');
        guides.forEach(g => g.style.display = showGuides.checked ? 'block' : 'none');
    }

    // ===== SETUP =====
    function setupEventListeners() {
        // File handling
        imageUpload.addEventListener('change', handleImageUpload);
        
        // Buttons
        downloadBtn.addEventListener('click', exportLayout);
        flipBtn.addEventListener('click', () => {
            if (selectedImage) selectedImage.flipped = !selectedImage.flipped;
        });
        centerBtn.addEventListener('click', centerImage);
        deleteBtn.addEventListener('click', deleteImage);
        
        // Controls
        showGuides.addEventListener('change', updateGuidesVisibility);
        snapToGrid.addEventListener('change', render);
        bgColor.addEventListener('input', render);
        transparentBg.addEventListener('change', () => {
            bgColor.disabled = transparentBg.checked;
            render();
        });
        
        // Canvas interaction
        canvas.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', () => {
            isDragging = false;
            isResizing = false;
        });
        canvas.addEventListener('wheel', handleZoom);
    }

    function renderLoop() {
        render();
        requestAnimationFrame(renderLoop);
    }
});
