class Cube {
    constructor(canvas, x, y, z, size) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.x = x;
        this.y = y;
        this.z = z;
        this.size = size;
        this.vertices = this.createVertices();
    }

    createVertices() {
        const s = this.size / 2;
        return [
            { x: -s, y: -s, z: -s }, { x: s, y: -s, z: -s },
            { x: s, y: s, z: -s }, { x: -s, y: s, z: -s },
            { x: -s, y: -s, z: s }, { x: s, y: -s, z: s },
            { x: s, y: s, z: s }, { x: -s, y: s, z: s }
        ];
    }

    rotate(angleX, angleY, angleZ) {
        const radX = angleX * Math.PI / 180;
        const radY = angleY * Math.PI / 180;
        const radZ = angleZ * Math.PI / 180;

        this.vertices.forEach(v => {
            // Rotation X
            let y = v.y * Math.cos(radX) - v.z * Math.sin(radX);
            let z = v.y * Math.sin(radX) + v.z * Math.cos(radX);
            v.y = y; v.z = z;

            // Rotation Y
            let x = v.x * Math.cos(radY) + v.z * Math.sin(radY);
            z = -v.x * Math.sin(radY) + v.z * Math.cos(radY);
            v.x = x; v.z = z;

            // Rotation Z
            x = v.x * Math.cos(radZ) - v.y * Math.sin(radZ);
            y = v.x * Math.sin(radZ) + v.y * Math.cos(radZ);
            v.x = x; v.y = y;
        });
    }

    project(v) {
        const focalLength = 400;
        const scale = focalLength / (focalLength + v.z + this.z);
        return {
            x: v.x * scale + this.x,
            y: v.y * scale + this.y
        };
    }

    draw() {
        const projected = this.vertices.map(v => this.project(v));
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(19, 236, 146, 0.15)'; // Emerald brand color with transparency
        this.ctx.lineWidth = 1;

        // Front face
        this.connect(0, 1, projected); this.connect(1, 2, projected);
        this.connect(2, 3, projected); this.connect(3, 0, projected);
        // Back face
        this.connect(4, 5, projected); this.connect(5, 6, projected);
        this.connect(6, 7, projected); this.connect(7, 4, projected);
        // Connecting edges
        this.connect(0, 4, projected); this.connect(1, 5, projected);
        this.connect(2, 6, projected); this.connect(3, 7, projected);

        this.ctx.stroke();
    }

    connect(i, j, points) {
        this.ctx.moveTo(points[i].x, points[i].y);
        this.ctx.lineTo(points[j].x, points[j].y);
    }
}

const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let cubes = [];
let mouseX = 0, mouseY = 0, isDragging = false;
let rotX = 0.2, rotY = 0.2;

function init() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cubes = [];
    const count = 15;
    for (let i = 0; i < count; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const z = Math.random() * 400 - 200;
        const size = Math.random() * 60 + 40;
        cubes.push(new Cube(canvas, x, y, z, size));
    }
}

window.addEventListener('resize', init);

// Interaction Handling
window.addEventListener('mousedown', (e) => {
    // Only drag if clicking on the background (body or canvas)
    if (e.target === document.body || e.target === canvas || e.target.tagName === 'MAIN') {
        isDragging = true;
    }
});
window.addEventListener('mouseup', () => isDragging = false);
window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        // More dramatic rotation on drag
        rotY = (e.movementX * 0.8);
        rotX = (e.movementY * 0.8);
    } else {
        // Very subtle idle rotation
        rotX *= 0.95;
        rotY *= 0.95;
        if (Math.abs(rotX) < 0.1) rotX = 0.1;
        if (Math.abs(rotY) < 0.1) rotY = 0.1;
    }
});

// Touch support
window.addEventListener('touchstart', (e) => {
    if (e.target === document.body || e.target === canvas || e.target.tagName === 'MAIN') {
        isDragging = true;
    }
});
window.addEventListener('touchend', () => isDragging = false);
window.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches[0]) {
        const touch = e.touches[0];
        // For touch we calculate simple diff
        rotY = 0.5;
        rotX = 0.5;
    }
});

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    cubes.forEach(cube => {
        cube.rotate(rotX, rotY, 0.05);
        cube.draw();

        // Slow vertical float
        cube.y -= 0.2;
        if (cube.y < -100) cube.y = canvas.height + 100;
    });

    requestAnimationFrame(animate);
}

init();
animate();
