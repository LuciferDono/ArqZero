/**
 * Physics System
 * Handles collision detection and physics calculations
 */

export class PhysicsSystem {
    constructor(config = {}) {
        this.gravity = config.gravity || 500;
        this.friction = config.friction || 0.8;
        this.airResistance = config.airResistance || 0.98;
        
        this.compatibleEntityTypes = ['player', 'enemy', 'platform', 'coin'];
    }

    update(entities, deltaTime) {
        const physicsEntities = entities.filter(e => 
            this.compatibleEntityTypes.includes(e.type)
        );

        // Apply gravity and update positions
        for (const entity of physicsEntities) {
            if (entity.velocity && !entity.isStatic) {
                this.applyGravity(entity, deltaTime);
                this.updatePosition(entity, deltaTime);
                this.applyFriction(entity, deltaTime);
            }
        }

        // Check collisions
        this.checkCollisions(physicsEntities);
    }

    applyGravity(entity, deltaTime) {
        if (entity.affectedByGravity && !entity.onGround) {
            entity.velocity.y += this.gravity * deltaTime;
        }
    }

    updatePosition(entity, deltaTime) {
        entity.x += entity.velocity.x * deltaTime;
        entity.y += entity.velocity.y * deltaTime;
    }

    applyFriction(entity, deltaTime) {
        if (entity.onGround) {
            entity.velocity.x *= this.friction;
        } else {
            entity.velocity.x *= this.airResistance;
        }
    }

    checkCollisions(entities) {
        // Separate entities by type
        const platforms = entities.filter(e => e.type === 'platform');
        const coins = entities.filter(e => e.type === 'coin');
        const enemies = entities.filter(e => e.type === 'enemy');
        const players = entities.filter(e => e.type === 'player');

        // Check player-platform collisions
        for (const player of players) {
            player.onGround = false;
            
            for (const platform of platforms) {
                this.handlePlayerPlatformCollision(player, platform);
            }
        }

        // Check player-enemy collisions
        for (const player of players) {
            for (const enemy of enemies) {
                if (!enemy.alive) continue;
                this.handlePlayerEnemyCollision(player, enemy);
            }
        }

        // Check player-coin collisions
        for (const player of players) {
            for (const coin of coins) {
                if (coin.collected) continue;
                this.handlePlayerCoinCollision(player, coin);
            }
        }

        // Check enemy-platform collisions
        for (const enemy of enemies) {
            for (const platform of platforms) {
                this.handleEnemyPlatformCollision(enemy, platform);
            }
        }
    }

    handlePlayerPlatformCollision(player, platform) {
        const collision = this.getCollision(player, platform);
        
        if (!collision) return;

        // Determine collision direction
        if (player.velocity.y > 0 && collision.isTop) {
            // Landing on top
            player.y = platform.y - player.height;
            player.velocity.y = 0;
            player.onGround = true;
        } else if (player.velocity.y < 0 && collision.isBottom) {
            // Hitting from below
            player.y = platform.y + platform.height;
            player.velocity.y = 0;
        } else if (player.velocity.x > 0) {
            // Hitting from left
            player.x = platform.x - player.width;
            player.velocity.x = 0;
        } else if (player.velocity.x < 0) {
            // Hitting from right
            player.x = platform.x + platform.width;
            player.velocity.x = 0;
        }
    }

    handleEnemyPlatformCollision(enemy, platform) {
        const collision = this.getCollision(enemy, platform);
        
        if (!collision) return;

        // Reverse direction at platform edges
        if (enemy.velocity.x > 0 && collision.isLeft) {
            enemy.velocity.x = -Math.abs(enemy.velocity.x);
        } else if (enemy.velocity.x < 0 && collision.isRight) {
            enemy.velocity.x = Math.abs(enemy.velocity.x);
        }
    }

    handlePlayerEnemyCollision(player, enemy) {
        const collision = this.getCollision(player, enemy);
        
        if (!collision) return;

        // Check if player jumped on enemy
        const playerBottom = player.y + player.height;
        const enemyTop = enemy.y;
        
        if (player.velocity.y > 0 && playerBottom - player.velocity.y < enemyTop + 10) {
            // Player defeated enemy
            enemy.die();
            player.velocity.y = -300; // Bounce up
        } else if (!player.isInvincible) {
            // Player hit by enemy
            player.takeDamage();
        }
    }

    handlePlayerCoinCollision(player, coin) {
        const collision = this.getCollision(player, coin);
        
        if (!collision) return;

        // Collect coin
        coin.collect();
    }

    getCollision(rect1, rect2) {
        const overlapX = this.getOverlap(
            rect1.x, rect1.x + rect1.width,
            rect2.x, rect2.x + rect2.width
        );
        
        const overlapY = this.getOverlap(
            rect1.y, rect1.y + rect1.height,
            rect2.y, rect2.y + rect2.height
        );

        if (overlapX <= 0 || overlapY <= 0) {
            return null;
        }

        return {
            overlapX,
            overlapY,
            isTop: overlapX < overlapY,
            isBottom: overlapX < overlapY && rect1.y < rect2.y,
            isLeft: overlapX >= overlapY && rect1.x < rect2.x,
            isRight: overlapX >= overlapY && rect1.x > rect2.x
        };
    }

    getOverlap(min1, max1, min2, max2) {
        return Math.max(0, Math.min(max1, max2) - Math.max(min1, min2));
    }

    render(ctx, entities) {
        // Physics system doesn't render
    }
}