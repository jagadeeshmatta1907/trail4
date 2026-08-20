/**
 * SHOW! Card Game - Core Game Logic & UI Controller
 * SEQUENTIAL TURN-BASED PASSING:
 * - Player A starts by picking 1 card to pass to Player B.
 * - Player B receives the card (holding 5 cards total).
 * - Player B inspects all 5 cards, selects 1 card to pass, and passes it to Player C.
 * - Player C receives it (5 cards), picks 1, and passes to Player D.
 * - Cycle continues clockwise one-by-one!
 * - As soon as ANY player matches 4 of a kind, they hit SUBMIT to trigger "SHOW!".
 * - Panic overlay activates for everyone else with reaction timing.
 * - Multi-round syncing across all players with host-driven next round transition.
 */

// ============ SAFETY FALLBACKS ============
if (!window.soundEngine) {
    window.soundEngine = {
        playTone() {}, playCardDeal() {}, playCardPass() {}, playCardSelect() {},
        playMatchComplete() {}, playShowSiren() {}, playBuzzer() {}, playRoundWin() {},
        playGrandChampion() {}, toggleMute() { return false; }
    };
}
if (!window.networkEngine) {
    window.networkEngine = {
        on() {}, emit() {},
        createRoom(a, b, cb) { if (cb) cb('SHOW1'); },
        joinRoom(a, b, cb) { if (cb) cb(a); },
        sendToHost() {}, sendToClient() {}, broadcast() {}, disconnect() {}
    };
}

// ============ THEMES (8 unique items per theme) ============
const THEMES = {
    royal: {
        id: 'royal', name: 'Royal Court', icon: '👑',
        cards: [
            { id: 'k',      name: 'King',    symbol: '👑', bgGradient: 'linear-gradient(135deg,#78350f,#d97706)', rankText: 'K' },
            { id: 'q',      name: 'Queen',   symbol: '👸', bgGradient: 'linear-gradient(135deg,#831843,#db2777)', rankText: 'Q' },
            { id: 'j',      name: 'Jack',    symbol: '🃏', bgGradient: 'linear-gradient(135deg,#164e63,#0891b2)', rankText: 'J' },
            { id: 'a',      name: 'Ace',     symbol: '🌟', bgGradient: 'linear-gradient(135deg,#713f12,#ca8a04)', rankText: 'A' },
            { id: 'knight', name: 'Knight',  symbol: '⚔️', bgGradient: 'linear-gradient(135deg,#581c87,#9333ea)', rankText: '⚔️' },
            { id: 'bishop', name: 'Bishop',  symbol: '⛪', bgGradient: 'linear-gradient(135deg,#064e3b,#059669)', rankText: '⛪' },
            { id: 'castle', name: 'Castle',  symbol: '🏰', bgGradient: 'linear-gradient(135deg,#1e293b,#475569)', rankText: '🏰' },
            { id: 'prince', name: 'Prince',  symbol: '🤴', bgGradient: 'linear-gradient(135deg,#881337,#e11d48)', rankText: '🤴' }
        ]
    },
    safari: {
        id: 'safari', name: 'Wild Safari', icon: '🦁',
        cards: [
            { id: 'lion',     name: 'Lion',     symbol: '🦁', bgGradient: 'linear-gradient(135deg,#7c2d12,#ea580c)', rankText: '🦁' },
            { id: 'panda',    name: 'Panda',    symbol: '🐼', bgGradient: 'linear-gradient(135deg,#064e3b,#059669)', rankText: '🐼' },
            { id: 'fox',      name: 'Fox',      symbol: '🦊', bgGradient: 'linear-gradient(135deg,#881337,#e11d48)', rankText: '🦊' },
            { id: 'eagle',    name: 'Eagle',    symbol: '🦅', bgGradient: 'linear-gradient(135deg,#312e81,#4f46e5)', rankText: '🦅' },
            { id: 'tiger',    name: 'Tiger',    symbol: '🐯', bgGradient: 'linear-gradient(135deg,#78350f,#d97706)', rankText: '🐯' },
            { id: 'elephant', name: 'Elephant', symbol: '🐘', bgGradient: 'linear-gradient(135deg,#334155,#64748b)', rankText: '🐘' },
            { id: 'monkey',   name: 'Monkey',   symbol: '🐵', bgGradient: 'linear-gradient(135deg,#451a03,#854d0e)', rankText: '🐵' },
            { id: 'wolf',     name: 'Wolf',     symbol: '🐺', bgGradient: 'linear-gradient(135deg,#0c4a6e,#0284c7)', rankText: '🐺' }
        ]
    },
    fruits: {
        id: 'fruits', name: 'Juicy Fruits', icon: '🍎',
        cards: [
            { id: 'apple',     name: 'Apple',      symbol: '🍎', bgGradient: 'linear-gradient(135deg,#7f1d1d,#dc2626)', rankText: '🍎' },
            { id: 'banana',    name: 'Banana',     symbol: '🍌', bgGradient: 'linear-gradient(135deg,#713f12,#ca8a04)', rankText: '🍌' },
            { id: 'grape',     name: 'Grape',      symbol: '🍇', bgGradient: 'linear-gradient(135deg,#581c87,#9333ea)', rankText: '🍇' },
            { id: 'berry',     name: 'Strawberry', symbol: '🍓', bgGradient: 'linear-gradient(135deg,#881337,#e11d48)', rankText: '🍓' },
            { id: 'melon',     name: 'Watermelon', symbol: '🍉', bgGradient: 'linear-gradient(135deg,#064e3b,#059669)', rankText: '🍉' },
            { id: 'pineapple', name: 'Pineapple',  symbol: '🍍', bgGradient: 'linear-gradient(135deg,#78350f,#d97706)', rankText: '🍍' },
            { id: 'orange',    name: 'Orange',     symbol: '🍊', bgGradient: 'linear-gradient(135deg,#7c2d12,#ea580c)', rankText: '🍊' },
            { id: 'cherry',    name: 'Cherry',     symbol: '🍒', bgGradient: 'linear-gradient(135deg,#881337,#be123c)', rankText: '🍒' }
        ]
    },
    heroes: {
        id: 'heroes', name: 'Superheroes', icon: '⚡',
        cards: [
            { id: 'thunder', name: 'Thunder', symbol: '⚡', bgGradient: 'linear-gradient(135deg,#0c4a6e,#0284c7)', rankText: '⚡' },
            { id: 'flame',   name: 'Flame',   symbol: '🔥', bgGradient: 'linear-gradient(135deg,#7c2d12,#ea580c)', rankText: '🔥' },
            { id: 'shadow',  name: 'Shadow',  symbol: '🕶️', bgGradient: 'linear-gradient(135deg,#1e293b,#475569)', rankText: '🕶️' },
            { id: 'cosmic',  name: 'Cosmic',  symbol: '🪐', bgGradient: 'linear-gradient(135deg,#701a75,#c026d3)', rankText: '🪐' },
            { id: 'frost',   name: 'Frost',   symbol: '❄️', bgGradient: 'linear-gradient(135deg,#155e75,#0891b2)', rankText: '❄️' },
            { id: 'mystic',  name: 'Mystic',  symbol: '🔮', bgGradient: 'linear-gradient(135deg,#6b21a8,#9333ea)', rankText: '🔮' },
            { id: 'wind',    name: 'Wind',    symbol: '🌪️', bgGradient: 'linear-gradient(135deg,#3f3f46,#71717a)', rankText: '🌪️' },
            { id: 'titan',   name: 'Titan',   symbol: '🛡️', bgGradient: 'linear-gradient(135deg,#854d0e,#ca8a04)', rankText: '🛡️' }
        ]
    }
};

