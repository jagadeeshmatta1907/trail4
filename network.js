/**
 * SHOW! Card Game - High-Performance Real-Time Multiplayer Network Engine
 * Uses secure WebSockets (WSS) Pub/Sub Relay with Multi-Broker Failover.
 * 100% Mobile 4G/5G Carrier-Grade NAT & Firewall friendly.
 * Zero setup required - instant room joins anywhere in the world!
 */

const PUBLIC_BROKERS = [
    'wss://broker.hivemq.com:8884/mqtt',
    'wss://broker.emqx.io:8084/mqtt',
    'wss://test.mosquitto.org:8081'
];

class NetworkEngine {
    constructor() {
        this.client = null;
        this.isHost = false;
        this.roomCode = null;
        this.myClientId = 'client_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        this.isMultiplayer = false;
        this.eventListeners = new Map();
        this.currentBrokerIndex = 0;
        this.connected = false;
        this.clientPeerIds = new Set();
    }

    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(cb => {
                try { cb(data); } catch (err) { console.error(`Error in event ${event}:`, err); }
            });
        }
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    connectBroker(onConnected, onError) {
        if (this.connected && this.client) {
            if (onConnected) onConnected();
            return;
        }

        if (typeof mqtt === 'undefined') {
            console.error("MQTT.js library not loaded. Falling back to simulated network.");
            if (onError) onError(new Error("Multiplayer library not loaded"));
            return;
        }

        const brokerUrl = PUBLIC_BROKERS[this.currentBrokerIndex % PUBLIC_BROKERS.length];
        console.log(`Connecting to multiplayer broker: ${brokerUrl}`);

        try {
            this.client = mqtt.connect(brokerUrl, {
                clientId: this.myClientId,
                clean: true,
                connectTimeout: 8000,
                reconnectPeriod: 2000,
                keepalive: 30
            });

            let connectTimeout = setTimeout(() => {
                if (!this.connected) {
                    console.warn("Broker connection timed out, trying next broker...");
                    this.tryNextBroker(onConnected, onError);
                }
            }, 8000);

            this.client.on('connect', () => {
                clearTimeout(connectTimeout);
                this.connected = true;
                console.log("Connected to multiplayer network!");
                if (onConnected) onConnected();
            });

            this.client.on('message', (topic, payload) => {
                try {
                    const message = JSON.parse(payload.toString());
                    this.handleIncomingMessage(topic, message);
                } catch (e) {
                    console.error("Error parsing message from topic", topic, e);
                }
            });

            this.client.on('error', (err) => {
                console.warn("MQTT error:", err);
                if (!this.connected) {
                    clearTimeout(connectTimeout);
                    this.tryNextBroker(onConnected, onError);
                }
            });

            this.client.on('close', () => {
                this.connected = false;
            });

        } catch (err) {
            console.error("MQTT connect exception:", err);
            this.tryNextBroker(onConnected, onError);
        }
    }

    tryNextBroker(onConnected, onError) {
        if (this.client) {
            try { this.client.end(true); } catch(e) {}
            this.client = null;
        }
        this.currentBrokerIndex++;
        if (this.currentBrokerIndex < PUBLIC_BROKERS.length * 2) {
            this.connectBroker(onConnected, onError);
        } else {
            if (onError) onError(new Error("Unable to connect to multiplayer server. Check internet."));
        }
    }

    createRoom(roomCode, hostPlayerData, onReady, onError) {
        this.isHost = true;
        this.isMultiplayer = true;
        this.roomCode = (roomCode || this.generateRoomCode()).toUpperCase().trim();

        this.connectBroker(() => {
            const hostTopic = `showgame/v3/${this.roomCode}/host`;
            const allTopic  = `showgame/v3/${this.roomCode}/all`;

            this.client.subscribe([hostTopic, allTopic], { qos: 1 }, (err) => {
                if (err) {
                    console.error("Subscription error:", err);
                    if (onError) onError(err);
                    return;
                }
                console.log(`Host ready for room ${this.roomCode}`);
                if (onReady) onReady(this.roomCode);
                this.emit('host_ready', { roomCode: this.roomCode });
            });
        }, onError);
    }

    joinRoom(roomCode, playerData, onConnected, onError) {
        this.isHost = false;
        this.isMultiplayer = true;
        this.roomCode = roomCode.toUpperCase().trim();

        this.connectBroker(() => {
            const myDirectTopic = `showgame/v3/${this.roomCode}/client/${this.myClientId}`;
            const allTopic      = `showgame/v3/${this.roomCode}/all`;

            this.client.subscribe([myDirectTopic, allTopic], { qos: 1 }, (err) => {
                if (err) {
                    console.error("Client subscription error:", err);
                    if (onError) onError(err);
                    return;
                }

                // Send join request to host
                const hostTopic = `showgame/v3/${this.roomCode}/host`;
                this.client.publish(hostTopic, JSON.stringify({
                    type: 'JOIN_REQUEST',
                    playerData: playerData,
                    peerId: this.myClientId,
                    timestamp: Date.now()
                }), { qos: 1 });

                if (onConnected) onConnected(this.roomCode);
                this.emit('connected_to_host', { roomCode: this.roomCode });
            });
        }, onError);
    }

    handleIncomingMessage(topic, msg) {
        if (!msg || !msg.type) return;

        // Ignore messages sent by self
        if (msg.senderClientId === this.myClientId) return;

        if (this.isHost) {
            switch (msg.type) {
                case 'JOIN_REQUEST':
                    this.clientPeerIds.add(msg.peerId);
                    this.emit('client_join_request', {
                        peerId: msg.peerId,
                        playerData: msg.playerData
                    });
                    break;
                case 'PASS_CARD':
                    this.emit('client_pass_card', {
                        peerId: msg.peerId,
                        card: msg.card,
                        fromSeat: msg.fromSeat
                    });
                    break;
                case 'SUBMIT_SHOW':
                    this.emit('client_submit_show', {
                        peerId: msg.peerId,
                        seatIndex: msg.seatIndex,
                        timestamp: msg.timestamp || performance.now()
                    });
                    break;
                default:
                    this.emit('client_custom_msg', { sender: msg.peerId, message: msg });
            }
        } else {
            // Client message handling
            const eventName = `host_${msg.type.toLowerCase()}`;
            this.emit(eventName, msg);
        }
    }

    sendToClient(peerId, message) {
        if (!this.client || !this.connected || !this.roomCode) return;
        const topic = `showgame/v3/${this.roomCode}/client/${peerId}`;
        const payload = { ...message, senderClientId: this.myClientId };
        this.client.publish(topic, JSON.stringify(payload), { qos: 1 });
    }

    broadcast(message) {
        if (!this.client || !this.connected || !this.roomCode) return;
        const topic = `showgame/v3/${this.roomCode}/all`;
        const payload = { ...message, senderClientId: this.myClientId };
        this.client.publish(topic, JSON.stringify(payload), { qos: 1 });
    }

    sendToHost(message) {
        if (!this.client || !this.connected || !this.roomCode) return;
        const topic = `showgame/v3/${this.roomCode}/host`;
        const payload = { ...message, peerId: this.myClientId, senderClientId: this.myClientId };
        this.client.publish(topic, JSON.stringify(payload), { qos: 1 });
    }

    disconnect() {
        if (this.client) {
            try {
                this.client.end(true);
            } catch (e) {}
            this.client = null;
        }
        this.connected = false;
        this.isMultiplayer = false;
        this.isHost = false;
        this.roomCode = null;
        this.clientPeerIds.clear();
    }
}

window.networkEngine = new NetworkEngine();
