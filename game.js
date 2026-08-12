// ============================================
// RETRO SPACE SHOOTER - Main Game Logic
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

// ============================================
// GAME SETTINGS (configurable from pause menu)
// ============================================
const settings = {
    soundEnabled: true,
    musicEnabled: true,
    particlesEnabled: true,
    screenShakeEnabled: true
};

// ============================================
// SHIP CONFIGURATIONS
// ============================================
const SHIP_CONFIGS = {
    fighter: { name: '⚡ Fighter', speed: 2.8, lives: 3, fireRate: 18, bulletDamage: 1, bulletSpeed: -4.5, color: '#0ff', accentColor: '#08f' },
    tank: { name: '🛡️ Destroyer', speed: 1.8, lives: 5, fireRate: 26, bulletDamage: 2, bulletSpeed: -3.8, color: '#0f0', accentColor: '#080' },
    speeder: { name: '💨 Phantom', speed: 4, lives: 2, fireRate: 12, bulletDamage: 1, bulletSpeed: -5.5, color: '#f0f', accentColor: '#80f' },
    balanced: { name: '🎯 Vanguard', speed: 2.5, lives: 4, fireRate: 16, bulletDamage: 1.5, bulletSpeed: -4, color: '#ff8', accentColor: '#f80' }
};

let selectedShip = 'fighter';

// ============================================
// ULTIMATE ABILITIES (earned by score, activated by keys 1/2/3)
// ============================================
const ULTIMATES = {
    timeWarp: {
        key: 'Digit1', name: 'Time Warp', icon: '⏳', color: '#a0f',
        description: 'Slows all enemies & bullets',
        unlockScore: 500, cooldown: 900, duration: 600 // 15s cooldown, 10s duration
    },
    plasmaBeam: {
        key: 'Digit2', name: 'Plasma Beam', icon: '🔥', color: '#f80',
        description: 'Devastating vertical beam',
        unlockScore: 2000, cooldown: 1100, duration: 240 // 18s cooldown, 4s duration
    },
    vortex: {
        key: 'Digit3', name: 'Vortex', icon: '🌀', color: '#80f',
        description: 'Black hole pulls & damages enemies',
        unlockScore: 5000, cooldown: 1200, duration: 480 // 20s cooldown, 8s duration
    }
};

