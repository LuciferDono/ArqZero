/**
 * Coin Entity
 */

import { BaseEntity } from './base-entity.js';

export class Coin extends BaseEntity {
    constructor(config) {
        super({
            type: 'coin',
            width: 24,
            height: 24,
            affectedByGravity: false,
            ...config
        });
        
        this.collected = false;
        this.scoreValue = 50;
        this.spinSpeed = 3;
        this.rotationAngle = 0;
        this.collectOffset = 0;
    }

    collect() {
        if (this.collected) return;
        
        this.collected = true;
        this.collectOffset = 0;
    }

    update(deltaTime) {
        if (this.collected) {
            this.collectOffset += deltaTime * 200;
            this.isRemoved = this.collectOffset > 100;
        } else {
            // Spin animation
            this.rotationAngle += deltaTime * this.spinSpeed;
        }
    }

    getScoreValue() {
        return this.scoreValue;
    }

    render(ctx) {
        if (this.collected) {
            this.renderCollecting(ctx);
            return;
        }
        
        this.renderCoin(ctx);
    }

    renderCoin(ctx) {
        const x = this.x;
        const y = this.y;
        
        // Calculate spin scale
        const scaleX = Math.abs(Math.cos(this.rotationAngle));
        
        ctx.save();
        ctx.translate(x, y);
        
        // Outer coin
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12 * scaleX + 2, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner coin
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.ellipse(0, 0, 8 * scaleX, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Coin shine
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-3, -3, 3, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Dollar sign
        if (scaleX > 0.3) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 1);
        }
        
        ctx.restore();
    }

    renderCollecting(ctx) {
        const x = this.x;
        const y = this.y - this.collectOffset;
        const scale = 1 - this.collectOffset / 100;
        
        if (scale <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = 1 - this.collectOffset / 100;
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        
        // Glowing effect
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 20;
        
        // Coin
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}