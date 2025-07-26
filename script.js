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
    const brightnessSlider = document.getElementById('brightnessSlider');
    const brightnessValue = document.getElementById('brightnessValue');
    const flipBtn = document.getElementById('flipBtn');
    const centerBtn = document.getElementById('centerBtn');
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

        // Draw all images
        images.forEach(img => {
            ctx.save();
            ctx.translate(img.x, img.y);
            
            // Fixed flip implementation
            if (img.flipped) {
                ctx.scale(-1, 1);
                ctx.translate(-img.width, 0);
            }

            ctx.globalAlpha = img.opacity;
            ctx.filter = `brightness(${img.brightness})`;
            
            ctx.drawImage(
                img.element, 
                0, 0, img.originalWidth, img.originalHeight,
                0, 0, img.width, img.height
            );

            // Draw selection
            if (img === selectedImage) {
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
                const centerX = selectedImage.x + selectedImage.width / 2;
                const centerY = selectedImage.y + selectedImage.height / 2;
                const canvasCenterX = canvas.width / scale / 2;
                const canvasCenterY = canvas.height / scale / 2;

                if (Math.abs(centerX - canvasCenterX) < 20) {
                    selectedImage.x = canvasCenterX - selectedImage.width / 2;
                }
                if (Math.abs(centerY - canvasCenterY) < 20) {
                    selectedImage.y = canvasCenterY - selectedImage.height / 2;
                }
            }
        } 
        else if (isResizing && selectedImage) {
            selectedImage.width = Math.max(20, startWidth + (mouseX - startX));
            selectedImage.height = Math.max(20, startHeight + (mouseY - startY));

            if (e.shiftKey) {
                const aspectRatio = startWidth / startHeight;
                selectedImage.height = selectedImage.width / aspectRatio;
            }
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
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    addImageToCanvas(img, file.name);
                };
                img.src = event.target.result;
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
            brightness: 1,
            opacity: 1,
            flipped: false,
            filename: filename
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
            brightnessSlider.value = image.brightness * 100;
            brightnessValue.textContent = Math.round(image.brightness * 100);
        } else {
            imageProperties.style.display = 'none';
        }
    }

    function updateGuidesVisibility() {
        const guides = document.querySelectorAll('.guide-line');
        guides.forEach(guide => {
            guide.style.display = showGuides.checked ? 'block' : 'none';
        });
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
        
        // Draw all images
        images.forEach(img => {
            exportCtx.save();
            
            // Calculate position relative to export canvas
            const x = (img.x + offsetX/scale) * exportScale;
            const y = (img.y + offsetY/scale) * exportScale;
            const imgWidth = img.width * exportScale;
            const imgHeight = img.height * exportScale;
            
            if (img.flipped) {
                exportCtx.translate(x + imgWidth, y);
                exportCtx.scale(-1, 1);
                exportCtx.drawImage(img.element, 0, 0, imgWidth, imgHeight);
            } else {
                exportCtx.drawImage(img.element, x, y, imgWidth, imgHeight);
            }
            
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

    function setupEventListeners() {
        imageUpload.addEventListener('change', handleImageUpload);
        downloadBtn.addEventListener('click', exportLayout);
        showGuides.addEventListener('change', updateGuidesVisibility);
        snapToGrid.addEventListener('change', render);
        bgColor.addEventListener('input', render);
        transparentBg.addEventListener('change', function() {
            bgColor.disabled = this.checked;
            render();
        });

        // Canvas interaction
        canvas.addEventListener('wheel', handleZoom);
        canvas.addEventListener('mousedown', startPan);
        document.addEventListener('mousemove', doPan);
        document.addEventListener('mouseup', endPan);
        document.addEventListener('mouseleave', endPan);
        canvas.addEventListener('contextmenu', e => e.preventDefault());

        // Property controls
        scaleSlider.addEventListener('input', function() {
            if (selectedImage) {
                selectedImage.scale = this.value / 100;
                selectedImage.width = selectedImage.originalWidth * selectedImage.scale;
                selectedImage.height = selectedImage.originalHeight * selectedImage.scale;
                scaleValue.textContent = this.value;
            }
        });

        brightnessSlider.addEventListener('input', function() {
            if (selectedImage) {
                selectedImage.brightness = this.value / 100;
                brightnessValue.textContent = this.value;
            }
        });

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

        deleteBtn.addEventListener('click', function() {
            if (selectedImage) {
                const index = images.indexOf(selectedImage);
                if (index !== -1) {
                    images.splice(index, 1);
                    selectImage(null);
                }
            }
        });
    }
});