// ============================================
// AUDIO SYSTEM
// ============================================
class AudioSystem {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.musicPlaying = false;
        this.musicTimeout = null;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playTone(freq, duration, type = 'square', volume = 0.1) {
        if (!settings.soundEnabled || this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    shootSound() { this.playTone(800, 0.1, 'square', 0.08); setTimeout(() => this.playTone(600, 0.05, 'square', 0.05), 30); }

    explosionSound() {
        if (!settings.soundEnabled || this.muted || !this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.3;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        source.buffer = buffer;
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        source.connect(gain); gain.connect(this.ctx.destination); source.start();
    }

    bigExplosionSound() {
        if (!settings.soundEnabled || this.muted || !this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 0.6;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 0.5);
        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        source.buffer = buffer;
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
        source.connect(gain); gain.connect(this.ctx.destination); source.start();
    }

    powerUpSound() { this.playTone(523, 0.1, 'sine', 0.1); setTimeout(() => this.playTone(659, 0.1, 'sine', 0.1), 80); setTimeout(() => this.playTone(784, 0.15, 'sine', 0.1), 160); }
    hitSound() { this.playTone(200, 0.15, 'sawtooth', 0.1); }
    levelUpSound() { [523, 659, 784, 1047].forEach((n, i) => setTimeout(() => this.playTone(n, 0.2, 'sine', 0.08), i * 100)); }

    startMusic() {
        if (!settings.musicEnabled || this.muted || !this.ctx || this.musicPlaying) return;
        this.musicPlaying = true;
        this._playMusicLoop();
    }

    _playMusicLoop() {
        if (!this.musicPlaying || this.muted || !settings.musicEnabled) return;
        const bassNotes = [65, 82, 73, 87, 65, 82, 98, 87];
        const tempo = 0.25;
        bassNotes.forEach((note, i) => {
            setTimeout(() => {
                if (!this.musicPlaying || this.muted || !settings.musicEnabled) return;
                this.playTone(note, tempo * 0.8, 'triangle', 0.04);
                if (i % 2 === 0) this.playTone(note * 4, tempo * 0.3, 'sine', 0.02);
            }, i * tempo * 1000);
        });
        this.musicTimeout = setTimeout(() => { if (this.musicPlaying) this._playMusicLoop(); }, bassNotes.length * tempo * 1000);
    }

    stopMusic() { this.musicPlaying = false; if (this.musicTimeout) clearTimeout(this.musicTimeout); }

    toggle() {
        this.muted = !this.muted;
        if (this.muted) this.stopMusic();
        else if (game && game.state === 'playing') this.startMusic();
        document.getElementById('muteBtn').textContent = this.muted ? '🔇 MUTED' : '🔊 SOUND';
    }
}

const audio = new AudioSystem();

// ============================================
// STAR FIELD
// ============================================
class StarField {
    constructor() {
        this.stars = [];
        for (let i = 0; i < 150; i++) {
            this.stars.push({ x: Math.random() * W, y: Math.random() * H, size: Math.random() * 2 + 0.5, speed: Math.random() * 2 + 0.5, brightness: Math.random() });
        }
    }
    update() {
        this.stars.forEach(s => {
            s.y += s.speed;
            s.brightness += (Math.random() - 0.5) * 0.1;
            s.brightness = Math.max(0.3, Math.min(1, s.brightness));
            if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        });
    }
    draw() {
        this.stars.forEach(s => { ctx.fillStyle = `rgba(255,255,255,${s.brightness})`; ctx.fillRect(s.x, s.y, s.size, s.size); });
    }
}

// ============================================
// PARTICLE SYSTEM
// ============================================
class Particle {
    constructor(x, y, color, vx, vy, life, size) {
        this.x = x; this.y = y; this.color = color; this.vx = vx; this.vy = vy;
        this.life = life; this.maxLife = life; this.size = size || 3;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life--; this.vx *= 0.98; this.vy *= 0.98; }
    draw() {
        const a = this.life / this.maxLife;
        ctx.globalAlpha = a; ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size * a, this.size * a);
        ctx.globalAlpha = 1;
    }
    isDead() { return this.life <= 0; }
}

class ParticleSystem {
    constructor() { this.particles = []; }
    emit(x, y, count, colors, speed = 5, life = 30) {
        if (!settings.particlesEnabled) return;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const vel = Math.random() * speed;
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.particles.push(new Particle(x, y, color, Math.cos(angle) * vel, Math.sin(angle) * vel, life + Math.random() * 20, Math.random() * 4 + 1));
        }
    }
    explosion(x, y) { this.emit(x, y, 40, ['#ff0', '#f80', '#f00', '#ff4', '#fff'], 6, 35); }
    bigExplosion(x, y) { this.emit(x, y, 80, ['#ff0', '#f80', '#f00', '#ff4', '#fff', '#f0f'], 10, 50); }
    smallExplosion(x, y) { this.emit(x, y, 15, ['#0ff', '#0af', '#08f', '#fff'], 3, 20); }
    sparkle(x, y, color) { this.emit(x, y, 8, [color, '#fff'], 2, 15); }
    thruster(x, y, color) {
        if (!settings.particlesEnabled) return;
        for (let i = 0; i < 2; i++) {
            this.particles.push(new Particle(x + (Math.random() - 0.5) * 8, y, color || '#0af', (Math.random() - 0.5) * 0.5, Math.random() * 2 + 1, 10 + Math.random() * 10, Math.random() * 3 + 1));
        }
    }
    update() { this.particles = this.particles.filter(p => { p.update(); return !p.isDead(); }); }
    draw() { this.particles.forEach(p => p.draw()); }
}

// ============================================
// PLAYER
// ============================================
class Player {
    constructor(shipType) {
        this.shipType = shipType || 'fighter';
        this.config = SHIP_CONFIGS[this.shipType];
        this.reset();
    }
    reset() {
        this.config = SHIP_CONFIGS[this.shipType];
        this.x = W / 2; this.y = H - 80;
        this.width = 40; this.height = 40;
        this.speed = this.config.speed;
        this.lives = this.config.lives;
        this.fireRate = this.config.fireRate;
        this.bulletDamage = this.config.bulletDamage;
        this.bulletSpeed = this.config.bulletSpeed;
        this.fireTimer = 0;
        this.powerLevel = 0;
        // Timed power-ups
        this.shieldActive = false; this.shieldTimer = 0; this.shieldMaxTime = 0;
        this.invincible = false; this.invincibleTimer = 0;
        this.rapidFire = false; this.rapidFireTimer = 0; this.rapidFireMaxTime = 0;
        this.weaponBoost = false; this.weaponBoostTimer = 0; this.weaponBoostMaxTime = 0;
        // Wingman
        this.wingmanActive = false; this.wingmanTimer = 0; this.wingmanMaxTime = 0;
        this.wingmanX = this.x - 50; this.wingmanY = this.y;
        this.wingmanFireTimer = 0;
    }
    update(keys) {
        if (keys['ArrowLeft'] || keys['KeyA']) this.x -= this.speed;
        if (keys['ArrowRight'] || keys['KeyD']) this.x += this.speed;
        if (keys['ArrowUp'] || keys['KeyW']) this.y -= this.speed * 0.5;
        if (keys['ArrowDown'] || keys['KeyS']) this.y += this.speed * 0.5;
        this.x = Math.max(this.width / 2, Math.min(W - this.width / 2, this.x));
        this.y = Math.max(H / 2, Math.min(H - this.height / 2, this.y));
        if (this.fireTimer > 0) this.fireTimer--;
        if (this.shieldActive) { this.shieldTimer--; if (this.shieldTimer <= 0) this.shieldActive = false; }
        if (this.invincible) { this.invincibleTimer--; if (this.invincibleTimer <= 0) this.invincible = false; }
        if (this.rapidFire) { this.rapidFireTimer--; if (this.rapidFireTimer <= 0) this.rapidFire = false; }
        if (this.weaponBoost) { this.weaponBoostTimer--; if (this.weaponBoostTimer <= 0) { this.weaponBoost = false; this.powerLevel = Math.max(0, this.powerLevel - 1); } }
        // Wingman update
        if (this.wingmanActive) {
            this.wingmanTimer--;
            if (this.wingmanTimer <= 0) { this.wingmanActive = false; }
            // Smoothly follow player offset to the left
            const targetX = this.x - 55;
            const targetY = this.y + 10;
            this.wingmanX += (targetX - this.wingmanX) * 0.08;
            this.wingmanY += (targetY - this.wingmanY) * 0.08;
            this.wingmanFireTimer--;
            if (this.wingmanFireTimer <= 0) {
                const rate = this.rapidFire ? Math.max(4, this.fireRate / 2) : this.fireRate;
                this.wingmanFireTimer = rate;
                const bSpeed = this.bulletSpeed;
                const dmg = this.bulletDamage;
                // Wingman shoots same pattern as player
                switch (this.powerLevel) {
                    case 0: game.bullets.push({ x: this.wingmanX, y: this.wingmanY - 15, vx: 0, vy: bSpeed, damage: dmg }); break;
                    case 1:
                        game.bullets.push({ x: this.wingmanX - 6, y: this.wingmanY - 15, vx: 0, vy: bSpeed, damage: dmg });
                        game.bullets.push({ x: this.wingmanX + 6, y: this.wingmanY - 15, vx: 0, vy: bSpeed, damage: dmg }); break;
                    case 2:
                        game.bullets.push({ x: this.wingmanX, y: this.wingmanY - 15, vx: 0, vy: bSpeed, damage: dmg });
                        game.bullets.push({ x: this.wingmanX - 8, y: this.wingmanY - 12, vx: -1, vy: bSpeed, damage: dmg });
                        game.bullets.push({ x: this.wingmanX + 8, y: this.wingmanY - 12, vx: 1, vy: bSpeed, damage: dmg }); break;
                    default:
                        game.bullets.push({ x: this.wingmanX, y: this.wingmanY - 15, vx: 0, vy: bSpeed, damage: dmg });
                        game.bullets.push({ x: this.wingmanX - 8, y: this.wingmanY - 12, vx: -1.5, vy: bSpeed, damage: dmg });
                        game.bullets.push({ x: this.wingmanX + 8, y: this.wingmanY - 12, vx: 1.5, vy: bSpeed, damage: dmg }); break;
                }
            }
            game.particles.thruster(this.wingmanX, this.wingmanY + 15, '#af0');
        }
        if (game.state === 'playing') game.particles.thruster(this.x, this.y + this.height / 2, this.config.accentColor);
    }
    shoot() {
        const rate = this.rapidFire ? Math.max(3, this.fireRate / 3) : this.fireRate;
        if (this.fireTimer > 0) return [];
        this.fireTimer = rate;
        audio.shootSound();
        const bullets = [];
        const bSpeed = this.bulletSpeed;
        const dmg = this.bulletDamage;
        switch (this.powerLevel) {
            case 0: bullets.push({ x: this.x, y: this.y - 20, vx: 0, vy: bSpeed, damage: dmg }); break;
            case 1:
                bullets.push({ x: this.x - 8, y: this.y - 20, vx: 0, vy: bSpeed, damage: dmg });
                bullets.push({ x: this.x + 8, y: this.y - 20, vx: 0, vy: bSpeed, damage: dmg }); break;
            case 2:
                bullets.push({ x: this.x, y: this.y - 20, vx: 0, vy: bSpeed, damage: dmg });
                bullets.push({ x: this.x - 12, y: this.y - 15, vx: -0.6, vy: bSpeed, damage: dmg });
                bullets.push({ x: this.x + 12, y: this.y - 15, vx: 0.6, vy: bSpeed, damage: dmg }); break;
            default:
                bullets.push({ x: this.x, y: this.y - 20, vx: 0, vy: bSpeed, damage: dmg });
                bullets.push({ x: this.x - 10, y: this.y - 17, vx: -0.8, vy: bSpeed, damage: dmg });
                bullets.push({ x: this.x + 10, y: this.y - 17, vx: 0.8, vy: bSpeed, damage: dmg });
                bullets.push({ x: this.x - 18, y: this.y - 12, vx: -1.5, vy: bSpeed * 0.9, damage: dmg });
                bullets.push({ x: this.x + 18, y: this.y - 12, vx: 1.5, vy: bSpeed * 0.9, damage: dmg }); break;
        }
        return bullets;
    }
    hit() {
        if (this.invincible || this.shieldActive) { if (this.shieldActive) game.particles.smallExplosion(this.x, this.y); return false; }
        this.lives--;
        this.invincible = true; this.invincibleTimer = 90;
        audio.hitSound(); game.particles.explosion(this.x, this.y);
        return this.lives <= 0;
    }
    draw() {
        if (this.invincible && Math.floor(this.invincibleTimer / 4) % 2 === 0) return;
        ctx.save(); ctx.translate(this.x, this.y);
        const mc = this.config.color, ac = this.config.accentColor;
        switch (this.shipType) {
            case 'fighter':
                ctx.fillStyle = mc; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-15, 15); ctx.lineTo(-5, 10); ctx.lineTo(0, 15); ctx.lineTo(5, 10); ctx.lineTo(15, 15); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#fff'; ctx.fillRect(-3, -8, 6, 8);
                ctx.fillStyle = ac; ctx.fillRect(-18, 8, 6, 4); ctx.fillRect(12, 8, 6, 4); break;
            case 'tank':
                ctx.fillStyle = mc; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-10, -10); ctx.lineTo(-20, 5); ctx.lineTo(-18, 18); ctx.lineTo(18, 18); ctx.lineTo(20, 5); ctx.lineTo(10, -10); ctx.closePath(); ctx.fill();
                ctx.fillStyle = ac; ctx.fillRect(-22, 5, 8, 12); ctx.fillRect(14, 5, 8, 12);
                ctx.fillStyle = '#fff'; ctx.fillRect(-4, -6, 8, 6);
                ctx.fillStyle = '#060'; ctx.fillRect(-12, 2, 6, 4); ctx.fillRect(6, 2, 6, 4); break;
            case 'speeder':
                ctx.fillStyle = mc; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(-8, 0); ctx.lineTo(-12, 16); ctx.lineTo(0, 12); ctx.lineTo(12, 16); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
                ctx.fillStyle = ac; ctx.fillRect(-14, 10, 4, 6); ctx.fillRect(10, 10, 4, 6);
                ctx.fillStyle = '#fff'; ctx.fillRect(-2, -10, 4, 6); break;
            case 'balanced':
                ctx.fillStyle = mc; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-12, -5); ctx.lineTo(-16, 12); ctx.lineTo(-6, 16); ctx.lineTo(6, 16); ctx.lineTo(16, 12); ctx.lineTo(12, -5); ctx.closePath(); ctx.fill();
                ctx.fillStyle = ac; ctx.fillRect(-19, 4, 6, 8); ctx.fillRect(13, 4, 6, 8);
                ctx.fillStyle = '#fff'; ctx.fillRect(-3, -8, 6, 6);
                ctx.fillStyle = '#f80'; ctx.fillRect(-8, 8, 4, 4); ctx.fillRect(4, 8, 4, 4); break;
        }
        if (this.shieldActive) {
            ctx.strokeStyle = `rgba(0,255,255,${0.5 + Math.sin(Date.now() * 0.01) * 0.3})`;
            ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
    }
}

