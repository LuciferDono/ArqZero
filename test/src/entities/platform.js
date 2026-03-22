/**
 * Platform Entity
 */

import { BaseEntity } from './base-entity.js';

export class Platform extends BaseEntity {
    constructor(config) {
        super({
            type: 'platform',
            isStatic: true,
            affectedByGravity: false,
            ...config
        });
        
        this.platformType = config.platformType || 'ground';
        this.colors = this.getPlatformColors(this.platformType);
    }

    getPlatformColors(type) {
        const colorMap = {
            ground: {
                main: '#8b4513',
                pattern: '#5a3d2b',
                accent: '#a0522d'
            },
            brick: {
                main: '#cd853f',
                pattern: '#8b4513',
                accent: '#d2691e'
            },
            stone: {
                main: '#696969',
                pattern: '#4a4a4a',
                accent: '#808080'
            },
            ice: {
                main: '#87CEEB',
                pattern: '#4169E1',
                accent: '#ADD8E6'
            }
        };
        
        return colorMap[type] || colorMap.ground;
    }

    render(ctx) {
        this.renderPlatform(ctx);
    }

    renderPlatform(ctx) {
        const x = this.x;
        const y = this.y;
        const width = this.width;
        const height = this.height;
        
        // Main platform body
        ctx.fillStyle = this.colors.main;
        ctx.fillRect(x, y, width, height);
        
        // Pattern overlay
        ctx.fillStyle = this.colors.pattern;
        
        // Brick/stone pattern
        const brickWidth = 20;
        const brickHeight = height;
        
        for (let i = 0; i < width; i += brickWidth) {
            ctx.fillRect(x + i, y, 2, height);
        }
        
        // Top border
        ctx.fillStyle = this.colors.accent;
        ctx.fillRect(x, y, width, 3);
        
        // Bottom border
        ctx.fillRect(x, y + height - 3, width, 3);
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(x, y + height, width, 5);
        
        // Highlight on top
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x, y, width, 2);
    }

    renderAsBlock(ctx) {
        // Alternative block-style rendering
        const x = this.x;
        const y = this.y;
        const width = this.width;
        const height = this.height;
        
        // Block body
        ctx.fillStyle = this.colors.main;
        ctx.fillRect(x, y, width, height);
        
        // Inner border
        ctx.strokeStyle = this.colors.pattern;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 3, y + 3, width - 6, height - 6);
        
        // Corner accents
        ctx.fillStyle = this.colors.accent;
        ctx.fillRect(x, y, 4, 4);
        ctx.fillRect(x + width - 4, y, 4, 4);
        ctx.fillRect(x, y + height - 4, 4, 4);
        ctx.fillRect(x + width - 4, y + height - 4, 4, 4);
    }
}