/**
 * Game Controller
 * Main game logic and state management
 */

import { Player } from './entities/player.js';
import { LevelGenerator } from './utils/level-generator.js';

export class GameController {
    constructor(engine, inputSystem, physicsSystem) {
        this.engine = engine;
        this.inputSystem = inputSystem;
        this.physicsSystem = physicsSystem;
        
        this.player = null;
        this.levelGenerator = new LevelGenerator();
        this.currentLevel = null;
        
        this.gameState = 'playing'; // playing, paused, gameover
        this.callbacks = {
            onGameOver: null,
            onScoreChange: null,
            onLivesChange: null
        };
    }

    loadLevel(levelName) {
        this.engine.reset();
        
        const entities = this.levelGenerator.generateLevel(levelName);
        entities.forEach(entity => this.engine.addEntity(entity));
        
        // Create player
        this.player = new Player({
            x: 50,
            y: 300,
            width: 40,
            height: 50
        });
        
        this.engine.addEntity(this.player);
        this.currentLevel = levelName;
        this.gameState = 'playing';
    }

    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        this.handleInput();
        this.checkGameState();
        
        // Camera follows player
        this.engine.setCameraTarget(this.player);
        
        // Update score and lives callbacks
        if (this.callbacks.onScoreChange) {
            this.callbacks.onScoreChange(this.player.score);
        }
        
        if (this.callbacks.onLivesChange) {
            this.callbacks.onLivesChange(this.player.lives);
        }
    }

    handleInput() {
        if (!this.player) return;
        
        // Movement
        if (this.inputSystem.isKeyDown('arrowleft') || this.inputSystem.isKeyDown('a')) {
            this.player.moveLeft();
        } else if (this.inputSystem.isKeyDown('arrowright') || this.inputSystem.isKeyDown('d')) {
            this.player.moveRight();
        } else {
            this.player.stopHorizontalMovement();
        }
        
        // Jump
        if (this.inputSystem.isKeyDown(' ') || 
            this.inputSystem.isKeyDown('arrowup') || 
            this.inputSystem.isKeyDown('w')) {
            this.player.jump();
        }
        
        // Restart
        if (this.inputSystem.isKeyDown('r') && this.gameState === 'gameover') {
            this.restart();
        }
    }

    checkGameState() {
        if (!this.player) return;
        
        // Check if player fell off screen
        if (this.player.y > this.engine.canvas.height + 100) {
            this.player.takeDamage();
            if (this.player.lives > 0) {
                this.player.respawn();
            }
        }
        
        // Check game over condition
        if (this.player.lives <= 0 && this.gameState !== 'gameover') {
            this.gameState = 'gameover';
            if (this.callbacks.onGameOver) {
                this.callbacks.onGameOver(this.player.score);
            }
        }
    }

    restart() {
        this.loadLevel(this.currentLevel || 'level-1');
    }

    pause() {
        this.gameState = 'paused';
    }

    resume() {
        this.gameState = 'playing';
    }

    onGameOver(callback) {
        this.callbacks.onGameOver = callback;
    }

    onScoreChange(callback) {
        this.callbacks.onScoreChange = callback;
    }

    onLivesChange(callback) {
        this.callbacks.onLivesChange = callback;
    }

    getPlayer() {
        return this.player;
    }

    getGameState() {
        return this.gameState;
    }

    getScore() {
        return this.player ? this.player.score : 0;
    }

    getLives() {
        return this.player ? this.player.lives : 3;
    }
}