// ============================================
// ALIEN TIERS
// ============================================
const ALIEN_TIERS = [
    { name: 'Scout', color: '#4f4', accent: '#2a2', glow: '#0f0' },
    { name: 'Warrior', color: '#ff0', accent: '#aa0', glow: '#ff0' },
    { name: 'Elite', color: '#f80', accent: '#a50', glow: '#f80' },
    { name: 'Commander', color: '#f00', accent: '#800', glow: '#f00' },
    { name: 'Overlord', color: '#f0f', accent: '#808', glow: '#f0f' },
    { name: 'Annihilator', color: '#fff', accent: '#aaa', glow: '#0ff' },
];
function getAlienTier(level) { return ALIEN_TIERS[Math.min(ALIEN_TIERS.length - 1, Math.floor((level - 1) / 2))]; }

// ============================================
// ENEMY
// ============================================
class Enemy {
    constructor(type, x, y, level) {
        this.x = x; this.y = y; this.type = type; this.level = level;
        this.time = 0; this.startX = x; this.tier = getAlienTier(level);
        // Gentler difficulty scaling: starts easy, ramps up gradually
        const spdS = 0.4 + (level - 1) * 0.06;
        const hpS = 0.8 + (level - 1) * 0.15;
        switch (type) {
            case 'grunt': this.width = 30; this.height = 30; this.hp = Math.ceil(1 * hpS); this.speed = 0.7 * spdS; this.score = 10 * level; break;
            case 'zigzag': this.width = 28; this.height = 28; this.hp = Math.ceil(1.5 * hpS); this.speed = 0.6 * spdS; this.score = 25 * level; this.amplitude = 25 + level * 4; break;
            case 'charger': this.width = 24; this.height = 24; this.hp = Math.ceil(1 * hpS); this.speed = 1.0 * spdS; this.score = 30 * level; break;
            case 'tank': this.width = 40; this.height = 40; this.hp = Math.ceil(4 * hpS); this.speed = 0.3 * spdS; this.score = 50 * level; this.shootTimer = 0; this.shootRate = Math.max(50, 120 - level * 5); break;
            case 'sniper': this.width = 26; this.height = 32; this.hp = Math.ceil(2 * hpS); this.speed = 0.35 * spdS; this.score = 40 * level; this.shootTimer = 0; this.shootRate = Math.max(45, 110 - level * 5); break;
            case 'splitter': this.width = 34; this.height = 34; this.hp = Math.ceil(2.5 * hpS); this.speed = 0.5 * spdS; this.score = 60 * level; this.hasSplit = false; break;
            case 'swarm': this.width = 18; this.height = 18; this.hp = Math.ceil(1 * hpS); this.speed = 0.9 * spdS; this.score = 15 * level; break;
            case 'boss': this.width = 90; this.height = 70; this.hp = Math.ceil(25 * hpS); this.maxHp = this.hp; this.speed = 0.25; this.score = 500 * level; this.shootTimer = 0; this.shootRate = Math.max(30, 80 - level * 3); this.phase = 0; this.phaseTimer = 0; break;
        }
        this.maxHp = this.maxHp || this.hp;
    }
    update(playerX) {
        this.time++;
        switch (this.type) {
            case 'grunt': this.y += this.speed; this.x += Math.sin(this.time * 0.03) * 0.5; break;
            case 'zigzag': this.y += this.speed; this.x = this.startX + Math.sin(this.time * 0.05) * this.amplitude; break;
            case 'charger': this.y += this.speed; if (this.time > 40) this.speed += 0.015; this.x += Math.sin(this.time * 0.08) * 0.6; break;
            case 'tank': this.y += this.speed; this.shootTimer++; break;
            case 'sniper': this.y += this.speed; if (this.y > 80 && this.y < 180) this.speed = 0.15; this.shootTimer++; break;
            case 'splitter': this.y += this.speed; this.x += Math.sin(this.time * 0.04) * 1.2; break;
            case 'swarm':
                this.y += this.speed * 0.7;
                // Track toward player x
                if (playerX !== undefined) { const dx = playerX - this.x; this.x += Math.sign(dx) * Math.min(1.5, Math.abs(dx) * 0.02); }
                break;
            case 'boss':
                if (this.y < 80) { this.y += this.speed; }
                else {
                    this.phaseTimer++;
                    if (this.phase === 0) this.x = W / 2 + Math.sin(this.time * 0.02) * 250;
                    else if (this.phase === 1) { this.x = W / 2 + Math.sin(this.time * 0.04) * 150; this.y = 80 + Math.sin(this.time * 0.03) * 30; }
                    else { this.x = W / 2 + Math.cos(this.time * 0.03) * 200; this.y = 80 + Math.sin(this.time * 0.02) * 50; }
                    if (this.phaseTimer > 250) { this.phase = (this.phase + 1) % 3; this.phaseTimer = 0; }
                }
                this.shootTimer++; break;
        }
    }
    canShoot() {
        if (this.type === 'boss' && this.shootTimer >= this.shootRate) { this.shootTimer = 0; return true; }
        if (this.type === 'tank' && this.shootTimer >= this.shootRate) { this.shootTimer = 0; return true; }
        if (this.type === 'sniper' && this.shootTimer >= this.shootRate && this.y > 50) { this.shootTimer = 0; return true; }
        return false;
    }
    getBullets(px, py) {
        const bullets = [];
        const bs = 1.2 + this.level * 0.12;
        if (this.type === 'boss') {
            if (this.phase === 0) { for (let i = -2; i <= 2; i++) bullets.push({ x: this.x + i * 15, y: this.y + 35, vx: i * 1.5, vy: bs + 1 }); }
            else if (this.phase === 1) { const dx = px - this.x, dy = py - this.y, d = Math.sqrt(dx * dx + dy * dy), s = bs + 2; bullets.push({ x: this.x, y: this.y + 35, vx: (dx / d) * s, vy: (dy / d) * s }); bullets.push({ x: this.x - 20, y: this.y + 30, vx: (dx / d) * s - 0.5, vy: (dy / d) * s }); bullets.push({ x: this.x + 20, y: this.y + 30, vx: (dx / d) * s + 0.5, vy: (dy / d) * s }); }
            else { for (let i = 0; i < 8; i++) { const a = (Math.PI * 2 * i) / 8 + this.time * 0.05; bullets.push({ x: this.x, y: this.y, vx: Math.cos(a) * bs, vy: Math.sin(a) * bs }); } }
        } else if (this.type === 'tank') { bullets.push({ x: this.x - 10, y: this.y + 20, vx: -0.5, vy: bs }); bullets.push({ x: this.x + 10, y: this.y + 20, vx: 0.5, vy: bs }); }
        else if (this.type === 'sniper') { const dx = px - this.x, dy = py - this.y, d = Math.sqrt(dx * dx + dy * dy), s = bs + 2; bullets.push({ x: this.x, y: this.y + 16, vx: (dx / d) * s, vy: (dy / d) * s }); }
        return bullets;
    }
    split() { if (this.type !== 'splitter' || this.hasSplit) return []; this.hasSplit = true; return [new Enemy('grunt', this.x - 20, this.y, this.level), new Enemy('grunt', this.x + 20, this.y, this.level)]; }
    isOffScreen() { return this.y > H + 50 || this.x < -100 || this.x > W + 100; }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y);
        const c = this.tier.color, ac = this.tier.accent;
        if (this.type === 'boss') {
            ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(-45, -5); ctx.lineTo(-40, 30); ctx.lineTo(-15, 35); ctx.lineTo(15, 35); ctx.lineTo(40, 30); ctx.lineTo(45, -5); ctx.closePath(); ctx.fill();
            ctx.fillStyle = ac; ctx.fillRect(-35, -10, 15, 20); ctx.fillRect(20, -10, 15, 20);
            ctx.fillStyle = this.tier.glow; ctx.shadowColor = this.tier.glow; ctx.shadowBlur = 10; ctx.fillRect(-15, -10, 8, 8); ctx.fillRect(7, -10, 8, 8); ctx.shadowBlur = 0;
            ctx.fillStyle = '#444'; ctx.fillRect(-38, 20, 8, 12); ctx.fillRect(30, 20, 8, 12); ctx.fillRect(-5, 28, 10, 10);
            const hp = this.hp / this.maxHp; ctx.fillStyle = '#333'; ctx.fillRect(-45, -50, 90, 8); ctx.fillStyle = hp > 0.5 ? '#0f0' : hp > 0.25 ? '#ff0' : '#f00'; ctx.fillRect(-45, -50, 90 * hp, 8); ctx.strokeStyle = '#fff'; ctx.strokeRect(-45, -50, 90, 8);
        } else {
            ctx.fillStyle = c;
            if (this.type === 'grunt') {
                ctx.fillRect(-12, -10, 24, 20); ctx.fillRect(-16, -4, 4, 8); ctx.fillRect(12, -4, 4, 8);
                ctx.fillStyle = '#000'; ctx.fillRect(-7, -5, 4, 4); ctx.fillRect(3, -5, 4, 4);
                ctx.fillStyle = ac; ctx.fillRect(-8, -14, 3, 4); ctx.fillRect(5, -14, 3, 4);
            } else if (this.type === 'zigzag') {
                ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(14, 0); ctx.lineTo(0, 14); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();
                ctx.fillStyle = ac; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(8, 0); ctx.lineTo(0, 8); ctx.lineTo(-8, 0); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#000'; ctx.fillRect(-3, -3, 6, 6);
            } else if (this.type === 'charger') {
                ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(10, 4); ctx.lineTo(6, 4); ctx.lineTo(6, 12); ctx.lineTo(-6, 12); ctx.lineTo(-6, 4); ctx.lineTo(-10, 4); ctx.closePath(); ctx.fill();
                ctx.fillStyle = this.tier.glow; ctx.globalAlpha = 0.5 + Math.sin(this.time * 0.2) * 0.3; ctx.fillRect(-4, 12, 8, 4); ctx.globalAlpha = 1;
            } else if (this.type === 'tank') {
                ctx.fillRect(-18, -16, 36, 32); ctx.fillStyle = ac; ctx.fillRect(-14, -12, 28, 24);
                ctx.fillStyle = c; ctx.fillRect(-20, -8, 6, 16); ctx.fillRect(14, -8, 6, 16);
                ctx.fillStyle = '#000'; ctx.fillRect(-8, -6, 6, 4); ctx.fillRect(2, -6, 6, 4);
                ctx.fillStyle = '#444'; ctx.fillRect(-4, 12, 8, 8);
                if (this.hp < this.maxHp) { const p = this.hp / this.maxHp; ctx.fillStyle = '#333'; ctx.fillRect(-18, -22, 36, 4); ctx.fillStyle = p > 0.5 ? '#0f0' : '#f00'; ctx.fillRect(-18, -22, 36 * p, 4); }
            } else if (this.type === 'sniper') {
                ctx.fillRect(-8, -16, 16, 28); ctx.fillStyle = ac; ctx.fillRect(-6, -12, 12, 20);
                ctx.fillStyle = this.tier.glow; ctx.shadowColor = this.tier.glow; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(0, -4, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
                ctx.fillStyle = '#666'; ctx.fillRect(-2, 12, 4, 8);
            } else if (this.type === 'splitter') {
                ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = ac; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, 16); ctx.stroke();
                ctx.fillStyle = '#000'; ctx.fillRect(-8, -4, 3, 3); ctx.fillRect(-3, -4, 3, 3); ctx.fillRect(3, -4, 3, 3); ctx.fillRect(8, -4, 3, 3);
            } else if (this.type === 'swarm') {
                ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(9, 5); ctx.lineTo(-9, 5); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#000'; ctx.fillRect(-2, -2, 4, 3);
            }
        }
        ctx.restore();
    }
}

