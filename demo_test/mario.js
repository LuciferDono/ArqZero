// Super Mario Style Game - 3 Levels
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game constants
const TILE_SIZE = 32;
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 4;
const MAX_FALL_SPEED = 12;

// Game state
let gameState = 'playing'; // playing, paused, gameover, levelcomplete, victory
let currentLevel = 1;
let score = 0;
let lives = 3;

// Level designs (0 = empty, 1 = ground, 2 = brick, 3 = question block, 4 = pipe, 5 = goomba, 6 = koopa troopa, 7 = coin, 8 = power-up, 9 = flag, 10 = hard block, 11 = platform)
const LEVELS = {
    1: {
        background: '#87ceeb',
        groundColor: '#8B4513',
        playerStart: { x: 50, y: 300 },
        goalX: 750,
        layout: [
            // Level 1 - Grass Plains (25 x 15)
            "                                                                                         ",
            "                                                                                         ",
            "                                                                                         ",
            "                                                                                         ",
            "                                                                                         ",
            "                                                                                         ",
            "                                                                                         ",
            "                                                                                         ",
            "                                                                                         ",
            "                                    3                                                    ",
            "       2     2                   11111                                                   ",
            "                   2222    7     11111              777                                 ",
            "        7    10    1111           11111    5        1111         5        9            ",
            "11111111111111111111111111111111111111111111111111111111111111111111111111111111111111",
            "11111111111111111111111111111111111111111111111111111111111111111111111111111111111"
        ]
    },
    2: {
        background: '#4a4a8a',
        groundColor: '#3d3d6b',
        playerStart: { x: 50, y: 300 },
        goalX: 750,
        layout: [
            // Level 2 - Underground
            "                                                                                         ",
            "                                                                                         ",
            "                                                                                         ",
            "                                                                                         ",
            "                                                                                         ",
            "                                                                                     3   ",
            "      2        7       2     5                                                         111 ",
            "               7                                                                 5     111 ",
            "          11      7       11               10  10  10                       5        111 ",
            "     11     11   7    11      11    10     1111111111    10    5     11       11    111 ",
            "11111111111111111111111111111110     111111111111111111    10  11111111111111111111111111",
            "11111111111111111111111111111110  5   111111111111111111    10  11111111111111111111111111",
            "777777777777777777777777777    10     777777777777777777    10  77777777777777777777777777",
            "11111111111111111111111111111110     111111111111111111    10  11111111111111111111111111",
            "11111111111111111111111111111110     111111111111111111  5  10  11111111111111111111111111"
        ]
    },
    3: {
        background: '#ff6b4a',
        groundColor: '#8b0000',
        playerStart: { x: 50, y: 300 },
        goalX: 720,
        layout: [
            // Level 3 - Castle (more challenging)
            "                                                                                         ",
            "                                                                                         ",
            "                              11        11                                                ",
            "                              11   5    11      5                                        ",
            "                              11        11                                               ",
            "                           7   11        11   7              9                          ",
            "                      2    7    11        11    7          111                         ",
            "                     11111111  11   11    11  11111111      111        5                ",
            "          5         1111111111 11   11    11 1111111111    111  11   111               ",
            "111111111111111111111111111111111   11    1111111111111111111  11   111                ",
            "1111111111111111111111111111111111111111111111111111111111111111111111111   4  4       ",
            "11111111111111111111111111111110  10     10  10  10  10  10     10  10111111  4  4    ",
            "111111111111111111111111111111101010101010101010101010101010101010101011111111  4  4    ",
            "11111111111111111111111111111110  10     10  10  10  10  10     10  1011111111111111111",
            "11111111111111111111111111111110  10     10  10  10  10  10     10  1011111111111111111"
        ]
    }
};

// Player object
const player = {
    x: 0,
    y: 0,
    width: 24,
    height: 32,
    velX: 0,
    velY: 0,
    jumping: false,
    grounded: false,
    facingRight: true,
    animFrame: 0,
    animTimer: 0,
    poweredUp: false,
    invincible: false,
    invincibleTimer: 0
};

// Game objects
let tiles = [];
let enemies = [];
let coins = [];
let powerUps = [];
let particles = [];
let flag = null;

