document.addEventListener('DOMContentLoaded', () => {
    // === 1. Custom Cursor ===
    const cursor = document.createElement('div');
    cursor.classList.add('custom-cursor');
    document.body.appendChild(cursor);

    const follower = document.createElement('div');
    follower.classList.add('cursor-follower');
    document.body.appendChild(follower);



    // Hover effects on interactively elements
    const interactiveElements = document.querySelectorAll('a, button, .project-card, .feature-item');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('hover-active');
            follower.classList.add('hover-active');
        });
        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover-active');
            follower.classList.remove('hover-active');
        });
    });

    // === 2. 3D Tilt Effect ===
    const tiltElements = document.querySelectorAll('[data-tilt]');

    tiltElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left; // x position within the element
            const y = e.clientY - rect.top;  // y position within the element

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -5; // Max rotation deg
            const rotateY = ((x - centerX) / centerX) * 5;

            el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        el.addEventListener('mouseleave', () => {
            el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        });
    });

    // === 3. Glitch Text Trigger ===
    const glitchTexts = document.querySelectorAll('.glitch-text');

    glitchTexts.forEach(text => {
        text.addEventListener('mouseenter', () => {
            text.classList.add('glitching');
            // Randomly trigger stronger glitch via CSS variable adjustments if needed
        });

        text.addEventListener('mouseleave', () => {
            setTimeout(() => {
                text.classList.remove('glitching');
            }, 300);
        });
    });

    // === 4. FOV Logic ===
    const fovCheck = document.getElementById('draw-fov-check');
    const fovSlider = document.getElementById('fov-slider');
    const fovValue = document.getElementById('fov-value');
    const fovOverlay = document.getElementById('fov-overlay');

    if (fovCheck && fovSlider && fovOverlay) {
        const updateFov = () => {
            if (fovCheck.checked) {
                const size = fovSlider.value + 'px';
                fovOverlay.style.width = size;
                fovOverlay.style.height = size;
                fovOverlay.classList.add('fov-active');
                if (fovValue) fovValue.innerText = fovSlider.value;
            } else {
                fovOverlay.classList.remove('fov-active');
            }
        };

        fovCheck.addEventListener('change', updateFov);
        fovSlider.addEventListener('input', updateFov);

        // Initialize
        updateFov();
    }
    // === 5. Global Right Click Disable ===
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // === 6. Aimbot Logic (Sense Page) ===
    const aimbotCheck = document.getElementById('aimbot-check');

    let isRightClickHeld = false;
    let currentTarget = null; // Store targeted element

    // Track right click state
    document.addEventListener('mousedown', (e) => {
        if (e.button === 2) { // Right click
            isRightClickHeld = true;
            if (aimbotCheck && aimbotCheck.checked) {
                // Initial snap
                handleAimbot(e);
            }
        }
        // Left click to interact with target
        if (e.button === 0 && isRightClickHeld && currentTarget) {
            e.preventDefault(); // Prevent clicking on empty space if cursor is virtually simulated
            currentTarget.click(); // Programmatically click the target

            // Visual feedback for click
            const ripple = document.createElement('div');
            ripple.style.position = 'fixed';
            ripple.style.left = cursor.style.left;
            ripple.style.top = cursor.style.top;
            ripple.style.width = '20px';
            ripple.style.height = '20px';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(255, 255, 255, 0.8)';
            ripple.style.transform = 'translate(-50%, -50%)';
            ripple.style.pointerEvents = 'none';
            ripple.style.zIndex = '10000';
            ripple.style.transition = 'all 0.3s ease';
            document.body.appendChild(ripple);

            requestAnimationFrame(() => {
                ripple.style.transform = 'translate(-50%, -50%) scale(2)';
                ripple.style.opacity = '0';
            });

            setTimeout(() => ripple.remove(), 300);
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 2) {
            isRightClickHeld = false;
            currentTarget = null;
            if (fovOverlay) fovOverlay.classList.remove('fov-locked');
        }
    });

    // Override main mousemove to handle aimbot
    document.addEventListener('mousemove', (e) => {
        // If aimbot is active, let the specific logic handle position
        if (isRightClickHeld && aimbotCheck && aimbotCheck.checked) {
            handleAimbot(e);
        } else {
            // Normal behavior
            updateCursor(e.clientX, e.clientY);
            currentTarget = null; // Reset if not locked
            if (fovOverlay) fovOverlay.classList.remove('fov-locked');
        }

        // FOV Overlay Follow
        if (fovOverlay && fovOverlay.classList.contains('fov-active')) {
            fovOverlay.style.left = e.clientX + 'px';
            fovOverlay.style.top = e.clientY + 'px';
        }
    });

    function updateCursor(x, y) {
        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';

        // Follower delay
        setTimeout(() => {
            follower.style.left = x + 'px';
            follower.style.top = y + 'px';
        }, 80);
    }

    // Consolidated Aimbot Handler
    function handleAimbot(e) {
        // Find nearest interactive element
        const elements = document.querySelectorAll('a, button, .project-card, .feature-item, input, label');
        const fovSlider = document.getElementById('fov-slider');
        const fovRadius = fovSlider ? parseInt(fovSlider.value) / 2 : Infinity; // Half of diameter

        let closestEl = null;
        let minDist = Infinity;

        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const elX = rect.left + rect.width / 2;
            const elY = rect.top + rect.height / 2;

            const dist = Math.hypot(e.clientX - elX, e.clientY - elY);

            if (dist < minDist) {
                minDist = dist;
                closestEl = { el, x: elX, y: elY };
            }
        });

        // Check against FOV Radius
        if (closestEl && minDist <= fovRadius) {
            updateCursor(closestEl.x, closestEl.y);
            cursor.classList.add('hover-active');
            follower.classList.add('hover-active');
            currentTarget = closestEl.el;

            // Turn FOV Yellow
            if (fovOverlay) fovOverlay.classList.add('fov-locked');

        } else {
            // Fallback to normal if outside FOV
            updateCursor(e.clientX, e.clientY);
            currentTarget = null;
            if (fovOverlay) fovOverlay.classList.remove('fov-locked');
        }
    }
});
