/**
 * Base Entity Class
 * All game entities extend from this class
 */

export class BaseEntity {
    constructor(config) {
        this.type = config.type || 'entity';
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.width = config.width || 32;
        this.height = config.height || 32;
        this.velocity = {
            x: 0,
            y: 0
        };
        this.isStatic = config.isStatic || false;
        this.affectedByGravity = config.affectedByGravity || true;
        this.enabled = true;
        this.isRemoved = false;
        
        // Physics properties
        this.friction = 0.8;
        this.onGround = false;
    }

    update(deltaTime) {
        // Override in subclasses
    }

    render(ctx) {
        // Override in subclasses
    }

    remove() {
        this.isRemoved = true;
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    setVelocity(x, y) {
        this.velocity.x = x;
        this.velocity.y = y;
    }
}