// ============================================
// POWER-UPS with emoji icons
// ============================================
const POWERUP_DEFS = {
    weapon: { icon: '🔫', color: '#0f0', label: 'Weapon' },
    shield: { icon: '🛡️', color: '#0ff', label: 'Shield' },
    rapid: { icon: '⚡', color: '#ff0', label: 'Rapid' },
    life: { icon: '❤️', color: '#f00', label: 'Life' },
    bomb: { icon: '💣', color: '#f80', label: 'Bomb' },
    wingman: { icon: '🛸', color: '#af0', label: 'Wingman' }
};

class PowerUp {
    constructor(x, y, type, flying) {
        this.x = x; this.y = y; this.type = type;
        this.width = 26; this.height = 26; this.time = 0;
        this.flying = flying || false;
        if (this.flying) {
            // Flying power-ups move in a wave pattern across the screen
            this.vx = (Math.random() < 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.7);
            this.vy = 0.2 + Math.random() * 0.3;
            this.amplitude = 30 + Math.random() * 40;
            this.freq = 0.03 + Math.random() * 0.02;
            this.startY = y;
        } else {
            this.vx = 0; this.vy = 1.2;
        }
    }
    update() {
        this.time++;
        if (this.flying) {
            this.x += this.vx;
            this.y = this.startY + Math.sin(this.time * this.freq) * this.amplitude + this.time * 0.3;
        } else {
            this.y += this.vy;
        }
    }
    isOffScreen() { return this.y > H + 30 || this.x < -40 || this.x > W + 40; }
    draw() {
        const def = POWERUP_DEFS[this.type];
        const pulse = Math.sin(this.time * 0.1) * 3;
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.shadowColor = def.color; ctx.shadowBlur = 10 + pulse;
        ctx.strokeStyle = def.color; ctx.lineWidth = 2;
        ctx.strokeRect(-13 - pulse / 2, -13 - pulse / 2, 26 + pulse, 26 + pulse);
        ctx.shadowBlur = 0;
        ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(def.icon, 0, 0);
        ctx.restore();
    }
}

