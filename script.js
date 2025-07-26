
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
