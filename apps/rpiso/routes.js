const router = require('express').Router();

// --- Game State (In-Memory Database) ---
// In a real application, this would be in a database and managed per-session.
// For this demo, it's a single, shared state that can be reset.

const TILE = { GRASS: 0, WALL: 1, DOOR: 2 };
const MAP_WIDTH = 10;
const MAP_HEIGHT = 10;

let gameState;

function createInitialState() {
    const map = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(TILE.GRASS));
    // Create walls
    for (let i = 0; i < MAP_WIDTH; i++) {
        map[0][i] = TILE.WALL;
        map[MAP_HEIGHT - 1][i] = TILE.WALL;
    }
    for (let i = 0; i < MAP_HEIGHT; i++) {
        map[i][0] = TILE.WALL;
        map[i][MAP_WIDTH - 1] = TILE.WALL;
    }
    map[4][4] = TILE.WALL;
    map[4][5] = TILE.WALL;
    map[5][4] = TILE.WALL;

    return {
        player: { x: 2, y: 2, hp: 100, maxHp: 100, ap: 10 },
        npcs: [
            { id: 1, name: 'Old Man', x: 3, y: 6, dialogue: "Beware the goblin in the east! It guards a lost key." }
        ],
        monsters: [
            { id: 1, name: 'Goblin', x: 7, y: 7, hp: 30, maxHp: 30, ap: 8, isHostile: true }
        ],
        map: {
            tiles: map,
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
        },
    };
}

// Initialize the game state
gameState = createInitialState();

// --- API Routes ---

// GET /api/rpiso/state - Get the initial game state
router.get('/state', (req, res) => {
    res.json(gameState);
});

// POST /api/rpiso/reset - Reset the game to its initial state
router.post('/reset', (req, res) => {
    gameState = createInitialState();
    res.json({ message: "The world has been reset.", newState: gameState });
});

// POST /api/rpiso/action - Perform a player action
router.post('/action', (req, res) => {
    const { type, payload } = req.body;
    let message = "";

    if (type === 'move') {
        const { dx, dy } = payload;
        const { player, map, npcs, monsters } = gameState;
        const newX = player.x + dx;
        const newY = player.y + dy;

        // Check map boundaries and walls
        if (map.tiles[newY][newX] === TILE.WALL) {
            message = "You can't walk through walls.";
            return res.json({ message, newState: gameState });
        }

        // Check for NPCs
        const npc = npcs.find(n => n.x === newX && n.y === newY);
        if (npc) {
            message = `[${npc.name}]: "${npc.dialogue}"`;
            return res.json({ message, newState: gameState });
        }

        // Check for monsters
        const monster = monsters.find(m => m.x === newX && m.y === newY);
        if (monster) {
            // Player attacks monster
            const playerDamage = Math.floor(Math.random() * player.ap) + 1;
            monster.hp -= playerDamage;
            message = `You attack the ${monster.name} for ${playerDamage} damage.`;

            // Monster attacks player
            if (monster.hp > 0) {
                const monsterDamage = Math.floor(Math.random() * monster.ap) + 1;
                player.hp -= monsterDamage;
                message += ` The ${monster.name} retaliates for ${monsterDamage} damage.`;
                if (player.hp <= 0) {
                    message += " You have been defeated!";
                    player.hp = 0;
                }
            } else {
                message += ` You defeated the ${monster.name}!`;
                // Remove monster from game
                gameState.monsters = monsters.filter(m => m.id !== monster.id);
            }
        } else {
            // Valid move
            player.x = newX;
            player.y = newY;
            message = `You move to (${newX}, ${newY}).`;
        }
    }

    res.json({ message, newState: gameState });
});

module.exports = router;