document.addEventListener('DOMContentLoaded', () => {
    // === 1. Custom Cursor ===
    const cursor = document.createElement('div');
    cursor.classList.add('custom-cursor');
    document.body.appendChild(cursor);

    const follower = document.createElement('div');
    follower.classList.add('cursor-follower');
    document.body.appendChild(follower);

    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';

        // Follower delay
        setTimeout(() => {
            follower.style.left = e.clientX + 'px';
            follower.style.top = e.clientY + 'px';
        }, 80);

        // FOV Overlay Follow
        const fovOverlay = document.getElementById('fov-overlay');
        if (fovOverlay && fovOverlay.classList.contains('fov-active')) {
            fovOverlay.style.left = e.clientX + 'px';
            fovOverlay.style.top = e.clientY + 'px';
        }
    });

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
});
