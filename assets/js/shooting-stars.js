(function() {
    const canvas = document.getElementById('shooting-stars-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    const stars = [];
    const MAX_STARS = 3;
    const STAR_COLORS = [
        { h: 260, s: 80, l: 70 },
        { h: 280, s: 85, l: 75 },
        { h: 240, s: 75, l: 65 },
        { h: 290, s: 90, l: 80 },
        { h: 250, s: 70, l: 60 }
    ];

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 100));
    resize();

    class ShootingStar {
        constructor(startFromClick = false, clickX = 0, clickY = 0) {
            this.color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
            this.reset(startFromClick, clickX, clickY);
            if (!startFromClick) {
                this.opacity = Math.random() * 0.8 + 0.1;
                this.x -= Math.random() * width * 0.3;
            }
        }

        reset(fromClick = false, clickX = 0, clickY = 0) {
            if (fromClick) {
                this.x = clickX;
                this.y = clickY;
                this.opacity = 1.2;
            } else {
                this.x = Math.random() * width * 0.5;
                this.y = Math.random() * height * 0.25;
                this.opacity = Math.random() * 0.6 + 0.2;
            }
            this.length = Math.random() * 140 + 70;
            this.speed = Math.random() * 10 + 7;
            this.angle = 30 + Math.random() * 18;
            this.radius = Math.random() * 1.4 + 0.5;
            this.trailParticles = Math.floor(Math.random() * 20 + 12);
            this.fadeRate = 0.005 + Math.random() * 0.008;
        }

        update() {
            const rad = this.angle * (Math.PI / 180);
            this.x += Math.cos(rad) * this.speed;
            this.y += Math.sin(rad) * this.speed;
            this.opacity -= this.fadeRate;

            if (this.x > width + 150 || this.y > height + 150 || this.opacity <= 0) {
                this.reset();
            }
        }

        draw(ctx) {
            if (this.opacity <= 0.01) return;

            const rad = this.angle * (Math.PI / 180);
            const endX = this.x - Math.cos(rad) * this.length * Math.min(this.opacity, 1);
            const endY = this.y - Math.sin(rad) * this.length * Math.min(this.opacity, 1);
            const { h, s, l } = this.color;

            const gradient = ctx.createLinearGradient(this.x, this.y, endX, endY);
            gradient.addColorStop(0, `hsla(${h}, ${s}%, ${l}%, ${Math.min(this.opacity, 1)})`);
            gradient.addColorStop(0.4, `hsla(${h}, ${s}%, ${l}%, ${this.opacity * 0.6})`);
            gradient.addColorStop(1, `hsla(${h}, ${s}%, ${l}%, 0)`);

            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = this.radius;
            ctx.lineCap = 'round';
            ctx.shadowColor = `hsla(${h}, ${s}%, ${l}%, ${this.opacity * 0.8})`;
            ctx.shadowBlur = this.radius * 4;
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 2.5, 0, Math.PI * 2);
            const glowGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2.5);
            glowGradient.addColorStop(0, `hsla(${h}, 95%, 85%, ${this.opacity * 1.4})`);
            glowGradient.addColorStop(0.5, `hsla(${h}, 90%, 70%, ${this.opacity * 0.6})`);
            glowGradient.addColorStop(1, `hsla(${h}, 80%, 60%, 0)`);
            ctx.fillStyle = glowGradient;
            ctx.fill();

            for (let i = 0; i < this.trailParticles; i++) {
                const t = i / this.trailParticles;
                const px = this.x + (endX - this.x) * t;
                const py = this.y + (endY - this.y) * t;
                const pOpacity = this.opacity * (1 - t) * 0.7;

                if (pOpacity > 0.01 && Math.random() < 0.35) {
                    ctx.beginPath();
                    ctx.arc(
                        px + (Math.random() - 0.5) * 14,
                        py + (Math.random() - 0.5) * 14,
                        Math.random() * 1.5,
                        0,
                        Math.PI * 2
                    );
                    ctx.fillStyle = `hsla(${h}, 75%, 88%, ${pOpacity})`;
                    ctx.fill();
                }
            }
        }
    }

    for (let i = 0; i < MAX_STARS; i++) {
        const star = new ShootingStar();
        star.opacity = Math.random() * 0.5;
        stars.push(star);
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);

        stars.forEach(star => {
            star.update();
            star.draw(ctx);
        });

        if (Math.random() < 0.01 && stars.length < MAX_STARS + 2) {
            stars.push(new ShootingStar());
        }

        while (stars.length > MAX_STARS + 3) {
            stars.shift();
        }

        requestAnimationFrame(animate);
    }

    animate();

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const star = new ShootingStar(true, x, y);
        stars.push(star);

        setTimeout(() => {
            const idx = stars.indexOf(star);
            if (idx > -1 && stars.length > MAX_STARS) stars.splice(idx, 1);
        }, 3000);
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stars.length = 0;
        } else {
            for (let i = 0; i < MAX_STARS; i++) {
                stars.push(new ShootingStar());
            }
        }
    });
})();