// Input handling
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    if ((e.code === 'ArrowUp' || e.code === 'Space') && !player.jumping && player.grounded && gameState === 'playing') {
        player.velY = JUMP_FORCE;
        player.jumping = true;
        player.grounded = false;
    }
    
    if (e.code === 'KeyR') {
        restartGame();
    }
    
    if (e.code === 'Space' && gameState === 'levelcomplete') {
        nextLevel();
    }
    
    if (e.code === 'Space' && gameState === 'victory') {
        restartGame();
    }
    
    // Prevent scrolling
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Load level
function loadLevel(levelNum) {
    const level = LEVELS[levelNum];
    tiles = [];
    enemies = [];
    coins = [];
    powerUps = [];
    particles = [];
    flag = null;
    
    player.x = level.playerStart.x;
    player.y = level.playerStart.y;
    player.velX = 0;
    player.velY = 0;
    player.jumping = false;
    player.grounded = false;
    player.poweredUp = false;
    player.invincible = false;
    
    // Parse level layout
    for (let row = 0; row < level.layout.length; row++) {
        for (let col = 0; col < level.layout[row].length; col++) {
            const char = level.layout[row][col];
            const x = col * TILE_SIZE;
            const y = (row + 2) * TILE_SIZE; // Offset to align with bottom
            
            if (char === '1') { // Ground
                tiles.push({ x, y, width: TILE_SIZE, height: TILE_SIZE, type: 'ground', originalY: y });
            } else if (char === '2') { // Brick
                tiles.push({ x, y, width: TILE_SIZE, height: TILE_SIZE, type: 'brick', originalY: y, broken: false });
            } else if (char === '3') { // Question block
                tiles.push({ x, y, width: TILE_SIZE, height: TILE_SIZE, type: 'question', originalY: y, hit: false });
            } else if (char === '10') { // Hard block
                tiles.push({ x, y, width: TILE_SIZE, height: TILE_SIZE, type: 'hard', originalY: y });
            } else if (char === '11') { // Platform
                tiles.push({ x, y, width: TILE_SIZE, height: 16, type: 'platform', originalY: y });
            }
            // Flag
            else if (char === '9') {
                flag = { x, y, width: 20, height: TILE_SIZE * 3, type: 'flag' };
            }
            // Enemies
            else if (char === '5') { // Goomba
                enemies.push({
                    x, y,
                    width: 24,
                    height: 24,
                    velX: -1,
                    type: 'goomba',
                    alive: true,
                    animFrame: 0,
                    animTimer: 0
                });
            }
            // Coins
            else if (char === '7') {
                coins.push({
                    x: x + 8,
                    y: y + 8,
                    width: 16,
                    height: 16,
                    collected: false,
                    animFrame: 0,
                    animTimer: 0
                });
            }
        }
    }
}

