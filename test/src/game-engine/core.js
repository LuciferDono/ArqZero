/**
 * Core Game Engine
 * Handles game loop, state management, and core functionality
 */

export class GameEngine {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.config = this.mergeDefaults(config);
        
        this.isRunning = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.framesPerSecond = 60;
        
        this.entities = [];
        this.systems = [];
        this.gameState = 'playing';
        
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            smoothness: 0.1
        };
        
        this.world = {
            width: 3000,
            height: 400
        };
        
        this.bindEvents();
    }

    mergeDefaults(config) {
        const defaults = {
            fps: 60,
            width: 800,
            height: 400
        };
        
        return {
            ...defaults,
            ...config
        };
    }

    bindEvents() {
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        // Handle window resize if needed
    }

    addEntity(entity) {
        this.entities.push(entity);
        return entity;
    }

    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index !== -1) {
            this.entities.splice(index, 1);
        }
    }

    addSystem(system) {
        this.systems.push(system);
        return system;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    stop() {
        this.isRunning = false;
    }

    gameLoop(currentTime = performance.now()) {
        if (!this.isRunning) return;

        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Cap delta time to prevent huge jumps
        this.deltaTime = Math.min(this.deltaTime, 0.1);

        this.update();
        this.render();

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update() {
        // Update camera
        this.updateCamera();

        // Update all systems
        for (const system of this.systems) {
            if (system.update) {
                system.update(this.entities, this.deltaTime);
            }
        }

        // Update all entities
        for (const entity of this.entities) {
            if (entity.update && !entity.isRemoved) {
                entity.update(this.deltaTime);
            }
        }

        // Remove dead entities
        this.entities = this.entities.filter(entity => !entity.isRemoved);
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply camera transform
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // Render all systems
        for (const system of this.systems) {
            if (system.render) {
                system.render(this.ctx, this.entities);
            }
        }

        // Render all entities
        for (const entity of this.entities) {
            if (entity.render && !entity.isRemoved) {
                entity.render(this.ctx);
            }
        }

        this.ctx.restore();
    }

    updateCamera() {
        this.camera.targetX += (this.camera.targetX - this.camera.x) * this.camera.smoothness;
        this.camera.targetY += (this.camera.targetY - this.camera.y) * this.camera.smoothness;
        
        this.camera.x = this.camera.targetX;
        this.camera.y = this.camera.targetY;
    }

    setCameraTarget(entity) {
        if (!entity) return;
        
        const targetX = entity.x - this.canvas.width / 3;
        const targetY = entity.y - this.canvas.height / 2;
        
        this.camera.targetX = Math.max(0, Math.min(targetX, this.world.width - this.canvas.width));
        this.camera.targetY = Math.max(0, Math.min(targetY, this.world.height - this.canvas.height));
    }

    getEntitiesByType(type) {
        return this.entities.filter(entity => entity.type === type);
    }

    pause() {
        this.gameState = 'paused';
    }

    resume() {
        this.gameState = 'playing';
    }

    reset() {
        this.entities = [];
        this.camera.x = 0;
        this.camera.y = 0;
        this.camera.targetX = 0;
        this.camera.targetY = 0;
    }
}

export class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    off(event, callback) {
        if (!this.events[event]) return;
        
        const index = this.events[event].indexOf(callback);
        if (index !== -1) {
            this.events[event].splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.events[event]) return;
        
        this.events[event].forEach(callback => {
            callback(data);
        });
    }
}