const BOT_NAMES = [
    { name: 'Alex Bot',   avatar: '🤖' },
    { name: 'Sam Bot',    avatar: '🦊' },
    { name: 'Jordan Bot', avatar: '🤠' },
    { name: 'Casey Bot',  avatar: '🐱' },
    { name: 'Riley Bot',  avatar: '🥷' },
    { name: 'Morgan Bot', avatar: '👾' },
    { name: 'Taylor Bot', avatar: '🧙‍♂️' }
];

const AVATARS = ['😎', '🤠', '🦊', '🐱', '🤖', '👾', '🚀', '🧙‍♂️', '🥷', '🦄', '👑', '🔥'];

// ============================================================
//  MAIN SHOW GAME CLASS
// ============================================================
class ShowGame {
    constructor() {
        this.currentScreen = 'home';
        this.isSinglePlayer = true;
        this.isHost = true;
        this.mySeatIndex = 0;

        this.settings = {
            playerCount: 4,
            totalRounds: 5,
            theme: 'royal',
            points: [1000, 750, 500, 250, 150, 100, 50, 25],
            aiDifficulty: 'normal'
        };

        this.currentRound = 1;
        this.gameState = 'IDLE';

        this.players = [];

        // Sequential Turn Passing State
        this.currentTurnSeat = 0;
        this.passStartSeat   = 0;
        this.passesThisRound = 0;

        this.incomingCard      = null;
        this.selectedCardIndex = null;

        // SHOW Phase
        this.showTriggered       = false;
        this.showTriggeredBySeat = null;
        this.showStartTime       = 0;
        this.submitOrder         = [];
        this.reactionInterval    = null;

        this.aiPassTimers     = [];
        this.aiReactionTimers = [];

        this.initDOM();
        this.initEventListeners();
        this.initNetworkListeners();
        this.checkURLParams();
        this.renderPointsInputs();
    }

    initDOM() {
        this.screens = {
            home:        document.getElementById('screen-home'),
            createRoom:  document.getElementById('screen-create-room'),
            joinRoom:    document.getElementById('screen-join-room'),
            lobby:       document.getElementById('screen-lobby'),
            gameTable:   document.getElementById('screen-game-table'),
            roundResult: document.getElementById('modal-round-result'),
            gamePodium:  document.getElementById('modal-game-podium'),
            rules:       document.getElementById('modal-rules')
        };
    }

    setScreen(name) {
        this.currentScreen = name;
        Object.values(this.screens).forEach(s => {
            if (!s) return;
            if (s.classList.contains('modal-overlay')) {
                s.classList.remove('active');
            } else {
                s.classList.remove('active-screen');
                s.style.display = 'none';
            }
        });
        const target = this.screens[name];
        if (target) {
            if (target.classList.contains('modal-overlay')) {
                target.classList.add('active');
            } else {
                target.classList.add('active-screen');
                target.style.display = 'flex';
            }
        }
    }

