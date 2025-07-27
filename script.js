document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.getElementById('previewCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const els = {
        upload: document.getElementById('imageUpload'),
        download: document.getElementById('downloadBtn'),
        bgColor: document.getElementById('bgColor'),
        transparentBg: document.getElementById('transparentBg'),
        exportSize: document.getElementById('exportSize'),
        snapToGrid: document.getElementById('snapToGrid'),
        showGuides: document.getElementById('showGuides'),
        showMirror: document.getElementById('showMirror'),
        propsPanel: document.getElementById('imageProperties'),
        scaleSlider: document.getElementById('scaleSlider'),
        scaleValue: document.getElementById('scaleValue'),
        mirrorOpacitySlider: document.getElementById('mirrorOpacitySlider'),
        mirrorOpacityValue: document.getElementById('mirrorOpacityValue'),
        mirrorDistanceSlider: document.getElementById('mirrorDistanceSlider'),
        mirrorDistanceValue: document.getElementById('mirrorDistanceValue'),
        flipBtn: document.getElementById('flipBtn'),
        centerBtn: document.getElementById('centerBtn'),
        deleteBtn: document.getElementById('deleteBtn'),
        zoomInBtn: document.getElementById('zoomInBtn'),
        zoomOutBtn: document.getElementById('zoomOutBtn'),
        resetZoomBtn: document.getElementById('resetZoomBtn')
    };

    // App State
    const state = {
        images: [],
        selected: null,
        drag: false,
        resize: false,
        pan: false,
        start: { x: 0, y: 0, left: 0, top: 0, width: 0, height: 0 },
        scale: 1,
        offset: { x: 0, y: 0 },
        startPan: { x: 0, y: 0 },
        grid: { size: 20, color: 'rgba(0,0,0,0.1)' }
    };

    // Core Functions
    function init() {
        resizeCanvas();
        setupEvents();
        requestAnimationFrame(render);
    }

    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Background
        if (!els.transparentBg.checked) {
            ctx.fillStyle = els.bgColor.value;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Grid
        if (els.showGuides.checked) {
            ctx.strokeStyle = state.grid.color;
            ctx.lineWidth = 1;
            for (let x = 0; x <= canvas.width; x += state.grid.size) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y <= canvas.height; y += state.grid.size) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
        }

        // Images
        state.images.forEach(img => {
            drawImage(img);
            if (img === state.selected) drawSelection(img);
        });

        requestAnimationFrame(render);
    }

    function drawImage(img) {
        ctx.save();
        ctx.setTransform(state.scale, 0, 0, state.scale, state.offset.x, state.offset.y);
        ctx.globalAlpha = img.opacity;
        
        if (img.flipped) {
            ctx.translate(img.x + img.width, img.y);
            ctx.scale(-1, 1);
            ctx.drawImage(img.element, 0, 0, img.width, img.height);
        } else {
            ctx.drawImage(img.element, img.x, img.y, img.width, img.height);
        }

        // Mirror Effect
        if (els.showMirror.checked && img.mirrorOpacity > 0 && img.mirrorDistance > 0) {
            const mirrorY = img.y + img.height;
            ctx.beginPath();
            ctx.rect(img.x, mirrorY, img.width, img.mirrorDistance);
            ctx.clip();
            
            ctx.save();
            ctx.globalAlpha = img.mirrorOpacity;
            ctx.translate(0, mirrorY * 2);
            ctx.scale(1, -1);
            ctx.drawImage(img.element, img.x, img.y, img.width, img.height);
            ctx.restore();
            
            const gradient = ctx.createLinearGradient(img.x, mirrorY, img.x, mirrorY + img.mirrorDistance);
            gradient.addColorStop(0, `rgba(255,255,255,${img.mirrorOpacity})`);
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = gradient;
            ctx.fillRect(img.x, mirrorY, img.width, img.mirrorDistance);
        }
        
        ctx.restore();
    }

    function drawSelection(img) {
        ctx.save();
        ctx.setTransform(state.scale, 0, 0, state.scale, state.offset.x, state.offset.y);
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(img.x - 2, img.y - 2, img.width + 4, img.height + 4);
        ctx.fillStyle = '#3498db';
        ctx.fillRect(img.x + img.width - 8, img.y + img.height - 8, 10, 10);
        ctx.restore();
    }

    // Event Handlers
    function handleUpload(e) {
        Array.from(e.target.files).forEach(file => {
            if (!file.type.match('image.*')) return;
            
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => addImage(img, file.name);
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function addImage(img, filename) {
        const newImg = {
            element: img,
            originalWidth: img.width,
            originalHeight: img.height,
            width: img.width,
            height: img.height,
            x: (canvas.width/2 - img.width/2 - state.offset.x) / state.scale,
            y: (canvas.height/2 - img.height/2 - state.offset.y) / state.scale,
            scale: 1,
            opacity: 1,
            mirrorOpacity: els.mirrorOpacitySlider.value / 100,
            mirrorDistance: parseInt(els.mirrorDistanceSlider.value),
            flipped: false,
            filename,
            number: state.images.length + 1
        };
        state.images.push(newImg);
        selectImage(newImg);
    }

    function selectImage(img) {
        state.selected = img;
        els.propsPanel.style.display = img ? 'block' : 'none';
        if (img) updateControls(img);
    }

    function updateControls(img) {
        els.scaleSlider.value = img.scale * 100;
        els.scaleValue.textContent = Math.round(img.scale * 100);
        els.mirrorOpacitySlider.value = img.mirrorOpacity * 100;
        els.mirrorOpacityValue.textContent = Math.round(img.mirrorOpacity * 100);
        els.mirrorDistanceSlider.value = img.mirrorDistance;
        els.mirrorDistanceValue.textContent = img.mirrorDistance;
    }

    function setupEvents() {
        // File Handling
        els.upload.addEventListener('change', handleUpload);
        els.download.addEventListener('click', exportImage);

        // Buttons
        els.flipBtn?.addEventListener('click', () => {
            if (state.selected) state.selected.flipped = !state.selected.flipped;
        });
        
        els.centerBtn?.addEventListener('click', () => {
            if (state.selected) {
                state.selected.x = (canvas.width/2 - state.selected.width/2 - state.offset.x) / state.scale;
                state.selected.y = (canvas.height/2 - state.selected.height/2 - state.offset.y) / state.scale;
            }
        });

        els.deleteBtn?.addEventListener('click', () => {
            state.images = state.images.filter(img => img !== state.selected);
            selectImage(null);
        });

        // Zoom Controls
        els.zoomInBtn?.addEventListener('click', () => zoom(1.1));
        els.zoomOutBtn?.addEventListener('click', () => zoom(0.9));
        els.resetZoomBtn?.addEventListener('click', () => {
            state.scale = 1;
            state.offset = { x: 0, y: 0 };
        });

        // Sliders
        els.scaleSlider?.addEventListener('input', e => {
            if (state.selected) {
                const scale = e.target.value / 100;
                state.selected.scale = scale;
                state.selected.width = state.selected.originalWidth * scale;
                state.selected.height = state.selected.originalHeight * scale;
                els.scaleValue.textContent = e.target.value;
            }
        });

        // Mouse Events
        canvas.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('wheel', handleWheel, { passive: false });

        // Window Resize
        window.addEventListener('resize', debounce(resizeCanvas, 100));
    }

    function exportImage() {
        const exportCanvas = document.createElement('canvas');
        const size = els.exportSize.value === 'auto' 
            ? Math.max(canvas.width, canvas.height) 
            : parseInt(els.exportSize.value.split('x')[0]);
        
        exportCanvas.width = size;
        exportCanvas.height = size;
        const exportCtx = exportCanvas.getContext('2d');

        // Background
        if (!els.transparentBg.checked) {
            exportCtx.fillStyle = els.bgColor.value;
            exportCtx.fillRect(0, 0, size, size);
        }

        // Calculate content bounds
        let bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
        state.images.forEach(img => {
            bounds.minX = Math.min(bounds.minX, img.x);
            bounds.maxX = Math.max(bounds.maxX, img.x + img.width);
            bounds.minY = Math.min(bounds.minY, img.y);
            bounds.maxY = Math.max(bounds.maxY, img.y + img.height + (els.showMirror.checked ? img.mirrorDistance : 0));
        });

        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        const scale = size / Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.9;

        // Draw images centered
        state.images.forEach(img => {
            exportCtx.save();
            exportCtx.globalAlpha = img.opacity;

            const x = (img.x - centerX) * scale + size/2;
            const y = (img.y - centerY) * scale + size/2;
            const width = img.width * scale;
            const height = img.height * scale;

            if (img.flipped) {
                exportCtx.translate(x + width, y);
                exportCtx.scale(-1, 1);
                exportCtx.drawImage(img.element, 0, 0, width, height);
            } else {
                exportCtx.drawImage(img.element, x, y, width, height);
            }

            // Mirror effect
            if (els.showMirror.checked && img.mirrorOpacity > 0) {
                const mirrorY = y + height;
                exportCtx.save();
                exportCtx.globalAlpha = img.mirrorOpacity;
                exportCtx.translate(0, mirrorY * 2);
                exportCtx.scale(1, -1);
                exportCtx.drawImage(img.element, x, y, width, height);
                exportCtx.restore();

                const gradient = exportCtx.createLinearGradient(x, mirrorY, x, mirrorY + img.mirrorDistance * scale);
                gradient.addColorStop(0, `rgba(255,255,255,${img.mirrorOpacity})`);
                gradient.addColorStop(1, 'rgba(255,255,255,0)`);
                
                exportCtx.globalCompositeOperation = 'destination-out';
                exportCtx.fillStyle = gradient;
                exportCtx.fillRect(x, mirrorY, width, img.mirrorDistance * scale);
            }

            exportCtx.restore();
        });

        // Download
        const link = document.createElement('a');
        link.download = `design-${Date.now()}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    }

    function debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    init();
});