// ============================================
// MAIN GAME
// ============================================
class Game {
    constructor() {
        this.state = 'menu';
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('spaceShooterHighScore')) || 0;
        this.level = 1;
        this.player = new Player(selectedShip);
        this.bullets = []; this.enemyBullets = []; this.enemies = []; this.powerUps = [];
        this.particles = new ParticleSystem();
        this.starField = new StarField();
        this.keys = {};
        this.spawnTimer = 0; this.spawnRate = 90;
        this.flyingPowerUpTimer = 0; this.flyingPowerUpRate = 350;
        this.enemiesKilled = 0; this.enemiesForNextLevel = 10;
        this.bossSpawned = false;
        this.screenShake = 0; this.levelTransition = 0;
        this.comboCount = 0; this.comboTimer = 0;
        this.floatingTexts = [];
        this.waveWarning = ''; this.waveWarningTimer = 0;
        // Ultimate abilities
        this.ultimates = {
            timeWarp: { unlocked: false, cooldownTimer: 0, activeTimer: 0, notified: false },
            plasmaBeam: { unlocked: false, cooldownTimer: 0, activeTimer: 0, notified: false },
            vortex: { unlocked: false, cooldownTimer: 0, activeTimer: 0, notified: false }
        };
        this.timeWarpActive = false;
        this.plasmaBeamActive = false;
        this.vortexActive = false;
        this.vortexX = W / 2; this.vortexY = H / 3;
    }

    reset() {
        this.score = 0; this.level = 1;
        this.player = new Player(selectedShip);
        this.bullets = []; this.enemyBullets = []; this.enemies = []; this.powerUps = [];
        this.particles = new ParticleSystem();
        this.spawnTimer = 0; this.spawnRate = 90;
        this.flyingPowerUpTimer = 0; this.flyingPowerUpRate = 350;
        this.enemiesKilled = 0; this.enemiesForNextLevel = 10;
        this.bossSpawned = false;
        this.screenShake = 0; this.levelTransition = 0;
        this.comboCount = 0; this.comboTimer = 0;
        this.floatingTexts = [];
        this.waveWarning = ''; this.waveWarningTimer = 0;
        // Reset ultimates
        this.ultimates = {
            timeWarp: { unlocked: false, cooldownTimer: 0, activeTimer: 0, notified: false },
            plasmaBeam: { unlocked: false, cooldownTimer: 0, activeTimer: 0, notified: false },
            vortex: { unlocked: false, cooldownTimer: 0, activeTimer: 0, notified: false }
        };
        this.timeWarpActive = false;
        this.plasmaBeamActive = false;
        this.vortexActive = false;
        this.vortexX = W / 2; this.vortexY = H / 3;
    }

    start() {
        audio.init(); this.reset(); this.state = 'playing';
        document.getElementById('homeScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('pauseMenu').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'block';
        audio.startMusic();
    }

    pause() {
        if (this.state !== 'playing') return;
        this.state = 'paused';
        document.getElementById('pauseMenu').style.display = 'flex';
        audio.stopMusic();
    }

    resume() {
        if (this.state !== 'paused') return;
        this.state = 'playing';
        document.getElementById('pauseMenu').style.display = 'none';
        audio.startMusic();
    }

    goHome() {
        this.state = 'menu'; audio.stopMusic();
        document.getElementById('homeScreen').classList.remove('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('pauseMenu').style.display = 'none';
        document.getElementById('pauseBtn').style.display = 'none';
        document.getElementById('homeHighScore').textContent = this.highScore;
    }

    gameOver() {
        this.state = 'gameover'; audio.stopMusic();
        document.getElementById('pauseBtn').style.display = 'none';
        if (this.score > this.highScore) { this.highScore = this.score; localStorage.setItem('spaceShooterHighScore', this.highScore); }
        document.getElementById('gameOverScreen').classList.remove('hidden');
        document.getElementById('finalScore').textContent = `SCORE: ${this.score}`;
        document.getElementById('highScoreText').textContent = `HIGH SCORE: ${this.highScore}`;
    }

    spawnEnemy() {
        const x = Math.random() * (W - 100) + 50;
        const types = ['grunt'];
        if (this.level >= 2) types.push('zigzag', 'swarm');
        if (this.level >= 3) types.push('charger');
        if (this.level >= 4) types.push('sniper');
        if (this.level >= 5) types.push('tank');
        if (this.level >= 6) types.push('splitter');
        if (this.level >= 7) types.push('swarm', 'swarm'); // More swarms at high levels

        // Boss every 5 levels
        if (this.level % 5 === 0 && !this.bossSpawned && this.enemiesKilled >= this.enemiesForNextLevel - 3) {
            this.enemies.push(new Enemy('boss', W / 2, -70, this.level));
            this.bossSpawned = true;
            this.waveWarning = '⚠ BOSS INCOMING ⚠'; this.waveWarningTimer = 120;
            audio.bigExplosionSound(); return;
        }

        // Spawn more enemies at higher levels
        let numToSpawn = 1;
        if (this.level >= 5) numToSpawn = Math.random() < 0.3 ? 2 : 1;
        if (this.level >= 8) numToSpawn = Math.random() < 0.4 ? 3 : 2;
        if (this.level >= 11) numToSpawn = Math.random() < 0.5 ? 4 : 3;

        for (let i = 0; i < numToSpawn; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            this.enemies.push(new Enemy(type, x + (i - numToSpawn / 2) * 35, -30 - i * 25, this.level));
        }
    }

    spawnPowerUp(x, y) {
        if (Math.random() < 0.16) {
            const types = ['weapon', 'shield', 'rapid', 'life', 'bomb'];
            const weights = [28, 22, 25, 10, 15];
            const total = weights.reduce((a, b) => a + b);
            let rand = Math.random() * total, type = types[0];
            for (let i = 0; i < weights.length; i++) { rand -= weights[i]; if (rand <= 0) { type = types[i]; break; } }
            this.powerUps.push(new PowerUp(x, y, type));
        }
    }

    applyPowerUp(type) {
        audio.powerUpSound();
        const duration = 360; // 6 seconds at 60fps
        switch (type) {
            case 'weapon':
                this.player.powerLevel = Math.min(3, this.player.powerLevel + 1);
                this.player.weaponBoost = true; this.player.weaponBoostTimer = duration; this.player.weaponBoostMaxTime = duration;
                this.addFloatingText(this.player.x, this.player.y - 30, '🔫 WEAPON UP!', '#0f0'); break;
            case 'shield':
                this.player.shieldActive = true; this.player.shieldTimer = duration; this.player.shieldMaxTime = duration;
                this.addFloatingText(this.player.x, this.player.y - 30, '🛡️ SHIELD!', '#0ff'); break;
            case 'rapid':
                this.player.rapidFire = true; this.player.rapidFireTimer = duration; this.player.rapidFireMaxTime = duration;
                this.addFloatingText(this.player.x, this.player.y - 30, '⚡ RAPID FIRE!', '#ff0'); break;
            case 'life':
                this.player.lives = Math.min(this.player.config.lives + 2, this.player.lives + 1);
                this.addFloatingText(this.player.x, this.player.y - 30, '❤️ +1 LIFE!', '#f00'); break;
            case 'bomb':
                this.screenBomb();
                this.addFloatingText(this.player.x, this.player.y - 30, '💣 BOMB!', '#f80'); break;
            case 'wingman':
                this.player.wingmanActive = true;
                this.player.wingmanTimer = 600; this.player.wingmanMaxTime = 600; // 10 seconds
                this.player.wingmanX = this.player.x - 55;
                this.player.wingmanY = this.player.y + 10;
                this.player.wingmanFireTimer = 0;
                this.addFloatingText(this.player.x, this.player.y - 30, '🛸 WINGMAN!', '#af0'); break;
        }
    }

    screenBomb() {
        this.enemies.forEach(e => { if (e.type !== 'boss') { this.particles.explosion(e.x, e.y); this.score += e.score; } else { e.hp -= 10; this.particles.bigExplosion(e.x, e.y); } });
        this.enemyBullets = [];
        this.enemies = this.enemies.filter(e => e.type === 'boss' && e.hp > 0);
        this.screenShake = 20; audio.bigExplosionSound();
    }

    // ===== ULTIMATE ABILITIES =====
    activateUltimate(name) {
        const def = ULTIMATES[name];
        const state = this.ultimates[name];
        if (!state.unlocked || state.cooldownTimer > 0 || state.activeTimer > 0) return;
        state.activeTimer = def.duration;
        state.cooldownTimer = def.cooldown;
        this[name + 'Active'] = true;
        if (name === 'vortex') { this.vortexX = W / 2; this.vortexY = H / 3; }
        audio.playTone(220, 0.3, 'sawtooth', 0.12);
        audio.playTone(440, 0.2, 'sine', 0.1);
        this.addFloatingText(this.player.x, this.player.y - 50, `${def.icon} ${def.name.toUpperCase()}!`, def.color);
        this.screenShake = 8;
    }

    updateUltimates() {
        // Check unlocks based on score
        for (const [name, def] of Object.entries(ULTIMATES)) {
            const state = this.ultimates[name];
            if (!state.unlocked && this.score >= def.unlockScore) {
                state.unlocked = true;
                if (!state.notified) {
                    state.notified = true;
                    this.waveWarning = `${def.icon} ULTIMATE UNLOCKED: ${def.name} [${def.key.replace('Digit', '')}]`;
                    this.waveWarningTimer = 180;
                    audio.powerUpSound();
                }
            }
            // Tick cooldowns
            if (state.cooldownTimer > 0 && state.activeTimer <= 0) state.cooldownTimer--;
            // Tick active timers
            if (state.activeTimer > 0) {
                state.activeTimer--;
                if (state.activeTimer <= 0) this[name + 'Active'] = false;
            }
        }

        // === TIME WARP EFFECT: slow enemies and enemy bullets ===
        // (Applied in enemy update via speed multiplier — handled below)

        // === PLASMA BEAM EFFECT: damage all enemies in a vertical column ===
        if (this.plasmaBeamActive) {
            const beamX = this.player.x;
            const beamWidth = 60;
            this.enemies.forEach(e => {
                if (Math.abs(e.x - beamX) < beamWidth) {
                    e.hp -= 0.8; // Strong continuous damage
                    if (Math.random() < 0.4) this.particles.sparkle(e.x, e.y, '#f80');
                }
            });
            // Enemy bullets are NOT affected by the plasma beam
        }

        // === VORTEX EFFECT: pull enemies toward center and damage them (bullets unaffected) ===
        if (this.vortexActive) {
            const vx = this.vortexX, vy = this.vortexY;
            const pullRadius = 250;
            this.enemies.forEach(e => {
                const dx = vx - e.x, dy = vy - e.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < pullRadius && dist > 5) {
                    const force = (pullRadius - dist) / pullRadius * 4;
                    e.x += (dx / dist) * force;
                    e.y += (dy / dist) * force;
                    if (dist < 60) e.hp -= 0.5; // Stronger damage when close to center
                }
            });
            // Enemy bullets are NOT affected by the vortex
            if (Math.random() < 0.5) this.particles.emit(vx + (Math.random() - 0.5) * 60, vy + (Math.random() - 0.5) * 60, 1, ['#80f', '#a0f', '#60f'], 1, 15);
        }
    }

    drawUltimates() {
        // Draw plasma beam visual
        if (this.plasmaBeamActive) {
            const beamX = this.player.x;
            const t = Date.now() * 0.01;
            const w = 30 + Math.sin(t * 3) * 10;
            ctx.save();
            const grad = ctx.createLinearGradient(beamX - w, 0, beamX + w, 0);
            grad.addColorStop(0, 'rgba(255,100,0,0)');
            grad.addColorStop(0.3, 'rgba(255,150,0,0.4)');
            grad.addColorStop(0.5, 'rgba(255,200,50,0.8)');
            grad.addColorStop(0.7, 'rgba(255,150,0,0.4)');
            grad.addColorStop(1, 'rgba(255,100,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(beamX - w, 0, w * 2, this.player.y - 20);
            // Core beam
            ctx.fillStyle = `rgba(255,255,200,${0.6 + Math.sin(t * 5) * 0.3})`;
            ctx.fillRect(beamX - 4, 0, 8, this.player.y - 20);
            ctx.restore();
        }

        // Draw vortex visual
        if (this.vortexActive) {
            const vx = this.vortexX, vy = this.vortexY;
            const t = Date.now() * 0.003;
            ctx.save();
            for (let i = 0; i < 5; i++) {
                const r = 20 + i * 30 + Math.sin(t + i) * 10;
                ctx.strokeStyle = `rgba(128,0,255,${0.5 - i * 0.08})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(vx, vy, r, t + i * 0.5, t + i * 0.5 + Math.PI * 1.5);
                ctx.stroke();
            }
            // Center glow
            ctx.fillStyle = `rgba(160,0,255,${0.3 + Math.sin(t * 2) * 0.15})`;
            ctx.beginPath(); ctx.arc(vx, vy, 25, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        // Draw time warp overlay
        if (this.timeWarpActive) {
            ctx.fillStyle = `rgba(160,0,255,${0.05 + Math.sin(Date.now() * 0.003) * 0.03})`;
            ctx.fillRect(0, 0, W, H);
        }

        // Draw ultimate ability HUD at bottom of screen
        ctx.save();
        const startX = W / 2 - 150;
        const y = H - 25;
        let idx = 0;
        for (const [name, def] of Object.entries(ULTIMATES)) {
            const state = this.ultimates[name];
            const x = startX + idx * 110;
            idx++;

            if (!state.unlocked) {
                // Locked
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#333';
                ctx.fillRect(x, y - 8, 100, 16);
                ctx.fillStyle = '#666';
                ctx.font = '10px Courier New'; ctx.textAlign = 'center';
                ctx.fillText(`[${def.key.replace('Digit', '')}] 🔒 ${def.unlockScore}pts`, x + 50, y + 3);
                ctx.globalAlpha = 1;
            } else {
                // Unlocked
                const isActive = state.activeTimer > 0;
                const onCooldown = state.cooldownTimer > 0 && !isActive;
                ctx.fillStyle = isActive ? def.color : (onCooldown ? '#222' : '#111');
                ctx.fillRect(x, y - 8, 100, 16);
                ctx.strokeStyle = isActive ? def.color : (onCooldown ? '#555' : def.color);
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y - 8, 100, 16);

                if (onCooldown) {
                    // Cooldown fill
                    const pct = 1 - (state.cooldownTimer / def.cooldown);
                    ctx.fillStyle = `${def.color}44`;
                    ctx.fillRect(x, y - 8, 100 * pct, 16);
                    ctx.fillStyle = '#888';
                    ctx.font = '10px Courier New'; ctx.textAlign = 'center';
                    ctx.fillText(`[${def.key.replace('Digit', '')}] ${(state.cooldownTimer / 60).toFixed(0)}s`, x + 50, y + 3);
                } else if (isActive) {
                    ctx.fillStyle = '#000';
                    ctx.font = 'bold 10px Courier New'; ctx.textAlign = 'center';
                    ctx.fillText(`${def.icon} ACTIVE`, x + 50, y + 3);
                } else {
                    // Ready!
                    const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
                    ctx.globalAlpha = pulse;
                    ctx.fillStyle = def.color;
                    ctx.font = 'bold 10px Courier New'; ctx.textAlign = 'center';
                    ctx.fillText(`[${def.key.replace('Digit', '')}] ${def.icon} READY`, x + 50, y + 3);
                    ctx.globalAlpha = 1;
                }
            }
        }
        ctx.restore();
    }

    addFloatingText(x, y, text, color) { this.floatingTexts.push({ x, y, text, color, life: 60 }); }

    levelUp() {
        this.level++; this.enemiesKilled = 0;
        this.enemiesForNextLevel = 10 + this.level * 3;
        // Gentler spawn rate decrease: starts at 90, decreases by 5 per level, min 20
        this.spawnRate = Math.max(20, 90 - this.level * 5);
        this.bossSpawned = false; this.levelTransition = 120;
        audio.levelUpSound();
        this.waveWarning = `⚡ LEVEL ${this.level} ⚡`; this.waveWarningTimer = 150;
    }

    updatePowerUpTimers() {
        const container = document.getElementById('powerUpTimers');
        let html = '';
        const p = this.player;
        if (p.weaponBoost && p.weaponBoostTimer > 0) {
            const pct = (p.weaponBoostTimer / p.weaponBoostMaxTime * 100).toFixed(0);
            const secs = (p.weaponBoostTimer / 60).toFixed(1);
            html += `<div class="timer-bar"><span class="timer-icon">🔫</span><div class="timer-track"><div class="timer-fill" style="width:${pct}%;background:#0f0;"></div></div><span class="timer-text">${secs}s</span></div>`;
        }
        if (p.shieldActive && p.shieldTimer > 0) {
            const pct = (p.shieldTimer / p.shieldMaxTime * 100).toFixed(0);
            const secs = (p.shieldTimer / 60).toFixed(1);
            html += `<div class="timer-bar"><span class="timer-icon">🛡️</span><div class="timer-track"><div class="timer-fill" style="width:${pct}%;background:#0ff;"></div></div><span class="timer-text">${secs}s</span></div>`;
        }
        if (p.rapidFire && p.rapidFireTimer > 0) {
            const pct = (p.rapidFireTimer / p.rapidFireMaxTime * 100).toFixed(0);
            const secs = (p.rapidFireTimer / 60).toFixed(1);
            html += `<div class="timer-bar"><span class="timer-icon">⚡</span><div class="timer-track"><div class="timer-fill" style="width:${pct}%;background:#ff0;"></div></div><span class="timer-text">${secs}s</span></div>`;
        }
        if (p.wingmanActive && p.wingmanTimer > 0) {
            const pct = (p.wingmanTimer / p.wingmanMaxTime * 100).toFixed(0);
            const secs = (p.wingmanTimer / 60).toFixed(1);
            html += `<div class="timer-bar"><span class="timer-icon">🛸</span><div class="timer-track"><div class="timer-fill" style="width:${pct}%;background:#af0;"></div></div><span class="timer-text">${secs}s</span></div>`;
        }
        container.innerHTML = html;
    }

    checkCollisions() {
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const bullet = this.bullets[bi]; if (!bullet) continue;
            for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
                const enemy = this.enemies[ei]; if (!enemy) continue;
                if (this.collides(bullet, 4, 8, enemy, enemy.width, enemy.height)) {
                    this.bullets.splice(bi, 1);
                    enemy.hp -= bullet.damage;
                    this.particles.sparkle(bullet.x, bullet.y, '#0ff');
                    if (enemy.hp <= 0) {
                        if (enemy.type === 'splitter' && !enemy.hasSplit) this.enemies.push(...enemy.split());
                        if (enemy.type === 'boss') {
                            this.particles.bigExplosion(enemy.x, enemy.y); audio.bigExplosionSound(); this.screenShake = 20;
                            // Auto-bomb on boss death: clear all remaining enemies and bullets
                            this.addFloatingText(enemy.x, enemy.y - 40, '💥 BOSS DEFEATED! 💥', '#f0f');
                            setTimeout(() => { this.screenBomb(); this.addFloatingText(W / 2, H / 2, '💣 AUTO-BOMB!', '#ff0'); }, 300);
                        }
                        else { this.particles.explosion(enemy.x, enemy.y); audio.explosionSound(); this.screenShake = 3; }
                        this.comboCount++; this.comboTimer = 60;
                        const mult = Math.min(5, this.comboCount);
                        const pts = enemy.score * mult; this.score += pts;
                        this.addFloatingText(enemy.x, enemy.y, this.comboCount > 1 ? `${pts} x${mult}` : `+${pts}`, this.comboCount > 1 ? '#ff0' : '#fff');
                        this.spawnPowerUp(enemy.x, enemy.y);
                        this.enemies.splice(ei, 1); this.enemiesKilled++;
                        if (this.enemiesKilled >= this.enemiesForNextLevel) this.levelUp();
                    }
                    break;
                }
            }
        }
        for (let bi = this.enemyBullets.length - 1; bi >= 0; bi--) {
            if (this.collides(this.enemyBullets[bi], 6, 6, this.player, this.player.width * 0.6, this.player.height * 0.6)) {
                this.enemyBullets.splice(bi, 1);
                if (this.player.hit()) { this.gameOver(); return; }
            }
        }
        for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
            const e = this.enemies[ei];
            if (this.collides(e, e.width * 0.6, e.height * 0.6, this.player, this.player.width * 0.5, this.player.height * 0.5)) {
                if (e.type !== 'boss') { this.particles.explosion(e.x, e.y); this.enemies.splice(ei, 1); }
                if (this.player.hit()) { this.gameOver(); return; }
            }
        }
        for (let pi = this.powerUps.length - 1; pi >= 0; pi--) {
            const pu = this.powerUps[pi];
            if (this.collides(pu, pu.width, pu.height, this.player, this.player.width, this.player.height)) {
                this.applyPowerUp(pu.type); this.particles.sparkle(pu.x, pu.y, '#fff'); this.powerUps.splice(pi, 1);
            }
        }
    }

    collides(a, aw, ah, b, bw, bh) { return Math.abs(a.x - b.x) < (aw + bw) / 2 && Math.abs(a.y - b.y) < (ah + bh) / 2; }

    update() {
        if (this.state !== 'playing') return;
        this.starField.update(); this.player.update(this.keys); this.particles.update();
        if (this.comboTimer > 0) { this.comboTimer--; if (this.comboTimer <= 0) this.comboCount = 0; }
        if (this.screenShake > 0) this.screenShake *= 0.9; if (this.screenShake < 0.5) this.screenShake = 0;
        if (this.levelTransition > 0) this.levelTransition--;
        if (this.waveWarningTimer > 0) this.waveWarningTimer--;
        this.floatingTexts = this.floatingTexts.filter(t => { t.y -= 1; t.life--; return t.life > 0; });
        if (this.keys['Space']) this.bullets.push(...this.player.shoot());
        this.bullets = this.bullets.filter(b => { b.x += b.vx; b.y += b.vy; return b.y > -10 && b.x > -10 && b.x < W + 10; });
        // Move enemy bullets - apply time warp slow without changing their stored velocity
        const bulletTimeScale = this.timeWarpActive ? 0.3 : 1;
        this.enemyBullets = this.enemyBullets.filter(b => {
            // Store original velocity if not yet stored
            if (b.origVx === undefined) { b.origVx = b.vx; b.origVy = b.vy; }
            // Always use original velocity for movement direction, apply time scale
            b.x += b.origVx * bulletTimeScale;
            b.y += b.origVy * bulletTimeScale;
            return b.y < H + 10 && b.y > -10 && b.x > -10 && b.x < W + 10;
        });
        if (this.levelTransition <= 0) { this.spawnTimer++; if (this.spawnTimer >= this.spawnRate) { this.spawnTimer = 0; this.spawnEnemy(); } }
        // Spawn flying power-ups periodically
        this.flyingPowerUpTimer++;
        if (this.flyingPowerUpTimer >= this.flyingPowerUpRate) {
            this.flyingPowerUpTimer = 0;
            const types = ['weapon', 'shield', 'rapid', 'life', 'bomb', 'wingman'];
            const weights = [25, 22, 22, 8, 12, 11];
            const total = weights.reduce((a, b) => a + b);
            let rand = Math.random() * total, type = types[0];
            for (let i = 0; i < weights.length; i++) { rand -= weights[i]; if (rand <= 0) { type = types[i]; break; } }
            const fromLeft = Math.random() < 0.5;
            const startX = fromLeft ? -20 : W + 20;
            const startY = 80 + Math.random() * (H * 0.4);
            const pu = new PowerUp(startX, startY, type, true);
            if (!fromLeft) pu.vx = -Math.abs(pu.vx); else pu.vx = Math.abs(pu.vx);
            this.powerUps.push(pu);
        }
        // Time warp: slow enemy movement and bullets (bullets keep original velocity stored)
        const timeScale = this.timeWarpActive ? 0.3 : 1;
        this.enemies.forEach(e => {
            const origSpeed = e.speed;
            e.speed *= timeScale;
            e.update(this.player.x);
            e.speed = origSpeed;
            if (e.canShoot()) {
                const newBullets = e.getBullets(this.player.x, this.player.y);
                // Store original velocity so we can restore after time warp ends
                newBullets.forEach(b => { b.origVx = b.vx; b.origVy = b.vy; });
                this.enemyBullets.push(...newBullets);
            }
        });
        this.enemies = this.enemies.filter(e => !e.isOffScreen());
        this.powerUps = this.powerUps.filter(p => { p.update(); return !p.isOffScreen(); });
        this.checkCollisions();
        this.updateUltimates();
        this.updatePowerUpTimers();
        document.getElementById('scoreDisplay').textContent = `SCORE: ${this.score}`;
        document.getElementById('levelDisplay').textContent = `LEVEL: ${this.level}`;
        document.getElementById('livesDisplay').textContent = `LIVES: ${'♥'.repeat(this.player.lives)}`;
    }

    draw() {
        ctx.save();
        if (this.screenShake > 0 && settings.screenShakeEnabled) ctx.translate((Math.random() - 0.5) * this.screenShake * 2, (Math.random() - 0.5) * this.screenShake * 2);
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        this.starField.draw();
        if (this.levelTransition > 90) { ctx.fillStyle = `rgba(0,255,255,${(this.levelTransition - 90) / 30 * 0.3})`; ctx.fillRect(0, 0, W, H); }
        this.powerUps.forEach(p => p.draw());
        const sc = this.player.config.color; ctx.fillStyle = sc; ctx.shadowColor = sc; ctx.shadowBlur = 5;
        this.bullets.forEach(b => ctx.fillRect(b.x - 2, b.y - 4, 4, 8)); ctx.shadowBlur = 0;
        ctx.fillStyle = '#f44'; ctx.shadowColor = '#f00'; ctx.shadowBlur = 5;
        this.enemyBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); }); ctx.shadowBlur = 0;
        this.enemies.forEach(e => e.draw());
        if (this.state === 'playing' || this.state === 'paused') {
            this.player.draw();
            // Draw wingman
            if (this.player.wingmanActive) {
                const wx = this.player.wingmanX, wy = this.player.wingmanY;
                const mc = this.player.config.color, ac = this.player.config.accentColor;
                ctx.save(); ctx.translate(wx, wy);
                ctx.globalAlpha = 0.85;
                // Smaller version of the player's ship
                ctx.scale(0.7, 0.7);
                switch (this.player.shipType) {
                    case 'fighter':
                        ctx.fillStyle = mc; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-15, 15); ctx.lineTo(-5, 10); ctx.lineTo(0, 15); ctx.lineTo(5, 10); ctx.lineTo(15, 15); ctx.closePath(); ctx.fill();
                        ctx.fillStyle = '#fff'; ctx.fillRect(-3, -8, 6, 8);
                        ctx.fillStyle = ac; ctx.fillRect(-18, 8, 6, 4); ctx.fillRect(12, 8, 6, 4); break;
                    case 'tank':
                        ctx.fillStyle = mc; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-10, -10); ctx.lineTo(-20, 5); ctx.lineTo(-18, 18); ctx.lineTo(18, 18); ctx.lineTo(20, 5); ctx.lineTo(10, -10); ctx.closePath(); ctx.fill();
                        ctx.fillStyle = ac; ctx.fillRect(-22, 5, 8, 12); ctx.fillRect(14, 5, 8, 12);
                        ctx.fillStyle = '#fff'; ctx.fillRect(-4, -6, 8, 6); break;
                    case 'speeder':
                        ctx.fillStyle = mc; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(-8, 0); ctx.lineTo(-12, 16); ctx.lineTo(0, 12); ctx.lineTo(12, 16); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
                        ctx.fillStyle = ac; ctx.fillRect(-14, 10, 4, 6); ctx.fillRect(10, 10, 4, 6);
                        ctx.fillStyle = '#fff'; ctx.fillRect(-2, -10, 4, 6); break;
                    case 'balanced':
                        ctx.fillStyle = mc; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-12, -5); ctx.lineTo(-16, 12); ctx.lineTo(-6, 16); ctx.lineTo(6, 16); ctx.lineTo(16, 12); ctx.lineTo(12, -5); ctx.closePath(); ctx.fill();
                        ctx.fillStyle = ac; ctx.fillRect(-19, 4, 6, 8); ctx.fillRect(13, 4, 6, 8);
                        ctx.fillStyle = '#fff'; ctx.fillRect(-3, -8, 6, 6); break;
                }
                ctx.globalAlpha = 1;
                ctx.restore();
                // Glow ring around wingman
                ctx.strokeStyle = `rgba(170,255,0,${0.3 + Math.sin(Date.now() * 0.005) * 0.2})`;
                ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(wx, wy, 22, 0, Math.PI * 2); ctx.stroke();
            }
        }
        this.particles.draw();
        this.floatingTexts.forEach(t => { ctx.globalAlpha = t.life / 60; ctx.fillStyle = t.color; ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'center'; ctx.fillText(t.text, t.x, t.y); ctx.globalAlpha = 1; });
        if (this.waveWarningTimer > 0) { ctx.globalAlpha = Math.min(1, this.waveWarningTimer / 30); ctx.fillStyle = '#ff0'; ctx.font = 'bold 22px Courier New'; ctx.textAlign = 'center'; ctx.fillText(this.waveWarning, W / 2, H / 2 + 20); ctx.globalAlpha = 1; }
        if (this.comboCount > 1) { ctx.fillStyle = '#ff0'; ctx.font = 'bold 13px Courier New'; ctx.textAlign = 'right'; ctx.fillText(`COMBO x${Math.min(5, this.comboCount)}`, W - 15, 50); }
        // Draw ultimate ability effects and HUD
        if (this.state === 'playing') this.drawUltimates();
        ctx.restore();
    }
}

// ============================================
// SHIP PREVIEW
// ============================================
function drawShipPreview(canvas, shipType) {
    if (!canvas) return;
    const p = canvas.getContext('2d'); p.clearRect(0, 0, 50, 50); p.save(); p.translate(25, 25);
    const cfg = SHIP_CONFIGS[shipType], mc = cfg.color, ac = cfg.accentColor;
    switch (shipType) {
        case 'fighter': p.fillStyle = mc; p.beginPath(); p.moveTo(0, -15); p.lineTo(-11, 12); p.lineTo(-4, 8); p.lineTo(0, 12); p.lineTo(4, 8); p.lineTo(11, 12); p.closePath(); p.fill(); p.fillStyle = '#fff'; p.fillRect(-2, -6, 4, 6); p.fillStyle = ac; p.fillRect(-13, 6, 4, 3); p.fillRect(9, 6, 4, 3); break;
        case 'tank': p.fillStyle = mc; p.beginPath(); p.moveTo(0, -13); p.lineTo(-8, -7); p.lineTo(-15, 4); p.lineTo(-13, 14); p.lineTo(13, 14); p.lineTo(15, 4); p.lineTo(8, -7); p.closePath(); p.fill(); p.fillStyle = ac; p.fillRect(-16, 4, 6, 9); p.fillRect(10, 4, 6, 9); p.fillStyle = '#fff'; p.fillRect(-3, -4, 6, 5); break;
        case 'speeder': p.fillStyle = mc; p.beginPath(); p.moveTo(0, -16); p.lineTo(-6, 0); p.lineTo(-9, 12); p.lineTo(0, 9); p.lineTo(9, 12); p.lineTo(6, 0); p.closePath(); p.fill(); p.fillStyle = ac; p.fillRect(-10, 8, 3, 5); p.fillRect(7, 8, 3, 5); p.fillStyle = '#fff'; p.fillRect(-2, -8, 4, 5); break;
        case 'balanced': p.fillStyle = mc; p.beginPath(); p.moveTo(0, -15); p.lineTo(-9, -4); p.lineTo(-12, 9); p.lineTo(-5, 12); p.lineTo(5, 12); p.lineTo(12, 9); p.lineTo(9, -4); p.closePath(); p.fill(); p.fillStyle = ac; p.fillRect(-14, 3, 5, 6); p.fillRect(9, 3, 5, 6); p.fillStyle = '#fff'; p.fillRect(-2, -6, 4, 5); break;
    }
    p.restore();
}

// ============================================
// INITIALIZATION
// ============================================
const game = new Game();

// Draw previews
document.querySelectorAll('.shipPreview').forEach(c => drawShipPreview(c, c.dataset.type));

// High score
document.getElementById('homeHighScore').textContent = game.highScore;

// Tab system
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// Ship selection
document.querySelectorAll('.ship-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.ship-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedShip = card.dataset.ship;
        document.getElementById('selectedShipName').textContent = SHIP_CONFIGS[selectedShip].name;
    });
});

// Input
document.addEventListener('keydown', (e) => {
    game.keys[e.code] = true;
    if (e.code === 'KeyP') { if (game.state === 'playing') game.pause(); else if (game.state === 'paused') game.resume(); }
    if (e.code === 'Space') e.preventDefault();
    // Ultimate ability activation
    if (game.state === 'playing') {
        if (e.code === 'Digit1') game.activateUltimate('timeWarp');
        if (e.code === 'Digit2') game.activateUltimate('plasmaBeam');
        if (e.code === 'Digit3') game.activateUltimate('vortex');
    }
});
document.addEventListener('keyup', (e) => { game.keys[e.code] = false; });

// Buttons
document.getElementById('startBtn').addEventListener('click', () => game.start());
document.getElementById('restartBtn').addEventListener('click', () => game.start());
document.getElementById('homeBtn').addEventListener('click', () => game.goHome());
document.getElementById('pauseBtn').addEventListener('click', () => game.pause());
document.getElementById('resumeBtn').addEventListener('click', () => game.resume());
document.getElementById('pauseHomeBtn').addEventListener('click', () => game.goHome());
document.getElementById('muteBtn').addEventListener('click', () => audio.toggle());

// Quit buttons - close the app/tab entirely
function quitGame() {
    audio.stopMusic();
    // Try to close the window/tab (works for PWA and windows opened by script)
    window.close();
    // Fallback: if window.close() doesn't work (browser restriction), show goodbye message
    game.state = 'menu';
    document.getElementById('pauseMenu').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('homeScreen').classList.remove('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('homeScreen').innerHTML = `<h1 style="color:#0ff; font-size:36px;">THANKS FOR PLAYING!</h1><p style="color:#888; margin-top:20px; font-size:14px;">You can close this tab now.</p>`;
}
document.getElementById('quitBtn').addEventListener('click', quitGame);
document.getElementById('pauseQuitBtn').addEventListener('click', quitGame);

// Settings toggles (only particles and screen shake in pause menu)
function setupToggle(id, settingKey) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
        settings[settingKey] = !settings[settingKey];
        btn.textContent = settings[settingKey] ? 'ON' : 'OFF';
        btn.classList.toggle('active', settings[settingKey]);
    });
}
setupToggle('toggleParticles', 'particlesEnabled');
setupToggle('toggleShake', 'screenShakeEnabled');

// Game loop - capped at 55fps for proper speed
const TARGET_FPS = 55;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
let lastFrameTime = 0;

function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);
    const elapsed = timestamp - lastFrameTime;
    if (elapsed < FRAME_INTERVAL) return;
    lastFrameTime = timestamp - (elapsed % FRAME_INTERVAL);
    game.update();
    game.draw();
}
game.starField.update(); game.draw(); requestAnimationFrame(gameLoop);
