document.addEventListener('DOMContentLoaded', () => {
    const waterDrop = document.getElementById('water-drop');
    const texts = document.querySelectorAll('.interactive-text');
    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;
    let cursorScale = 1;
    const ease = 0.2;
    const gravity = 0.3;
    const friction = 0.95;
    const surfaceTension = 0.1;
    const drops = new Set();
    const spatialGrid = new Map();
    let lensedTextContainer = null; // 맺힌 글씨 효과를 위한 컨테이너
    let currentHoveredText = null;

    // waterDrop 내부에 lensedTextContainer 초기화
    lensedTextContainer = document.createElement('div');
    lensedTextContainer.className = 'lensed-text-container';
    lensedTextContainer.style.display = 'none';
    waterDrop.appendChild(lensedTextContainer);

    // 마우스 움직임 추적
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (currentHoveredText) {
            updateLensedTextPosition(currentHoveredText);
        }
    });

    function updateLensedTextPosition(textElement) {
        if (!lensedTextContainer || !textElement) return;
        const textRect = textElement.getBoundingClientRect();
        const dropRect = waterDrop.getBoundingClientRect();
        // 텍스트 중앙 좌표
        const textCenterX = textRect.left + textRect.width / 2;
        const textCenterY = textRect.top + textRect.height / 2;
        // 물방울 중앙 좌표
        const dropCenterX = dropRect.left + dropRect.width / 2;
        const dropCenterY = dropRect.top + dropRect.height / 2;
        // 중앙 정렬: 텍스트 중앙이 물방울 중앙에 오도록
        lensedTextContainer.style.left = `${(dropRect.width - textRect.width) / 2 + (textCenterX - dropCenterX)}px`;
        lensedTextContainer.style.top = `${(dropRect.height - textRect.height) / 2 + (textCenterY - dropCenterY)}px`;
        // 폰트 스타일 동기화 (기존대로)
        const computedStyle = window.getComputedStyle(textElement);
        lensedTextContainer.style.fontFamily = computedStyle.fontFamily;
        lensedTextContainer.style.fontSize = computedStyle.fontSize;
        lensedTextContainer.style.fontWeight = computedStyle.fontWeight;
        lensedTextContainer.style.color = computedStyle.color;
        lensedTextContainer.style.lineHeight = computedStyle.lineHeight;
        lensedTextContainer.style.letterSpacing = computedStyle.letterSpacing;
        lensedTextContainer.style.textAlign = computedStyle.textAlign;
        lensedTextContainer.style.width = `${textRect.width}px`;
        lensedTextContainer.style.height = `${textRect.height}px`;
    }

    texts.forEach(text => {
        let touchHoverTimeout = null;
        let lastTapTime = 0;

        text.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const now = Date.now();
            if (currentHoveredText !== text) {
                // hover 효과
                text.style.transform = 'scale(1.1)';
                currentHoveredText = text;
                lensedTextContainer.textContent = text.textContent;
                updateLensedTextPosition(text);
                lensedTextContainer.style.display = 'block';
                // 일정 시간 후 hover 해제
                clearTimeout(touchHoverTimeout);
                touchHoverTimeout = setTimeout(() => {
                    text.style.transform = 'scale(1)';
                    currentHoveredText = null;
                    lensedTextContainer.style.display = 'none';
                }, 1200);
            } else if (now - lastTapTime < 400) {
                // 더블탭: 클릭 효과
                const rect = text.getBoundingClientRect();
                createWaterDrops(rect.left + rect.width / 2, rect.top + rect.height);
                text.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    text.style.transform = 'scale(1.1)';
                }, 150);
                lensedTextContainer.style.display = 'none';
                currentHoveredText = null;
            }
            lastTapTime = now;
        });
    });

    document.body.addEventListener('touchstart', (e) => {
        if (!e.target.classList.contains('interactive-text')) {
            if (currentHoveredText) {
                currentHoveredText.style.transform = 'scale(1)';
                currentHoveredText = null;
                lensedTextContainer.style.display = 'none';
            }
        }
    }, {passive: false});

    function updateSpatialGrid() {
        spatialGrid.clear();
        for(const drop of drops) {
            const gridX = Math.floor(drop.x / 50);
            const gridY = Math.floor(drop.y / 50);
            const key = `${gridX},${gridY}`;
            if(!spatialGrid.has(key)) spatialGrid.set(key, []);
            spatialGrid.get(key).push(drop);
        }
    }

    function checkCollisions() {
        updateSpatialGrid();
        for(const drop of drops) {
            const gridX = Math.floor(drop.x / 50);
            const gridY = Math.floor(drop.y / 50);
            for(let x = -1; x <= 1; x++) {
                for(let y = -1; y <= 1; y++) {
                    const key = `${gridX+x},${gridY+y}`;
                    if(spatialGrid.has(key)) {
                        spatialGrid.get(key).forEach(other => {
                            if(drop !== other && drop.merge(other)) {
                                createSplashEffect(drop.x, drop.y, drop.size);
                            }
                        });
                    }
                }
            }
        }
    }

    function createParticleSplash(x, y, baseSize) {
        const numParticles = 5 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'splash-particle';
            document.body.appendChild(particle);
            const size = Math.random() * (baseSize / 3) + 2;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${x + (Math.random() - 0.5) * baseSize}px`;
            particle.style.top = `${y + (Math.random() - 0.5) * baseSize / 2}px`;

            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            let pVelX = Math.cos(angle) * speed;
            let pVelY = Math.sin(angle) * speed - Math.random() * 2;
            let pOpacity = 1;

            const animateParticle = () => {
                pVelY += 0.1;
                particle.style.left = `${parseFloat(particle.style.left) + pVelX}px`;
                particle.style.top = `${parseFloat(particle.style.top) + pVelY}px`;
                pOpacity -= 0.03;
                particle.style.opacity = pOpacity;
                if (pOpacity > 0) {
                    requestAnimationFrame(animateParticle);
                } else {
                    particle.remove();
                }
            };
            animateParticle();
        }
    }

    function createSplashEffect(x, y, size) {
        createParticleSplash(x, y, size);
    }

    class WaterDrop {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.velocityX = (Math.random() - 0.5) * 1.5;
            this.velocityY = 0;
            this.size = 8 + Math.random() * 4;
            this.mass = this.size * this.size;
            this.baseSize = this.size;
            this.scaleX = 1;
            this.scaleY = 1;
            this.oscillationAngle = Math.random() * Math.PI * 2;
            this.oscillationAmount = 0;
            this.element = document.createElement('div');
            this.element.className = 'falling-drop';
            this.element.style.left = `${x}px`;
            this.element.style.top = `${y}px`;
            this.element.style.width = `${this.size}px`;
            this.element.style.height = `${this.size}px`;
            document.body.appendChild(this.element);
            this.trail = null;
            this.createTrail();
            this.mergeCount = 0;
            this.squashTimer = 0;
        }

        createTrail() {
            this.trail = document.createElement('div');
            this.trail.className = 'drop-trail';
            this.trail.style.left = `${this.x + this.size / 2}px`;
            this.trail.style.top = `${this.y}px`;
            this.trail.style.height = '0';
            document.body.appendChild(this.trail);
        }

        popEffect() {
            this.element.classList.add('pop');
            // 팝 파티클 효과
            const numParticles = 8 + Math.floor(Math.random() * 4);
            for (let i = 0; i < numParticles; i++) {
                const particle = document.createElement('div');
                particle.className = 'pop-particle';
                // 중앙에서 시작
                particle.style.left = `${this.x}px`;
                particle.style.top = `${this.y}px`;
                document.body.appendChild(particle);
                // 랜덤 방향/속도
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 3;
                let px = this.x, py = this.y;
                let vx = Math.cos(angle) * speed;
                let vy = Math.sin(angle) * speed - Math.random() * 1.5;
                let opacity = 0.8;
                function animateParticle() {
                    px += vx;
                    py += vy;
                    vy += 0.12; // 중력
                    opacity -= 0.03;
                    particle.style.left = `${px}px`;
                    particle.style.top = `${py}px`;
                    particle.style.opacity = opacity;
                    if (opacity > 0) {
                        requestAnimationFrame(animateParticle);
                    } else {
                        particle.remove();
                    }
                }
                animateParticle();
            }
            setTimeout(() => {
                this.remove();
            }, 350);
        }

        update() {
            // 표면장력 효과
            let tensionX = 0;
            let tensionY = 0;
            const gridX = Math.floor(this.x / 50);
            const gridY = Math.floor(this.y / 50);
            for(let x = -1; x <= 1; x++) {
                for(let y = -1; y <= 1; y++) {
                    const key = `${gridX+x},${gridY+y}`;
                    if(spatialGrid.has(key)) {
                        spatialGrid.get(key).forEach(other => {
                            if(other !== this) {
                                const dx = other.x - this.x;
                                const dy = other.y - this.y;
                                const dist = Math.sqrt(dx*dx + dy*dy);
                                if(dist < this.size * 2) {
                                    const force = surfaceTension * (dist - this.size);
                                    tensionX += (dx / dist) * force;
                                    tensionY += (dy / dist) * force;
                                }
                            }
                        });
                    }
                }
            }
            this.velocityX += tensionX / this.mass;
            this.velocityY += tensionY / this.mass;

            // 중력, 마찰, 불규칙성
            this.velocityY += gravity * (this.size/15);
            this.velocityX *= friction - (this.size * 0.002);
            this.velocityY += Math.sin(this.x * 0.1) * 0.02;

            this.x += this.velocityX;
            this.y += this.velocityY;

            // --- 모양 변형 및 진동 로직 ---
            if (this.oscillationAmount > 0) {
                this.oscillationAngle += 0.4 / (this.mass / 100 + 0.5);
                this.scaleX = 1 + Math.sin(this.oscillationAngle) * this.oscillationAmount;
                this.scaleY = 1 - Math.sin(this.oscillationAngle) * this.oscillationAmount;
                this.oscillationAmount *= 0.92;
                if (this.oscillationAmount < 0.01) {
                    this.oscillationAmount = 0;
                    this.scaleX = 1;
                    this.scaleY = 1;
                }
            } else {
                // 낙하 시 스트레칭 (부드럽게)
                const targetStretchY = Math.min(1 + Math.abs(this.velocityY) * 0.06, 1.6);
                const targetSquashX = Math.max(0.6, 1 - Math.abs(this.velocityY) * 0.04);
                this.scaleY += (targetStretchY - this.scaleY) * 0.1;
                this.scaleX += (targetSquashX - this.scaleX) * 0.1;
            }
            this.element.style.width = `${this.baseSize * this.scaleX}px`;
            this.element.style.height = `${this.baseSize * this.scaleY}px`;
            this.element.style.borderRadius = '50%';
            // 중앙 정렬
            this.element.style.left = `${this.x - (this.baseSize * this.scaleX / 2)}px`;
            this.element.style.top = `${this.y - (this.baseSize * this.scaleY / 2)}px`;

            // 바닥 충돌 시 터짐 효과
            if (this.y + (this.baseSize * this.scaleY / 2) > window.innerHeight) {
                if (this.baseSize > 50) {
                    this.popEffect();
                    return false;
                }
                this.y = window.innerHeight - (this.baseSize * this.scaleY / 2);
                this.velocityY *= -0.5;
                this.velocityX *= 0.7;
                if (Math.abs(this.velocityY) > 0.5) {
                    this.oscillationAmount = Math.min(Math.abs(this.velocityY) * 0.08, 0.4);
                }
            }
            // 수평 경계 반동 시 진동 발생
            if (this.x - (this.baseSize * this.scaleX / 2) < 0 || this.x + (this.baseSize * this.scaleX / 2) > window.innerWidth) {
                this.velocityX *= -0.5;
                this.squashTimer = 4;
                this.oscillationAmount = Math.min(Math.abs(this.velocityX) * 0.08, 0.3);
            }

            // 꼬리 효과 개선 (중앙 하단)
            if (this.trail) {
                const trailHeight = Math.min(Math.abs(this.velocityY) * 5, 30 + this.size * 0.5);
                this.trail.style.height = `${trailHeight}px`;
                this.trail.style.opacity = Math.max(0, Math.min(Math.abs(this.velocityY) / 10, 0.6) - (this.size * 0.01));
                this.trail.style.left = `${this.x - this.trail.offsetWidth / 2}px`;
                this.trail.style.top = `${this.y + (this.baseSize * this.scaleY / 2)}px`;
            }
            return true;
        }

        merge(otherDrop) {
            const dx = otherDrop.x - this.x;
            const dy = otherDrop.y - this.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            const minDist = (this.size + otherDrop.size)/2;
            if(distance < minDist) {
                // 운동량 보존
                const totalMass = this.mass + otherDrop.mass;
                this.velocityX = (this.velocityX * this.mass + otherDrop.velocityX * otherDrop.mass) / totalMass;
                this.velocityY = (this.velocityY * this.mass + otherDrop.velocityY * otherDrop.mass) / totalMass;
                // 부피 보존
                const newVolume = Math.PI * (this.size/2)**2 + Math.PI * (otherDrop.size/2)**2;
                this.size = Math.sqrt(newVolume/Math.PI) * 2;
                this.mass = this.size * this.size;
                this.baseSize = this.size;
                this.mergeCount++;
                this.oscillationAmount = Math.min(0.2 + (otherDrop.size / this.size) * 0.2, 0.6);
                // 시각 효과
                this.element.style.transform = `scale(${1 + this.mergeCount*0.2})`;
                this.element.style.backgroundColor = `hsl(${200 + this.mergeCount*20}, 70%, 60%)`;
                this.createMergeWave();
                otherDrop.remove();
                return true;
            }
            return false;
        }

        createMergeWave() {
            const wave = document.createElement('div');
            wave.className = 'merge-wave';
            wave.style.cssText = `
                left: ${this.x}px;
                top: ${this.y}px;
                width: ${this.size}px;
                height: ${this.size}px;
            `;
            document.body.appendChild(wave);
            setTimeout(() => wave.remove(), 1000);
        }

        remove() {
            this.element.remove();
            if (this.trail) this.trail.remove();
            drops.delete(this);
        }
    }

    function createWaterDrops(x, y) {
        const count = Math.floor(Math.random() * 2) + 4;
        for (let i = 0; i < count; i++) {
            drops.add(new WaterDrop(
                x + (Math.random() - 0.5) * 30,
                y + (Math.random() - 0.5) * 15
            ));
        }
    }

    function animate() {
        currentX += (mouseX - currentX) * ease;
        currentY += (mouseY - currentY) * ease;

        // waterDrop의 크기를 고려하여 중앙 정렬
        const dropWidth = waterDrop.offsetWidth;
        const dropHeight = waterDrop.offsetHeight;
        waterDrop.style.left = `${currentX - dropWidth / 2}px`;
        waterDrop.style.top = `${currentY - dropHeight / 2}px`;

        // 커서 모양(border-radius) 애니메이션
        const time = Date.now() / 1500;
        const r1 = 45 + Math.sin(time * 0.8 + 0.1) * 8;
        const r2 = 55 + Math.cos(time * 0.8 + 0.3) * 8;
        const r3 = 48 + Math.sin(time * 0.8 + 0.5) * 7;
        const r4 = 52 + Math.cos(time * 0.8 + 0.7) * 7;
        const r5 = 40 + Math.cos(time * 0.8 + 0.2) * 6;
        const r6 = 42 + Math.sin(time * 0.8 + 0.4) * 6;
        const r7 = 58 + Math.cos(time * 0.8 + 0.6) * 5;
        const r8 = 60 + Math.sin(time * 0.8 + 0.8) * 5;
        waterDrop.style.borderRadius = `${r1}% ${r2}% ${r3}% ${r4}% / ${r5}% ${r6}% ${r7}% ${r8}%`;

        // 기존 커서 스케일 (텍스트 호버 시) 및 펄스 효과
        let pulseScale = 1 + Math.sin(Date.now() / 350) * 0.03;
        waterDrop.style.transform = `scale(${cursorScale * pulseScale})`;

        // 떨어지는 물방울들 업데이트
        checkCollisions();
        for (const drop of drops) {
            if (!drop.update()) {
                // Set에서 제거는 drop.remove() 내부에서 처리됨
            }
        }
        // 커서 근처 물방울 반응
        drops.forEach(drop => {
            const dx = drop.x - currentX;
            const dy = drop.y - currentY;
            const distance = Math.sqrt(dx*dx + dy*dy);
            const interactionRadius = dropWidth * 0.8;
            if(distance < interactionRadius) {
                const forceFactor = (interactionRadius - distance) / interactionRadius;
                const pushForce = forceFactor * 0.15;
                const normalizedDx = dx / distance || 0;
                const normalizedDy = dy / distance || 0;
                drop.velocityX += normalizedDx * pushForce;
                drop.velocityY += normalizedDy * pushForce;
            }
        });
        if (currentHoveredText) {
            updateLensedTextPosition(currentHoveredText);
        }
        requestAnimationFrame(animate);
    }

    animate();

    // Rain effect
    class RainDrop {
        constructor(canvasWidth, canvasHeight) {
            this.canvasWidth = canvasWidth;
            this.canvasHeight = canvasHeight;
            this.reset();
            this.createElement();
        }
        reset() {
            this.x = Math.random() * this.canvasWidth;
            this.y = Math.random() * -this.canvasHeight;
            this.length = 30 + Math.random() * 30;
            this.speed = 3 + Math.random() * 3;
            this.opacity = 0.3 + Math.random() * 0.3;
            this.sway = (Math.random() - 0.5) * 0.5;
        }
        createElement() {
            this.el = document.createElement('div');
            this.el.className = 'rain-drop';
            this.el.style.width = '2px';
            this.el.style.height = `${this.length}px`;
            this.el.style.opacity = this.opacity;
            this.el.style.left = `${this.x}px`;
            this.el.style.top = `${this.y}px`;
            document.getElementById('rain-canvas').appendChild(this.el);
        }
        update() {
            this.y += this.speed;
            this.x += this.sway;
            if (this.y > this.canvasHeight) {
                this.reset();
                this.y = -this.length;
            }
            this.el.style.left = `${this.x}px`;
            this.el.style.top = `${this.y}px`;

            const dropRect = waterDrop.getBoundingClientRect();
            if (
                this.x > dropRect.left && this.x < dropRect.right &&
                this.y + this.length > dropRect.top && this.y < dropRect.bottom
            ) {
                // 흔들림 효과
                waterDrop.style.transform += ' rotate(' + (Math.random() - 0.5) * 6 + 'deg)';
                // 작은 스플래시 파티클 생성
                createParticleSplash(this.x, dropRect.top, 8);
            }
        }
    }

    function startRain() {
        const rainCanvas = document.getElementById('rain-canvas');
        const rainDrops = [];
        const rainCount = 60;
        const width = window.innerWidth;
        const height = window.innerHeight;
        for (let i = 0; i < rainCount; i++) {
            rainDrops.push(new RainDrop(width, height));
        }
        function rainAnimate() {
            for (const drop of rainDrops) drop.update();
            requestAnimationFrame(rainAnimate);
        }
        rainAnimate();
    }

    startRain();

    function isMobile() {
        return /Mobi|Android|iPhone|iPad|iPod|Touch/i.test(navigator.userAgent);
    }
    if (isMobile()) {
        document.getElementById('water-drop').style.display = 'none';
    }

    function createTextRipple(x, y, parent) {
        const ripple = document.createElement('div');
        ripple.className = 'text-ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        parent.appendChild(ripple);
        setTimeout(() => ripple.remove(), 700);
    }
}); 