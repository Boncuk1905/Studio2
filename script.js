document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const previewArea = document.getElementById('previewArea');
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
    
    // State
    let images = [];
    let selectedImage = null;
    let isDragging = false;
    let isResizing = false;
    let startX, startY;
    let startLeft, startTop, startWidth, startHeight;
    let previewWidth = previewArea.offsetWidth;
    let previewHeight = previewArea.offsetHeight;
    
    // Initialize
    updateGuidesVisibility();
    
    // Event listeners
    imageUpload.addEventListener('change', handleImageUpload);
    downloadBtn.addEventListener('click', exportLayout);
    showGuides.addEventListener('change', updateGuidesVisibility);
    snapToGrid.addEventListener('change', render);
    bgColor.addEventListener('input', render);
    transparentBg.addEventListener('change', function() {
        bgColor.disabled = this.checked;
        render();
    });
    
    // Window resize
    window.addEventListener('resize', function() {
        previewWidth = previewArea.offsetWidth;
        previewHeight = previewArea.offsetHeight;
        render();
    });
    
    // Update guide lines visibility
    function updateGuidesVisibility() {
        const guides = document.querySelectorAll('.guide-line');
        guides.forEach(guide => {
            guide.style.display = showGuides.checked ? 'block' : 'none';
        });
    }
    
    // Handle image upload
    function handleImageUpload(e) {
        const files = e.target.files;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    createImageWrapper(img, file.name);
                };
                img.src = event.target.result;
            };
            
            reader.readAsDataURL(file);
        }
        
        // Reset input to allow uploading same file again
        e.target.value = '';
    }
    
    // Create image wrapper element
    function createImageWrapper(img, filename) {
        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        
        // Calculate initial position (center of preview area)
        const left = (previewWidth - img.width) / 2;
        const top = (previewHeight - img.height) / 2;
        
        // Create resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        
        // Add image to wrapper
        wrapper.appendChild(img);
        wrapper.appendChild(resizeHandle);
        
        // Set initial position and size
        wrapper.style.left = `${left}px`;
        wrapper.style.top = `${top}px`;
        wrapper.style.width = `${img.width}px`;
        wrapper.style.height = `${img.height}px`;
        
        // Add to DOM
        previewArea.appendChild(wrapper);
        
        // Store image data
        const imageData = {
            element: wrapper,
            imgElement: img,
            originalWidth: img.width,
            originalHeight: img.height,
            scale: 1,
            brightness: 1,
            isFlipped: false,
            left: left,
            top: top,
            width: img.width,
            height: img.height,
            filename: filename
        };
        
        images.push(imageData);
        
        // Add event listeners for dragging and resizing
        setupDragAndResize(wrapper, imageData);
        
        // Select this image
        selectImage(imageData);
        
        render();
    }
    
    // Setup drag and resize functionality
    function setupDragAndResize(wrapper, imageData) {
        const imgElement = imageData.imgElement;
        const resizeHandle = wrapper.querySelector('.resize-handle');
        
        // Mouse down event for both drag and resize
        wrapper.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Check if resize handle was clicked
            if (e.target === resizeHandle) {
                isResizing = true;
            } else {
                isDragging = true;
                selectImage(imageData);
            }
            
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(wrapper.style.left);
            startTop = parseInt(wrapper.style.top);
            startWidth = parseInt(wrapper.style.width);
            startHeight = parseInt(wrapper.style.height);
        });
        
        // Mouse move event for both drag and resize
        document.addEventListener('mousemove', function(e) {
            if (!isDragging && !isResizing) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            if (isDragging) {
                // Calculate new position
                let newLeft = startLeft + dx;
                let newTop = startTop + dy;
                
                // Snap to grid if enabled
                if (snapToGrid.checked) {
                    const centerX = newLeft + (imageData.width / 2);
                    const centerY = newTop + (imageData.height / 2);
                    
                    // Snap to horizontal center
                    if (Math.abs(centerX - previewWidth / 2) < 20) {
                        newLeft = (previewWidth / 2) - (imageData.width / 2);
                    }
                    
                    // Snap to vertical center
                    if (Math.abs(centerY - previewHeight / 2) < 20) {
                        newTop = (previewHeight / 2) - (imageData.height / 2);
                    }
                }
                
                // Update position
                wrapper.style.left = `${newLeft}px`;
                wrapper.style.top = `${newTop}px`;
                
                // Update data
                imageData.left = newLeft;
                imageData.top = newTop;
            } 
            else if (isResizing) {
                // Calculate new size
                const newWidth = Math.max(50, startWidth + dx);
                const newHeight = Math.max(50, startHeight + dy);
                
                // Calculate scale factors
                const scaleX = newWidth / imageData.originalWidth;
                const scaleY = newHeight / imageData.originalHeight;
                
                // Maintain aspect ratio with Shift key
                if (e.shiftKey) {
                    const scale = Math.min(scaleX, scaleY);
                    const scaledWidth = imageData.originalWidth * scale;
                    const scaledHeight = imageData.originalHeight * scale;
                    
                    wrapper.style.width = `${scaledWidth}px`;
                    wrapper.style.height = `${scaledHeight}px`;
                    
                    imageData.width = scaledWidth;
                    imageData.height = scaledHeight;
                    imageData.scale = scale;
                } else {
                    wrapper.style.width = `${newWidth}px`;
                    wrapper.style.height = `${newHeight}px`;
                    
                    imageData.width = newWidth;
                    imageData.height = newHeight;
                    imageData.scale = scaleX; // Using scaleX as primary scale
                }
                
                render();
            }
        });
        
        // Mouse up event to stop dragging/resizing
        document.addEventListener('mouseup', function() {
            isDragging = false;
            isResizing = false;
        });
        
        // Wheel event for scaling
        wrapper.addEventListener('wheel', function(e) {
            e.preventDefault();
            
            // Determine scale direction
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newScale = Math.max(0.1, Math.min(3, imageData.scale + delta));
            
            // Calculate new dimensions
            const newWidth = imageData.originalWidth * newScale;
            const newHeight = imageData.originalHeight * newScale;
            
            // Update image data
            imageData.scale = newScale;
            imageData.width = newWidth;
            imageData.height = newHeight;
            
            // Update wrapper dimensions
            wrapper.style.width = `${newWidth}px`;
            wrapper.style.height = `${newHeight}px`;
            
            // Update scale slider
            scaleSlider.value = newScale * 100;
            scaleValue.textContent = Math.round(newScale * 100);
            
            render();
        });
    }
    
    // Select an image
    function selectImage(imageData) {
        // Deselect all images
        images.forEach(img => {
            img.element.classList.remove('selected');
        });
        
        // Select the clicked image
        selectedImage = imageData;
        imageData.element.classList.add('selected');
        
        // Update properties panel
        imageProperties.style.display = 'block';
        scaleSlider.value = imageData.scale * 100;
        scaleValue.textContent = Math.round(imageData.scale * 100);
        brightnessSlider.value = imageData.brightness * 100;
        brightnessValue.textContent = Math.round(imageData.brightness * 100);
        
        // Update event listeners for property controls
        updatePropertyControls();
    }
    
    // Update event listeners for property controls
    function updatePropertyControls() {
        // Remove existing listeners
        const newScaleSlider = scaleSlider.cloneNode(true);
        scaleSlider.parentNode.replaceChild(newScaleSlider, scaleSlider);
        scaleSlider = newScaleSlider;
        
        const newBrightnessSlider = brightnessSlider.cloneNode(true);
        brightnessSlider.parentNode.replaceChild(newBrightnessSlider, brightnessSlider);
        brightnessSlider = newBrightnessSlider;
        
        const newFlipBtn = flipBtn.cloneNode(true);
        flipBtn.parentNode.replaceChild(newFlipBtn, flipBtn);
        flipBtn = newFlipBtn;
        
        const newCenterBtn = centerBtn.cloneNode(true);
        centerBtn.parentNode.replaceChild(newCenterBtn, centerBtn);
        centerBtn = newCenterBtn;
        
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
        deleteBtn = newDeleteBtn;
        
        // Scale slider
        scaleSlider.addEventListener('input', function() {
            const scale = this.value / 100;
            selectedImage.scale = scale;
            selectedImage.width = selectedImage.originalWidth * scale;
            selectedImage.height = selectedImage.originalHeight * scale;
            
            selectedImage.element.style.width = `${selectedImage.width}px`;
            selectedImage.element.style.height = `${selectedImage.height}px`;
            
            scaleValue.textContent = this.value;
            render();
        });
        
        // Brightness slider
        brightnessSlider.addEventListener('input', function() {
            selectedImage.brightness = this.value / 100;
            brightnessValue.textContent = this.value;
            render();
        });
        
        // Flip button
        flipBtn.addEventListener('click', function() {
            selectedImage.isFlipped = !selectedImage.isFlipped;
            render();
        });
        
        // Center button
        centerBtn.addEventListener('click', function() {
            const left = (previewWidth - selectedImage.width) / 2;
            const top = (previewHeight - selectedImage.height) / 2;
            
            selectedImage.left = left;
            selectedImage.top = top;
            selectedImage.element.style.left = `${left}px`;
            selectedImage.element.style.top = `${top}px`;
            
            render();
        });
        
        // Delete button
        deleteBtn.addEventListener('click', function() {
            const index = images.indexOf(selectedImage);
            if (index !== -1) {
                previewArea.removeChild(selectedImage.element);
                images.splice(index, 1);
                selectedImage = null;
                imageProperties.style.display = 'none';
                render();
            }
        });
    }
    
    // Render all images with their transformations
    function render() {
        images.forEach(imageData => {
            const wrapper = imageData.element;
            const img = imageData.imgElement;
            
            // Apply transformations
            img.style.transform = `scaleX(${imageData.isFlipped ? -1 : 1})`;
            img.style.filter = `brightness(${imageData.brightness})`;
        });
    }
    
    // Export layout as image
    function exportLayout() {
        // Determine export dimensions
        let width, height;
        const size = exportSize.value;
        
        if (size === 'auto') {
            width = previewWidth;
            height = previewHeight;
        } else {
            const [w, h] = size.split('x').map(Number);
            width = w;
            height = h;
        }
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Set background
        if (!transparentBg.checked) {
            ctx.fillStyle = bgColor.value;
            ctx.fillRect(0, 0, width, height);
        }
        
        // Calculate scale factors
        const scaleX = width / previewWidth;
        const scaleY = height / previewHeight;
        
        // Draw all images
        images.forEach(imageData => {
            const img = imageData.imgElement;
            
            // Save context state
            ctx.save();
            
            // Calculate scaled position and dimensions
            const x = imageData.left * scaleX;
            const y = imageData.top * scaleY;
            const imgWidth = imageData.width * scaleX;
            const imgHeight = imageData.height * scaleY;
            
            // Set brightness
            ctx.filter = `brightness(${imageData.brightness})`;
            
            // Flip if needed
            if (imageData.isFlipped) {
                ctx.translate(x + imgWidth, y);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0, imgWidth, imgHeight);
            } else {
                ctx.drawImage(img, x, y, imgWidth, imgHeight);
            }
            
            // Restore context state
            ctx.restore();
        });
        
        // Download the image
        canvas.toBlob(function(blob) {
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
    
    // Click on preview area to deselect all images
    previewArea.addEventListener('click', function(e) {
        if (e.target === previewArea) {
            images.forEach(img => {
                img.element.classList.remove('selected');
            });
            selectedImage = null;
            imageProperties.style.display = 'none';
        }
    });
});
