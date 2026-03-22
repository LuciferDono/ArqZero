/**
 * Player Entity (Mario)
 */

import { BaseEntity } from './base-entity.js';

export class Player extends BaseEntity {
    constructor(config) {
        super({
            type: 'player',
            ...config
        });
        
        this.speed = 200;
        this.jumpForce = -400;
        this.score = 0;
        this.lives = 3;
        
        this.isInvincible = false;
        this.invincibleTimer = 0;
        this.invincibleDuration = 2; // seconds
        
        this.facingRight = true;
        this.isJumping = false;
    }

    update(deltaTime) {
        // Handle invincibility
        if (this.isInvincible) {
            this.invincibleTimer -= deltaTime;
            if (this.invincibleTimer <= 0) {
                this.isInvincible = false;
            }
        }
        
        // Check if jumping
        this.isJumping = !this.onGround;
    }

    takeDamage() {
        if (this.isInvincible) return;
        
        this.lives--;
        this.isInvincible = true;
        this.invincibleTimer = this.invincibleDuration;
        
        // Knockback
        this.velocity.x = -200;
        this.velocity.y = -200;
        
        if (this.lives <= 0) {
            this.handleDeath();
        }
    }

    handleDeath() {
        // Emit game over event or handle death
    }

    addScore(points) {
        this.score += points;
    }

    render(ctx) {
        ctx.save();
        
        // Blink if invincible
        if (this.isInvincible) {
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 50) * 0.3;
        }
        
        this.renderMario(ctx);
        
        ctx.restore();
    }

    renderMario(ctx) {
        const x = this.x;
        const y = this.y;
        const width = this.width;
        const height = this.height;
        
        // Determine facing direction for mirrored rendering
        if (!this.facingRight) {
            ctx.translate(x + width, y);
            ctx.scale(-1, 1);
            ctx.translate(-x, -y);
        }
        
        // Body (red overalls)
        ctx.fillStyle = '#e52521';
        ctx.fillRect(x, y + height * 0.3, width, height * 0.7);
        
        // Shirt (blue)
        ctx.fillStyle = '#0066cc';
        ctx.fillRect(x + 3, y + height * 0.35, width - 6, height * 0.15);
        
        // Head (skin color)
        ctx.fillStyle = '#f5deb3';
        ctx.fillRect(x + width * 0.25, y - height * 0.25, width * 0.5, height * 0.4);
        
        // Hat (red)
        ctx.fillStyle = '#e52521';
        ctx.fillRect(x + width * 0.2, y - height * 0.35, width * 0.6, height * 0.15);
        
        // Hat brim
        ctx.fillRect(x, y - height * 0.25, width * 0.3, height * 0.1);
        
        // Mustache
        ctx.fillStyle = '#4a2c2a';
        ctx.fillRect(x + width * 0.2, y + height * 0.05, width * 0.4, height * 0.06);
        
        // Eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + width * 0.3, y - height * 0.2, width * 0.08, height * 0.08);
        ctx.fillRect(x + width * 0.55, y - height * 0.2, width * 0.08, height * 0.08);
        
        // Arms
        ctx.fillStyle = '#f5deb3';
        ctx.fillRect(x + width * 0.1, y + height * 0.35, width * 0.15, height * 0.25);
        ctx.fillRect(x + width * 0.75, y + height * 0.35, width * 0.15, height * 0.25);
        
        // Gloves
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + width * 0.05, y + height * 0.55, width * 0.2, height * 0.1);
        ctx.fillRect(x + width * 0.75, y + height * 0.55, width * 0.2, height * 0.1);
        
        // Legs (blue pants)
        ctx.fillStyle = '#0066cc';
        ctx.fillRect(x + width * 0.2, y + height * 0.75, width * 0.25, height * 0.25);
        ctx.fillRect(x + width * 0.55, y + height * 0.75, width * 0.25, height * 0.25);
        
        // Shoes (brown)
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x + width * 0.15, y + height * 0.95, width * 0.35, height * 0.05);
        ctx.fillRect(x + width * 0.5, y + height * 0.95, width * 0.35, height * 0.05);
    }

    jump() {
        if (this.onGround) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
        }
    }

    moveLeft() {
        this.velocity.x = -this.speed;
        this.facingRight = false;
    }

    moveRight() {
        this.velocity.x = this.speed;
        this.facingRight = true;
    }

    stopHorizontalMovement() {
        this.velocity.x = 0;
    }

    respawn() {
        this.x = 50;
        this.y = 300;
        this.velocity.x = 0;
        this.velocity.y = 0;
        this.isInvincible = true;
        this.invincibleTimer = this.invincibleDuration;
    }
}