// Collision detection
function AABB(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Update player
function updatePlayer() {
    // Horizontal movement
    if (keys['ArrowLeft']) {
        player.velX = -MOVE_SPEED;
        player.facingRight = false;
    } else if (keys['ArrowRight']) {
        player.velX = MOVE_SPEED;
        player.facingRight = true;
    } else {
        player.velX *= 0.8;
    }
    
    // Apply gravity
    player.velY += GRAVITY;
    if (player.velY > MAX_FALL_SPEED) player.velY = MAX_FALL_SPEED;
    
    // Move and check collisions
    player.grounded = false;
    
    // Horizontal collision
    player.x += player.velX;
    for (const tile of tiles) {
        if (AABB(player, tile) && tile.type !== 'platform') {
            if (player.velX > 0) {
                player.x = tile.x - player.width;
            } else if (player.velX < 0) {
                player.x = tile.x + tile.width;
            }
            player.velX = 0;
        }
    }
    
    // Keep player in bounds
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
    
    // Vertical collision
    player.y += player.velY;
    for (const tile of tiles) {
        if (AABB(player, tile)) {
            if (player.velY > 0) {
                player.y = tile.y - player.height;
                player.grounded = true;
                player.jumping = false;
            } else if (player.velY < 0 && tile.type !== 'platform') {
                player.y = tile.y + tile.height;
                player.velY = 0;
                
                // Hit block from below
                if (tile.type === 'question' && !tile.hit) {
                    tile.hit = true;
                    spawnCoin(tile.x + 8, tile.y - 20);
                    score += 50;
                } else if (tile.type === 'brick' && player.poweredUp && !tile.broken) {
                    tile.broken = true;
                    spawnBrickParticles(tile.x, tile.y);
                    score += 10;
                } else if (tile.type === 'brick') {
                    tile.y += 5;
                    setTimeout(() => { tile.y = tile.originalY; }, 100);
                }
            }
        }
    }
    
    // Platform collision (only from above)
    for (const tile of tiles) {
        if (tile.type === 'platform' && AABB(player, tile)) {
            if (player.velY > 0 && player.y + player.height - player.velY <= tile.y) {
                player.y = tile.y - player.height;
                player.grounded = true;
                player.jumping = false;
                player.velY = 0;
            }
        }
    }
    
    // Fall off screen
    if (player.y > canvas.height + 50) {
        loseLife();
    }
    
    // Animation
    player.animTimer++;
    if (player.animTimer > 10) {
        player.animTimer = 0;
        player.animFrame = (player.animFrame + 1) % 3;
    }
    
    // Invincibility timer
    if (player.invincible) {
        player.invincibleTimer--;
        if (player.invincibleTimer <= 0) {
            player.invincible = false;
        }
    }
}

// Update enemies
function updateEnemies() {
    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        
        // Move enemy
        enemy.x += enemy.velX;
        
        // Check tile collisions
        for (const tile of tiles) {
            if (AABB(enemy, tile) && tile.type !== 'platform') {
                if (enemy.velX > 0) {
                    enemy.x = tile.x - enemy.width;
                    enemy.velX = -1;
                } else if (enemy.velX < 0) {
                    enemy.x = tile.x + tile.width;
                    enemy.velX = 1;
                }
            }
        }
        
        // Turn around at screen edges
        if (enemy.x <= 0 || enemy.x >= canvas.width - enemy.width) {
            enemy.velX *= -1;
        }
        
        // Animation
        enemy.animTimer++;
        if (enemy.animTimer > 10) {
            enemy.animTimer = 0;
            enemy.animFrame = (enemy.animFrame + 1) % 2;
        }
        
        // Player collision
        if (!player.invincible && AABB(player, enemy)) {
            // Check if player stomped enemy
            if (player.velY > 0 && player.y + player.height < enemy.y + enemy.height / 2) {
                enemy.alive = false;
                player.velY = JUMP_FORCE / 2;
                score += 100;
                spawnDeathParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            } else {
                loseLife();
            }
        }
    }
}

// Update coins
function updateCoins() {
    for (const coin of coins) {
        if (coin.collected) continue;
        
        coin.animTimer++;
        if (coin.animTimer > 5) {
            coin.animTimer = 0;
            coin.animFrame = (coin.animFrame + 1) % 4;
        }
        
        if (AABB(player, coin)) {
            coin.collected = true;
            score += 10;
        }
    }
}

// Check flag collision
function checkFlagCollision() {
    if (flag && AABB(player, flag)) {
        gameState = 'levelcomplete';
        document.getElementById('level-complete').classList.remove('hidden');
    }
}

// Spawn functions
function spawnCoin(x, y) {
    coins.push({
        x, y,
        width: 16,
        height: 16,
        collected: false,
        animFrame: 0,
        animTimer: 0,
        spawned: true
    });
}

function spawnBrickParticles(x, y) {
    for (let i = 0; i < 4; i++) {
        particles.push({
            x: x + Math.random() * 16,
            y: y,
            velX: (Math.random() - 0.5) * 6,
            velY: -Math.random() * 4 - 2,
            width: 8,
            height: 8,
            color: '#bdb064',
            life: 30
        });
    }
}

function spawnDeathParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x, y,
            velX: (Math.random() - 0.5) * 6,
            velY: (Math.random() - 0.5) * 6,
            width: 6,
            height: 6,
            color: '#8b4513',
            life: 20
        });
    }
}

function updateParticles() {
    for (const particle of particles) {
        particle.x += particle.velX;
        particle.y += particle.velY;
        particle.velY += 0.2;
        particle.life--;
    }
    particles = particles.filter(p => p.life > 0);
}

