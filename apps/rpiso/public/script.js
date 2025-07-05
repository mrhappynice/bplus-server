document.addEventListener('DOMContentLoaded', () => {
    const API_PREFIX = '/api/rpiso';

    // DOM Elements
    const gameWorldEl = document.getElementById('game-world');
    const playerHpEl = document.getElementById('player-hp');
    const messageLogEl = document.getElementById('message-log');
    const resetButton = document.getElementById('reset-button');

    // Game State
    let gameState = null;
    let TILE_SIZE = 64; // in pixels

    // --- Core Functions ---

    async function init() {
        try {
            const response = await fetch(`${API_PREFIX}/state`);
            if (!response.ok) throw new Error('Failed to load game state.');
            gameState = await response.json();
            render();
            setupEventListeners();
        } catch (error) {
            logMessage(`Error: ${error.message}`, 'error');
        }
    }

    function render() {
        if (!gameState) return;
        renderMap();
        renderEntities();
        renderUI();
    }
    
    function setupEventListeners() {
        window.addEventListener('keydown', handleKeyPress);
        resetButton.addEventListener('click', handleReset);
    }

    // --- Rendering Functions ---

    function renderMap() {
        gameWorldEl.innerHTML = '';
        const gridContainer = document.createElement('div');
        gridContainer.className = 'isometric-grid';
        gridContainer.style.width = `${gameState.map.width * TILE_SIZE}px`;
        gridContainer.style.height = `${gameState.map.height * TILE_SIZE}px`;

        gameState.map.tiles.forEach((row, y) => {
            row.forEach((tileType, x) => {
                const tileEl = document.createElement('div');
                tileEl.className = 'tile';
                tileEl.classList.add(tileType === 1 ? 'wall' : 'grass');
                tileEl.style.left = `${x * TILE_SIZE}px`;
                tileEl.style.top = `${y * TILE_SIZE}px`;
                gridContainer.appendChild(tileEl);
            });
        });
        gameWorldEl.appendChild(gridContainer);
    }

    function renderEntities() {
        // Clear previous entities except the grid
        const existingEntities = gameWorldEl.querySelectorAll('.entity');
        existingEntities.forEach(e => e.remove());

        const gridContainer = gameWorldEl.querySelector('.isometric-grid');
        if (!gridContainer) return;
        
        const allEntities = [
            gameState.player,
            ...gameState.npcs,
            ...gameState.monsters
        ];
        
        allEntities.forEach(entity => {
            const entityEl = document.createElement('div');
            entityEl.className = 'entity';
            
            if (entity.hp !== undefined) { // It's a player or monster
                entityEl.classList.add(entity.maxHp ? 'player' : 'monster');
                if (entity.name) {
                     entityEl.dataset.name = entity.name;
                } else {
                     entityEl.dataset.name = 'Player';
                }
            } else { // It's an NPC
                entityEl.classList.add('npc');
                entityEl.dataset.name = entity.name;
            }

            entityEl.style.left = `${entity.x * TILE_SIZE + TILE_SIZE / 4}px`;
            entityEl.style.top = `${entity.y * TILE_SIZE + TILE_SIZE / 4}px`;
            gridContainer.appendChild(entityEl);
        });
    }

    function renderUI() {
        const { player } = gameState;
        playerHpEl.textContent = `HP: ${player.hp} / ${player.maxHp}`;
        playerHpEl.style.setProperty('--hp-percent', `${(player.hp / player.maxHp) * 100}%`);
    }

    // --- Event Handlers & API Calls ---

    async function handleKeyPress(e) {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        e.preventDefault();

        if (gameState.player.hp <= 0) {
            logMessage("You are defeated and cannot move.", "error");
            return;
        }

        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp') dy = -1;
        if (e.key === 'ArrowDown') dy = 1;
        if (e.key === 'ArrowLeft') dx = -1;
        if (e.key === 'ArrowRight') dx = 1;

        await performAction('move', { dx, dy });
    }
    
    async function handleReset() {
        try {
            const response = await fetch(`${API_PREFIX}/reset`, { method: 'POST' });
            if (!response.ok) throw new Error('Failed to reset the world.');
            const result = await response.json();
            gameState = result.newState;
            logMessage(result.message, 'system');
            render();
        } catch (error) {
            logMessage(`Error: ${error.message}`, 'error');
        }
    }

    async function performAction(type, payload) {
        try {
            const response = await fetch(`${API_PREFIX}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, payload }),
            });
            if (!response.ok) throw new Error('Action failed on server.');

            const result = await response.json();
            gameState = result.newState;
            logMessage(result.message);
            render();

        } catch (error) {
            logMessage(`Error: ${error.message}`, 'error');
        }
    }

    function logMessage(text, type = 'info') {
        const p = document.createElement('p');
        p.textContent = text;
        p.className = type;
        
        messageLogEl.appendChild(p);
        // Scroll to the bottom
        messageLogEl.scrollTop = messageLogEl.scrollHeight;
        
        // Limit log history
        while (messageLogEl.children.length > 20) {
            messageLogEl.removeChild(messageLogEl.firstChild);
        }
    }

    // --- Start the application ---
    init();
});