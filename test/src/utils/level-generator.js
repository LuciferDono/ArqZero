/**
 * Level Generator
 * Creates level layouts based on templates
 */

import { Platform } from '../entities/platform.js';
import { Enemy } from '../entities/enemy.js';
import { Coin } from '../entities/coin.js';

export class LevelGenerator {
    constructor() {
        this.levelTemplates = {
            'level-1': this.generateLevel1
        };
    }

    generateLevel(levelName) {
        const generator = this.levelTemplates[levelName] || this.levelTemplates['level-1'];
        return generator.call(this);
    }

    generateLevel1() {
        const entities = [];
        
        // Ground platforms
        entities.push(
            new Platform({ x: 0, y: 350, width: 300, height: 50, platformType: 'ground' }),
            new Platform({ x: 350, y: 350, width: 200, height: 50, platformType: 'ground' }),
            new Platform({ x: 600, y: 350, width: 150, height: 50, platformType: 'ground' }),
            new Platform({ x: 800, y: 350, width: 300, height: 50, platformType: 'ground' }),
            new Platform({ x: 1150, y: 350, width: 200, height: 50, platformType: 'ground' }),
            new Platform({ x: 1400, y: 350, width: 400, height: 50, platformType: 'ground' }),
            new Platform({ x: 1850, y: 350, width: 300, height: 50, platformType: 'ground' }),
        );

        // Floating brick platforms
        entities.push(
            new Platform({ x: 300, y: 280, width: 80, height: 20, platformType: 'brick' }),
            new Platform({ x: 450, y: 220, width: 80, height: 20, platformType: 'brick' }),
            new Platform({ x: 650, y: 280, width: 80, height: 20, platformType: 'brick' }),
            new Platform({ x: 850, y: 200, width: 100, height: 20, platformType: 'brick' }),
            new Platform({ x: 1000, y: 280, width: 80, height: 20, platformType: 'brick' }),
            new Platform({ x: 1200, y: 220, width: 100, height: 20, platformType: 'brick' }),
            new Platform({ x: 1350, y: 280, width: 80, height: 20, platformType: 'brick' }),
            new Platform({ x: 1550, y: 180, width: 100, height: 20, platformType: 'brick' }),
            new Platform({ x: 1700, y: 250, width: 80, height: 20, platformType: 'brick' }),
            new Platform({ x: 1800, y: 320, width: 80, height: 20, platformType: 'brick' }),
            new Platform({ x: 1950, y: 200, width: 100, height: 20, platformType: 'brick' }),
        );

        // Coins
        entities.push(
            new Coin({ x: 320, y: 240 }),
            new Coin({ x: 470, y: 180 }),
            new Coin({ x: 670, y: 240 }),
            new Coin({ x: 870, y: 160 }),
            new Coin({ x: 1020, y: 240 }),
            new Coin({ x: 1230, y: 180 }),
            new Coin({ x: 1570, y: 140 }),
            new Coin({ x: 1720, y: 210 }),
            new Coin({ x: 1970, y: 160 }),
        );

        // Enemies
        entities.push(
            new Enemy({ x: 400, y: 315, direction: 'left', speed: 40, patrolRange: 80 }),
            new Enemy({ x: 700, y: 315, direction: 'right', speed: 50, patrolRange: 100 }),
            new Enemy({ x: 950, y: 315, direction: 'left', speed: 45, patrolRange: 90 }),
            new Enemy({ x: 1300, y: 315, direction: 'right', speed: 55, patrolRange: 110 }),
            new Enemy({ x: 1600, y: 315, direction: 'left', speed: 40, patrolRange: 85 }),
            new Enemy({ x: 1900, y: 315, direction: 'right', speed: 50, patrolRange: 95 }),
        );

        return entities;
    }

    generateProceduralLevel(seed, complexity = 1) {
        // Future: Procedural level generation with seed
        return this.generateLevel1();
    }
}

export const levelData = {
    'level-1': {
        name: 'World 1-1',
        description: 'Classic platforming adventure',
        difficulty: 'easy'
    }
};