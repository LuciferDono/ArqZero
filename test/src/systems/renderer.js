/**
 * Rendering System
 * Handles background rendering and visual effects
 */

export class RenderingSystem {
    constructor(config = {}) {
        this.backgroundColors = config.backgroundColors || {
            skyTop: '#5c94fc',
            skyBottom: '#5c94fc',
            ground: '#4a4a4a'
        };
        
        this.clouds = [];
        this.hills = [];
        this.pipes = [];
        
        this.generateWorldElements();
    }

    generateWorldElements() {
        // Generate clouds
        for (let i = 0; i < 15; i++) {
            this.clouds.push({
                x: Math.random() * 3000,
                y: 30 + Math.random() * 60,
                size: 20 + Math.random() * 30,
                speed: 0.3 + Math.random() * 0.3
            });
        }

        // Generate hills
        for (let i = 0; i < 10; i++) {
            this.hills.push({
                x: i * 350 + Math.random() * 100,
                y: 350,
                width: 80 + Math.random() * 60,
                height: 60 + Math.random() * 40
            });
        }
    }

    update(entities, deltaTime) {
        // Update clouds (parallax effect)
        this.clouds.forEach(cloud => {
            cloud.x += cloud.speed * deltaTime * 60;
            if (cloud.x > 3200) {
                cloud.x = -100;
                cloud.y = 30 + Math.random() * 60;
            }
        });
    }

    render(ctx, entities, camera) {
        this.renderSky(ctx);
        this.renderClouds(ctx, camera);
        this.renderHills(ctx, camera);
    }

    renderSky(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, this.backgroundColors.skyTop);
        gradient.addColorStop(0.85, this.backgroundColors.skyBottom);
        gradient.addColorStop(1, this.backgroundColors.ground);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    renderClouds(ctx, camera) {
        ctx.fillStyle = '#ffffff';
        
        for (const cloud of this.clouds) {
            const x = cloud.x - camera.x * 0.3;
            
            if (x < -100 || x > ctx.canvas.width + 100) continue;
            
            this.drawCloud(ctx, x, cloud.y, cloud.size);
        }
    }

    drawCloud(ctx, x, y, size) {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.arc(x + size * 0.8, y - size * 0.3, size * 0.7, 0, Math.PI * 2);
        ctx.arc(x + size * 1.5, y, size, 0, Math.PI * 2);
        ctx.arc(x + size * 0.75, y + size * 0.2, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }

    renderHills(ctx, camera) {
        ctx.fillStyle = '#228b22';
        
        for (const hill of this.hills) {
            const x = hill.x - camera.x * 0.5;
            
            if (x < -100 || x > ctx.canvas.width + 100) continue;
            
            this.drawHill(ctx, x, hill.y, hill.width, hill.height);
        }
    }

    drawHill(ctx, x, y, width, height) {
        ctx.beginPath();
        ctx.moveTo(x, y + 50);
        ctx.quadraticCurveTo(x + width / 2, y - height, x + width, y + 50);
        ctx.quadraticCurveTo(x + width / 2, y + height, x, y + 50);
        ctx.fill();
    }
}

export class UISystem {
    constructor() {
        this.score = 0;
        this.lives = 3;
        this.isGameOver = false;
    }

    update(entities, deltaTime) {
        // Update UI based on game state
        const players = entities.filter(e => e.type === 'player');
        
        if (players.length > 0) {
            this.score = players[0].score || 0;
            this.lives = players[0].lives || 3;
        }
    }

    render(ctx, entities, camera) {
        // Render HUD
        this.renderHUD(ctx);
    }

    renderHUD(ctx) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 20, 30);
        ctx.fillText(`LIVES: ${this.lives}`, 20, 60);
        ctx.restore();
    }

    showGameOver(ctx, finalScore) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        ctx.fillStyle = '#e52521';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', ctx.canvas.width / 2, ctx.canvas.height / 2 - 50);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.fillText(`Final Score: ${finalScore}`, ctx.canvas.width / 2, ctx.canvas.height / 2 + 20);
        ctx.fillText('Press R to restart', ctx.canvas.width / 2, ctx.canvas.height / 2 + 60);
    }
}