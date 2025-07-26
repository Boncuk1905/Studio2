document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const previewArea = document.getElementById('previewArea');
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
    let images = [];
    let selectedImage = null;
    let hoveredImage = null;
    let isDragging = false;
    let isResizing = false;
    let isPanning = false;
    let startX, startY;
    let startLeft, startTop, startWidth, startHeight;
    
    // Zoom and pan
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let startPanX, startPanY;

    // Initialize
    setupHighDPICanvas();
    updateGuidesVisibility();
    setupEventListeners();
    requestAnimationFrame(renderLoop);

    function setupHighDPICanvas() {
        const dpi = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpi;
        canvas.height = rect.height * dpi;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.scale(dpi, dpi);
    }

    function renderLoop() {
        render();
        requestAnimationFrame(renderLoop);
    }

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

        // Draw grid if snap is enabled
        if (snapToGrid.checked) {
            drawGrid();
        }

        // Draw all images with reflections (sorted by number in reverse)
        [...images].sort((a, b) => b.number - a.number).forEach(img => {
            ctx.save();
            ctx.translate(img.x, img.y);
            
            if (img.flipped) {
                ctx.scale(-1, 1);
                ctx.translate(-img.width, 0);
            }

            // Draw main image
            ctx.globalAlpha = img.opacity;
            ctx.drawImage(
                img.element, 
                0, 0, img.originalWidth, img.originalHeight,
                0, 0, img.width, img.height
            );

            // Draw mirror reflection (ChatGPT's fixed version)
            if (img.mirrorOpacity > 0) {
                ctx.save();
                
                // Draw reflected image
                ctx.globalAlpha = img.mirrorOpacity;
                ctx.scale(1, -1);
                ctx.drawImage(
                    img.element,
                    0, 0, img.originalWidth, img.originalHeight,
                    0, -img.height * 2 - img.mirrorDistance, img.width, img.height
                );
                
                // Add gradient mask for fade effect
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

            // Draw selection
            if (img === selectedImage) {
                ctx.globalAlpha = 1;
                ctx.strokeStyle = '#0066ff';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(0, 0, img.width, img.height);
                
                // Draw resize handle (larger)
                ctx.fillStyle = '#0066ff';
                ctx.fillRect(img.width - 15, img.height - 15, 15, 15);
            }

            ctx.restore();
        });

        ctx.restore();
    }

    function drawGrid() {
        const gridSize = 20;
        const width = canvas.width / scale;
        const height = canvas.height / scale;
        
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        
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
        
        ctx.restore();
    }

    function handleImageUpload(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    addImageToCanvas(img, file.name);
                };
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
            x: (canvas.width / 2 / scale) - (img.width / 2) - (offsetX / scale),
            y: (canvas.height / 2 / scale) - (img.height / 2) - (offsetY / scale),
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

    function startPan(e) {
        if (e.button === 1) { // Middle mouse button
            isPanning = true;
            startPanX = e.clientX - offsetX;
            startPanY = e.clientY - offsetY;
            canvas.style.cursor = 'grabbing';
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - offsetX) / scale;
        const mouseY = (e.clientY - rect.top - offsetY) / scale;

        // Check for resize handle
        if (selectedImage) {
            const img = selectedImage;
            const resizeHandleX = img.x + img.width;
            const resizeHandleY = img.y + img.height;
            
            if (Math.abs(mouseX - resizeHandleX) < 20 && Math.abs(mouseY - resizeHandleY) < 20) {
                isResizing = true;
                startX = mouseX;
                startY = mouseY;
                startWidth = img.width;
                startHeight = img.height;
                return;
            }
        }

        // Check for image selection with better hit detection
        for (let i = images.length - 1; i >= 0; i--) {
            const img = images[i];
            if (mouseX >= img.x && mouseX <= img.x + img.width &&
                mouseY >= img.y && mouseY <= img.y + img.height) {
                selectImage(img);
                isDragging = true;
                startX = mouseX;
                startY = mouseY;
                startLeft = img.x;
                startTop = img.y;
                return;
            }
        }

        selectImage(null);
    }

    function doPan(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - offsetX) / scale;
        const mouseY = (e.clientY - rect.top - offsetY) / scale;

        // Update hover state
        hoveredImage = null;
        for (let i = images.length - 1; i >= 0; i--) {
            const img = images[i];
            if (mouseX >= img.x && mouseX <= img.x + img.width &&
                mouseY >= img.y && mouseY <= img.y + img.height) {
                hoveredImage = img;
                break;
            }
        }

        if (isPanning) {
            offsetX = e.clientX - startPanX;
            offsetY = e.clientY - startPanY;
            return;
        }

        if (isDragging && selectedImage) {
            selectedImage.x = startLeft + (mouseX - startX);
            selectedImage.y = startTop + (mouseY - startY);

            if (snapToGrid.checked) {
                const gridSize = 20;
                selectedImage.x = Math.round(selectedImage.x / gridSize) * gridSize;
                selectedImage.y = Math.round(selectedImage.y / gridSize) * gridSize;
            }
        } 
        else if (isResizing && selectedImage) {
            const newWidth = Math.max(20, startWidth + (mouseX - startX));
            const newHeight = Math.max(20, startHeight + (mouseY - startY));
            
            if (e.shiftKey) {
                const aspectRatio = selectedImage.originalWidth / selectedImage.originalHeight;
                if (newWidth / newHeight > aspectRatio) {
                    selectedImage.width = newHeight * aspectRatio;
                    selectedImage.height = newHeight;
                } else {
                    selectedImage.width = newWidth;
                    selectedImage.height = newWidth / aspectRatio;
                }
            } else {
                selectedImage.width = newWidth;
                selectedImage.height = newHeight;
            }
            
            selectedImage.scale = selectedImage.width / selectedImage.originalWidth;
        }
    }

    function exportLayout() {
        // Determine export dimensions
        let width, height;
        const size = exportSize.value;
        
        if (size === 'auto') {
            width = Math.round(canvas.width / window.devicePixelRatio);
            height = Math.round(canvas.height / window.devicePixelRatio);
        } else {
            const [w, h] = size.split('x').map(Number);
            width = w;
            height = h;
        }
        
        // Create export canvas
        const exportCanvas = document.createElement('canvas');
        const dpi = 2;
        exportCanvas.width = width * dpi;
        exportCanvas.height = height * dpi;
        const exportCtx = exportCanvas.getContext('2d');
        exportCtx.scale(dpi, dpi);
        
        // Draw background
        if (!transparentBg.checked) {
            exportCtx.fillStyle = bgColor.value;
            exportCtx.fillRect(0, 0, width, height);
        }
        
        // Calculate content bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        images.forEach(img => {
            minX = Math.min(minX, img.x);
            minY = Math.min(minY, img.y);
            maxX = Math.max(maxX, img.x + img.width);
            maxY = Math.max(maxY, img.y + img.height + 
                  (img.mirrorOpacity > 0 ? img.height + img.mirrorDistance : 0));
        });
        
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const scaleX = width / (contentWidth + 40);
        const scaleY = height / (contentHeight + 40);
        const exportScale = Math.min(scaleX, scaleY);
        
        // Center point
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        // Draw all images with reflections
        images.sort((a, b) => a.number - b.number).forEach(img => {
            const x = (img.x - centerX) * exportScale + width/2;
            const y = (img.y - centerY) * exportScale + height/2;
            const imgWidth = img.width * exportScale;
            const imgHeight = img.height * exportScale;
            
            // Draw reflection
            if (img.mirrorOpacity > 0) {
                exportCtx.save();
                
                // Draw reflected image
                exportCtx.globalAlpha = img.mirrorOpacity;
                
                if (img.flipped) {
                    exportCtx.translate(x + imgWidth, y + imgHeight * 2 + img.mirrorDistance * exportScale);
                    exportCtx.scale(-1, -1);
                } else {
                    exportCtx.translate(x, y + imgHeight * 2 + img.mirrorDistance * exportScale);
                    exportCtx.scale(1, -1);
                }
                
                exportCtx.drawImage(
                    img.element,
                    0, 0, img.originalWidth, img.originalHeight,
                    0, 0, imgWidth, imgHeight
                );
                
                // Add gradient mask
                exportCtx.globalCompositeOperation = 'destination-in';
                const gradient = exportCtx.createLinearGradient(
                    x, y + imgHeight,
                    x, y + imgHeight * 2 + img.mirrorDistance * exportScale
                );
                gradient.addColorStop(0, 'rgba(0,0,0,0.7)');
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                exportCtx.fillStyle = gradient;
                exportCtx.fillRect(
                    x, y + imgHeight,
                    imgWidth, imgHeight + img.mirrorDistance * exportScale
                );
                
                exportCtx.restore();
            }
            
            // Draw main image
            exportCtx.save();
            exportCtx.globalAlpha = img.opacity;
            
            if (img.flipped) {
                exportCtx.translate(x + imgWidth, y);
                exportCtx.scale(-1, 1);
            } else {
                exportCtx.translate(x, y);
            }
            
            exportCtx.drawImage(
                img.element,
                0, 0, img.originalWidth, img.originalHeight,
                0, 0, imgWidth, imgHeight
            );
            exportCtx.restore();
        });
        
        // Download the image
        exportCanvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mirror-design-${new Date().getTime()}.png`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        }, 'image/png', 1.0);
    }

    // ... (resten af funktionerne forbliver uændret)
    function endPan() {
        isPanning = false;
        isDragging = false;
        isResizing = false;
        canvas.style.cursor = hoveredImage ? 'move' : 'grab';
    }

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
        const isVisible = showGuides.checked;
        guides.forEach(guide => {
            guide.style.display = isVisible ? 'block' : 'none';
        });
    }

    function setupEventListeners() {
        imageUpload.addEventListener('change', handleImageUpload);
        downloadBtn.addEventListener('click', exportLayout);
        flipBtn.addEventListener('click', () => {
            if (selectedImage) selectedImage.flipped = !selectedImage.flipped;
        });
        centerBtn.addEventListener('click', centerImage);
        deleteBtn.addEventListener('click', deleteImage);
        
        // ... (andre event listeners)
        
        canvas.addEventListener('mousedown', startPan);
        document.addEventListener('mousemove', doPan);
        document.addEventListener('mouseup', endPan);
        canvas.addEventListener('wheel', handleZoom);
    }

    function centerImage() {
        if (selectedImage) {
            selectedImage.x = (canvas.width / 2 / scale) - (selectedImage.width / 2) - (offsetX / scale);
            selectedImage.y = (canvas.height / 2 / scale) - (selectedImage.height / 2) - (offsetY / scale);
        }
    }

    function deleteImage() {
        if (selectedImage) {
            const index = images.indexOf(selectedImage);
            if (index !== -1) {
                images.splice(index, 1);
                selectImage(images.length > 0 ? images[0] : null);
            }
        }
    }
});