    initEventListeners() {
        const soundBtn = document.getElementById('btn-sound-toggle');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                const isMuted = window.soundEngine.toggleMute();
                soundBtn.innerHTML = isMuted ? '🔇' : '🔊';
            });
        }

        document.querySelectorAll('.btn-open-rules').forEach(btn =>
            btn.addEventListener('click', () => this.screens.rules.classList.add('active')));
        document.getElementById('btn-close-rules')?.addEventListener('click', () =>
            this.screens.rules.classList.remove('active'));

        document.getElementById('btn-single-player')?.addEventListener('click', () => this.startSinglePlayer());
        document.getElementById('btn-create-multiplayer')?.addEventListener('click', () => {
            this.setScreen('createRoom');
            this.renderPointsInputs();
        });
        document.getElementById('btn-join-multiplayer')?.addEventListener('click', () => this.setScreen('joinRoom'));

        document.getElementById('input-player-count')?.addEventListener('input', e => {
            const count = parseInt(e.target.value) || 4;
            const label = document.getElementById('total-cards-label');
            if (label) label.innerText = `${count * 4} Cards (${count} sets of 4)`;
            this.renderPointsInputs();
        });

        document.querySelectorAll('.preset-btn').forEach(btn =>
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.applyScoringPreset(btn.dataset.preset);
            }));

        document.getElementById('btn-confirm-create-room')?.addEventListener('click', () => this.handleCreateRoom());
        document.getElementById('btn-confirm-join-room')?.addEventListener('click', () => this.handleJoinRoom());

        document.querySelectorAll('.btn-back-home').forEach(btn =>
            btn.addEventListener('click', () => {
                this.clearAITimers();
                window.networkEngine.disconnect();
                this.setScreen('home');
            }));

        document.getElementById('btn-copy-code')?.addEventListener('click', () => {
            const code = document.getElementById('lobby-room-code')?.innerText;
            if (code) {
                navigator.clipboard.writeText(code);
                this.showToast("Room code copied: " + code);
            }
        });
        document.getElementById('btn-copy-link')?.addEventListener('click', () => {
            const code = document.getElementById('lobby-room-code')?.innerText;
            if (code) {
                navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?room=${code}`);
                this.showToast("Invite link copied to clipboard!");
            }
        });

        document.getElementById('btn-lobby-start-game')?.addEventListener('click', () => this.startMatchFromLobby());

        document.getElementById('btn-pass-card')?.addEventListener('click', () => this.handleHumanPassCard());
        document.getElementById('btn-game-submit')?.addEventListener('click', () => this.handleHumanSubmit());
        document.getElementById('btn-panic-submit')?.addEventListener('click', () => this.handleHumanPanicSubmit());

        document.getElementById('btn-next-round')?.addEventListener('click', () => this.handleNextRound());
        document.getElementById('btn-new-tournament')?.addEventListener('click', () => {
            this.screens.gamePodium.classList.remove('active');
            this.setScreen('home');
        });

        this.setupAvatarPickers();
    }

    renderPointsInputs() {
        const count = parseInt(document.getElementById('input-player-count')?.value || '4');
        const container = document.getElementById('points-inputs-grid');
        if (!container) return;
        container.innerHTML = '';
        const defaults = [1000, 750, 500, 250, 150, 100, 50, 25];
        const medals   = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place', '4th Place', '5th Place', '6th Place', '7th Place', '8th Place'];
        const styles   = ['gold', 'silver', 'bronze', 'iron', 'iron', 'iron', 'iron', 'iron'];

        for (let i = 0; i < count; i++) {
            const card = document.createElement('div');
            card.className = `point-input-card ${styles[i] || 'iron'}`;
            card.innerHTML = `
                <span class="point-badge">${medals[i] || `${i + 1}th Place`}</span>
                <div class="point-val-wrap">
                    <input type="number" class="input-point-rank" data-rank="${i}" value="${this.settings.points[i] !== undefined ? this.settings.points[i] : (defaults[i] || 0)}">
                    <span>pts</span>
                </div>
            `;
            container.appendChild(card);
        }
    }

    applyScoringPreset(presetName) {
        const inputs = document.querySelectorAll('.input-point-rank');
        const presets = {
            classic:    [1000, 750, 500, 250, 150, 100, 50, 25],
            simple:     [100, 75, 50, 25, 15, 10, 5, 0],
            highstakes: [1000, 400, 150, 0, 0, 0, 0, 0]
        };
        const vals = presets[presetName] || presets.classic;
        inputs.forEach((inp, idx) => inp.value = vals[idx] !== undefined ? vals[idx] : 0);
    }

    setupAvatarPickers() {
        ['host-avatar-picker', 'join-avatar-picker'].forEach(id => {
            const container = document.getElementById(id);
            if (!container) return;
            container.innerHTML = '';
            AVATARS.forEach((av, idx) => {
                const span = document.createElement('span');
                span.className = `avatar-option ${idx === 0 ? 'selected' : ''}`;
                span.innerText = av;
                span.addEventListener('click', () => {
                    container.querySelectorAll('.avatar-option').forEach(s => s.classList.remove('selected'));
                    span.classList.add('selected');
                });
                container.appendChild(span);
            });
        });
    }

    getSelectedAvatar(pickerId) {
        return document.getElementById(pickerId)?.querySelector('.avatar-option.selected')?.innerText || '😎';
    }

    checkURLParams() {
        const params = new URLSearchParams(window.location.search);
        const roomCode = params.get('room');
        if (roomCode) {
            this.setScreen('joinRoom');
            const input = document.getElementById('input-join-code');
            if (input) input.value = roomCode.toUpperCase();
        }
    }

    showToast(message) {
        let toast = document.getElementById('game-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'game-toast';
            document.body.appendChild(toast);
        }
        toast.innerText = message;
        toast.className = 'toast show';
        setTimeout(() => toast.className = 'toast', 2600);
    }

    shuffle(array) {
        let arr = [...array];
        let m = arr.length, t, i;
        while (m) {
            i = Math.floor(Math.random() * m--);
            t = arr[m];
            arr[m] = arr[i];
            arr[i] = t;
        }
        return arr;
    }

    // ================= SINGLE PLAYER SETUP =================
    startSinglePlayer() {
        this.isSinglePlayer = true;
        this.isHost = true;
        this.mySeatIndex = 0;

        const pCount = parseInt(document.getElementById('select-sp-players')?.value || '4');
        const rounds = parseInt(document.getElementById('input-rounds')?.value || '5');
        const theme  = document.getElementById('select-theme')?.value || 'royal';

        const pointInputs = document.querySelectorAll('.input-point-rank');
        let pointsArr = [];
        if (pointInputs && pointInputs.length >= pCount) {
            pointInputs.forEach(inp => pointsArr.push(parseInt(inp.value) || 0));
        } else {
            pointsArr = [1000, 750, 500, 250, 150, 100, 50, 25].slice(0, pCount);
        }

        this.settings = {
            playerCount: pCount,
            totalRounds: rounds,
            theme: theme,
            points: pointsArr
        };

        const hostName   = document.getElementById('input-host-name')?.value.trim() || 'You';
        const hostAvatar = this.getSelectedAvatar('host-avatar-picker');

        this.players = [
            { id: 'p0', seat: 0, name: `${hostName} (You)`, avatar: hostAvatar, isAI: false, peerId: null, hand: [], score: 0, roundScore: 0, hasSubmitted: false, reactionTime: null, rank: null }
        ];

        for (let i = 1; i < pCount; i++) {
            const botMeta = BOT_NAMES[(i - 1) % BOT_NAMES.length];
            this.players.push({
                id: `bot_${i}`,
                seat: i,
                name: botMeta.name,
                avatar: botMeta.avatar,
                isAI: true,
                peerId: null,
                hand: [],
                score: 0,
                roundScore: 0,
                hasSubmitted: false,
                reactionTime: null,
                rank: null
            });
        }

        this.currentRound = 1;
        this.setScreen('gameTable');
        this.startRound();
    }

    // ================= MULTIPLAYER SETUP =================
    handleCreateRoom() {
        const hostName   = document.getElementById('input-host-name')?.value.trim() || 'Host';
        const hostAvatar = this.getSelectedAvatar('host-avatar-picker');
        const pCount     = parseInt(document.getElementById('input-player-count')?.value || '4');
        const rounds     = parseInt(document.getElementById('input-rounds')?.value || '5');
        const theme      = document.getElementById('select-theme')?.value || 'royal';

        const pointInputs = document.querySelectorAll('.input-point-rank');
        let pointsArr = [];
        pointInputs.forEach(inp => pointsArr.push(parseInt(inp.value) || 0));

        this.settings = {
            playerCount: pCount,
            totalRounds: rounds,
            theme: theme,
            points: pointsArr
        };

        this.isSinglePlayer = false;
        this.isHost = true;
        this.mySeatIndex = 0;

        this.players = [
            { id: 'p0', seat: 0, name: hostName, avatar: hostAvatar, isAI: false, peerId: null, hand: [], score: 0, roundScore: 0, hasSubmitted: false, reactionTime: null, rank: null }
        ];

        for (let i = 1; i < pCount; i++) {
            const botMeta = BOT_NAMES[(i - 1) % BOT_NAMES.length];
            this.players.push({
                id: `p${i}`,
                seat: i,
                name: botMeta.name,
                avatar: botMeta.avatar,
                isAI: true,
                peerId: null,
                hand: [],
                score: 0,
                roundScore: 0,
                hasSubmitted: false,
                reactionTime: null,
                rank: null
            });
        }

        window.networkEngine.createRoom(null, { name: hostName, avatar: hostAvatar }, (roomCode) => {
            document.getElementById('lobby-room-code').innerText = roomCode;
            document.getElementById('lobby-rules-summary').innerText = 
                `${pCount} Players (${pCount * 4} Cards) • ${rounds} Rounds • 1st: ${pointsArr[0]}pts • ${THEMES[theme].name}`;
            
            this.updateLobbyUI();
            this.setScreen('lobby');
            this.showToast(`Room created! Code: ${roomCode}`);
        }, () => {
            alert("Error creating room. Please check your internet connection.");
        });
    }

    handleJoinRoom() {
        const joinCode   = document.getElementById('input-join-code')?.value.trim();
        const playerName = document.getElementById('input-join-name')?.value.trim() || 'Player';
        const playerAvatar = this.getSelectedAvatar('join-avatar-picker');

        if (!joinCode || joinCode.length < 4) {
            this.showToast("Please enter a valid 5-letter Room Code");
            return;
        }

        const joinBtn = document.getElementById('btn-confirm-join-room');
        if (joinBtn) {
            joinBtn.disabled = true;
            joinBtn.innerText = "Connecting to room...";
        }

        this.isSinglePlayer = false;
        this.isHost = false;

        window.networkEngine.joinRoom(joinCode, { name: playerName, avatar: playerAvatar }, (code) => {
            if (joinBtn) {
                joinBtn.disabled = false;
                joinBtn.innerText = "Join Lobby →";
            }
            document.getElementById('lobby-room-code').innerText = code;
            this.setScreen('lobby');
            document.getElementById('btn-lobby-start-game').style.display = 'none';
            document.getElementById('lobby-waiting-notice').innerText = "Connected! Waiting for host to start...";
            this.showToast(`Connected to room ${code}!`);
        }, (err) => {
            if (joinBtn) {
                joinBtn.disabled = false;
                joinBtn.innerText = "Join Lobby →";
            }
            this.showToast("Could not connect. Please verify room code and retry.");
        });
    }

    initNetworkListeners() {
        const net = window.networkEngine;
        if (!net || typeof net.on !== 'function') return;

        net.on('client_join_request', (data) => {
            if (!this.isHost) return;

            let assignedSeat = -1;
            // Check if player already exists
            for (let i = 1; i < this.players.length; i++) {
                if (this.players[i].peerId === data.peerId) {
                    assignedSeat = i;
                    break;
                }
            }

            // Otherwise assign first AI slot
            if (assignedSeat === -1) {
                for (let i = 1; i < this.players.length; i++) {
                    if (this.players[i].isAI) {
                        assignedSeat = i;
                        break;
                    }
                }
            }

            if (assignedSeat !== -1) {
                this.players[assignedSeat] = {
                    id: data.peerId,
                    seat: assignedSeat,
                    name: data.playerData.name,
                    avatar: data.playerData.avatar,
                    isAI: false,
                    peerId: data.peerId,
                    hand: [],
                    score: 0,
                    roundScore: 0,
                    hasSubmitted: false,
                    reactionTime: null,
                    rank: null
                };

                this.broadcastLobbyUpdate();
                this.updateLobbyUI();
                this.showToast(`${data.playerData.name} joined the room!`);
            }
        });

        net.on('host_lobby_update', (msg) => {
            this.settings = msg.settings;
            this.players = msg.players;
            this.mySeatIndex = msg.yourSeat;
            
            document.getElementById('lobby-rules-summary').innerText = 
                `${this.settings.playerCount} Players • ${this.settings.totalRounds} Rounds • 1st: ${this.settings.points[0]}pts`;
            
            this.updateLobbyUI();
        });

        net.on('host_game_start', (msg) => {
            this.settings = msg.settings;
            this.players = msg.players;
            this.currentRound = msg.currentRound;
            this.setScreen('gameTable');
            this.renderGameTable();
        });

        net.on('host_deal_cards', (msg) => {
            this.players[this.mySeatIndex].hand = msg.yourHand;
            this.gameState = 'PASSING';
            this.currentTurnSeat = msg.firstTurnSeat;
            this.selectedCardIndex = null;
            this.incomingCard = null;
            this.screens.roundResult.classList.remove('active');
            document.getElementById('show-panic-overlay').classList.remove('active');

            this.renderPlayerHand();
            this.renderGameTable();
            this.updateTurnUI();
            window.soundEngine.playCardDeal();
        });

        net.on('host_your_turn', (msg) => {
            const me = this.players[this.mySeatIndex];
            if (msg.receivedCard) {
                me.hand.push(msg.receivedCard);
                this.incomingCard = msg.receivedCard;
            }
            this.currentTurnSeat = this.mySeatIndex;
            this.selectedCardIndex = null;
            this.renderPlayerHand();
            this.renderGameTable();
            this.updateTurnUI();
            window.soundEngine.playCardPass();
        });

        net.on('host_turn_update', (msg) => {
            this.currentTurnSeat = msg.currentTurnSeat;
            this.passesThisRound = msg.passesThisRound;
            this.renderGameTable();
            this.updateTurnUI();
        });

        net.on('client_pass_card', (msg) => {
            if (!this.isHost) return;
            const seat = msg.fromSeat;
            const card = msg.card;
            if (this.players[seat]) {
                const removeIdx = this.players[seat].hand.findIndex(c => c && c.uid === card.uid);
                if (removeIdx !== -1) {
                    this.players[seat].hand.splice(removeIdx, 1);
                }
                this.executeNextTurnPass(seat, card);
            }
        });

        net.on('host_show_triggered', (msg) => {
            this.triggerShowOverlay(msg.callerSeat, msg.callerName);
        });

        net.on('client_submit_show', (msg) => {
            if (!this.isHost) return;
            this.recordPlayerSubmit(msg.seatIndex, msg.timestamp);
        });

        net.on('host_round_result', (msg) => {
            this.players = msg.players;
            this.currentRound = msg.currentRound;
            this.displayRoundResults(msg.results);
        });

        net.on('host_match_over', (msg) => {
            this.players = msg.players;
            this.displayMatchOverPodium();
        });

        net.on('host_next_round', (msg) => {
            this.currentRound = msg.currentRound;
            this.screens.roundResult.classList.remove('active');
            document.getElementById('show-panic-overlay').classList.remove('active');
            this.players = msg.players;
            this.currentTurnSeat = msg.firstTurnSeat;
            this.gameState = 'PASSING';
            this.showTriggered = false;
            this.incomingCard = null;
            this.selectedCardIndex = null;
            this.renderGameTable();
            this.renderPlayerHand();
            this.updateTurnUI();
        });
    }

    broadcastLobbyUpdate() {
        if (!this.isHost) return;
        this.players.forEach((p, idx) => {
            if (!p.isAI && p.peerId) {
                window.networkEngine.sendToClient(p.peerId, {
                    type: 'LOBBY_UPDATE',
                    settings: this.settings,
                    players: this.players.map(pl => ({
                        id: pl.id, seat: pl.seat, name: pl.name, avatar: pl.avatar, isAI: pl.isAI, score: pl.score
                    })),
                    yourSeat: idx
                });
            }
        });
    }

    updateLobbyUI() {
        const slotsContainer = document.getElementById('lobby-player-slots');
        if (!slotsContainer) return;
        slotsContainer.innerHTML = '';

        this.players.forEach((p, idx) => {
            const slot = document.createElement('div');
            slot.className = `lobby-slot ${p.isAI ? 'slot-ai' : 'slot-human'}`;
            slot.innerHTML = `
                <div class="slot-avatar">${p.avatar}</div>
                <div class="slot-info">
                    <div class="slot-name">${p.name} ${idx === 0 ? '👑 (Host)' : ''}</div>
                    <div class="slot-badge">${p.isAI ? '🤖 AI Bot' : '👤 Player'}</div>
                </div>
            `;
            slotsContainer.appendChild(slot);
        });
    }

    startMatchFromLobby() {
        if (!this.isHost) return;
        this.currentRound = 1;

        window.networkEngine.broadcast({
            type: 'GAME_START',
            settings: this.settings,
            players: this.players,
            currentRound: this.currentRound
        });

        this.setScreen('gameTable');
        this.startRound();
    }

    // ================= ROUND & DEALING =================
    startRound() {
        this.gameState           = 'DEALING';
        this.showTriggered       = false;
        this.showTriggeredBySeat = null;
        this.submitOrder         = [];
        this.selectedCardIndex   = null;
        this.incomingCard        = null;
        this.passesThisRound     = 0;
        this.clearAITimers();

        this.players.forEach(p => {
            p.hand = [];
            p.hasSubmitted = false;
            p.reactionTime = null;
            p.rank = null;
            p.roundScore = 0;
        });

        this.screens.roundResult.classList.remove('active');
        document.getElementById('show-panic-overlay').classList.remove('active');

        this.dealCards();
    }

    dealCards() {
        window.soundEngine.playCardDeal();

        const pCount = this.players.length;
        const themeConfig = THEMES[this.settings.theme] || THEMES.royal;
        
        let chosenCategories = [];
        for (let i = 0; i < pCount; i++) {
            chosenCategories.push(themeConfig.cards[i % themeConfig.cards.length]);
        }

        let deck = [];
        chosenCategories.forEach((cardTemplate, catIdx) => {
            for (let i = 0; i < 4; i++) {
                deck.push({
                    id: `${cardTemplate.id}_${catIdx}`,
                    name: cardTemplate.name,
                    symbol: cardTemplate.symbol,
                    bgGradient: cardTemplate.bgGradient,
                    rankText: cardTemplate.rankText,
                    uid: `${cardTemplate.id}_${catIdx}_${i}`
                });
            }
        });

        deck = this.shuffle(deck);

        for (let seat = 0; seat < pCount; seat++) {
            this.players[seat].hand = deck.slice(seat * 4, (seat + 1) * 4);
        }

        // Randomly choose who starts the first pass
        this.passStartSeat   = Math.floor(Math.random() * pCount);
        this.currentTurnSeat = this.passStartSeat;

        if (!this.isSinglePlayer && this.isHost) {
            this.players.forEach((p, seat) => {
                if (!p.isAI && p.peerId) {
                    window.networkEngine.sendToClient(p.peerId, {
                        type: 'DEAL_CARDS',
                        yourHand: p.hand,
                        firstTurnSeat: this.currentTurnSeat
                    });
                }
            });
        }

        this.gameState = 'PASSING';
        this.renderGameTable();
        this.renderPlayerHand();
        this.updateTurnUI();

        // If the starting player is an AI bot, schedule bot pass
        if (this.players[this.currentTurnSeat]?.isAI) {
            this.scheduleBotPass(this.currentTurnSeat);
        }
    }

    // ================= SEQUENTIAL TURN PASSING =================
    updateTurnUI() {
        const myTurn = (this.currentTurnSeat === this.mySeatIndex);
        const passBtn = document.getElementById('btn-pass-card');
        const turnBanner = document.getElementById('turn-banner');

        const currentPlayer = this.players[this.currentTurnSeat];

        if (turnBanner && currentPlayer) {
            if (myTurn) {
                const handSize = this.players[this.mySeatIndex].hand.length;
                if (handSize > 4) {
                    turnBanner.innerText = `🟢 YOUR TURN — You have 5 cards! Pick 1 card to PASS →`;
                } else {
                    turnBanner.innerText = `🟢 YOUR TURN — Select a card to start passing →`;
                }
                turnBanner.className = 'turn-banner my-turn';
            } else {
                turnBanner.innerText = `⏳ ${currentPlayer.name} is choosing a card to pass...`;
                turnBanner.className = 'turn-banner other-turn';
            }
        }

        if (passBtn) {
            if (myTurn && !this.showTriggered) {
                passBtn.disabled = (this.selectedCardIndex === null);
                passBtn.className = 'btn btn-action' + (this.selectedCardIndex !== null ? ' active-action' : '');
                passBtn.innerHTML = '<span>📤 Pass Selected Card</span>';
            } else {
                passBtn.disabled = true;
                passBtn.className = 'btn btn-action';
                passBtn.innerHTML = currentPlayer
                    ? `<span>⏳ ${currentPlayer.name}'s turn...</span>`
                    : '<span>📤 Pass Selected Card</span>';
            }
        }

        this.renderGameTable();
    }

    handleHumanPassCard() {
        if (this.gameState !== 'PASSING') return;
        if (this.currentTurnSeat !== this.mySeatIndex) return;
        if (this.selectedCardIndex === null) {
            this.showToast("Select a card first!");
            return;
        }
        if (this.showTriggered) return;

        const myPlayer = this.players[this.mySeatIndex];
        const cardToPass = myPlayer.hand[this.selectedCardIndex];
        if (!cardToPass) return;

        // Remove from human's hand
        myPlayer.hand.splice(this.selectedCardIndex, 1);
        this.selectedCardIndex = null;
        this.incomingCard = null;

        window.soundEngine.playCardPass();

        if (this.isHost) {
            this.executeNextTurnPass(this.mySeatIndex, cardToPass);
        } else {
            window.networkEngine.sendToHost({
                type: 'PASS_CARD',
                card: cardToPass,
                fromSeat: this.mySeatIndex
            });
            this.renderPlayerHand();
            this.updateTurnUI();
        }
    }

    executeNextTurnPass(fromSeat, card) {
        if (!this.isHost) return;

        const pCount = this.players.length;
        const nextSeat = (fromSeat + 1) % pCount;
        const receiver = this.players[nextSeat];

        // Give card to receiver (now holds 5 cards)
        receiver.hand.push(card);
        this.passesThisRound++;
        this.currentTurnSeat = nextSeat;

        this.animateCenterPass(card);

        if (!this.isSinglePlayer) {
            window.networkEngine.broadcast({
                type: 'TURN_UPDATE',
                currentTurnSeat: nextSeat,
                passesThisRound: this.passesThisRound
            });

            if (!receiver.isAI && receiver.peerId) {
                window.networkEngine.sendToClient(receiver.peerId, {
                    type: 'YOUR_TURN',
                    receivedCard: card
                });
            }
        }

        this.renderGameTable();
        this.renderPlayerHand();
        this.updateTurnUI();

        // Check if receiver completed 4 of a kind
        if (this.isSetComplete(receiver.hand)) {
            if (receiver.isAI) {
                const delay = 1200 + Math.random() * 800;
                setTimeout(() => {
                    if (!this.showTriggered) {
                        this.handleShowDeclaration(nextSeat);
                    }
                }, delay);
                return;
            } else if (nextSeat === this.mySeatIndex) {
                this.updateSetProgress();
                return;
            }
        }

        if (receiver.isAI) {
            this.scheduleBotPass(nextSeat);
        }
    }

    scheduleBotPass(seat) {
        if (this.showTriggered || this.gameState !== 'PASSING') return;

        // Bot deliberates for 1.4s - 2.6s
        const delay = 1400 + Math.random() * 1200;
        const timer = setTimeout(() => {
            if (this.gameState !== 'PASSING' || this.showTriggered) return;
            if (this.currentTurnSeat !== seat) return;

            const card = this.botChooseCardToPass(seat);
            if (!card) return;

            const bot = this.players[seat];
            const removeIdx = bot.hand.findIndex(c => c && c.uid === card.uid);
            if (removeIdx !== -1) {
                bot.hand.splice(removeIdx, 1);
            }

            this.executeNextTurnPass(seat, card);
        }, delay);

        this.aiPassTimers.push(timer);
    }

    botChooseCardToPass(seat) {
        const bot = this.players[seat];
        if (!bot || !bot.hand || bot.hand.length === 0) return null;

        const counts = {};
        bot.hand.forEach(c => {
            if (c) counts[c.name] = (counts[c.name] || 0) + 1;
        });

        let minCount = 999;
        let candidates = [];

        bot.hand.forEach((card, idx) => {
            if (!card) return;
            const count = counts[card.name] || 0;
            if (count < minCount) {
                minCount = count;
                candidates = [{ card, idx }];
            } else if (count === minCount) {
                candidates.push({ card, idx });
            }
        });

        if (candidates.length === 0) candidates = [{ card: bot.hand[0], idx: 0 }];
        return candidates[Math.floor(Math.random() * candidates.length)].card;
    }

    // ================= RENDER =================
    renderGameTable() {
        const pCount = this.players.length;
        const roundEl = document.getElementById('table-round-indicator');
        if (roundEl) roundEl.innerText = `Round ${this.currentRound} of ${this.settings.totalRounds}`;
        
        const theme = THEMES[this.settings.theme] || THEMES.royal;
        const themeBadge = document.getElementById('table-theme-badge');
        if (themeBadge) themeBadge.innerHTML = `${theme.icon} ${theme.name} • ${pCount * 4} Cards`;

        const container = document.getElementById('dynamic-opponents-ring');
        if (!container) return;
        container.innerHTML = '';

        for (let i = 1; i < pCount; i++) {
            const seatIdx = (this.mySeatIndex + i) % pCount;
            const opp = this.players[seatIdx];
            if (!opp) continue;

            const isTheirTurn = (seatIdx === this.currentTurnSeat);
            const cardCount = opp.hand.length;
            const seatEl = document.createElement('div');
            seatEl.className = `opponent-seat-card ${isTheirTurn ? 'card-ready' : ''}`;

            let miniCards = '';
            for (let k = 0; k < Math.max(4, cardCount); k++) {
                miniCards += `<span class="mini-card-back"></span>`;
            }

            seatEl.innerHTML = `
                <div class="opponent-avatar">${opp.avatar}</div>
                <div class="opponent-name">${opp.name}</div>
                <div class="opponent-score">${opp.score} pts</div>
                <div class="opponent-cards-count">${miniCards}</div>
                <div class="opponent-pass-indicator ${isTheirTurn ? 'ready' : ''}">
                    ${isTheirTurn ? '✋ Passing Card...' : `${cardCount} cards`}
                </div>
            `;
            container.appendChild(seatEl);
        }
    }

    renderPlayerHand() {
        const handContainer = document.getElementById('player-hand');
        if (!handContainer) return;
        handContainer.innerHTML = '';

        const myPlayer = this.players[this.mySeatIndex];
        if (!myPlayer || !myPlayer.hand || myPlayer.hand.length === 0) return;

        const myTurn = (this.currentTurnSeat === this.mySeatIndex);

        myPlayer.hand.forEach((card, idx) => {
            if (!card) return;

            const isSelected = (this.selectedCardIndex === idx);
            const isNewlyRecvd = (this.incomingCard && this.incomingCard.uid === card.uid);

            const cardEl = document.createElement('div');
            cardEl.className = `playing-card ${isSelected ? 'selected' : ''} ${isNewlyRecvd ? 'newly-received' : ''}`;
            cardEl.style.background = card.bgGradient || '#1e293b';
            cardEl.innerHTML = `
                <div class="card-corner top-left">
                    <span class="rank">${card.rankText || '●'}</span>
                    <span class="suit">${card.symbol || '🂠'}</span>
                </div>
                <div class="card-center">
                    <span class="symbol-large">${card.symbol || '🂠'}</span>
                    <span class="card-name">${card.name || 'Card'}</span>
                </div>
                <div class="card-corner bottom-right">
                    <span class="rank">${card.rankText || '●'}</span>
                    <span class="suit">${card.symbol || '🂠'}</span>
                </div>
            `;

            if (myTurn && !this.showTriggered) {
                cardEl.addEventListener('click', () => {
                    this.selectedCardIndex = idx;
                    window.soundEngine.playCardSelect();
                    this.renderPlayerHand();
                    this.updateTurnUI();
                });
            }

            handContainer.appendChild(cardEl);
        });

        this.updateSetProgress();
    }

    updateSetProgress() {
        const myPlayer = this.players[this.mySeatIndex];
        if (!myPlayer || !myPlayer.hand) return;

        const counts = {};
        myPlayer.hand.forEach(c => {
            if (c && c.name) {
                counts[c.name] = (counts[c.name] || 0) + 1;
            }
        });

        let maxCount = 0;
        let maxCardName = '';
        let maxSymbol = '';

        for (const [name, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                maxCardName = name;
                const card = myPlayer.hand.find(c => c && c.name === name);
                maxSymbol = card ? card.symbol : '';
            }
        }

        const pct = Math.min(100, Math.round((maxCount / 4) * 100));
        const badge = document.getElementById('hand-progress-badge');
        if (badge) {
            badge.innerHTML = `
                <div class="progress-label">
                    <span>${maxSymbol} ${maxCardName || 'Set'}: <strong>${Math.min(4, maxCount)}/4 (${pct}%)</strong></span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${pct}%;"></div>
                </div>
            `;
        }

        const submitBtn = document.getElementById('btn-game-submit');
        if (submitBtn) {
            if (maxCount >= 4 && !this.showTriggered) {
                submitBtn.classList.add('ready-pulse');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '🌟 4/4 MATCHED! PRESS SUBMIT! 🌟';
                window.soundEngine.playMatchComplete();
            } else {
                submitBtn.classList.remove('ready-pulse');
                submitBtn.disabled = true;
                submitBtn.innerHTML = 'SUBMIT (Matches 4/4)';
            }
        }
    }

    animateCenterPass(card) {
        const center = document.getElementById('pass-animation-zone');
        const flightEl = document.getElementById('flight-card-element');
        if (center) {
            if (flightEl && card) flightEl.innerText = card.symbol || '🂠';
            center.classList.add('animating');
            setTimeout(() => {
                center.classList.remove('animating');
            }, 500);
        }
    }

    // ================= "SHOW" TRIGGER & REACTION PHASE =================
    handleHumanSubmit() {
        const myPlayer = this.players[this.mySeatIndex];
        if (myPlayer.hasSubmitted) return;

        window.soundEngine.playBuzzer();

        if (!this.isSetComplete(myPlayer.hand)) {
            this.showToast("You need 4 matching cards to call SHOW!");
            return;
        }

        this.handleShowDeclaration(this.mySeatIndex);
    }

    handleHumanPanicSubmit() {
        const myPlayer = this.players[this.mySeatIndex];
        if (myPlayer.hasSubmitted) return;

        window.soundEngine.playBuzzer();

        if (this.isHost) {
            this.recordPlayerSubmit(this.mySeatIndex, performance.now());
        } else {
            myPlayer.hasSubmitted = true;
            window.networkEngine.sendToHost({
                type: 'SUBMIT_SHOW',
                seatIndex: this.mySeatIndex,
                timestamp: performance.now()
            });
            this.updatePanicBtn('✓ Submitted! Waiting for others...', true);
        }
    }

    handleShowDeclaration(callerSeat) {
        if (this.showTriggered) return;
        this.clearAITimers();
        this.showTriggered = true;
        this.showTriggeredBySeat = callerSeat;
        this.showStartTime = performance.now();

        const caller = this.players[callerSeat];
        this.submitOrder = [callerSeat];
        caller.hasSubmitted = true;
        caller.reactionTime = 0;
        caller.rank = 1;

        if (this.isHost && !this.isSinglePlayer) {
            window.networkEngine.broadcast({
                type: 'SHOW_TRIGGERED',
                callerSeat: callerSeat,
                callerName: caller.name
            });
        }

        this.triggerShowOverlay(callerSeat, caller.name);

        if (this.isHost) {
            this.triggerAIReactions();
        }
    }

    triggerShowOverlay(callerSeat, callerName) {
        this.showTriggered = true;
        this.showStartTime = performance.now();

        window.soundEngine.playShowSiren();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

        const overlay = document.getElementById('show-panic-overlay');
        if (!overlay) return;
        overlay.classList.add('active');

        document.getElementById('panic-caller-name').innerText = `${callerName} matched 4 cards!`;
        document.getElementById('panic-timer-display').innerText = '0 ms';

        if (callerSeat === this.mySeatIndex) {
            this.updatePanicBtn('🎉 YOU CALLED SHOW! (1st Place)', true);
        } else {
            this.updatePanicBtn('🚨 TAP SUBMIT NOW! 🚨', false);
        }

        clearInterval(this.reactionInterval);
        const myPlayer = this.players[this.mySeatIndex];
        this.reactionInterval = setInterval(() => {
            if (!myPlayer.hasSubmitted && callerSeat !== this.mySeatIndex) {
                const elapsed = Math.round(performance.now() - this.showStartTime);
                const td = document.getElementById('panic-timer-display');
                if (td) td.innerText = `${elapsed} ms`;
            }
        }, 30);
    }

    updatePanicBtn(text, submitted) {
        const btn = document.getElementById('btn-panic-submit');
        if (!btn) return;
        btn.innerHTML = text;
        btn.disabled  = submitted;
        if (submitted) btn.classList.add('submitted');
        else btn.classList.remove('submitted');
    }

    triggerAIReactions() {
        this.players.forEach((p, seat) => {
            if (!p.isAI || seat === this.showTriggeredBySeat) return;
            const delay = 1000 + Math.random() * 1800; // 1.0s to 2.8s
            const timer = setTimeout(() => {
                this.recordPlayerSubmit(seat, performance.now());
            }, delay);
            this.aiReactionTimers.push(timer);
        });

        setTimeout(() => {
            this.players.forEach((p, seat) => {
                if (!p.hasSubmitted) {
                    this.recordPlayerSubmit(seat, performance.now());
                }
            });
        }, 7000);
    }

    recordPlayerSubmit(seat, timestamp) {
        if (!this.isHost) return;

        const player = this.players[seat];
        if (player.hasSubmitted) return;

        player.hasSubmitted = true;
        player.reactionTime = Math.max(0, Math.round(timestamp - this.showStartTime));
        player.rank = this.submitOrder.length + 1;
        this.submitOrder.push(seat);

        if (seat === this.mySeatIndex) {
            clearInterval(this.reactionInterval);
            this.updatePanicBtn('✓ Submitted! Waiting...', true);
        }

        if (this.submitOrder.length === this.players.length) {
            clearInterval(this.reactionInterval);
            setTimeout(() => {
                this.concludeRound();
            }, 800);
        }
    }

    // ================= SCORING & ROUND RESULTS =================
    concludeRound() {
        if (!this.isHost) return;

        const pointValues = this.settings.points;

        const results = this.submitOrder.map((seatIdx, rankIdx) => {
            const player = this.players[seatIdx];
            const pts = pointValues[rankIdx] !== undefined ? pointValues[rankIdx] : 0;
            player.roundScore = pts;
            player.score += pts;
            player.rank = rankIdx + 1;

            return {
                seat: seatIdx,
                name: player.name,
                avatar: player.avatar,
                isAI: player.isAI,
                rank: rankIdx + 1,
                points: pts,
                totalScore: player.score,
                reactionTime: player.reactionTime,
                hand: [...player.hand],
                isCaller: (seatIdx === this.showTriggeredBySeat)
            };
        });

        if (!this.isSinglePlayer) {
            window.networkEngine.broadcast({
                type: 'ROUND_RESULT',
                results: results,
                players: this.players,
                currentRound: this.currentRound
            });
        }

        this.displayRoundResults(results);
    }

    displayRoundResults(results) {
        clearInterval(this.reactionInterval);
        document.getElementById('show-panic-overlay').classList.remove('active');

        window.soundEngine.playRoundWin();

        const modal = document.getElementById('modal-round-result');
        modal.classList.add('active');

        document.getElementById('round-result-title').innerText = `Round ${this.currentRound} Results`;

        const listContainer = document.getElementById('round-rankings-list');
        listContainer.innerHTML = '';

        const medals = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place'];

        results.forEach((r, idx) => {
            const row = document.createElement('div');
            row.className = `result-rank-row rank-${r.rank}`;
            
            let handHtml = '';
            if (r.hand) {
                handHtml = r.hand.map(c => c ? `
                    <span class="mini-card" style="background:${c.bgGradient || '#334155'};" title="${c.name || 'Card'}">
                        ${c.symbol || '🂠'}
                    </span>
                ` : '').join('');
            }

            row.innerHTML = `
                <div class="rank-badge">${medals[idx] || `${idx + 1}th Place`}</div>
                <div class="rank-player">
                    <span class="player-avatar">${r.avatar}</span>
                    <div class="player-details">
                        <strong>${r.name}</strong>
                        <span class="time-stat">${r.isCaller ? '🌟 Matched 4 Cards' : `⚡ ${r.reactionTime}ms`}</span>
                    </div>
                </div>
                <div class="rank-hand">${handHtml}</div>
                <div class="rank-points">+${r.points} pts</div>
                <div class="rank-total">Total: ${r.totalScore}</div>
            `;
            listContainer.appendChild(row);
        });

        const nextBtn = document.getElementById('btn-next-round');
        const waitNotice = document.getElementById('round-waiting-host');

        if (this.currentRound >= this.settings.totalRounds) {
            nextBtn.innerText = '🏆 View Tournament Winner!';
        } else {
            nextBtn.innerText = `Next: Round ${this.currentRound + 1} of ${this.settings.totalRounds} →`;
        }

        if (!this.isHost) {
            nextBtn.style.display = 'none';
            if (waitNotice) waitNotice.style.display = 'block';
        } else {
            nextBtn.style.display = 'block';
            if (waitNotice) waitNotice.style.display = 'none';
        }
    }

    handleNextRound() {
        if (this.currentRound >= this.settings.totalRounds) {
            if (this.isHost && !this.isSinglePlayer) {
                window.networkEngine.broadcast({
                    type: 'MATCH_OVER',
                    players: this.players
                });
            }
            this.screens.roundResult.classList.remove('active');
            this.displayMatchOverPodium();
        } else {
            this.currentRound++;
            this.screens.roundResult.classList.remove('active');

            if (this.isHost) {
                this.startRound();
                if (!this.isSinglePlayer) {
                    window.networkEngine.broadcast({
                        type: 'NEXT_ROUND',
                        currentRound: this.currentRound,
                        players: this.players.map(p => ({
                            id: p.id, seat: p.seat, name: p.name, avatar: p.avatar, isAI: p.isAI,
                            score: p.score, roundScore: 0, hasSubmitted: false, reactionTime: null, rank: null
                        })),
                        firstTurnSeat: this.currentTurnSeat
                    });
                }
            }
        }
    }

    displayMatchOverPodium() {
        this.screens.roundResult.classList.remove('active');
        const podiumModal = document.getElementById('modal-game-podium');
        podiumModal.classList.add('active');

        window.soundEngine.playGrandChampion();
        this.launchConfetti();

        const sorted = [...this.players].sort((a, b) => b.score - a.score);

        const winner = sorted[0] || { avatar: '😎', name: 'Winner', score: 0 };
        const second = sorted[1] || { avatar: '🤖', name: '2nd Place', score: 0 };
        const third  = sorted[2] || { avatar: '🤖', name: '3rd Place', score: 0 };

        document.getElementById('podium-p1-name').innerText = `${winner.avatar} ${winner.name}`;
        document.getElementById('podium-p1-score').innerText = `${winner.score} pts`;

        document.getElementById('podium-p2-name').innerText = `${second.avatar} ${second.name}`;
        document.getElementById('podium-p2-score').innerText = `${second.score} pts`;

        document.getElementById('podium-p3-name').innerText = `${third.avatar} ${third.name}`;
        document.getElementById('podium-p3-score').innerText = `${third.score} pts`;

        const list = document.getElementById('podium-full-leaderboard');
        list.innerHTML = '';
        sorted.forEach((p, idx) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-row';
            item.innerHTML = `
                <div class="lb-rank">#${idx + 1}</div>
                <div class="lb-player">${p.avatar} ${p.name}</div>
                <div class="lb-score"><strong>${p.score} pts</strong></div>
            `;
            list.appendChild(item);
        });
    }

    isSetComplete(hand) {
        if (!hand || hand.length < 4) return false;
        const counts = {};
        hand.forEach(c => {
            if (c && c.name) counts[c.name] = (counts[c.name] || 0) + 1;
        });
        return Object.values(counts).some(cnt => cnt >= 4);
    }

    clearAITimers() {
        this.aiPassTimers.forEach(t => clearTimeout(t));
        this.aiPassTimers = [];
        this.aiReactionTimers.forEach(t => clearTimeout(t));
        this.aiReactionTimers = [];
    }

    launchConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#a855f7', '#ef4444'];

        for (let i = 0; i < 130; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: Math.random() * 4 - 2,
                vy: Math.random() * 5 + 3,
                rot: Math.random() * 360,
                vrot: Math.random() * 10 - 5
            });
        }

        let animationFrame;
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.vrot;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rot * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();

                if (p.y > canvas.height) {
                    p.y = -20;
                    p.x = Math.random() * canvas.width;
                }
            });
            animationFrame = requestAnimationFrame(render);
        };

        render();

        setTimeout(() => {
            cancelAnimationFrame(animationFrame);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }, 6000);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.showGame = new ShowGame();
});
