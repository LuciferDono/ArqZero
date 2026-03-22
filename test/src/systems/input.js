/**
 * Input System
 * Handles keyboard and mouse input
 */

export class InputSystem {
    constructor() {
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            left: false,
            right: false,
            middle: false
        };
        
        this.bindEvents();
    }

    bindEvents() {
        // Keyboard events
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Mouse events
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    handleKeyDown(e) {
        this.keys[e.key.toLowerCase()] = true;
        this.keys[e.code] = true;
    }

    handleKeyUp(e) {
        this.keys[e.key.toLowerCase()] = false;
        this.keys[e.code] = false;
    }

    handleMouseMove(e) {
        const rect = e.target.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
    }

    handleMouseDown(e) {
        if (e.button === 0) this.mouse.left = true;
        if (e.button === 1) this.mouse.middle = true;
        if (e.button === 2) this.mouse.right = true;
    }

    handleMouseUp(e) {
        if (e.button === 0) this.mouse.left = false;
        if (e.button === 1) this.mouse.middle = false;
        if (e.button === 2) this.mouse.right = false;
    }

    isKeyPressed(key) {
        return this.keys[key.toLowerCase()] || this.keys[key];
    }

    isKeyDown(key) {
        return this.keys[key.toLowerCase()] || this.keys[key];
    }

    update(entities, deltaTime) {
        // Input system doesn't need per-frame updates
    }

    render(ctx, entities) {
        // Input system doesn't render
    }
}

export class InputMapper {
    constructor(inputSystem) {
        this.inputSystem = inputSystem;
        this.mappings = {};
    }

    mapAction(action, keys) {
        this.mappings[action] = keys;
    }

    isActionActive(action) {
        const keys = this.mappings[action];
        if (!keys) return false;

        return keys.some(key => this.inputSystem.isKeyDown(key));
    }

    isActionJustPressed(action) {
        const keys = this.mappings[action];
        if (!keys) return false;

        return keys.some(key => this.inputSystem.isKeyPressed(key));
    }
}