// Lose life
function loseLife() {
    lives--;
    if (lives <= 0) {
        gameOver(false);
    } else {
        player.invincible = true;
        player.invincibleTimer = 120;
        player.x = LEVELS[currentLevel].playerStart.x;
        player.y = LEVELS[currentLevel].playerStart.y;
        player.velX = 0;
        player.velY = 0;
    }
    updateUI();
}

// Game over
function gameOver(victory) {
    gameState = victory ? 'victory' : 'gameover';
    const gameOverDiv = document.getElementById('game-over');
    const titleEl = document.getElementById('game-over-title');
    const messageEl = document.getElementById('game-over-message');
    
    gameOverDiv.classList.remove('hidden');
    
    if (victory) {
        titleEl.textContent = 'YOU WIN!';
        titleEl.classList.add('victory');
        messageEl.textContent = `Final Score: ${score} - Press R to play again`;
    } else {
        titleEl.textContent = 'GAME OVER';
        titleEl.classList.remove('victory');
        messageEl.textContent = `Final Score: ${score} - Press R to try again`;
    }
}

// Next level
function nextLevel() {
    currentLevel++;
    document.getElementById('level-complete').classList.add('hidden');
    
    if (currentLevel > 3) {
        gameOver(true);
    } else {
        loadLevel(currentLevel);
        gameState = 'playing';
        updateUI();
    }
}

// Restart game
function restartGame() {
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('level-complete').classList.add('hidden');
    
    currentLevel = 1;
    score = 0;
    lives = 3;
    gameState = 'playing';
    
    loadLevel(currentLevel);
    updateUI();
}

// Update UI
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
    document.getElementById('level').textContent = currentLevel;
}

// Draw functions
function draw() {
    const level = LEVELS[currentLevel];
    
    // Clear canvas
    ctx.fillStyle = level.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw tiles
    for (const tile of tiles) {
        if (tile.broken) continue;
        
        if (tile.type === 'ground') {
            drawGround(tile);
        } else if (tile.type === 'brick') {
            drawBrick(tile);
        } else if (tile.type === 'question') {
            drawQuestionBlock(tile);
        } else if (tile.type === 'hard') {
            drawHardBlock(tile);
        } else if (tile.type === 'platform') {
            drawPlatform(tile);
        }
    }
    
    // Draw flag
    if (flag) {
        drawFlag(flag);
    }
    
    // Draw coins
    for (const coin of coins) {
        if (!coin.collected) {
            drawCoin(coin);
        }
    }
    
    // Draw enemies
    for (const enemy of enemies) {
        if (enemy.alive) {
            drawGoomba(enemy);
        }
    }
    
    // Draw player
    if (!player.invincible || Math.floor(Date.now() / 100) % 2) {
        drawMario(player);
    }
    
    // Draw particles
    for (const particle of particles) {
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, particle.width, particle.height);
    }
}

// Drawing helpers with textures
function drawGround(tile) {
    const level = LEVELS[currentLevel];
    
    // Main ground block
    ctx.fillStyle = level.groundColor;
    ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
    
    // Grass/detail on top
    ctx.fillStyle = currentLevel === 1 ? '#228b22' : (currentLevel === 2 ? '#556b2f' : '#8b4513');
    ctx.fillRect(tile.x, tile.y, tile.width, 4);
    
    // Brick texture pattern
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(tile.x + 2, tile.y + 6, tile.width - 4, tile.height - 8);
    ctx.beginPath();
    ctx.moveTo(tile.x + tile.width / 2, tile.y + 6);
    ctx.lineTo(tile.x + tile.width / 2, tile.y + tile.height - 2);
    ctx.stroke();
}

function drawBrick(tile) {
    // Brick color
    ctx.fillStyle = '#b05232';
    ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
    
    // Brick pattern
    ctx.strokeStyle = '#8b4026';
    ctx.lineWidth = 2;
    ctx.strokeRect(tile.x + 1, tile.y + 1, tile.width - 2, tile.height - 2);
    
    // Inner brick lines
    ctx.beginPath();
    ctx.moveTo(tile.x, tile.y + tile.height / 2);
    ctx.lineTo(tile.x + tile.width, tile.y + tile.height / 2);
    ctx.moveTo(tile.x + tile.width / 2, tile.y + tile.height / 2);
    ctx.lineTo(tile.x + tile.width / 2, tile.y + tile.height);
    ctx.stroke();
}

