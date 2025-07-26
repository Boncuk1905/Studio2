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
    let startX, startY;
    let startLeft, startTop, startWidth, startHeight;
    
    // Zoom and pan
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isPanning = false;
    let startPanX, startPanY;

    // Initialize
    function init() {
        resizeCanvas();
        updateGuidesVisibility();
        setupEventListeners();
    }

    function resizeCanvas() {
        canvas.width = previewArea.clientWidth;
        canvas.height = previewArea.clientHeight;
        render();
    }

    function setupEventListeners() {
        window.addEventListener('resize', resizeCanvas);
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
        canvas.addEventListener('mousedown', handleCanvasMouseDown);
        canvas.addEventListener('mousemove', handleCanvasMouseMove);
        canvas.addEventListener('mouseup', handleCanvasMouseUp);
        canvas.addEventListener('mouseleave', handleCanvasMouseUp);
        canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    function handleZoom(e) {
        e.preventDefault();
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomIntensity = 0.1;
        const wheelDelta = e.deltaY < 0 ? 1 : -1;
        const newScale = Math.max(0.1, Math.min(5, scale + wheelDelta * zoomIntensity));

        // Calculate new offset to zoom toward mouse position
        offsetX -= (mouseX - offsetX) * (newScale / scale - 1);
        offsetY -= (mouseY - offsetY) * (newScale / scale - 1);

        scale = newScale;
        render();
    }

    function handleCanvasMouseDown(e) {
        if (e.button === 1) { // Middle mouse button
            isPanning = true;
            startPanX = e.clientX - offsetX;
            startPanY = e.clientY - offsetY;
            canvas.classList.add('panning');
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - offsetX) / scale;
        const mouseY = (e.clientY - rect.top - offsetY) / scale;

        // Check if clicked on a resize handle
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

        // Check if clicked on an image
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

    function handleCanvasMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - offsetX) / scale;
        const mouseY = (e.clientY - rect.top - offsetY) / scale;

        if (isPanning) {
            offsetX = e.clientX - startPanX;
            offsetY = e.clientY - startPanY;
            render();
            return;
        }

        if (!selectedImage) return;

        if (isDragging) {
            const dx = mouseX - startX;
            const dy = mouseY - startY;

            selectedImage.x = startLeft + dx;
            selectedImage.y = startTop + dy;

            // Snap to center if enabled
            if (snapToGrid.checked) {
                const centerX = selectedImage.x + selectedImage.width / 2;
                const centerY = selectedImage.y + selectedImage.height / 2;

                if (Math.abs(centerX - canvas.width / 2 / scale) < 20) {
                    selectedImage.x = (canvas.width / 2 / scale) - (selectedImage.width / 2);
                }

                if (Math.abs(centerY - canvas.height / 2 / scale) < 20) {
                    selectedImage.y = (canvas.height / 2 / scale) - (selectedImage.height / 2);
                }
            }

            render();
        } else if (isResizing) {
            const dx = mouseX - startX;
            const dy = mouseY - startY;

            selectedImage.width = Math.max(20, startWidth + dx);
            selectedImage.height = Math.max(20, startHeight + dy);

            // Maintain aspect ratio with Shift key
            if (e.shiftKey) {
                const aspectRatio = startWidth / startHeight;
                selectedImage.height = selectedImage.width / aspectRatio;
            }

            render();
        }
    }

    function handleCanvasMouseUp() {
        isPanning = false;
        isDragging = false;
        isResizing = false;
        canvas.classList.remove('panning');
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
        render();
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
        
        render();
    }

    function updateGuidesVisibility() {
        const guides = document.querySelectorAll('.guide-line');
        guides.forEach(guide => {
            guide.style.display = showGuides.checked ? 'block' : 'none';
        });
    }

    function render() {
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        if (!transparentBg.checked) {
            ctx.fillStyle = bgColor.value;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Apply zoom and pan
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        // Draw checkerboard pattern for transparency
        if (transparentBg.checked) {
            const patternSize = 20 * (1/scale);
            ctx.fillStyle = '#eee';
            for (let y = 0; y < canvas.height / scale; y += patternSize * 2) {
                for (let x = 0; x < canvas.width / scale; x += patternSize * 2) {
                    if ((x + y) % (patternSize * 4) === 0) {
                        ctx.fillRect(x, y, patternSize, patternSize);
                        ctx.fillRect(x + patternSize, y + patternSize, patternSize, patternSize);
                    }
                }
            }
        }

        // Draw all images
        images.forEach(img => {
            ctx.save();
            ctx.translate(img.x, img.y);
            
            if (img.flipped) {
                ctx.scale(-1, 1);
                ctx.translate(-img.width, 0);
            }

            ctx.globalAlpha = img.opacity;
            ctx.filter = `brightness(${img.brightness})`;
            
            ctx.drawImage(
                img.element, 
                0, 0, 
                img.originalWidth, 
                img.originalHeight,
                0, 0,
                img.width, 
                img.height
            );

            // Draw selection outline
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

    // Initialize property controls
    scaleSlider.addEventListener('input', function() {
        if (selectedImage) {
            selectedImage.scale = this.value / 100;
            selectedImage.width = selectedImage.originalWidth * selectedImage.scale;
            selectedImage.height = selectedImage.originalHeight * selectedImage.scale;
            scaleValue.textContent = this.value;
            render();
        }
    });

    brightnessSlider.addEventListener('input', function() {
        if (selectedImage) {
            selectedImage.brightness = this.value / 100;
            brightnessValue.textContent = this.value;
            render();
        }
    });

    flipBtn.addEventListener('click', function() {
        if (selectedImage) {
            selectedImage.flipped = !selectedImage.flipped;
            render();
        }
    });

    centerBtn.addEventListener('click', function() {
        if (selectedImage) {
            selectedImage.x = (canvas.width / 2 / scale) - (selectedImage.width / 2) - (offsetX / scale);
            selectedImage.y = (canvas.height / 2 / scale) - (selectedImage.height / 2) - (offsetY / scale);
            render();
        }
    });

    deleteBtn.addEventListener('click', function() {
        if (selectedImage) {
            const index = images.indexOf(selectedImage);
            if (index !== -1) {
                images.splice(index, 1);
                selectImage(null);
                render();
            }
        }
    });

    // Start the app
    init();
});
