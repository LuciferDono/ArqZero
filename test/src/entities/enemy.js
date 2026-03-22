/**
 * Enemy Entity (Goomba)
 */

import { BaseEntity } from './base-entity.js';

export class Enemy extends BaseEntity {
    constructor(config) {
        super({
            type: 'enemy',
            width: 35,
            height: 35,
            ...config
        });
        
        this.speed = Math.abs(config.speed || 50);
        this.velocity.x = config.direction === 'left' ? -this.speed : this.speed;
        this.alive = true;
        this.scoreValue = 100;
        
        this.patrolStart = this.x;
        this.patrolRange = config.patrolRange || 100;
    }

    update(deltaTime) {
        if (!this.alive) {
            // Animation for dying
            this.scaleY = Math.max(0, (this.scaleY || 1) - deltaTime * 5);
            if (this.scaleY <= 0) {
                this.remove();
            }
            return;
        }

        // Patrol logic
        this.patrol(deltaTime);
    }

    patrol(deltaTime) {
        const distance = this.x - this.patrolStart;
        
        if (distance > this.patrolRange && this.velocity.x > 0) {
            this.velocity.x = -this.speed;
        } else if (distance < -this.patrolRange && this.velocity.x < 0) {
            this.velocity.x = this.speed;
        }
    }

    die() {
        this.alive = false;
        this.scaleY = 1;
    }

    getScoreValue() {
        return this.scoreValue;
    }

    render(ctx) {
        if (!this.alive) {
            this.renderDead(ctx);
            return;
        }
        
        this.renderGoomba(ctx);
    }

    renderGoomba(ctx) {
        const x = this.x;
        const y = this.y;
        const width = this.width;
        const height = this.height;
        
        // Body (brown mushroom shape)
        ctx.fillStyle = '#8b4513';
        ctx.beginPath();
        ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Face (lighter brown)
        ctx.fillStyle = '#d2691e';
        ctx.fillRect(x + 6, y + 6, width - 12, height - 12);
        
        // Angry eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 6, y + 8, width * 0.2, height * 0.23);
        ctx.fillRect(x + width * 0.5, y + 8, width * 0.2, height * 0.23);
        
        // Pupils
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 9, y + 10, width * 0.09, height * 0.12);
        ctx.fillRect(x + width * 0.57, y + 10, width * 0.09, height * 0.12);
        
        // Angry eyebrows
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 4, y + 6, width * 0.25, height * 0.05);
        ctx.fillRect(x + width * 0.45, y + 6, width * 0.25, height * 0.05);
        
        // Feet
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 2, y + height - 5, width * 0.25, height * 0.14);
        ctx.fillRect(x + width * 0.65, y + height - 5, width * 0.25, height * 0.14);
        
        // Animation legs
        const legOffset = Math.sin(Date.now() / 100) * 2;
        ctx.fillRect(x + 5 + legOffset, y + height - 8, width * 0.15, height * 0.1);
        ctx.fillRect(x + width * 0.55 - legOffset, y + height - 8, width * 0.15, height * 0.1);
    }

    renderDead(ctx) {
        const x = this.x;
        const y = this.y + this.height * (1 - (this.scaleY || 0));
        const width = this.width;
        const height = this.height;
        
        // Squished body
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x, y + height * 0.7, width, height * 0.3);
        
        // Face
        ctx.fillStyle = '#d2691e';
        ctx.fillRect(x + 6, y + height * 0.7 + 2, width - 12, height * 0.2);
    }
}