function drawQuestionBlock(tile) {
    const colors = tile.hit ? ['#8b6914', '#a07818'] : ['#ffd700', '#ffed4a'];
    ctx.fillStyle = colors[0];
    ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
    
    // Border
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.strokeRect(tile.x + 1, tile.y + 1, tile.width - 2, tile.height - 2);
    
    // Question mark
    ctx.fillStyle = tile.hit ? '#8b6914' : '#8b4513';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tile.hit ? '' : '?', tile.x + tile.width / 2, tile.y + tile.height / 2);
    
    // Corner dots
    ctx.fillStyle = colors[1];
    const dotSize = 4;
    ctx.fillRect(tile.x + 3, tile.y + 3, dotSize, dotSize);
    ctx.fillRect(tile.x + tile.width - dotSize - 3, tile.y + 3, dotSize, dotSize);
    ctx.fillRect(tile.x + 3, tile.y + tile.height - dotSize - 3, dotSize, dotSize);
    ctx.fillRect(tile.x + tile.width - dotSize - 3, tile.y + tile.height - dotSize - 3, dotSize, dotSize);
}

function drawHardBlock(tile) {
    ctx.fillStyle = '#654321';
    ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
    
    // Hard texture
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(tile.x + 2, tile.y + 2, tile.width - 4, tile.height - 4);
    
    // Rivets
    ctx.fillStyle = '#8b6914';
    ctx.beginPath();
    ctx.arc(tile.x + 4, tile.y + 4, 2, 0, Math.PI * 2);
    ctx.arc(tile.x + tile.width - 4, tile.y + 4, 2, 0, Math.PI * 2);
    ctx.arc(tile.x + 4, tile.y + tile.height - 4, 2, 0, Math.PI * 2);
    ctx.arc(tile.x + tile.width - 4, tile.y + tile.height - 4, 2, 0, Math.PI * 2);
    ctx.fill();
}

function drawPlatform(tile) {
    ctx.fillStyle = '#c0a080';
    ctx.fillRect(tile.x, tile.y, tile.width, tile.height);
    
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;
    ctx.strokeRect(tile.x, tile.y, tile.width, tile.height);
    
    // Wood grain
    ctx.strokeStyle = '#a08060';
    ctx.beginPath();
    ctx.moveTo(tile.x + 4, tile.y + 2);
    ctx.lineTo(tile.x + tile.width - 4, tile.y + tile.height - 2);
    ctx.stroke();
}

function drawFlag(flag) {
    // Pole
    ctx.fillStyle = '#2d5a2d';
    ctx.fillRect(flag.x + 8, flag.y, 4, flag.height + 50);
    
    // Flag
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(flag.x + 12, flag.y);
    ctx.lineTo(flag.x + 12 + 30, flag.y + 15);
    ctx.lineTo(flag.x + 12, flag.y + 30);
    ctx.closePath();
    ctx.fill();
    
    // Star on flag
    ctx.fillStyle = '#ffff00';
    ctx.font = '12px Arial';
    ctx.fillText('★', flag.x + 20, flag.y + 18);
    
    // Ball on top
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(flag.x + 10, flag.y, 6, 0, Math.PI * 2);
    ctx.fill();
}

function drawCoin(coin) {
    const scaleX = Math.sin(coin.animFrame * Math.PI / 2);
    ctx.fillStyle = coin.spawned ? '#ffd700' : '#ffed4a';
    ctx.fillRect(
        coin.x + (16 - 16 * Math.abs(scaleX)) / 2,
        coin.y,
        16 * Math.abs(scaleX),
        16
    );
    
    // Coin shine
    ctx.fillStyle = '#fff';
    ctx.fillRect(
        coin.x + 4 + (16 - 16 * Math.abs(scaleX)) / 2,
        coin.y + 2,
        4 * Math.abs(scaleX),
        4
    );
}

