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

        // Sort images by their number
        const sortedImages = [...images].sort((a, b) => a.number - b.number);

        // Draw all images with reflections
        sortedImages.forEach(img => {
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

            // Draw mirror reflection
            if (img.mirrorOpacity > 0) {
                ctx.save();
                ctx.globalAlpha = img.mirrorOpacity;
                ctx.scale(1, -1);
                ctx.drawImage(
                    img.element,
                    0, 0, img.originalWidth, img.originalHeight,
                    0, -img.height * 2 - img.mirrorDistance, img.width, img.height
                );
                ctx.restore();
            }

            // Draw image number
            ctx.fillStyle = '#000';
            ctx.font = 'bold 16px Arial';
            ctx.fillText(img.number.toString(), 10, 20);

            // Draw selection
            if (img === selectedImage) {
                ctx.globalAlpha = 1;
                ctx.strokeStyle = '#0066ff';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(0, 0, img.width, img.height);
                
                // Draw resize handle
                ctx.fillStyle = '#0066ff';
                ctx.fillRect(img.width - 10, img.height - 10, 10, 10);
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
        
        // Vertical lines
        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    function handleZoom(e) {
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomIntensity = 0.1;
        const wheelDelta = e.deltaY < 0 ? 1 : -1;
        const newScale = Math.max(0.1, Math.min(5, scale + wheelDelta * zoomIntensity));

        // Calculate new offset for smooth zoom-to-pointer
        offsetX -= (mouseX - offsetX) * (newScale / scale - 1);
        offsetY -= (mouseY - offsetY) * (newScale / scale - 1);

        scale = newScale;
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
            
            if (Math.abs(mouseX - resizeHandleX) < 10 && Math.abs(mouseY - resizeHandleY) < 10) {
                isResizing = true;
                startX = mouseX;
                startY = mouseY;
                startWidth = img.width;
                startHeight = img.height;
                return;
            }
        }

        // Check for image selection
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

        // Clicked on empty space
        selectImage(null);
    }

    function doPan(e) {
        if (isPanning) {
            offsetX = e.clientX - startPanX;
            offsetY = e.clientY - startPanY;
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - offsetX) / scale;
        const mouseY = (e.clientY - rect.top - offsetY) / scale;

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
                // Maintain aspect ratio
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

    function endPan() {
        isPanning = false;
        isDragging = false;
        isResizing = false;
        canvas.style.cursor = 'grab';
    }

    function handleImageUpload(e) {
        const files = e.target.files;
        
        if (!files || files.length === 0) return;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    addImageToCanvas(img, file.name);
                };
                img.onerror = function() {
                    console.error("Failed to load image:", file.name);
                };
                img.src = event.target.result;
            };
            
            reader.onerror = function() {
                console.error("Failed to read file:", file.name);
            };
            
            reader.readAsDataURL(file);
        }
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
            mirrorOpacity: 0.3,
            mirrorDistance: 20,
            flipped: false,
            filename: filename,
            number: images.length + 1
        };

        images.push(newImage);
        selectImage(newImage);
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
        // File upload
        imageUpload.addEventListener('change', handleImageUpload);
        
        // Buttons
        downloadBtn.addEventListener('click', exportLayout);
        flipBtn.addEventListener('click', function() {
            if (selectedImage) {
                selectedImage.flipped = !selectedImage.flipped;
            }
        });
        centerBtn.addEventListener('click', function() {
            if (selectedImage) {
                selectedImage.x = (canvas.width / 2 / scale) - (selectedImage.width / 2) - (offsetX / scale);
                selectedImage.y = (canvas.height / 2 / scale) - (selectedImage.height / 2) - (offsetY / scale);
            }
        });
        centerExportBtn.addEventListener('click', function() {
            if (selectedImage) {
                selectedImage.number = 1; // Sæt som primært billede
                updateImageNumbers();
            }
        });
        deleteBtn.addEventListener('click', function() {
            if (selectedImage) {
                const index = images.indexOf(selectedImage);
                if (index !== -1) {
                    images.splice(index, 1);
                    updateImageNumbers();
                    selectImage(images.length > 0 ? images[0] : null);
                }
            }
        });

        // Controls
        showGuides.addEventListener('change', updateGuidesVisibility);
        snapToGrid.addEventListener('change', render);
        bgColor.addEventListener('input', render);
        transparentBg.addEventListener('change', function() {
            bgColor.disabled = this.checked;
            render();
        });
        scaleSlider.addEventListener('input', function() {
            if (selectedImage) {
                const scaleValue = this.value / 100;
                selectedImage.width = selectedImage.originalWidth * scaleValue;
                selectedImage.height = selectedImage.originalHeight * scaleValue;
                selectedImage.scale = scaleValue;
                scaleValue.textContent = this.value;
            }
        });
        mirrorOpacitySlider.addEventListener('input', function() {
            if (selectedImage) {
                selectedImage.mirrorOpacity = this.value / 100;
                mirrorOpacityValue.textContent = this.value;
            }
        });
        mirrorDistanceSlider.addEventListener('input', function() {
            if (selectedImage) {
                selectedImage.mirrorDistance = parseInt(this.value);
                mirrorDistanceValue.textContent = this.value;
            }
        });
        imageNumberInput.addEventListener('change', function() {
            if (selectedImage) {
                selectedImage.number = parseInt(this.value);
                updateImageNumbers();
            }
        });

        // Canvas interaction
        canvas.addEventListener('wheel', handleZoom);
        canvas.addEventListener('mousedown', startPan);
        document.addEventListener('mousemove', doPan);
        document.addEventListener('mouseup', endPan);
        document.addEventListener('mouseleave', endPan);
        canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    function updateImageNumbers() {
        // Sorter billeder efter deres nummer
        images.sort((a, b) => a.number - b.number);
        
        // Opdater numre for at undgå dubletter
        images.forEach((img, index) => {
            img.number = index + 1;
        });
        
        // Opdater UI hvis det valgte billede stadig findes
        if (selectedImage && !images.includes(selectedImage)) {
            selectImage(images.length > 0 ? images[0] : null);
        }
    }

    function exportLayout() {
        // Determine export dimensions
        let width, height;
        const size = exportSize.value;
        
        if (size === 'auto') {
            width = canvas.width;
            height = canvas.height;
        } else {
            const [w, h] = size.split('x').map(Number);
            width = w;
            height = h;
        }
        
        // Create temporary canvas
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = width;
        exportCanvas.height = height;
        const exportCtx = exportCanvas.getContext('2d');
        
        // Draw background
        if (!transparentBg.checked) {
            exportCtx.fillStyle = bgColor.value;
            exportCtx.fillRect(0, 0, width, height);
        }
        
        // Calculate scale factors
        const contentWidth = canvas.width / scale;
        const contentHeight = canvas.height / scale;
        const exportScale = Math.min(
            width / contentWidth,
            height / contentHeight
        );
        
        // Find the primary image (number 1)
        const primaryImage = images.find(img => img.number === 1);
        let centerX = 0, centerY = 0;
        
        if (primaryImage) {
            centerX = (primaryImage.x + primaryImage.width/2) * exportScale - width/2;
            centerY = (primaryImage.y + primaryImage.height/2) * exportScale - height/2;
        }
        
        // Draw all images with reflections
        images.sort((a, b) => a.number - b.number).forEach(img => {
            // Calculate position relative to export canvas
            let x = (img.x + offsetX/scale) * exportScale - centerX;
            let y = (img.y + offsetY/scale) * exportScale - centerY;
            const imgWidth = img.width * exportScale;
            const imgHeight = img.height * exportScale;
            
            // Draw reflection FIRST (under main image)
            if (img.mirrorOpacity > 0) {
                exportCtx.save();
                exportCtx.globalAlpha = img.mirrorOpacity;
                
                if (img.flipped) {
                    exportCtx.translate(x + imgWidth, y + imgHeight + img.mirrorDistance * exportScale);
                    exportCtx.scale(-1, -1);
                } else {
                    exportCtx.translate(x, y + imgHeight + img.mirrorDistance * exportScale);
                    exportCtx.scale(1, -1);
                }
                
                exportCtx.drawImage(
                    img.element,
                    0, 0, img.originalWidth, img.originalHeight,
                    0, 0, imgWidth, imgHeight
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
            a.download = `design-${new Date().getTime()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    }
});
