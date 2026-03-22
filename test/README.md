# Super Mario - Labs Architecture Edition

A professional, modular Super Mario-style platformer game using modern ES6 modules and Component-Entity-System (CES) architecture.

## Architecture Overview

This project follows a modern game development architecture with clear separation of concerns:

```
test/
├── src/
│   ├── game-engine/          # Core game engine
│   │   └── core.js           # GameEngine class, game loop, state management
│   ├── entities/             # All game entities
│   │   ├── base-entity.js    # Base entity class with common functionality
│   │   ├── player.js         # Player entity (Mario)
│   │   ├── enemy.js          # Enemy entities (Goombas)
│   │   ├── platform.js       # Platform entities
│   │   └── coin.js           # Collectible coin entities
│   ├── systems/              # Game systems (CES pattern)
│   │   ├── input.js          # Input handling and mapping
│   │   ├── physics.js        # Physics and collision detection
│   │   └── renderer.js       # Rendering system (background, UI)
│   ├── utils/                # Utility functions
│   │   └── level-generator.js # Level generation system
│   └── game-controller.js    # Main game logic and state management
├── assets/                   # Assets folder (for future expansion)
└── index.html                # Main entry point
```

## Architecture Features

### 1. **Component-Entity-System (CES) Pattern**
- **Entities**: Game objects (Player, Platform, Enemy, Coin)
- **Components**: Data stored in entities (position, velocity, type)
- **Systems**: Logic processing (Input, Physics, Rendering)

### 2. **Modular ES6 Modules**
- Proper import/export syntax
- Clear dependencies between modules
- Each module has a single responsibility

### 3. **Core Game Engine**
- Central game loop with delta time
- Entity management (add, remove, filter)
- System management
- Camera system with smooth following
- Event emitter for game events

### 4. **Entity System**
- Base entity class with common functionality
- Inheritance for specialized entities
- Update and render hooks
- Collision detection support

### 5. **Game Systems**
- **Input System**: Keyboard and mouse input handling
- **Physics System**: Gravity, collision detection, platform interaction
- **Rendering System**: Background rendering, parallax scrolling
- **UI System**: Heads-up display, game over screen

### 6. **Game Controller**
- Central game logic coordinator
- State management (playing, paused, game over)
- Player context management
- Level loading
- Event callbacks (game over, score changes)

### 7. **Level Generation**
- Template-based level creation
- Support for multiple levels
- Procedural generation ready for expansion

## How to Play

1. Open `index.html` in a modern web browser
2. Use controls:
   - **Arrow Keys** or **A/D** - Move left/right
   - **Space** or **W** or **Up Arrow** - Jump
   - **R** - Restart (when game over)

## Game Features

- **Character**: Detailed Mario rendering with animations
- **Multiple Entity Types**: 
  - Player with physics-based movement
  - Enemies with patrol behavior and AI
  - Platforms with different types (ground, brick)
  - Coins with spin animations and collection effects
- **Physics System**: 
  - Gravity simulation
  - Collision detection
  - Platform interaction
  - Enemy defeat mechanics
- **Camera System**: Smooth following with world boundaries
- **Rendering**: 
  - Parallax scrolling background
  - Animated clouds and hills
  - Entity animations
  - Visual effects (coin collection, invincibility)
- **Game State Management**: 
  - Score tracking
  - Lives system
  - Game over detection
  - Restart functionality

## Technical Highlights

- **Delta Time**: Frame-rate independent movement
- **Collision Detection**: AABB collision with directional detection
- **Camera Following**: Smooth camera with configurable following
- **Entity Management**: Efficient add/remove operations
- **Modular Systems**: Independent, extensible game systems
- **Type Safety**: Consistent entity types and properties
- **Performance**: Optimized rendering and updates

## Browser Console

Open browser console to see architecture information:
- Game engine instance
- Active systems
- Entity list
- Architecture features summary

## Future Expansion Ideas

- Add more entity types (power-ups, different enemy types)
- Implement multiple levels with level selection
- Add sound system with audio management
- Implement save/load game state
- Add particle effects system
- Create title screen and menus
- Add settings panel
- Implement touch controls for mobile
- Add multiplayer support
- Create level editor

## Development Notes

All code follows best practices:
- Clean separation of concerns
- Single Responsibility Principle
- DRY (Don't Repeat Yourself)
- Consistent naming conventions
- Proper documentation
- Extensible architecture

This architecture provides a solid foundation for game development and can be easily expanded with new features, entities, and systems.