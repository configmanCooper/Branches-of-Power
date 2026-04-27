// Branches of Power — Networking (WebRTC via PeerJS)
// Host/join multiplayer, state sync, action relay

var Network = (function() {
    'use strict';

    var peer = null;
    var connections = {};  // peerId -> DataConnection
    var roomCode = '';
    var isHost = false;
    var myRole = null;
    var lobby = { players: {} }; // role -> { peerId, name, ready }
    var onStateUpdate = null;
    var onLobbyUpdate = null;
    var onChatMessage = null;
    var onActionResult = null;
    var onVoteRequest = null;
    var onError = null;
    var onConnected = null;
    var messageSeq = 0;
    var lastKnownState = null;
    var lastKnownLobby = null;
    var migrating = false;

    var PEERJS_CONFIG = {
        host: '0.peerjs.com',
        port: 443,
        secure: true,
        path: '/',
        debug: 0,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        }
    };

    function generateRoomCode() {
        var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var code = '';
        for (var i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    function createMessage(type, payload) {
        return {
            type: type,
            payload: payload,
            from: myRole || 'unknown',
            seq: messageSeq++,
            timestamp: Date.now()
        };
    }

    function broadcast(message) {
        var msgStr = JSON.stringify(message);
        for (var id in connections) {
            if (connections[id] && connections[id].open) {
                connections[id].send(msgStr);
            }
        }
    }

    function sendToHost(message) {
        var hostConn = connections['host'];
        if (hostConn && hostConn.open) {
            hostConn.send(JSON.stringify(message));
        }
    }

    function handleMessage(data, fromPeerId) {
        var msg;
        try {
            msg = typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
            console.error('Invalid message:', data);
            return;
        }

        switch (msg.type) {
            case 'HOST_STATE_UPDATE':
                lastKnownState = msg.payload;
                if (onStateUpdate) onStateUpdate(msg.payload);
                break;

            case 'LOBBY_UPDATE':
                lobby = msg.payload;
                lastKnownLobby = JSON.parse(JSON.stringify(lobby));
                if (onLobbyUpdate) onLobbyUpdate(lobby);
                break;

            case 'PLAYER_ACTION':
                if (isHost) {
                    // Validate sender's actual role from lobby
                    var senderRole = null;
                    for (var lr in lobby.players) {
                        if (lobby.players[lr].peerId === fromPeerId) { senderRole = lr; break; }
                    }
                    if (!senderRole || senderRole !== msg.payload.role) {
                        console.warn('Role mismatch: peer claims ' + msg.payload.role + ' but is ' + senderRole);
                        break;
                    }
                    var result = Engine.executeAction(senderRole, msg.payload.actionId, msg.payload.params);
                    // Broadcast result and new state
                    broadcast(createMessage('ACTION_RESULT', {
                        role: msg.payload.role,
                        actionId: msg.payload.actionId,
                        result: result
                    }));
                    broadcast(createMessage('HOST_STATE_UPDATE', Engine.getState()));
                }
                break;

            case 'ACTION_RESULT':
                if (onActionResult) onActionResult(msg.payload);
                break;

            case 'CHAT_MESSAGE':
                if (isHost) {
                    // Limit message length and re-wrap
                    if (msg.payload && typeof msg.payload.text === 'string') {
                        msg.payload.text = msg.payload.text.substring(0, 500);
                    }
                    broadcast(createMessage('CHAT_MESSAGE', msg.payload));
                }
                if (onChatMessage) onChatMessage(msg.payload);
                break;

            case 'ROLE_SELECT':
                if (isHost) {
                    var reqRole = msg.payload.role;
                    var playerName = msg.payload.name;
                    if (!lobby.players[reqRole]) {
                        // Remove player from any previously held role
                        for (var existingRole in lobby.players) {
                            if (lobby.players[existingRole].peerId === fromPeerId) {
                                delete lobby.players[existingRole];
                            }
                        }
                        lobby.players[reqRole] = { peerId: fromPeerId, name: playerName, ready: false };
                        broadcast(createMessage('LOBBY_UPDATE', lobby));
                    }
                }
                break;

            case 'PLAYER_READY':
                if (isHost) {
                    for (var r in lobby.players) {
                        if (lobby.players[r].peerId === fromPeerId) {
                            lobby.players[r].ready = msg.payload.ready;
                        }
                    }
                    broadcast(createMessage('LOBBY_UPDATE', lobby));
                }
                break;

            case 'VOTE_REQUEST':
                if (onVoteRequest) onVoteRequest(msg.payload);
                break;

            case 'VOTE_RESPONSE':
                if (isHost && pendingVote) {
                    pendingVote.responses[msg.from] = msg.payload.vote;
                    checkVoteComplete();
                }
                break;

            case 'GAME_START':
                lastKnownState = msg.payload;
                if (onStateUpdate) onStateUpdate(msg.payload);
                break;

            case 'RECONNECT':
                if (isHost) {
                    var reconnRole = msg.payload ? msg.payload.role : null;
                    if (reconnRole && lobby.players[reconnRole] && lobby.players[reconnRole].disconnected) {
                        lobby.players[reconnRole].peerId = fromPeerId;
                        lobby.players[reconnRole].disconnected = false;
                    }
                    var reconnConn = connections[fromPeerId];
                    if (reconnConn && reconnConn.open) {
                        reconnConn.send(JSON.stringify(createMessage('HOST_STATE_UPDATE', Engine.getState())));
                        reconnConn.send(JSON.stringify(createMessage('LOBBY_UPDATE', lobby)));
                    }
                    broadcast(createMessage('LOBBY_UPDATE', lobby));
                }
                break;
        }
    }

    // --- Consensus Voting ---
    var pendingVote = null;
    var voteTimeout = null;

    function requestVote(description, callback) {
        pendingVote = {
            description: description,
            responses: {},
            callback: callback
        };
        broadcast(createMessage('VOTE_REQUEST', { description: description }));
        // Host must also see the vote prompt
        if (onVoteRequest) onVoteRequest({ description: description });
        voteTimeout = setTimeout(function() {
            checkVoteComplete(true);
        }, 30000);
    }

    function checkVoteComplete(forceComplete) {
        if (!pendingVote) return;
        var yesCount = 0;
        var totalResponses = 0;
        for (var r in pendingVote.responses) {
            totalResponses++;
            if (pendingVote.responses[r]) yesCount++;
        }
        var totalPlayers = Object.keys(lobby.players).length;

        if (totalResponses >= totalPlayers || forceComplete) {
            clearTimeout(voteTimeout);
            var threshold = Math.ceil(totalPlayers * 0.75);
            var passed = yesCount >= threshold;
            if (pendingVote.callback) pendingVote.callback(passed, yesCount);
            pendingVote = null;
        }
    }

    function respondToVote(vote) {
        if (isHost) {
            if (pendingVote) {
                pendingVote.responses[myRole] = vote;
                checkVoteComplete();
            }
        } else {
            sendToHost(createMessage('VOTE_RESPONSE', { vote: vote }));
        }
    }

    // --- Host Functions ---
    function hostGame(playerName, callback) {
        roomCode = generateRoomCode();
        var peerId = 'bop-' + roomCode;

        peer = new Peer(peerId, PEERJS_CONFIG);

        peer.on('open', function(id) {
            isHost = true;
            myRole = null; // Host picks role in lobby
            lobby = { players: {}, roomCode: roomCode };
            if (callback) callback(null, roomCode);
            if (onConnected) onConnected(roomCode);
        });

        peer.on('connection', function(conn) {
            conn.on('open', function() {
                connections[conn.peer] = conn;
                conn.send(JSON.stringify(createMessage('LOBBY_UPDATE', lobby)));
            });

            conn.on('data', function(data) {
                handleMessage(data, conn.peer);
            });

            conn.on('close', function() {
                var disconnectedRole = null;
                for (var r in lobby.players) {
                    if (lobby.players[r].peerId === conn.peer) {
                        lobby.players[r].disconnected = true;
                        disconnectedRole = r;
                    }
                }
                broadcast(createMessage('LOBBY_UPDATE', lobby));
                delete connections[conn.peer];

                // Skip disconnected player's turn if it's their turn
                var gameState = Engine.getState();
                if (gameState && gameState.phase === 'action' && disconnectedRole) {
                    var currentRole = Engine.getCurrentRole();
                    if (currentRole === disconnectedRole) {
                        while (Engine.getCurrentRole() === disconnectedRole && gameState[disconnectedRole].actionsRemaining > 0) {
                            gameState[disconnectedRole].actionsRemaining--;
                        }
                        broadcast(createMessage('HOST_STATE_UPDATE', Engine.getState()));
                        if (onStateUpdate) onStateUpdate(JSON.parse(JSON.stringify(Engine.getState())));
                    }
                }
            });
        });

        peer.on('error', function(err) {
            console.error('PeerJS error:', err);
            if (err.type === 'unavailable-id') {
                peer.destroy();
                peer = null;
                roomCode = generateRoomCode();
                hostGame(playerName, callback);
                return;
            }
            if (onError) onError(err);
        });
    }

    function joinGame(code, playerName, callback) {
        roomCode = code.toUpperCase();
        var peerId = 'bop-player-' + Math.random().toString(36).substr(2, 8);

        peer = new Peer(peerId, PEERJS_CONFIG);

        peer.on('open', function() {
            var conn = peer.connect('bop-' + roomCode, { reliable: true });

            conn.on('open', function() {
                connections['host'] = conn;
                isHost = false;
                if (callback) callback(null);
                if (onConnected) onConnected(roomCode);
            });

            conn.on('data', function(data) {
                handleMessage(data, 'host');
            });

            conn.on('close', function() {
                if (migrating) return;
                if (lastKnownState) {
                    initiateHostMigration();
                } else {
                    if (onError) onError({ type: 'disconnected', message: 'Lost connection to host' });
                }
            });
        });

        peer.on('error', function(err) {
            console.error('PeerJS error:', err);
            if (onError) onError(err);
            if (callback) callback(err);
        });
    }

    function selectRole(role, playerName) {
        myRole = role;
        if (isHost) {
            lobby.players[role] = { peerId: peer.id, name: playerName, ready: false };
            broadcast(createMessage('LOBBY_UPDATE', lobby));
            if (onLobbyUpdate) onLobbyUpdate(lobby);
        } else {
            sendToHost(createMessage('ROLE_SELECT', { role: role, name: playerName }));
        }
    }

    function setReady(ready) {
        if (isHost) {
            if (lobby.players[myRole]) {
                lobby.players[myRole].ready = ready;
                broadcast(createMessage('LOBBY_UPDATE', lobby));
                if (onLobbyUpdate) onLobbyUpdate(lobby);
            }
        } else {
            sendToHost(createMessage('PLAYER_READY', { ready: ready }));
        }
    }

    function startGame(gameLength) {
        if (!isHost) return;
        var allReady = true;
        var playerCount = 0;
        for (var r in lobby.players) {
            playerCount++;
            if (!lobby.players[r].ready) allReady = false;
        }
        if (playerCount < 4 || !allReady) return false;

        Engine.init(gameLength);
        broadcast(createMessage('GAME_START', Engine.getState()));
        if (onStateUpdate) onStateUpdate(JSON.parse(JSON.stringify(Engine.getState())));
        return true;
    }

    function sendAction(actionId, params) {
        if (isHost) {
            var result = Engine.executeAction(myRole, actionId, params);
            broadcast(createMessage('ACTION_RESULT', { role: myRole, actionId: actionId, result: result }));
            broadcast(createMessage('HOST_STATE_UPDATE', Engine.getState()));
            if (onActionResult) onActionResult({ role: myRole, actionId: actionId, result: result });
            if (onStateUpdate) onStateUpdate(JSON.parse(JSON.stringify(Engine.getState())));
        } else {
            sendToHost(createMessage('PLAYER_ACTION', { role: myRole, actionId: actionId, params: params }));
        }
    }

    function sendChat(message) {
        if (typeof message !== 'string') return;
        message = message.substring(0, 500);
        var msg = createMessage('CHAT_MESSAGE', { from: myRole, text: message });
        if (isHost) {
            broadcast(msg);
            if (onChatMessage) onChatMessage(msg.payload);
        } else {
            sendToHost(msg);
        }
    }

    function disconnect() {
        if (peer) {
            peer.destroy();
            peer = null;
        }
        connections = {};
        isHost = false;
        myRole = null;
        lobby = { players: {} };
        lastKnownState = null;
        lastKnownLobby = null;
        migrating = false;
    }

    // --- Host Migration ---

    function getHostRole() {
        if (!lastKnownLobby || !lastKnownLobby.players) return null;
        var players = lastKnownLobby.players;
        for (var role in players) {
            if (players[role].peerId === 'bop-' + roomCode || players[role].isHost) {
                return role;
            }
        }
        return null;
    }

    function getNewHostRole() {
        var hostRole = getHostRole();
        var players = lastKnownLobby ? lastKnownLobby.players : lobby.players;
        for (var i = 0; i < Config.ROLES.length; i++) {
            var role = Config.ROLES[i];
            if (role === hostRole) continue;
            if (players[role] && !players[role].disconnected) {
                return role;
            }
        }
        return null;
    }

    function initiateHostMigration() {
        migrating = true;
        var newHostRole = getNewHostRole();

        if (!newHostRole) {
            migrating = false;
            if (onError) onError({ type: 'disconnected', message: 'No players available to become host' });
            return;
        }

        if (myRole === newHostRole) {
            becomeHost();
        } else {
            setTimeout(function() {
                reconnectToNewHost(0);
            }, 3000);
        }
    }

    function setupHostConnectionHandler(conn) {
        conn.on('open', function() {
            connections[conn.peer] = conn;
            conn.send(JSON.stringify(createMessage('LOBBY_UPDATE', lobby)));
            conn.send(JSON.stringify(createMessage('HOST_STATE_UPDATE', Engine.getState())));
        });

        conn.on('data', function(data) {
            handleMessage(data, conn.peer);
        });

        conn.on('close', function() {
            var disconnectedRole = null;
            for (var r in lobby.players) {
                if (lobby.players[r].peerId === conn.peer) {
                    lobby.players[r].disconnected = true;
                    disconnectedRole = r;
                }
            }
            broadcast(createMessage('LOBBY_UPDATE', lobby));
            delete connections[conn.peer];

            var gameState = Engine.getState();
            if (gameState && gameState.phase === 'action' && disconnectedRole) {
                var currentRole = Engine.getCurrentRole();
                if (currentRole === disconnectedRole) {
                    while (Engine.getCurrentRole() === disconnectedRole && gameState[disconnectedRole].actionsRemaining > 0) {
                        gameState[disconnectedRole].actionsRemaining--;
                    }
                    broadcast(createMessage('HOST_STATE_UPDATE', Engine.getState()));
                    if (onStateUpdate) onStateUpdate(JSON.parse(JSON.stringify(Engine.getState())));
                }
            }
        });
    }

    function becomeHost() {
        var savedState = JSON.parse(JSON.stringify(lastKnownState));
        var savedLobby = lastKnownLobby ? JSON.parse(JSON.stringify(lastKnownLobby)) : lobby;

        // Clear any pending vote from saved state
        if (savedState.pendingVote) delete savedState.pendingVote;
        pendingVote = null;
        if (voteTimeout) { clearTimeout(voteTimeout); voteTimeout = null; }

        // Destroy current peer
        if (peer) { peer.destroy(); peer = null; }
        connections = {};

        var migratedPeerId = 'bop-' + roomCode + '-m';
        peer = new Peer(migratedPeerId, PEERJS_CONFIG);

        peer.on('open', function() {
            isHost = true;

            // Restore engine state
            Engine.setState(savedState);

            // Restore lobby, mark old host as disconnected
            lobby = savedLobby;
            var hostRole = getHostRole();
            if (hostRole && lobby.players[hostRole]) {
                lobby.players[hostRole].disconnected = true;
            }
            // Update our own peerId in lobby
            if (lobby.players[myRole]) {
                lobby.players[myRole].peerId = migratedPeerId;
                lobby.players[myRole].isHost = true;
            }

            // Re-initialize AI for AI-controlled roles
            for (var i = 0; i < Config.ROLES.length; i++) {
                var role = Config.ROLES[i];
                if (lobby.players[role] && lobby.players[role].disconnected && role !== myRole) {
                    if (typeof GameAI !== 'undefined') {
                        var aiCfg = GameAI.getAIConfig(role);
                        if (aiCfg && aiCfg.enabled) {
                            var persName = aiCfg.personality ? aiCfg.personality.name : 'random';
                            GameAI.setAI(role, true, persName);
                        }
                    }
                }
            }

            migrating = false;

            // Notify local UI
            if (onStateUpdate) onStateUpdate(JSON.parse(JSON.stringify(Engine.getState())));
            if (onLobbyUpdate) onLobbyUpdate(lobby);

            // Show migration toast via error handler
            if (onError) onError({ type: 'info', message: 'You are now the host! Game continues.' });
        });

        peer.on('connection', function(conn) {
            setupHostConnectionHandler(conn);
        });

        peer.on('error', function(err) {
            console.error('Migration PeerJS error:', err);
            migrating = false;
            if (onError) onError(err);
        });
    }

    function reconnectToNewHost(attempt) {
        var maxRetries = 3;
        var retryDelay = 3000;
        var newHostPeerId = 'bop-' + roomCode + '-m';

        if (attempt >= maxRetries) {
            migrating = false;
            if (onError) onError({ type: 'disconnected', message: 'Could not reconnect to new host' });
            return;
        }

        try {
            var conn = peer.connect(newHostPeerId, { reliable: true });

            conn.on('open', function() {
                connections['host'] = conn;
                migrating = false;
                // Announce reconnection with our role
                conn.send(JSON.stringify(createMessage('RECONNECT', { role: myRole })));
                if (onError) onError({ type: 'info', message: 'Reconnected! Game continues.' });
            });

            conn.on('data', function(data) {
                handleMessage(data, 'host');
            });

            conn.on('close', function() {
                if (migrating) return;
                if (onError) onError({ type: 'disconnected', message: 'Lost connection to host' });
            });

            conn.on('error', function() {
                setTimeout(function() {
                    reconnectToNewHost(attempt + 1);
                }, retryDelay);
            });
        } catch (e) {
            setTimeout(function() {
                reconnectToNewHost(attempt + 1);
            }, retryDelay);
        }
    }

    // --- Local / Single-Player Mode ---
    function startLocalGame(gameLength) {
        isHost = true;
        myRole = 'president'; // default, can switch
        roomCode = 'LOCAL';
        Engine.init(gameLength);
        lobby = {
            players: {
                president: { name: 'Player 1', ready: true },
                house: { name: 'Player 2', ready: true },
                senate: { name: 'Player 3', ready: true },
                supremeCourt: { name: 'Player 4', ready: true }
            },
            roomCode: 'LOCAL'
        };
        if (onStateUpdate) onStateUpdate(JSON.parse(JSON.stringify(Engine.getState())));
        return true;
    }

    function localAction(role, actionId, params) {
        var result = Engine.executeAction(role, actionId, params);
        if (onActionResult) onActionResult({ role: role, actionId: actionId, result: result });
        if (onStateUpdate) onStateUpdate(JSON.parse(JSON.stringify(Engine.getState())));
        return result;
    }

    return {
        hostGame: hostGame,
        joinGame: joinGame,
        selectRole: selectRole,
        setReady: setReady,
        startGame: startGame,
        sendAction: sendAction,
        sendChat: sendChat,
        respondToVote: respondToVote,
        disconnect: disconnect,
        startLocalGame: startLocalGame,
        localAction: localAction,

        isHost: function() { return isHost; },
        getMyRole: function() { return myRole; },
        setMyRole: function(r) {
            var validRoles = ['president', 'house', 'senate', 'supremeCourt'];
            if (validRoles.indexOf(r) !== -1) myRole = r;
        },
        getRoomCode: function() { return roomCode; },
        getLobby: function() { return lobby; },

        // Event handlers
        onStateUpdate: function(fn) { onStateUpdate = fn; },
        onLobbyUpdate: function(fn) { onLobbyUpdate = fn; },
        onChatMessage: function(fn) { onChatMessage = fn; },
        onActionResult: function(fn) { onActionResult = fn; },
        onVoteRequest: function(fn) { onVoteRequest = fn; },
        onError: function(fn) { onError = fn; },
        onConnected: function(fn) { onConnected = fn; }
    };
})();

if (typeof module !== 'undefined') module.exports = Network;