function drawGoomba(enemy) {
    // Body (mushroom shape)
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.ellipse(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 + 4, enemy.width / 2, enemy.height / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Head (cap)
    ctx.fillStyle = '#a0522d';
    ctx.beginPath();
    ctx.ellipse(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 - 4, enemy.width / 2 + 2, enemy.height / 2 - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Spots
    ctx.fillStyle = '#deb887';
    ctx.beginPath();
    ctx.arc(enemy.x + 6, enemy.y + 6, 3, 0, Math.PI * 2);
    ctx.arc(enemy.x + enemy.width - 6, enemy.y + 6, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(enemy.x + 8, enemy.y + 10, 4, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(enemy.x + enemy.width - 8, enemy.y + 10, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(enemy.x + 8, enemy.y + 11, 2, 0, Math.PI * 2);
    ctx.arc(enemy.x + enemy.width - 8, enemy.y + 11, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Feet (animated)
    ctx.fillStyle = '#000';
    if (enemy.animFrame === 0) {
        ctx.fillRect(enemy.x + 2, enemy.y + enemy.height - 4, 8, 4);
        ctx.fillRect(enemy.x + enemy.width - 10, enemy.y + enemy.height - 6, 8, 4);
    } else {
        ctx.fillRect(enemy.x + 2, enemy.y + enemy.height - 6, 8, 4);
        ctx.fillRect(enemy.x + enemy.width - 10, enemy.y + enemy.height - 4, 8, 4);
    }
}

function drawMario(player) {
    const x = player.x;
    const y = player.y;
    const w = player.width;
    const h = player.height;
    
    // Body (red overalls)
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x + 4, y + 12, w - 8, h / 2);
    
    // Arms
    ctx.fillStyle = '#ffcc99'; // Skin
    if (player.facingRight) {
        ctx.fillRect(x + w - 6, y + 14, 6, 8);
    } else {
        ctx.fillRect(x, y + 14, 6, 8);
    }
    
    // Legs (blue overalls)
    ctx.fillStyle = '#0066cc';
    if (player.animFrame === 0 || !player.grounded) {
        ctx.fillRect(x + 4, y + h - 10, 6, 10);
        ctx.fillRect(x + w - 10, y + h - 10, 6, 10);
    } else if (player.animFrame === 1) {
        ctx.fillRect(x + 2, y + h - 8, 6, 8);
        ctx.fillRect(x + w - 8, y + h - 12, 6, 10);
    } else {
        ctx.fillRect(x + 4, y + h - 12, 6, 10);
        ctx.fillRect(x + w - 10, y + h - 8, 6, 8);
    }
    
    // Head
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(x + 4, y, w - 8, 12);
    
    // Hat
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x + 2, y - 2, w - 4, 6);
    ctx.fillRect(x + (player.facingRight ? w - 6 : 2), y - 2, 8, 8);
    
    // Hat brim
    ctx.fillStyle = '#cc0000';
    if (player.facingRight) {
        ctx.fillRect(x + w - 4, y + 2, 6, 4);
    } else {
        ctx.fillRect(x - 2, y + 2, 6, 4);
    }
    
    // Eyes
    ctx.fillStyle = '#000';
    if (player.facingRight) {
        ctx.fillRect(x + w - 10, y + 4, 4, 4);
    } else {
        ctx.fillRect(x + 6, y + 4, 4, 4);
    }
    
    // Mustache (animated)
    ctx.fillStyle = '#4a2800';
    if (player.animFrame === 0 || !player.grounded) {
        ctx.fillRect(x + 4, y + 10, w - 8, 2);
    } else {
        ctx.fillRect(x + 6, y + 10, w - 12, 2);
    }
    
    // M logo on hat
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px Arial';
    ctx.fillText('M', x + w / 2 - 3, y + 3);
}

// Game loop
function gameLoop() {
    if (gameState === 'playing') {
        updatePlayer();
        updateEnemies();
        updateCoins();
        updateParticles();
        checkFlagCollision();
        updateUI();
    }
    
    draw();
    requestAnimationFrame(gameLoop);
}

// Initialize game
window.onload = () => {
    loadLevel(currentLevel);
    updateUI();
    gameLoop();
};