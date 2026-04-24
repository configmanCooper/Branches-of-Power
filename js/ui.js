// Branches of Power — UI System
// All rendering, panels, modals, action buttons

var UI = (function() {
    'use strict';

    var currentState = null;
    var currentRole = null;
    var chatMessages = [];
    var actionLog = [];

    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getPartyColor(party) {
        return party === 'democrat' ? '#2196F3' : '#f44336';
    }

    function getPartisanColor(value) {
        // 1 = deep red (conservative), 10 = purple, 20 = deep blue (liberal)
        var ratio = (value - 1) / 19;
        var r = Math.round(220 - ratio * 180);
        var g = Math.round(40 + ratio * 20 - Math.abs(ratio - 0.5) * 60);
        var b = Math.round(40 + ratio * 180);
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    function init() {
        // Set up event delegation
        document.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-action]');
            if (!btn) return;
            var action = btn.getAttribute('data-action');
            try {
                handleAction(action, btn.dataset);
            } catch (err) {
                console.error('Action error (' + action + '):', err);
                alert('Error in action "' + action + '": ' + err.message);
            }
            e.preventDefault();
        });

        // Chat input
        var chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && chatInput.value.trim()) {
                    Network.sendChat(chatInput.value.trim());
                    chatInput.value = '';
                }
            });
        }
    }

    function handleAction(action, dataset) {
        switch (action) {
            // Lobby
            case 'hostGame':
                showHostLobby();
                break;
            case 'joinGame':
                showJoinLobby();
                break;
            case 'localGame':
                showLocalSetup();
                break;
            case 'selectRole':
                Network.selectRole(dataset.role, document.getElementById('player-name-input').value || 'Player');
                currentRole = dataset.role;
                renderLobby();
                break;
            case 'toggleReady':
                Network.setReady(true);
                break;
            case 'startOnlineGame':
                var len = document.querySelector('input[name="game-length"]:checked');
                Network.startGame(len ? len.value : 'standard');
                break;
            case 'startLocalGame':
                try {
                    var len2 = document.querySelector('input[name="game-length"]:checked');
                    // Read AI settings
                    GameAI.resetAI();
                    var roles = Config.ROLES;
                    var firstHumanRole = null;
                    for (var ri = 0; ri < roles.length; ri++) {
                        var r = roles[ri];
                        var modeEl = document.getElementById('ai-mode-' + r);
                        var persEl = document.getElementById('ai-personality-' + r);
                        var isAI = modeEl && modeEl.value === 'ai';
                        if (isAI) {
                            var persName = persEl ? persEl.value : 'random';
                            GameAI.setAI(r, true, persName);
                        }
                        if (!isAI && !firstHumanRole) firstHumanRole = r;
                    }
                    Network.startLocalGame(len2 ? len2.value : 'standard');
                    currentRole = firstHumanRole || 'president';
                } catch (err) {
                    console.error('Start game error:', err);
                    alert('Error starting game: ' + err.message);
                }
                break;
            case 'connectToGame':
                var code = document.getElementById('room-code-input').value.trim();
                var name = document.getElementById('player-name-input').value || 'Player';
                if (code.length === 6) {
                    Network.joinGame(code, name, function(err) {
                        if (err) {
                            showToast('Failed to connect: ' + err.message, 'error');
                        }
                    });
                }
                break;
            case 'doHostGame':
                var name2 = document.getElementById('player-name-input').value || 'Host';
                Network.hostGame(name2, function(err, roomCode) {
                    if (err) {
                        showToast('Failed to host: ' + err.message, 'error');
                    } else {
                        renderLobby();
                    }
                });
                break;

            // Game Actions
            case 'gameAction':
                executeGameAction(dataset.actionId, dataset);
                break;

            // Modal actions
            case 'closeModal':
                closeModal();
                break;

            // Role switch (local mode)
            case 'switchRole':
                currentRole = dataset.role;
                Network.setMyRole(currentRole);
                renderGame(currentState);
                break;

            // Vote
            case 'voteYes':
                Network.respondToVote(true);
                closeModal();
                break;
            case 'voteNo':
                Network.respondToVote(false);
                closeModal();
                break;
        }
    }

    function executeGameAction(actionId, dataset) {
        var params = {};

        // Actions needing parameter selection — show modal
        switch (actionId) {
            case 'advocate':
            case 'admonish':
                showAdvocateModal(actionId);
                return;
            case 'stateOfUnion':
                showStateOfUnionModal();
                return;
            case 'hostHearing':
                showHearingModal();
                return;
            case 'whipHouse':
                showWhipModal();
                return;
            case 'updateBill':
                showUpdateBillModal();
                return;
            case 'inquiryPresident':
                showInquiryPresidentModal();
                return;
            case 'inquiryChamber':
                showInquiryChamberModal();
                return;
            case 'assignJustice':
                showAssignJusticeModal();
                return;
            case 'suggestJustice':
                showSuggestJusticeModal();
                return;
            case 'housePassBill':
            case 'senatePassBill':
                showPassBillModal(actionId);
                return;
            case 'proposeAmendment':
                showProposeAmendmentModal();
                return;
        }

        // Direct actions
        if (Network.getRoomCode() === 'LOCAL') {
            Network.localAction(currentRole, actionId, params);
        } else {
            Network.sendAction(actionId, params);
        }
    }

    // --- Modals ---
    function openModal(title, bodyHtml, footerHtml) {
        document.getElementById('modal-overlay').style.display = 'flex';
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHtml;
        document.getElementById('modal-footer').innerHTML = footerHtml || '<button class="btn btn-secondary" data-action="closeModal">Close</button>';
    }

    function closeModal() {
        document.getElementById('modal-overlay').style.display = 'none';
    }

    function showAdvocateModal(actionId) {
        var isAdvocate = actionId === 'advocate';
        var verb = isAdvocate ? 'Advocate' : 'Admonish';
        var html = '<p>' + verb + ' current legislation. Choose target:</p>';
        html += '<div class="modal-choices">';
        html += '<button class="btn btn-primary" onclick="UI.confirmAction(\'' + actionId + '\', {target:\'both\'})">Both Chambers (' + (isAdvocate?'+':'-') + '2 PC each)</button>';
        html += '<button class="btn btn-blue" onclick="UI.confirmAction(\'' + actionId + '\', {target:\'senate\'})">Senate Only (' + (isAdvocate?'+':'-') + '4 PC)</button>';
        html += '<button class="btn btn-green" onclick="UI.confirmAction(\'' + actionId + '\', {target:\'house\'})">House Only (' + (isAdvocate?'+':'-') + '4 PC)</button>';
        html += '</div>';
        openModal(verb + ' Legislation', html);
    }

    function showStateOfUnionModal() {
        var html = '<p>Choose the effect of the State of the Union Address:</p>';
        html += '<div class="modal-choices">';
        html += '<button class="btn btn-primary" onclick="UI.confirmAction(\'stateOfUnion\', {choice:\'boostPres\'})">+2 President Popularity</button>';
        html += '<button class="btn btn-danger" onclick="UI.confirmAction(\'stateOfUnion\', {choice:\'hurtPres\'})">-4 President Popularity</button>';
        html += '<button class="btn btn-green" onclick="UI.confirmAction(\'stateOfUnion\', {choice:\'gainPC\'})">+2 PC for House</button>';
        html += '<button class="btn btn-blue" onclick="UI.confirmAction(\'stateOfUnion\', {choice:\'hurtSenate\'})">-4 PC for Senate</button>';
        html += '<button class="btn btn-gold" onclick="UI.confirmAction(\'stateOfUnion\', {choice:\'gainVP\'})">+1 VP for House</button>';
        html += '</div>';
        openModal('State of the Union', html);
    }

    function showHearingModal() {
        var html = '<p>Choose hearing outcome:</p>';
        html += '<div class="modal-choices">';
        html += '<button class="btn btn-primary" onclick="UI.confirmAction(\'hostHearing\', {choice:\'pcAndBoostPres\'})">+1 PC, +1 Pres Pop</button>';
        html += '<button class="btn btn-danger" onclick="UI.confirmAction(\'hostHearing\', {choice:\'pcAndHurtPres\'})">+2 PC, -2 Pres Pop</button>';
        html += '<button class="btn btn-gold" onclick="UI.confirmAction(\'hostHearing\', {choice:\'gainVP\'})">+1 VP</button>';
        html += '</div>';
        openModal('Host a Hearing', html);
    }

    function showWhipModal() {
        var comp = currentState.house.composition;
        var html = '<p>Choose faction to convert (20 members shift one step):</p>';
        html += '<div class="modal-choices">';
        if (comp.extremeDem > 0) html += '<button class="btn" style="background:#00008B;color:white" onclick="UI.confirmAction(\'whipHouse\', {faction:\'extremeDem\',direction:\'right\'})">Ext.Dem → Dem (' + comp.extremeDem + ')</button>';
        if (comp.democrat > 0) {
            html += '<button class="btn" style="background:#0000CD;color:white" onclick="UI.confirmAction(\'whipHouse\', {faction:\'democrat\',direction:\'left\'})">Dem → Ext.Dem (' + comp.democrat + ')</button>';
            html += '<button class="btn" style="background:#0000CD;color:white" onclick="UI.confirmAction(\'whipHouse\', {faction:\'democrat\',direction:\'right\'})">Dem → Rep (' + comp.democrat + ')</button>';
        }
        if (comp.republican > 0) {
            html += '<button class="btn" style="background:#CC0000;color:white" onclick="UI.confirmAction(\'whipHouse\', {faction:\'republican\',direction:\'left\'})">Rep → Dem (' + comp.republican + ')</button>';
            html += '<button class="btn" style="background:#CC0000;color:white" onclick="UI.confirmAction(\'whipHouse\', {faction:\'republican\',direction:\'right\'})">Rep → Ext.Rep (' + comp.republican + ')</button>';
        }
        if (comp.extremeRep > 0) html += '<button class="btn" style="background:#8B0000;color:white" onclick="UI.confirmAction(\'whipHouse\', {faction:\'extremeRep\',direction:\'left\'})">Ext.Rep → Rep (' + comp.extremeRep + ')</button>';
        html += '</div>';
        openModal('Whip the House', html);
    }

    function showUpdateBillModal() {
        var bill = currentState.currentBill;
        var html = '<p>Current bill: Part ' + bill.partisanship + ', Pop ' + bill.popularity + ', Leg ' + bill.legality + '</p>';
        html += '<p>Adjust up to 3 points total (1 PC per 2 extra points):</p>';
        html += '<div class="bill-adjust">';
        html += '<label>Partisanship: <input type="number" id="adj-part" value="0" min="-5" max="5" style="width:60px"></label>';
        html += '<label>Popularity: <input type="number" id="adj-pop" value="0" min="-5" max="5" style="width:60px"></label>';
        html += '<label>Legality: <input type="number" id="adj-leg" value="0" min="-5" max="5" style="width:60px"></label>';
        html += '</div>';
        html += '<button class="btn btn-primary" onclick="UI.confirmBillUpdate()">Apply Changes</button>';
        openModal('Update Bill', html);
    }

    function showInquiryPresidentModal() {
        var html = '<p>Choose effect on President:</p>';
        html += '<div class="modal-choices">';
        html += '<button class="btn btn-danger" onclick="UI.confirmAction(\'inquiryPresident\', {choice:\'hurt\'})">-2 President Popularity</button>';
        html += '<button class="btn btn-primary" onclick="UI.confirmAction(\'inquiryPresident\', {choice:\'help\'})">+1 President Popularity</button>';
        html += '</div>';
        openModal('Inquiry of President', html);
    }

    function showInquiryChamberModal() {
        var html = '<p>Choose target and effect:</p>';
        html += '<div class="modal-choices">';
        html += '<button class="btn btn-danger" onclick="UI.confirmAction(\'inquiryChamber\', {target:\'house\',choice:\'hurt\'})">House: -2 PC</button>';
        html += '<button class="btn btn-primary" onclick="UI.confirmAction(\'inquiryChamber\', {target:\'house\',choice:\'help\'})">House: +1 PC</button>';
        html += '<button class="btn btn-danger" onclick="UI.confirmAction(\'inquiryChamber\', {target:\'senate\',choice:\'hurt\'})">Senate: -2 PC</button>';
        html += '<button class="btn btn-primary" onclick="UI.confirmAction(\'inquiryChamber\', {target:\'senate\',choice:\'help\'})">Senate: +1 PC</button>';
        html += '</div>';
        openModal('Inquiry of Chamber', html);
    }

    function showAssignJusticeModal() {
        var html = '<p>Choose justice leaning:</p>';
        html += '<div class="modal-choices">';
        html += '<button class="btn" style="background:#0000CD;color:white" onclick="UI.confirmAction(\'assignJustice\', {leaning:\'liberal\'})">Liberal</button>';
        html += '<button class="btn" style="background:#808080;color:white" onclick="UI.confirmAction(\'assignJustice\', {leaning:\'moderate\'})">Moderate</button>';
        html += '<button class="btn" style="background:#CC0000;color:white" onclick="UI.confirmAction(\'assignJustice\', {leaning:\'conservative\'})">Conservative</button>';
        html += '</div>';
        openModal('Assign Justice', html);
    }

    function showSuggestJusticeModal() {
        var html = '<p>Suggest a justice leaning:</p>';
        html += '<div class="modal-choices">';
        html += '<button class="btn" style="background:#0000CD;color:white" onclick="UI.confirmAction(\'suggestJustice\', {leaning:\'liberal\'})">Liberal</button>';
        html += '<button class="btn" style="background:#808080;color:white" onclick="UI.confirmAction(\'suggestJustice\', {leaning:\'moderate\'})">Moderate</button>';
        html += '<button class="btn" style="background:#CC0000;color:white" onclick="UI.confirmAction(\'suggestJustice\', {leaning:\'conservative\'})">Conservative</button>';
        html += '</div>';
        openModal('Suggest Justice', html);
    }

    function showPassBillModal(actionId) {
        var chamber = actionId === 'housePassBill' ? 'house' : 'senate';
        var pc = currentState[chamber].pc;
        var html = '<p>How much PC to spend on expanding vote ranges?</p>';
        html += '<p>Available PC: ' + pc + '</p>';
        html += '<label>PC to use: <input type="number" id="pass-pc" value="0" min="0" max="' + pc + '" style="width:60px"></label>';
        html += '<br><br>';
        html += '<button class="btn btn-primary" onclick="UI.confirmPassBill(\'' + actionId + '\')">Vote!</button>';
        openModal('Pass Bill', html);
    }

    function showProposeAmendmentModal() {
        var bills = currentState.unconstitutionalBills || [];
        if (bills.length === 0) return;
        var html = '<p>Choose an unconstitutional bill to restore:</p>';
        html += '<select id="amendment-bill" style="width:100%;padding:6px;margin:6px 0;">';
        for (var i = 0; i < bills.length; i++) {
            html += '<option value="' + i + '">' + escapeHtml(bills[i].name) + ' (P:' + bills[i].partisanship + ' Pop:' + bills[i].popularity + ' L:' + bills[i].legality + ')</option>';
        }
        html += '</select>';
        html += '<p>Where should the bill go?</p>';
        html += '<div class="modal-choices">';
        html += '<button class="btn btn-primary" onclick="UI.confirmAmendment(\'floor\')">Put on Floor</button>';
        html += '<button class="btn btn-secondary" onclick="UI.confirmAmendment(\'drawPile\')">Add to Passed Bills</button>';
        html += '</div>';
        openModal('Constitutional Amendment', html);
    }

    function confirmAmendment(destination) {
        var billIndex = parseInt(document.getElementById('amendment-bill').value) || 0;
        confirmAction('proposeAmendment', { billIndex: billIndex, destination: destination });
    }

    function confirmAction(actionId, params) {
        closeModal();
        if (Network.getRoomCode() === 'LOCAL') {
            Network.localAction(currentRole, actionId, params);
        } else {
            Network.sendAction(actionId, params);
        }
    }

    function confirmBillUpdate() {
        var p = parseInt(document.getElementById('adj-part').value) || 0;
        var pop = parseInt(document.getElementById('adj-pop').value) || 0;
        var leg = parseInt(document.getElementById('adj-leg').value) || 0;
        confirmAction('updateBill', { changes: { partisanship: p, popularity: pop, legality: leg } });
    }

    function confirmPassBill(actionId) {
        var pc = parseInt(document.getElementById('pass-pc').value) || 0;
        confirmAction(actionId, { pcToUse: pc });
    }

    // --- Toast ---
    function showToast(message, type) {
        type = type || 'info';
        var container = document.getElementById('toast-container');
        if (!container) return;
        var el = document.createElement('div');
        el.className = 'toast toast-' + type;
        el.textContent = message;
        container.appendChild(el);
        setTimeout(function() { el.classList.add('toast-fade'); }, 3000);
        setTimeout(function() { el.remove(); }, 3500);
    }

    // --- Rendering ---
    function renderMainMenu() {
        var content = document.getElementById('game-content');
        content.innerHTML = '<div class="main-menu">' +
            '<h1>🏛️ Branches of Power</h1>' +
            '<p class="subtitle">A 4-Player Government Strategy Game</p>' +
            '<div class="menu-buttons">' +
            '<input type="text" id="player-name-input" placeholder="Your Name" class="menu-input" maxlength="20">' +
            '<button class="btn btn-primary btn-large" data-action="hostGame">🌐 Host Online Game</button>' +
            '<button class="btn btn-blue btn-large" data-action="joinGame">🔗 Join Online Game</button>' +
            '<button class="btn btn-green btn-large" data-action="localGame">🖥️ Local Game (Hot Seat)</button>' +
            '</div>' +
            '<div class="version">v' + Config.VERSION + '</div>' +
            '</div>';
    }

    function showHostLobby() {
        var content = document.getElementById('game-content');
        content.innerHTML = '<div class="lobby">' +
            '<h2>Host a Game</h2>' +
            '<button class="btn btn-primary" data-action="doHostGame">Create Room</button>' +
            '<div id="lobby-info"></div>' +
            '</div>';
    }

    function showJoinLobby() {
        var content = document.getElementById('game-content');
        content.innerHTML = '<div class="lobby">' +
            '<h2>Join a Game</h2>' +
            '<input type="text" id="room-code-input" placeholder="Room Code (6 chars)" class="menu-input" maxlength="6" style="text-transform:uppercase">' +
            '<button class="btn btn-primary" data-action="connectToGame">Connect</button>' +
            '<div id="lobby-info"></div>' +
            '</div>';
    }

    function showLocalSetup() {
        var content = document.getElementById('game-content');
        var html = '<div class="lobby">';
        html += '<h2>🖥️ Game Setup</h2>';
        html += '<div class="game-length-select">';
        html += '<h3>Game Length</h3>';
        for (var key in Config.GAME_LENGTHS) {
            var gl = Config.GAME_LENGTHS[key];
            var checked = key === 'standard' ? ' checked' : '';
            html += '<label class="radio-label"><input type="radio" name="game-length" value="' + key + '"' + checked + '> ' + gl.label + '</label>';
        }
        html += '</div>';

        html += '<div class="ai-setup">';
        html += '<h3>Player Setup</h3>';
        var roles = Config.ROLES;
        for (var i = 0; i < roles.length; i++) {
            var role = roles[i];
            var personalities = GameAI.getPersonalities(role);
            html += '<div class="ai-role-setup" style="display:flex;align-items:center;gap:10px;margin:8px 0;padding:8px;background:rgba(255,255,255,0.05);border-radius:6px;border-left:3px solid ' + Config.ROLE_COLORS[role] + '">';
            html += '<span style="min-width:120px;color:' + Config.ROLE_COLORS[role] + ';font-weight:bold">' + Config.ROLE_ICONS[role] + ' ' + Config.ROLE_LABELS[role] + '</span>';
            html += '<select id="ai-mode-' + role + '" onchange="UI.onAIModeChange(\'' + role + '\')" style="padding:4px 8px;border-radius:4px;background:#1a1a2e;color:white;border:1px solid #444">';
            html += '<option value="human">👤 Human</option>';
            html += '<option value="ai">🤖 AI</option>';
            html += '</select>';
            html += '<select id="ai-personality-' + role + '" style="padding:4px 8px;border-radius:4px;background:#1a1a2e;color:white;border:1px solid #444;display:none">';
            html += '<option value="random">🎲 Random</option>';
            for (var j = 0; j < personalities.length; j++) {
                html += '<option value="' + personalities[j].name + '">' + personalities[j].name + '</option>';
            }
            html += '</select>';
            html += '</div>';
        }
        html += '</div>';

        html += '<button class="btn btn-green btn-large" data-action="startLocalGame">Start Game</button>';
        html += '</div>';
        content.innerHTML = html;
    }

    function onAIModeChange(role) {
        var modeSelect = document.getElementById('ai-mode-' + role);
        var persSelect = document.getElementById('ai-personality-' + role);
        if (modeSelect && persSelect) {
            persSelect.style.display = modeSelect.value === 'ai' ? 'inline-block' : 'none';
        }
    }

    function renderLobby() {
        var lobby = Network.getLobby();
        var info = document.getElementById('lobby-info');
        if (!info) return;

        var html = '';
        if (lobby.roomCode && lobby.roomCode !== 'LOCAL') {
            html += '<div class="room-code-display">Room Code: <strong>' + lobby.roomCode + '</strong></div>';
        }

        html += '<div class="role-select">';
        html += '<h3>Select Your Role</h3>';
        var roles = Config.ROLES;
        for (var i = 0; i < roles.length; i++) {
            var r = roles[i];
            var taken = lobby.players[r] ? true : false;
            var isMe = taken && Network.getMyRole() === r;
            var cls = taken ? (isMe ? 'role-mine' : 'role-taken') : 'role-available';
            html += '<div class="role-card ' + cls + '" ' + (!taken ? 'data-action="selectRole" data-role="' + r + '"' : '') + '>';
            html += '<span class="role-icon">' + Config.ROLE_ICONS[r] + '</span>';
            html += '<span class="role-name">' + Config.ROLE_LABELS[r] + '</span>';
            if (taken) {
                html += '<span class="role-player">' + escapeHtml(lobby.players[r].name || 'Player') + '</span>';
                html += lobby.players[r].ready ? '<span class="ready-badge">✅ Ready</span>' : '<span class="not-ready-badge">⏳ Not Ready</span>';
            } else {
                html += '<span class="role-player">Available</span>';
            }
            html += '</div>';
        }
        html += '</div>';

        if (Network.getMyRole() && !Network.isHost()) {
            html += '<button class="btn btn-primary" data-action="toggleReady">Ready Up</button>';
        }
        if (Network.isHost()) {
            html += '<div class="game-length-select">';
            html += '<h3>Game Length</h3>';
            for (var key in Config.GAME_LENGTHS) {
                var gl = Config.GAME_LENGTHS[key];
                var checked = key === 'standard' ? ' checked' : '';
                html += '<label class="radio-label"><input type="radio" name="game-length" value="' + key + '"' + checked + '> ' + gl.label + '</label>';
            }
            html += '</div>';
            html += '<button class="btn btn-green btn-large" data-action="startOnlineGame">Start Game</button>';
        }

        info.innerHTML = html;
    }

    function renderGame(state) {
        if (!state) return;
        currentState = state;

        var content = document.getElementById('game-content');
        if (state.phase === 'gameOver') {
            renderGameOver(state);
            return;
        }

        var isMyTurn = Engine.getCurrentRole() === currentRole;
        var currentTurnRole = Engine.getCurrentRole();
        var isLocal = Network.getRoomCode() === 'LOCAL';

        var html = '<div class="game-board">';

        // Header
        html += '<div class="game-header">';
        html += '<div class="header-left"><h2>🏛️ Branches of Power</h2></div>';
        html += '<div class="header-center">';
        html += '<span class="round-display">Round ' + state.round + '/' + state.maxRounds + '</span>';
        html += '<span class="turn-display active-turn" style="color:' + Config.ROLE_COLORS[currentTurnRole] + ';background:rgba(255,255,255,0.08);padding:4px 12px;border-radius:6px;border:1px solid ' + Config.ROLE_COLORS[currentTurnRole] + '">';
        html += Config.ROLE_ICONS[currentTurnRole] + ' ' + Config.ROLE_LABELS[currentTurnRole] + '\'s Turn';
        html += ' (Action ' + (5 - state[currentTurnRole].actionsRemaining) + '/4)</span>';
        html += '</div>';
        // VP Scoreboard in header
        html += '<div class="vp-scoreboard">';
        for (var vi = 0; vi < Config.ROLES.length; vi++) {
            var vr = Config.ROLES[vi];
            html += '<span class="vp-score" style="color:' + Config.ROLE_COLORS[vr] + '">' + Config.ROLE_ICONS[vr] + ' ' + state[vr].vp + '</span>';
        }
        html += '</div>';
        html += '<div class="header-right">';
        if (Network.getRoomCode() !== 'LOCAL') {
            html += '<span class="room-code">Room: ' + Network.getRoomCode() + '</span>';
        }
        html += '</div>';
        html += '</div>';

        // Main area
        html += '<div class="game-main">';

        // Left: Player stats
        html += '<div class="player-panel">';
        html += renderPlayerStats(state);
        html += '</div>';

        // Center: Bill + composition + actions
        html += '<div class="center-panel">';
        html += renderBillCard(state);

        // Pending Amendment banner
        if (state.pendingAmendment) {
            var pa = state.pendingAmendment;
            html += '<div class="amendment-banner" style="background:rgba(255,193,7,0.15);border:1px solid #FFC107;border-radius:8px;padding:8px 12px;margin:6px 0;text-align:center;">';
            html += '<strong>⚖️ Pending Amendment:</strong> "' + escapeHtml(pa.bill.name) + '"';
            html += '<br><small>Proposed by ' + Config.ROLE_LABELS[pa.proposedBy] + '. Waiting for: ' + pa.needed.map(function(r) { return Config.ROLE_LABELS[r]; }).join(', ') + '</small>';
            html += '</div>';
        }

        html += renderCompositionBars(state);

        // Role switcher for local mode
        if (isLocal) {
            html += '<div class="role-switcher">';
            html += '<span class="switcher-label">Playing as: </span>';
            for (var ri = 0; ri < Config.ROLES.length; ri++) {
                var role = Config.ROLES[ri];
                var active = role === currentRole ? ' active' : '';
                var isTurn = role === currentTurnRole ? ' is-turn' : '';
                var isRoleAI = GameAI.isAI(role);
                if (isRoleAI) {
                    var aiConf = GameAI.getAIConfig(role);
                    html += '<span class="role-switch-btn ai-role' + isTurn + '" style="border-color:' + Config.ROLE_COLORS[role] + ';opacity:0.6;cursor:default">';
                    html += Config.ROLE_ICONS[role] + ' 🤖 ' + (aiConf.personality ? aiConf.personality.name : 'AI');
                    html += '</span>';
                } else {
                    html += '<button class="role-switch-btn' + active + isTurn + '" data-action="switchRole" data-role="' + role + '" style="border-color:' + Config.ROLE_COLORS[role] + '">';
                    html += Config.ROLE_ICONS[role] + ' ' + Config.ROLE_LABELS[role].split(' ')[0];
                    html += '</button>';
                }
            }
            html += '</div>';
        }

        // Actions
        html += renderActions(state, isLocal ? currentTurnRole : currentRole);
        html += '</div>';

        // Right: Action log
        html += '<div class="log-panel">';
        html += renderActionLog(state);
        html += '</div>';

        html += '</div>'; // game-main

        // Chat bar
        html += '<div class="chat-bar">';
        html += '<div id="chat-messages" class="chat-messages">';
        for (var ci = Math.max(0, chatMessages.length - 20); ci < chatMessages.length; ci++) {
            var cm = chatMessages[ci];
            html += '<span class="chat-msg"><strong style="color:' + (Config.ROLE_COLORS[cm.from] || '#fff') + '">' + escapeHtml(cm.from) + ':</strong> ' + escapeHtml(cm.text) + '</span>';
        }
        html += '</div>';
        html += '<input type="text" id="chat-input" placeholder="Chat..." class="chat-input">';
        html += '</div>';

        html += '</div>'; // game-board

        // Preserve chat input value before re-render
        var oldChatInput = document.getElementById('chat-input');
        var savedChatValue = oldChatInput ? oldChatInput.value : '';

        content.innerHTML = html;

        // Restore chat input value
        var newChatInput = document.getElementById('chat-input');
        if (newChatInput && savedChatValue) {
            newChatInput.value = savedChatValue;
        }
        // Re-attach chat keypress
        if (newChatInput) {
            newChatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && newChatInput.value.trim()) {
                    Network.sendChat(newChatInput.value.trim());
                    newChatInput.value = '';
                }
            });
        }

        // Auto-play AI turns
        if (isLocal && state.phase === 'action') {
            var aiTurnRole = Engine.getCurrentRole();
            if (GameAI.isAI(aiTurnRole)) {
                setTimeout(function() {
                    playAITurn(aiTurnRole);
                }, 400);
            }
        }
    }

    function playAITurn(role) {
        var state = JSON.parse(JSON.stringify(Engine.getState()));
        var actions = Engine.getAvailableActions(role);
        if (actions.length === 0) return;

        var decision = GameAI.getAIDecision(role, state, actions);
        if (!decision) return;

        // Verify the chosen action is actually available
        var valid = false;
        for (var i = 0; i < actions.length; i++) {
            if (actions[i].id === decision.id) { valid = true; break; }
        }
        if (!valid) decision = { id: actions[0].id, params: {} };

        Network.localAction(role, decision.id, decision.params);
    }

    function renderPlayerStats(state) {
        var html = '<h3>Players</h3>';
        var roles = Config.ROLES;

        for (var i = 0; i < roles.length; i++) {
            var role = roles[i];
            var rs = state[role];
            var isCurrent = Engine.getCurrentRole() === role;
            var isMe = role === currentRole;

            html += '<div class="player-card' + (isCurrent ? ' current-turn' : '') + (isMe ? ' is-me' : '') + '" style="border-left: 4px solid ' + Config.ROLE_COLORS[role] + '">';
            html += '<div class="player-card-header">';
            html += '<span class="player-role-icon">' + Config.ROLE_ICONS[role] + '</span>';
            html += '<span class="player-role-name">' + Config.ROLE_LABELS[role] + '</span>';
            if (GameAI.isAI(role)) {
                var aiConf = GameAI.getAIConfig(role);
                html += '<span class="ai-badge" style="font-size:0.7em;opacity:0.7"> 🤖 ' + (aiConf.personality ? aiConf.personality.name : 'AI') + '</span>';
            }
            if (isCurrent) html += '<span class="turn-indicator">◀ TURN</span>';
            html += '</div>';

            html += '<div class="player-stats">';
            html += '<div class="stat"><span class="stat-label">VP</span><span class="stat-value vp-value">' + rs.vp + '</span></div>';

            if (role === 'president') {
                html += '<div class="stat"><span class="stat-label">Pop</span><span class="stat-value" style="color:' + getPartyColor(rs.party) + '">' + rs.popularity + '</span></div>';
                html += '<div class="stat"><span class="stat-label">Party</span><span class="stat-value" style="color:' + getPartyColor(rs.party) + '">' + (rs.party === 'democrat' ? 'D' : 'R') + '</span></div>';
            }
            if (role === 'house' || role === 'senate') {
                html += '<div class="stat"><span class="stat-label">PC</span><span class="stat-value">' + rs.pc + '</span></div>';
                html += '<div class="stat"><span class="stat-label">Maj</span><span class="stat-value" style="color:' + getPartyColor(rs.majorityParty) + '">' + (rs.majorityParty === 'democrat' ? 'D' : 'R') + '</span></div>';
            }
            if (role === 'supremeCourt') {
                var courtMaj = Engine.getCourtMajority();
                html += '<div class="stat"><span class="stat-label">JP</span><span class="stat-value" style="color:#9C27B0">' + rs.jp + '</span></div>';
                html += '<div class="stat"><span class="stat-label">Justices</span><span class="stat-value">' + rs.justices.length + '</span></div>';
                html += '<div class="stat"><span class="stat-label">Lean</span><span class="stat-value">' + courtMaj.charAt(0).toUpperCase() + '</span></div>';
                if (rs.landmarkEffect) {
                    html += '<div class="stat"><span class="stat-label">Landmark</span><span class="stat-value" style="color:#FFD700">' + rs.landmarkEffect + '</span></div>';
                }
            }

            var maxActions = role === 'supremeCourt' ? rs.baseActionsPerRound : 4;
            html += '<div class="stat"><span class="stat-label">Actions</span><span class="stat-value">' + rs.actionsRemaining + '/' + maxActions + '</span></div>';
            html += '</div>';
            html += '</div>';
        }

        return html;
    }

    function renderBillCard(state) {
        var bill = state.currentBill;
        if (!bill) {
            return '<div class="bill-card empty-bill"><p>No bill on the floor</p></div>';
        }

        var partColor = getPartisanColor(bill.partisanship);
        var html = '<div class="bill-card" style="border-color:' + partColor + '">';
        html += '<div class="bill-header" style="background:' + partColor + '">';
        html += '<h3>' + escapeHtml(bill.name) + '</h3>';
        if (bill.markers && bill.markers.length > 0) {
            html += '<span class="bill-markers">' + bill.markers.join(' ') + '</span>';
        }
        html += '</div>';
        html += '<div class="bill-stats">';
        var partLabel = bill.partisanship <= 7 ? 'Conservative' : (bill.partisanship >= 14 ? 'Liberal' : 'Moderate');
        html += '<div class="bill-stat">';
        html += '<span class="bill-stat-label">Partisanship <small>(' + partLabel + ')</small></span>';
        html += '<span class="bill-stat-value" style="color:' + partColor + '">' + bill.partisanship + '/20</span>';
        html += '<div class="bill-stat-bar"><div class="bill-stat-fill" style="width:' + (bill.partisanship / 20 * 100) + '%;background:' + partColor + '"></div></div>';
        html += '</div>';
        html += '<div class="bill-stat">';
        html += '<span class="bill-stat-label">Popularity</span>';
        html += '<span class="bill-stat-value">' + bill.popularity + '/20</span>';
        html += '<div class="bill-stat-bar"><div class="bill-stat-fill" style="width:' + (bill.popularity / 20 * 100) + '%;background:#4CAF50"></div></div>';
        html += '</div>';
        html += '<div class="bill-stat">';
        html += '<span class="bill-stat-label">Legality</span>';
        html += '<span class="bill-stat-value">' + bill.legality + '/20</span>';
        html += '<div class="bill-stat-bar"><div class="bill-stat-fill" style="width:' + (bill.legality / 20 * 100) + '%;background:#FF9800"></div></div>';
        html += '</div>';
        html += '</div>';

        // Status indicators
        html += '<div class="bill-status">';
        html += '<span class="chamber-status ' + (bill.passedByHouse ? 'passed' : 'pending') + '">House: ' + (bill.passedByHouse ? '✅ Passed' : '⏳ Pending') + '</span>';
        html += '<span class="chamber-status ' + (bill.passedBySenate ? 'passed' : 'pending') + '">Senate: ' + (bill.passedBySenate ? '✅ Passed' : '⏳ Pending') + '</span>';
        html += '</div>';

        if (bill.requiresSupermajority) {
            html += '<div class="bill-warning">⚠️ Requires 2/3 Supermajority</div>';
        }
        if (state.billKilledThisRound) {
            html += '<div class="bill-warning">💀 Killed in Committee (cannot pass this round)</div>';
        }
        html += '</div>';
        return html;
    }

    function renderCompositionBars(state) {
        var html = '<div class="composition-section">';

        // Senate
        var sc = state.senate.composition;
        var sTotal = sc.democrat + sc.modDem + sc.modRep + sc.republican;
        html += '<div class="comp-bar-container">';
        html += '<span class="comp-label">Senate (' + sTotal + ')</span>';
        html += '<div class="comp-bar">';
        html += '<div class="comp-seg" style="width:' + (sc.democrat / sTotal * 100) + '%;background:#0000CD" title="Dem: ' + sc.democrat + '"></div>';
        html += '<div class="comp-seg" style="width:' + (sc.modDem / sTotal * 100) + '%;background:#6495ED" title="Mod Dem: ' + sc.modDem + '"></div>';
        html += '<div class="comp-seg" style="width:' + (sc.modRep / sTotal * 100) + '%;background:#F08080" title="Mod Rep: ' + sc.modRep + '"></div>';
        html += '<div class="comp-seg" style="width:' + (sc.republican / sTotal * 100) + '%;background:#CC0000" title="Rep: ' + sc.republican + '"></div>';
        html += '</div>';
        html += '<div class="comp-numbers">Dem: ' + sc.democrat + ' | Mod-D: ' + sc.modDem + ' | Mod-R: ' + sc.modRep + ' | Rep: ' + sc.republican + '</div>';
        html += '</div>';

        // House
        var hc = state.house.composition;
        var hTotal = hc.extremeDem + hc.democrat + hc.republican + hc.extremeRep;
        html += '<div class="comp-bar-container">';
        html += '<span class="comp-label">House (' + hTotal + ')</span>';
        html += '<div class="comp-bar">';
        html += '<div class="comp-seg" style="width:' + (hc.extremeDem / hTotal * 100) + '%;background:#00008B" title="Ext Dem: ' + hc.extremeDem + '"></div>';
        html += '<div class="comp-seg" style="width:' + (hc.democrat / hTotal * 100) + '%;background:#0000CD" title="Dem: ' + hc.democrat + '"></div>';
        html += '<div class="comp-seg" style="width:' + (hc.republican / hTotal * 100) + '%;background:#CC0000" title="Rep: ' + hc.republican + '"></div>';
        html += '<div class="comp-seg" style="width:' + (hc.extremeRep / hTotal * 100) + '%;background:#8B0000" title="Ext Rep: ' + hc.extremeRep + '"></div>';
        html += '</div>';
        html += '<div class="comp-numbers">Far-D: ' + hc.extremeDem + ' | Dem: ' + hc.democrat + ' | Rep: ' + hc.republican + ' | Far-R: ' + hc.extremeRep + '</div>';
        html += '</div>';

        // Supreme Court
        var justices = state.supremeCourt.justices;
        html += '<div class="comp-bar-container">';
        html += '<span class="comp-label">Supreme Court (' + justices.length + ')</span>';
        html += '<div class="court-justices">';
        for (var j = 0; j < justices.length; j++) {
            var jl = justices[j].leaning;
            var jColor = jl === 'liberal' ? '#0000CD' : (jl === 'conservative' ? '#CC0000' : '#808080');
            html += '<span class="justice-dot" style="background:' + jColor + '" title="' + jl + '">⚖</span>';
        }
        html += '</div>';
        var libCount = justices.filter(function(j) { return j.leaning === 'liberal'; }).length;
        var modCount = justices.filter(function(j) { return j.leaning === 'moderate'; }).length;
        var conCount = justices.filter(function(j) { return j.leaning === 'conservative'; }).length;
        html += '<div class="comp-numbers">Lib:' + libCount + ' Mod:' + modCount + ' Con:' + conCount + '</div>';
        html += '</div>';

        html += '</div>';
        return html;
    }

    function renderActions(state, activeRole) {
        var actions = Engine.getAvailableActions(activeRole);
        var isMyAction = (activeRole === currentRole) || (Network.getRoomCode() === 'LOCAL');

        var html = '<div class="actions-panel">';
        html += '<h3>' + Config.ROLE_ICONS[activeRole] + ' ' + Config.ROLE_LABELS[activeRole] + ' Actions';
        html += ' <span class="action-counter">(' + state[activeRole].actionsRemaining + ' remaining)</span></h3>';

        if (GameAI.isAI(activeRole) && Network.getRoomCode() === 'LOCAL') {
            var aiConf = GameAI.getAIConfig(activeRole);
            html += '<p class="waiting-msg">🤖 AI (' + (aiConf.personality ? aiConf.personality.name : 'Random') + ') is playing...</p>';
        } else if (!isMyAction && Network.getRoomCode() !== 'LOCAL') {
            html += '<p class="waiting-msg">Waiting for ' + Config.ROLE_LABELS[Engine.getCurrentRole()] + ' to act...</p>';
        } else if (actions.length === 0) {
            html += '<p class="no-actions-msg">No actions available</p>';
        } else {
            html += '<div class="action-grid">';
            for (var i = 0; i < actions.length; i++) {
                var a = actions[i];
                html += '<button class="action-btn" data-action="gameAction" data-action-id="' + a.id + '">';
                html += '<span class="action-name">' + escapeHtml(a.label) + '</span>';
                html += '<span class="action-desc">' + escapeHtml(a.description) + '</span>';
                html += '<span class="action-cost">Cost: ' + a.cost + ' action' + (a.cost !== 1 ? 's' : '') + '</span>';
                html += '</button>';
            }
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    function renderActionLog(state) {
        var html = '<h3>📜 Action Log</h3>';
        html += '<div class="log-entries">';
        var logs = state.log || [];
        for (var i = Math.max(0, logs.length - 30); i < logs.length; i++) {
            var entry = logs[i];
            var roleColor = Config.ROLE_COLORS[entry.role] || '#888';
            html += '<div class="log-entry">';
            html += '<span class="log-round">R' + entry.round + '</span>';
            html += '<span class="log-role" style="color:' + roleColor + '">' + (Config.ROLE_LABELS[entry.role] || entry.role) + '</span>';
            html += '<span class="log-action">' + escapeHtml(entry.action) + '</span>';
            html += '<span class="log-details">' + escapeHtml(entry.details || '') + '</span>';
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    function renderGameOver(state) {
        var winner = Engine.getWinner();
        var content = document.getElementById('game-content');
        var html = '<div class="game-over">';
        html += '<h1>🏛️ Game Over!</h1>';
        html += '<div class="winner-display" style="border-color:' + Config.ROLE_COLORS[winner.role] + '">';
        html += '<h2>' + Config.ROLE_ICONS[winner.role] + ' ' + Config.ROLE_LABELS[winner.role] + ' Wins!</h2>';
        html += '<p class="winner-vp">' + winner.vp + ' Victory Points</p>';
        html += '</div>';
        html += '<div class="final-scores">';
        html += '<h3>Final Scores</h3>';
        var roles = Config.ROLES;
        for (var i = 0; i < roles.length; i++) {
            var r = roles[i];
            var rs = state[r];
            html += '<div class="final-score-card" style="border-left: 4px solid ' + Config.ROLE_COLORS[r] + '">';
            html += '<span>' + Config.ROLE_ICONS[r] + ' ' + Config.ROLE_LABELS[r] + '</span>';
            html += '<span class="final-vp">' + rs.vp + ' VP</span>';
            html += '</div>';
        }
        html += '</div>';
        html += '<button class="btn btn-primary btn-large" onclick="location.reload()">Play Again</button>';
        html += '</div>';
        content.innerHTML = html;
    }

    function showVoteModal(description) {
        openModal('Vote Required',
            '<p>' + escapeHtml(description) + '</p>' +
            '<p>3 out of 4 players must agree.</p>',
            '<button class="btn btn-green" data-action="voteYes">✅ Yes</button>' +
            '<button class="btn btn-danger" data-action="voteNo">❌ No</button>'
        );
    }

    function addChatMessage(msg) {
        chatMessages.push(msg);
        if (currentState) renderGame(currentState);
    }

    return {
        init: init,
        renderMainMenu: renderMainMenu,
        renderLobby: renderLobby,
        renderGame: renderGame,
        showToast: showToast,
        showVoteModal: showVoteModal,
        addChatMessage: addChatMessage,
        confirmAction: confirmAction,
        confirmBillUpdate: confirmBillUpdate,
        confirmPassBill: confirmPassBill,
        confirmAmendment: confirmAmendment,
        closeModal: closeModal,
        onAIModeChange: onAIModeChange
    };
})();

if (typeof module !== 'undefined') module.exports = UI;
