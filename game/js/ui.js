// Branches of Power — UI System
// All rendering, panels, modals, action buttons

var UI = (function() {
    'use strict';

    var currentState = null;
    var currentRole = null;
    var chatMessages = [];
    var actionLog = [];
    var tutorialActive = false;
    var tutorialStep = 0;
    var previousVP = null;
    var vpDeltas = {};
    var vpDeltaTimeout = null;
    var lastPCCapRound = null;
    var lastSummaryRound = 0;

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
                    // Set currentRole BEFORE starting game so renderGame has correct context
                    currentRole = firstHumanRole || 'president';
                    Network.startLocalGame(len2 ? len2.value : 'standard');
                } catch (err) {
                    console.error('Start game error:', err);
                    alert('Error starting game: ' + err.message + '\n' + err.stack);
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

            // Select active bill
            case 'selectBill':
                Network.localAction(currentRole, 'setActiveBill', { billId: parseInt(dataset.billId) });
                break;

            // Passed Laws viewer
            case 'showPassedLaws':
                showPassedLawsModal();
                break;

            // Deal Actions
            case 'showProposeDeal':
                showProposeDealModal();
                break;
            case 'sendDeal':
                var target = document.getElementById('deal-target');
                var ask = document.getElementById('deal-ask');
                var offer = document.getElementById('deal-offer');
                var msg = document.getElementById('deal-message');
                var askBill = document.getElementById('deal-ask-bill');
                var offerBill = document.getElementById('deal-offer-bill');
                if (target && ask && offer) {
                    var askBillId = (askBill && askBill.value) ? parseInt(askBill.value) : null;
                    var offerBillId = (offerBill && offerBill.value) ? parseInt(offerBill.value) : null;
                    Network.localAction(currentRole, 'proposeDeal', {
                        to: target.value,
                        askType: ask.value,
                        offerType: offer.value,
                        message: msg ? msg.value : '',
                        askBillId: askBillId,
                        offerBillId: offerBillId
                    });
                    closeModal();
                    // AI responds to deals immediately
                    if (GameAI.isAI(target.value)) {
                        var aiAccepts = GameAI.respondToDeal(target.value, currentRole, ask.value, offer.value, Engine.getState());
                        var latestDeal = Engine.getState().deals[Engine.getState().deals.length - 1];
                        if (aiAccepts) {
                            Network.localAction(target.value, 'respondDeal', { dealId: latestDeal.id, accept: true });
                        } else {
                            // AI rejected — try to counteroffer
                            var counter = GameAI.generateCounteroffer(target.value, currentRole, ask.value, offer.value, Engine.getState());
                            if (counter) {
                                Network.localAction(target.value, 'counterDeal', {
                                    dealId: latestDeal.id,
                                    counterAskType: counter.counterAskType,
                                    counterOfferType: counter.counterOfferType,
                                    counterMessage: counter.message,
                                    counterAskBillId: counter.counterAskBillId,
                                    counterOfferBillId: counter.counterOfferBillId
                                });
                                showToast('🔄 ' + Config.ROLE_LABELS[target.value] + ' rejected your deal but made a counteroffer!', 'info');
                            } else {
                                Network.localAction(target.value, 'respondDeal', { dealId: latestDeal.id, accept: false });
                            }
                        }
                    }
                }
                break;
            case 'acceptDeal':
                Network.localAction(currentRole, 'respondDeal', { dealId: parseInt(dataset.dealId), accept: true });
                break;
            case 'rejectDeal':
                Network.localAction(currentRole, 'respondDeal', { dealId: parseInt(dataset.dealId), accept: false });
                break;
            case 'fulfillDeal':
                Network.localAction(currentRole, 'fulfillDeal', { dealId: parseInt(dataset.dealId) });
                showToast('Promise fulfilled! Trust increased.', 'success');
                break;
            case 'breakDeal':
                Network.localAction(currentRole, 'breakDeal', { dealId: parseInt(dataset.dealId) });
                showToast('Promise broken! Trust damaged.', 'error');
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

            // Tutorial & Help
            case 'showDealHistory':
                showDealHistoryModal();
                break;
            case 'showHowToPlay':
                showHowToPlayModal();
                break;
            case 'tutorialNext':
                tutorialStep++;
                renderTutorial(tutorialStep);
                break;
            case 'tutorialSkip':
                dismissTutorial();
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
            case 'resolveEvent':
                params.resolutionId = dataset.resolutionId;
                break;
            case 'eventSpecialAction':
                params.actionIndex = parseInt(dataset.actionIndex);
                break;
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
        var bill = Engine.getActiveBill();
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

        // VP change detection
        if (previousVP) {
            var newDeltas = {};
            for (var vdi = 0; vdi < Config.ROLES.length; vdi++) {
                var vdr = Config.ROLES[vdi];
                var diff = state[vdr].vp - (previousVP[vdr] || 0);
                if (diff !== 0) newDeltas[vdr] = diff;
            }
            if (Object.keys(newDeltas).length > 0) {
                vpDeltas = newDeltas;
                if (vpDeltaTimeout) clearTimeout(vpDeltaTimeout);
                vpDeltaTimeout = setTimeout(function() { vpDeltas = {}; if (currentState) renderGame(currentState); }, 2500);
            }
        }
        previousVP = {};
        for (var vpi = 0; vpi < Config.ROLES.length; vpi++) {
            previousVP[Config.ROLES[vpi]] = state[Config.ROLES[vpi]].vp;
        }

        // PC cap notification
        if (state.pcCappedThisRound && state.round !== lastPCCapRound) {
            lastPCCapRound = state.round;
            if (state.pcCappedThisRound.senate && currentRole === 'senate') {
                showToast('⚠️ Senate PC capped at ' + Config.MAX_PC_CARRYOVER + ' for this round.', 'warning');
            }
            if (state.pcCappedThisRound.house && currentRole === 'house') {
                showToast('⚠️ House PC capped at ' + Config.MAX_PC_CARRYOVER + ' for this round.', 'warning');
            }
        }

        // Round summary toast
        if (state.roundSummaries && state.roundSummaries.length > 0 && state.round > 1) {
            var latestSummary = state.roundSummaries[state.roundSummaries.length - 1];
            if (latestSummary.round > lastSummaryRound && latestSummary.round === state.round - 1) {
                lastSummaryRound = latestSummary.round;
                var summaryParts = ['Round ' + latestSummary.round + ' Complete'];
                if (latestSummary.billsPassed) summaryParts.push('📜 Bill passed');
                if (latestSummary.eventResolved) summaryParts.push('⚡ ' + latestSummary.eventResolved + ' resolved');
                summaryParts.push('Stability: ' + latestSummary.stability + '/10');
                showToast(summaryParts.join(' | '), 'info');
            }
        }

        var content = document.getElementById('game-content');
        if (state.phase === 'gameOver') {
            renderGameOver(state);
            return;
        }

        try {
        var isMyTurn = Engine.getCurrentRole() === currentRole;
        var currentTurnRole = Engine.getCurrentRole();
        var isLocal = Network.getRoomCode() === 'LOCAL';

        var html = '<div class="game-board">';

        // Header
        html += '<div class="game-header">';
        html += '<div class="header-left"><h2>🏛️ Branches of Power</h2></div>';
        html += '<div class="header-center">';
        html += '<span class="round-display">Round ' + state.round + '/' + state.maxRounds;
        var phaseLabel = state.phase === 'action' ? 'Action Phase' :
                         state.phase === 'election' ? 'Election Phase' :
                         state.phase === 'gameOver' ? 'Game Over' : state.phase;
        html += ' • ' + phaseLabel + '</span>';

        // Election countdown
        var nextPresElection = 0;
        var nextMidterm = 0;
        for (var er = state.round; er <= state.maxRounds; er++) {
            if (er % 4 === 0 && !nextPresElection) nextPresElection = er;
            if (er % 2 === 0 && !nextMidterm) nextMidterm = er;
        }
        var electionWarning = '';
        if (nextPresElection && nextPresElection - state.round <= 2 && nextPresElection - state.round > 0) {
            electionWarning += ' <span class="election-warning pres-election">🗳️ Presidential Election in ' + (nextPresElection - state.round) + ' round' + (nextPresElection - state.round > 1 ? 's' : '') + '!</span>';
        }
        if (nextMidterm && nextMidterm !== nextPresElection && nextMidterm - state.round <= 1 && nextMidterm - state.round > 0) {
            electionWarning += ' <span class="election-warning midterm">📊 Midterms next round!</span>';
        }
        html += electionWarning;

        html += '<span class="turn-display active-turn" style="color:' + Config.ROLE_COLORS[currentTurnRole] + ';background:rgba(255,255,255,0.08);padding:4px 12px;border-radius:6px;border:1px solid ' + Config.ROLE_COLORS[currentTurnRole] + '">';
        html += Config.ROLE_ICONS[currentTurnRole] + ' ' + Config.ROLE_LABELS[currentTurnRole] + '\'s Turn';
        html += ' (Action ' + (5 - state[currentTurnRole].actionsRemaining) + '/4)</span>';

        // Turn order indicator
        html += '<div class="turn-order-strip">';
        for (var toi = 0; toi < state.turnOrder.length; toi++) {
            var toRole = state.turnOrder[toi];
            var isToCurrent = toRole === currentTurnRole;
            html += '<span class="turn-order-item' + (isToCurrent ? ' turn-order-active' : '') + '" style="color:' + Config.ROLE_COLORS[toRole] + '">' + Config.ROLE_ICONS[toRole] + '</span>';
            if (toi < state.turnOrder.length - 1) html += '<span class="turn-order-arrow">→</span>';
        }
        html += '</div>';

        html += '</div>';
        // VP Scoreboard in header
        html += '<div class="vp-scoreboard">';
        for (var vi = 0; vi < Config.ROLES.length; vi++) {
            var vr = Config.ROLES[vi];
            var vpDelta = vpDeltas[vr];
            var vpDeltaHtml = '';
            if (vpDelta) {
                var deltaClass = vpDelta > 0 ? 'vp-delta-pos' : 'vp-delta-neg';
                vpDeltaHtml = ' <span class="vp-delta ' + deltaClass + '">' + (vpDelta > 0 ? '+' : '') + vpDelta + '</span>';
            }
            html += '<span class="vp-score" style="color:' + Config.ROLE_COLORS[vr] + '">' + Config.ROLE_ICONS[vr] + ' ' + state[vr].vp + vpDeltaHtml + '</span>';
        }
        html += '</div>';
        // Stability gauge
        if (state.stability !== undefined) {
            var stab = state.stability;
            var stabColor = stab >= 8 ? '#4CAF50' : (stab >= 5 ? '#2196F3' : (stab >= 3 ? '#FF9800' : '#f44336'));
            var stabLabel = stab >= 8 ? 'Prosperous' : (stab >= 5 ? 'Stable' : (stab >= 3 ? 'Unstable' : (stab >= 1 ? 'Crisis' : 'COLLAPSE')));
            html += '<div class="stability-gauge" style="display:flex;align-items:center;gap:6px;margin-left:12px">';
            html += '<span style="font-size:0.8em;color:#aaa">🏛️ Stability:</span>';
            html += '<div style="width:80px;height:10px;background:#333;border-radius:5px;overflow:hidden;border:1px solid #555">';
            html += '<div style="width:' + (stab * 10) + '%;height:100%;background:' + stabColor + ';transition:width 0.3s"></div>';
            html += '</div>';
            html += '<span style="font-size:0.85em;font-weight:bold;color:' + stabColor + '">' + stab + '/10 ' + stabLabel + '</span>';
            html += '</div>';
        }
        html += '<div class="header-right">';
        html += '<button class="btn btn-how-to-play" data-action="showHowToPlay" style="background:rgba(255,255,255,0.1);border:1px solid #666;color:#ccc;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:0.85em;margin-right:8px">❓ How to Play</button>';
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
        html += renderBillsPanel(state);

        // Active Event banner
        if (state.activeEvent && !state.activeEvent.resolved) {
            var evt = state.activeEvent;
            var sevColors = { 1: '#2196F3', 2: '#FF9800', 3: '#f44336' };
            var sevLabels = { 1: 'Minor', 2: 'Major', 3: 'Critical' };
            var sevColor = sevColors[evt.severity] || '#FF9800';
            html += '<div class="event-banner" style="background:rgba(255,193,7,0.1);border:2px solid ' + sevColor + ';border-radius:10px;padding:10px 14px;margin:8px 0;position:relative">';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';
            html += '<span style="font-weight:bold;font-size:1.05em;color:' + sevColor + '">⚡ ' + escapeHtml(evt.name) + '</span>';
            var urgencyColor = evt.roundsRemaining <= 1 ? '#f44336' : sevColor;
            html += '<span style="font-size:0.8em;padding:2px 8px;border-radius:10px;background:' + urgencyColor + ';color:white;font-weight:bold">' + sevLabels[evt.severity] + ' | ' + evt.roundsRemaining + ' round' + (evt.roundsRemaining !== 1 ? 's' : '') + ' left' + (evt.roundsRemaining <= 1 ? ' ⚠️' : '') + '</span>';
            html += '</div>';
            html += '<p style="margin:4px 0;font-size:0.9em;color:#ccc;font-style:italic">' + escapeHtml(evt.flavor) + '</p>';

            // Failure warning
            // Failure effects warning
            var pen = evt.failPenalty;
            if (pen) {
                var failWarnings = [];
                if (pen.stability) failWarnings.push('Stability ' + pen.stability);
                if (pen.popularity) failWarnings.push('Popularity ' + pen.popularity);
                if (pen.houseShift) failWarnings.push('🏛️ House composition shift!');
                if (pen.senateShift) failWarnings.push('🏛️ Senate composition shift!');
                if (pen.justiceEffect && pen.justiceEffect.resign) failWarnings.push('⚖️ Justice resigns!');
                if (pen.justiceEffect && pen.justiceEffect.switchPartisanship) failWarnings.push('⚖️ Justice partisanship changes!');
                if (pen.presidentLosesElection) failWarnings.push('🗳️ President loses next election!');
                if (failWarnings.length > 0) {
                    html += '<p style="margin:2px 0;font-size:0.8em;color:#f44336">⚠️ Failure: ' + failWarnings.join(' | ') + '</p>';
                }
            }

            // Resolution options with cooperative progress
            html += '<div style="margin-top:6px;border-top:1px solid rgba(255,255,255,0.1);padding-top:6px">';
            for (var ri = 0; ri < evt.resolutions.length; ri++) {
                var res = evt.resolutions[ri];
                var roleNames = res.roles.map(function(r) { return Config.ROLE_LABELS[r]; }).join(' + ');
                html += '<div style="margin:4px 0;padding:4px 8px;background:rgba(255,255,255,0.05);border-radius:6px;font-size:0.85em">';
                html += '<strong>' + escapeHtml(res.label) + '</strong>';
                html += ' <span style="color:#888">(' + roleNames + ')</span>';
                if (res.cooperative && res.agreedRoles) {
                    var committed = res.agreedRoles.length;
                    var needed = res.roles.length;
                    html += ' <span style="color:#FFC107">[' + committed + '/' + needed + ' committed]</span>';
                    if (res.agreedRoles.length > 0) {
                        html += ' <span style="font-size:0.8em;color:#aaa">' + res.agreedRoles.map(function(r) { return Config.ROLE_ICONS[r]; }).join(' ') + '</span>';
                    }
                }
                html += '</div>';
            }
            html += '</div>';

            // Queued event indicator
            if (state.queuedEvent) {
                html += '<div style="margin-top:4px;font-size:0.8em;color:#FF9800">📋 Queued: ' + escapeHtml(state.queuedEvent.name) + '</div>';
            }
            html += '</div>';
        }

        // Pending Amendment banner
        if (state.pendingAmendment) {
            var pa = state.pendingAmendment;
            html += '<div class="amendment-banner" style="background:rgba(255,193,7,0.15);border:1px solid #FFC107;border-radius:8px;padding:8px 12px;margin:6px 0;text-align:center;">';
            html += '<strong>⚖️ Pending Amendment:</strong> "' + escapeHtml(pa.bill.name) + '"';
            html += '<br><small>Proposed by ' + Config.ROLE_LABELS[pa.proposedBy] + '. Waiting for: ' + pa.needed.map(function(r) { return Config.ROLE_LABELS[r]; }).join(', ') + '</small>';
            html += '</div>';
        }

        // Pending Unity Summit banner
        if (state.pendingUnitySummit) {
            var us = state.pendingUnitySummit;
            html += '<div class="unity-banner" style="background:rgba(76,175,80,0.15);border:1px solid #4CAF50;border-radius:8px;padding:8px 12px;margin:6px 0;text-align:center;">';
            html += '<strong>🕊️ National Unity Summit</strong>';
            html += '<br><small>Proposed by ' + Config.ROLE_LABELS[us.proposedBy] + '. Agreed: ' + us.agreed.map(function(r) { return Config.ROLE_ICONS[r]; }).join(' ') + ' (' + us.agreed.length + '/4)';
            if (us.needed.length > 0) {
                html += ' | Waiting: ' + us.needed.map(function(r) { return Config.ROLE_LABELS[r]; }).join(', ');
            }
            html += '</small></div>';
        }

        html += renderCompositionBars(state);

        // Passed Laws button
        var lawCount = (state.passedBills || []).length;
        var unconCount = (state.unconstitutionalBills || []).length;
        html += '<button class="btn" data-action="showPassedLaws" style="margin:6px 0;width:100%;padding:6px;background:rgba(255,255,255,0.08);border:1px solid #555;border-radius:6px;color:#ccc;cursor:pointer;text-align:center">';
        html += '📚 Passed Laws (' + lawCount + ')';
        if (unconCount > 0) html += ' | ⚖️ Unconstitutional (' + unconCount + ')';
        html += '</button>';

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

        // Deals panel
        html += renderDealsPanel(state, currentRole, isLocal);

        html += '</div>';

        // Right: Action log
        html += '<div class="log-panel">';
        html += renderActionLog(state);
        html += '</div>';

        html += '</div>'; // game-main

        // Chat bar (vertical card-based)
        html += '<div class="chat-bar">';
        html += '<div id="chat-messages" class="chat-messages">';
        for (var ci = Math.max(0, chatMessages.length - 20); ci < chatMessages.length; ci++) {
            var cm = chatMessages[ci];
            var chatTime = cm.timestamp ? new Date(cm.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
            html += '<div class="chat-msg"><strong style="color:' + (Config.ROLE_COLORS[cm.from] || '#fff') + '">' + escapeHtml(cm.from) + '</strong>';
            if (chatTime) html += ' <span class="chat-time">' + chatTime + '</span>';
            html += '<br>' + escapeHtml(cm.text) + '</div>';
        }
        html += '</div>';
        html += '<input type="text" id="chat-input" placeholder="Type a message..." class="chat-input">';
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
                    try {
                        playAITurn(aiTurnRole);
                    } catch (aiErr) {
                        console.error('AI turn error:', aiErr);
                        alert('AI error for ' + aiTurnRole + ': ' + aiErr.message + '\n' + aiErr.stack);
                    }
                }, 3000);
            }
        }

        // 6.2 First-game tutorial trigger
        if (state.round === 1 && !tutorialActive) {
            var tutorialDone = false;
            try { tutorialDone = localStorage.getItem('bop_tutorial_done') === 'true'; } catch (e) { /* localStorage unavailable — show tutorial */ }
            if (!tutorialDone) {
                tutorialActive = true;
                tutorialStep = 0;
                renderTutorial(0);
            }
        }
        } catch (renderErr) {
            console.error('Render error:', renderErr);
            alert('Error rendering game: ' + renderErr.message + '\n' + renderErr.stack);
        }
    }

    function playAITurn(role) {
        var state = JSON.parse(JSON.stringify(Engine.getState()));
        var actions = Engine.getAvailableActions(role);
        if (actions.length === 0) return;

        // AI may propose a deal to the human player
        if (currentRole && !GameAI.isAI(currentRole)) {
            var dealProposal = GameAI.getAIDealProposal(role, currentRole, state);
            if (dealProposal) {
                Network.localAction(role, 'proposeDeal', {
                    to: dealProposal.to,
                    askType: dealProposal.askType,
                    offerType: dealProposal.offerType,
                    message: dealProposal.message
                });
            }
        }

        // AI also fulfills or breaks accepted deals
        var aiDeals = Engine.getAcceptedDealsForRole(role);
        for (var d = 0; d < aiDeals.length; d++) {
            var deal = aiDeals[d];
            var conf = GameAI.getAIConfig(role);
            var lieRate = conf.personality ? conf.personality.baseLieRate || 0.2 : 0.2;
            if (Math.random() < lieRate) {
                Network.localAction(role, 'breakDeal', { dealId: deal.id });
            } else {
                Network.localAction(role, 'fulfillDeal', { dealId: deal.id });
            }
        }

        var decision = GameAI.getAIDecision(role, state, actions);
        if (!decision) {
            decision = { id: actions[0].id, params: {} };
        }

        // Verify the chosen action is actually available
        var valid = false;
        for (var i = 0; i < actions.length; i++) {
            if (actions[i].id === decision.id) { valid = true; break; }
        }
        if (!valid) decision = { id: actions[0].id, params: {} };

        var result = Network.localAction(role, decision.id, decision.params);

        // If action failed, try other actions before giving up
        if (!result || !result.success) {
            var tried = {};
            tried[decision.id] = true;
            var succeeded = false;
            for (var j = 0; j < actions.length; j++) {
                if (tried[actions[j].id]) continue;
                tried[actions[j].id] = true;
                var fallbackResult = Network.localAction(role, actions[j].id, {});
                if (fallbackResult && fallbackResult.success) {
                    succeeded = true;
                    break;
                }
            }
            // If all actions failed, force skip this role's remaining actions
            if (!succeeded) {
                Engine.skipRemainingActions(role);
                // Manually trigger state update since we bypassed localAction
                var updatedState = JSON.parse(JSON.stringify(Engine.getState()));
                Engine.setState(updatedState);
                renderGame(updatedState);
            }
        }
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
            var vpGlossary = (Config.GLOSSARY && Config.GLOSSARY.VP) || '';
            html += '<div class="stat" title="' + escapeHtml(vpGlossary) + '"><span class="stat-label">VP ℹ️</span><span class="stat-value vp-value">' + rs.vp + '</span></div>';

            if (role === 'president') {
                var popGlossary = (Config.GLOSSARY && Config.GLOSSARY.Pop) || '';
                html += '<div class="stat" title="' + escapeHtml(popGlossary) + '"><span class="stat-label">Pop ℹ️</span><span class="stat-value" style="color:' + getPartyColor(rs.party) + '">' + rs.popularity + '</span></div>';
                html += '<div class="stat"><span class="stat-label">Party</span><span class="stat-value" style="color:' + getPartyColor(rs.party) + '">' + (rs.party === 'democrat' ? 'D' : 'R') + '</span></div>';
            }
            if (role === 'house' || role === 'senate') {
                var pcGlossary = (Config.GLOSSARY && Config.GLOSSARY.PC) || '';
                html += '<div class="stat" title="' + escapeHtml(pcGlossary) + '"><span class="stat-label">PC ℹ️</span><span class="stat-value">' + rs.pc + '</span></div>';
                html += '<div class="stat"><span class="stat-label">Maj</span><span class="stat-value" style="color:' + getPartyColor(rs.majorityParty) + '">' + (rs.majorityParty === 'democrat' ? 'D' : 'R') + '</span></div>';
            }
            if (role === 'supremeCourt') {
                var courtMaj = Engine.getCourtMajority();
                var jpGlossary = (Config.GLOSSARY && Config.GLOSSARY.JP) || '';
                html += '<div class="stat" title="' + escapeHtml(jpGlossary) + '"><span class="stat-label">JP ℹ️</span><span class="stat-value" style="color:#9C27B0">' + rs.jp + '</span></div>';
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

    function renderBillsPanel(state) {
        var bills = state.bills || [];
        if (bills.length === 0) {
            return '<div class="bill-card empty-bill"><p>No bills on the floor</p></div>';
        }

        var html = '';

        // Bill tabs (only show if multiple bills)
        if (bills.length > 1) {
            html += '<div class="bill-tabs" style="display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap">';
            for (var t = 0; t < bills.length; t++) {
                var b = bills[t];
                var isActive = b.id === state.activeBillId;
                var tabColor = getPartisanColor(b.partisanship);
                var tabStyle = isActive
                    ? 'background:' + tabColor + ';color:white;font-weight:bold;border:2px solid white'
                    : 'background:rgba(255,255,255,0.08);color:#aaa;border:2px solid ' + tabColor;
                html += '<button class="bill-tab" data-action="selectBill" data-bill-id="' + b.id + '" style="' + tabStyle + ';padding:4px 10px;border-radius:6px 6px 0 0;cursor:pointer;font-size:0.8em;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">';
                html += b.name;
                if (b.passedByHouse) html += ' ✅H';
                if (b.passedBySenate) html += ' ✅S';
                if (b.killed) html += ' 💀';
                if (b.stalled) html += ' ⏸️';
                html += '</button>';
            }
            html += '</div>';
        }

        // Render active bill card
        var activeBill = Engine.getActiveBill();
        if (!activeBill) activeBill = bills[0];
        html += renderBillCard(state, activeBill);

        return html;
    }

    function renderBillCard(state, bill) {
        if (!bill) {
            return '<div class="bill-card empty-bill"><p>No bill on the floor</p></div>';
        }

        var partColor = getPartisanColor(bill.partisanship);
        var html = '<div class="bill-card" style="border-color:' + partColor + '">';
        html += '<div class="bill-header" style="background:' + partColor + '">';
        html += '<h3>' + escapeHtml(bill.name) + '</h3>';
        if (Config.BILL_DESCRIPTIONS && Config.BILL_DESCRIPTIONS[bill.name]) {
            html += '<p class="bill-flavor">' + escapeHtml(Config.BILL_DESCRIPTIONS[bill.name]) + '</p>';
        }
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

    function getVPPreview(actionId, state, role) {
        var previews = {
            executiveOrder: '+1 VP',
            signBill: '+4-8 VP',
            bullyPulpit: '+5 VP',
            stateDinner: '+3 VP',
            witchhunt: 'SC -6 VP',
            campaign: '+4 Pop',
            earmark: '+4 VP',
            subpoena: '+2 VP',
            caucusMeeting: '+3 PC',
            hostHearing: '+2 VP or +2 PC',
            killBill: '+1 VP',
            supportBill: '+5 Bill Pop',
            debate: '+2 PC',
            conference: '+1 PC',
            senatePassBill: 'VP varies',
            housePassBill: 'VP varies',
            generalCourt: '+2 VP',
            courtAdvisoryRole: '+2 VP',
            courtClerksResearch: '+2 JP',
            judicialReview: '+3-6 VP',
            writeOpinion: '+1 VP, +1 JP',
            certiorari: '+1 VP, +1 JP',
            oralArguments: '+2 VP, +1 JP',
            landmarkRuling: '+5 VP',
            governmentShutdown: '-2 VP',
            powerOfPurse: '-4 VP',
            popularizeBill: '+3 Bill Pop'
        };
        return previews[actionId] || '';
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
            var recommendedIds = getRecommendedActions(state, activeRole);
            for (var i = 0; i < actions.length; i++) {
                var a = actions[i];
                var extraData = '';
                if (a.params) {
                    if (a.params.resolutionId) extraData += ' data-resolution-id="' + a.params.resolutionId + '"';
                    if (a.params.actionIndex !== undefined) extraData += ' data-action-index="' + a.params.actionIndex + '"';
                }
                var tooltip = Config.ACTION_TOOLTIPS[a.id] || a.description || '';
                var isRecommended = recommendedIds.indexOf(a.id) !== -1;
                html += '<button class="action-btn' + (isRecommended ? ' recommended' : '') + '" data-action="gameAction" data-action-id="' + a.id + '"' + extraData + ' title="' + escapeHtml(tooltip) + '">';
                html += '<span class="action-name">' + escapeHtml(a.label) + '</span>';
                html += '<span class="action-desc">' + escapeHtml(a.description) + '</span>';
                html += '<span class="action-cost">Cost: ' + a.cost + ' action' + (a.cost !== 1 ? 's' : '') + '</span>';
                var vpHint = getVPPreview(a.id, state, activeRole);
                if (vpHint) {
                    html += '<span class="action-vp-preview">' + vpHint + '</span>';
                }
                html += '</button>';
            }
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    function renderDealsPanel(state, myRole, isLocal) {
        if (!isLocal) return '';
        var html = '<div class="deals-panel" style="margin-top:12px;padding:10px;background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid #333">';
        html += '<h3 style="margin:0 0 8px 0">🤝 Deals & Trust</h3>';

        // Trust display
        html += '<div class="trust-display" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">';
        var roles = Config.ROLES;
        for (var i = 0; i < roles.length; i++) {
            var r = roles[i];
            if (r === myRole) continue;
            var trustVal = state.trust[myRole] ? state.trust[myRole][r] : 5;
            var trustColor = trustVal >= 7 ? '#4CAF50' : (trustVal >= 4 ? '#FF9800' : '#f44336');
            var trustLabel = trustVal >= 7 ? '👍' : (trustVal >= 4 ? '🤝' : '👎');
            html += '<span style="font-size:0.8em;color:' + Config.ROLE_COLORS[r] + '">' + Config.ROLE_ICONS[r] + ' ' + trustLabel + ' ' + trustVal.toFixed(1) + '</span>';
        }
        html += '</div>';

        // Propose deal button
        html += '<button class="btn btn-small" data-action="showProposeDeal" style="margin-bottom:8px;background:#2196F3;color:white;padding:4px 12px;border-radius:4px;border:none;cursor:pointer">📜 Propose Deal</button>';

        // Pending deals TO the player
        var pendingDeals = Engine.getPendingDealsForRole(myRole);
        if (pendingDeals.length > 0) {
            html += '<div class="pending-deals" style="margin-top:6px">';
            html += '<h4 style="margin:4px 0;color:#FFC107">📨 Incoming Deals</h4>';
            for (var j = 0; j < pendingDeals.length; j++) {
                var pd = pendingDeals[j];
                html += '<div class="deal-card" style="background:rgba(255,193,7,0.1);border:1px solid ' + (pd.isCounteroffer ? '#FF9800' : '#FFC107') + ';border-radius:6px;padding:8px;margin:4px 0">';
                if (pd.isCounteroffer) {
                    html += '<div style="color:#FF9800;font-size:0.8em;font-weight:bold;margin-bottom:4px">🔄 COUNTEROFFER</div>';
                }
                html += '<div style="color:' + Config.ROLE_COLORS[pd.from] + ';font-weight:bold">' + Config.ROLE_ICONS[pd.from] + ' ' + Config.ROLE_LABELS[pd.from] + ' proposes:</div>';
                html += '<div style="margin:4px 0"><strong>Asks you to:</strong> ' + getDealTypeLabel(pd.askType, pd.askBillName) + '</div>';
                html += '<div style="margin:4px 0"><strong>Offers to:</strong> ' + getDealTypeLabel(pd.offerType, pd.offerBillName) + '</div>';
                if (pd.message) html += '<div style="font-style:italic;color:#aaa">"' + escapeHtml(pd.message) + '"</div>';
                html += '<div style="margin-top:6px">';
                html += '<button class="btn btn-small" data-action="acceptDeal" data-deal-id="' + pd.id + '" style="background:#4CAF50;color:white;padding:3px 10px;border-radius:4px;border:none;cursor:pointer;margin-right:6px">✅ Accept</button>';
                html += '<button class="btn btn-small" data-action="rejectDeal" data-deal-id="' + pd.id + '" style="background:#f44336;color:white;padding:3px 10px;border-radius:4px;border:none;cursor:pointer">❌ Reject</button>';
                html += '</div></div>';
            }
            html += '</div>';
        }

        // Active deals the player has accepted (promises they made)
        var acceptedDeals = Engine.getAcceptedDealsForRole(myRole);
        if (acceptedDeals.length > 0) {
            html += '<div class="active-deals" style="margin-top:6px">';
            html += '<h4 style="margin:4px 0;color:#4CAF50">📋 Your Promises</h4>';
            for (var k = 0; k < acceptedDeals.length; k++) {
                var ad = acceptedDeals[k];
                html += '<div class="deal-card" style="background:rgba(76,175,80,0.1);border:1px solid #4CAF50;border-radius:6px;padding:8px;margin:4px 0">';
                html += '<div>Promised ' + Config.ROLE_LABELS[ad.to] + ': <strong>' + getDealTypeLabel(ad.offerType, ad.offerBillName) + '</strong></div>';
                html += '<div style="font-size:0.8em;color:#888">They will: ' + getDealTypeLabel(ad.askType, ad.askBillName) + '</div>';
                html += '<div style="margin-top:6px">';
                html += '<button class="btn btn-small" data-action="fulfillDeal" data-deal-id="' + ad.id + '" style="background:#4CAF50;color:white;padding:3px 10px;border-radius:4px;border:none;cursor:pointer;margin-right:6px">✅ Fulfill</button>';
                html += '<button class="btn btn-small" data-action="breakDeal" data-deal-id="' + ad.id + '" style="background:#f44336;color:white;padding:3px 10px;border-radius:4px;border:none;cursor:pointer">💔 Break Promise</button>';
                html += '</div></div>';
            }
            html += '</div>';
        }

        // Deals waiting on others (deals player proposed that were accepted)
        var waitingDeals = state.deals.filter(function(d) {
            return d.to !== myRole && d.from === myRole && d.status === 'accepted';
        });
        if (waitingDeals.length > 0) {
            html += '<div style="margin-top:6px">';
            html += '<h4 style="margin:4px 0;color:#2196F3">⏳ Waiting On Others</h4>';
            for (var w = 0; w < waitingDeals.length; w++) {
                var wd = waitingDeals[w];
                html += '<div style="font-size:0.85em;padding:4px;border-left:2px solid ' + Config.ROLE_COLORS[wd.to] + '">';
                html += Config.ROLE_LABELS[wd.to] + ' promised: ' + getDealTypeLabel(wd.askType, wd.askBillName);
                html += '</div>';
            }
            html += '</div>';
        }

        // Deal history button
        if (state.dealHistory && state.dealHistory.length > 0) {
            html += '<div style="margin-top:8px;text-align:center"><button class="btn" data-action="showDealHistory" style="font-size:0.8em;padding:4px 10px;background:rgba(255,255,255,0.05);border:1px solid #555;color:#aaa;border-radius:4px;cursor:pointer">📋 Deal History (' + state.dealHistory.length + ')</button></div>';
        }

        html += '</div>';
        return html;
    }

    function getDealTypeLabel(type, billName) {
        var label = (Engine.DEAL_TYPES && Engine.DEAL_TYPES[type]) ? Engine.DEAL_TYPES[type].label : (type || 'General favor');
        if (billName) {
            label += ' <span style="color:#FFC107">"' + escapeHtml(billName) + '"</span>';
        } else if (Engine.DEAL_TYPES && Engine.DEAL_TYPES[type] && Engine.DEAL_TYPES[type].billRelated && currentState && currentState.bills && currentState.bills.length > 0) {
            var activeBill = currentState.bills[0];
            if (currentState.activeBillId) {
                for (var i = 0; i < currentState.bills.length; i++) {
                    if (currentState.bills[i].id === currentState.activeBillId) { activeBill = currentState.bills[i]; break; }
                }
            }
            if (activeBill) label += ' <span style="color:#FFC107">"' + escapeHtml(activeBill.name) + '"</span>';
        }
        return label;
    }

    function showProposeDealModal() {
        var myRole2 = currentRole;
        var roles = Config.ROLES;
        var dealTypes = Engine.DEAL_TYPES;
        var state = currentState;
        var bills = state.bills || [];

        // Get first non-self role as default target
        var defaultTarget = '';
        for (var d = 0; d < roles.length; d++) {
            if (roles[d] !== myRole2) { defaultTarget = roles[d]; break; }
        }

        // Build bill options HTML
        var billOptionsHtml = '<option value="">-- Any/No specific bill --</option>';
        for (var bi = 0; bi < bills.length; bi++) {
            billOptionsHtml += '<option value="' + bills[bi].id + '">' + escapeHtml(bills[bi].name) + '</option>';
        }

        var html = '<div style="padding:10px">';
        html += '<h4>Who do you want to make a deal with?</h4>';
        html += '<select id="deal-target" style="width:100%;padding:8px;margin:6px 0;background:#1a1a2e;color:white;border:1px solid #444;border-radius:4px">';
        for (var i = 0; i < roles.length; i++) {
            if (roles[i] === myRole2) continue;
            html += '<option value="' + roles[i] + '">' + Config.ROLE_ICONS[roles[i]] + ' ' + Config.ROLE_LABELS[roles[i]] + '</option>';
        }
        html += '</select>';

        html += '<h4>What do you ask them to do?</h4>';
        html += '<select id="deal-ask" style="width:100%;padding:8px;margin:6px 0;background:#1a1a2e;color:white;border:1px solid #444;border-radius:4px">';
        html += '</select>';
        html += '<div id="deal-ask-bill-row" style="display:none;margin:4px 0">';
        html += '<label style="font-size:0.85em;color:#aaa">Which bill?</label>';
        html += '<select id="deal-ask-bill" style="width:100%;padding:6px;background:#1a1a2e;color:white;border:1px solid #444;border-radius:4px">' + billOptionsHtml + '</select>';
        html += '</div>';

        html += '<h4>What do you offer in return?</h4>';
        html += '<select id="deal-offer" style="width:100%;padding:8px;margin:6px 0;background:#1a1a2e;color:white;border:1px solid #444;border-radius:4px">';
        for (var key2 in dealTypes) {
            if (dealTypes[key2].roles.indexOf(myRole2) !== -1) {
                html += '<option value="' + key2 + '">' + dealTypes[key2].label + '</option>';
            }
        }
        html += '</select>';
        html += '<div id="deal-offer-bill-row" style="display:none;margin:4px 0">';
        html += '<label style="font-size:0.85em;color:#aaa">Which bill?</label>';
        html += '<select id="deal-offer-bill" style="width:100%;padding:6px;background:#1a1a2e;color:white;border:1px solid #444;border-radius:4px">' + billOptionsHtml + '</select>';
        html += '</div>';

        html += '<h4>Message (optional)</h4>';
        html += '<input type="text" id="deal-message" placeholder="Add a message..." style="width:100%;padding:8px;margin:6px 0;background:#1a1a2e;color:white;border:1px solid #444;border-radius:4px">';

        html += '</div>';

        showModal('📜 Propose a Deal', html, [
            { label: '📜 Send Deal', action: 'sendDeal', className: 'btn-green' },
            { label: 'Cancel', action: 'closeModal', className: 'btn-red' }
        ]);

        // Show/hide bill selector based on deal type
        function updateBillVisibility() {
            var askEl = document.getElementById('deal-ask');
            var offerEl = document.getElementById('deal-offer');
            var askBillRow = document.getElementById('deal-ask-bill-row');
            var offerBillRow = document.getElementById('deal-offer-bill-row');
            if (askEl && askBillRow) {
                var askType = dealTypes[askEl.value];
                askBillRow.style.display = (askType && askType.billRelated && bills.length > 0) ? 'block' : 'none';
            }
            if (offerEl && offerBillRow) {
                var offerType = dealTypes[offerEl.value];
                offerBillRow.style.display = (offerType && offerType.billRelated && bills.length > 0) ? 'block' : 'none';
            }
        }

        // Populate ask dropdown based on target, and update when target changes
        function updateAskOptions() {
            var targetEl = document.getElementById('deal-target');
            var askEl = document.getElementById('deal-ask');
            if (!targetEl || !askEl) return;
            var targetRole = targetEl.value;
            var opts = '';
            for (var k in dealTypes) {
                if (dealTypes[k].roles.indexOf(targetRole) !== -1) {
                    opts += '<option value="' + k + '">' + dealTypes[k].label + '</option>';
                }
            }
            askEl.innerHTML = opts;
            updateBillVisibility();
        }
        updateAskOptions();
        var targetSelect = document.getElementById('deal-target');
        if (targetSelect) {
            targetSelect.addEventListener('change', updateAskOptions);
        }
        var askSelect = document.getElementById('deal-ask');
        if (askSelect) askSelect.addEventListener('change', updateBillVisibility);
        var offerSelect = document.getElementById('deal-offer');
        if (offerSelect) offerSelect.addEventListener('change', updateBillVisibility);
        updateBillVisibility();
    }

    function showDealHistoryModal() {
        var state = currentState;
        var history = (state && state.dealHistory) || [];
        var html = '<div style="max-height:400px;overflow-y:auto">';
        if (history.length === 0) {
            html += '<p style="color:#888;text-align:center">No deal history yet.</p>';
        } else {
            for (var i = history.length - 1; i >= 0; i--) {
                var d = history[i];
                var statusColor = d.status === 'fulfilled' ? '#4CAF50' : (d.status === 'broken' ? '#f44336' : (d.status === 'accepted' ? '#2196F3' : (d.status === 'rejected' ? '#FF9800' : '#888')));
                var statusIcon = d.status === 'fulfilled' ? '✅' : (d.status === 'broken' ? '💔' : (d.status === 'accepted' ? '🤝' : (d.status === 'rejected' ? '❌' : '⏳')));
                html += '<div style="padding:6px 8px;margin:4px 0;background:rgba(255,255,255,0.03);border-radius:4px;border-left:3px solid ' + statusColor + '">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center">';
                html += '<strong style="color:' + (Config.ROLE_COLORS[d.from] || '#fff') + '">' + (Config.ROLE_LABELS[d.from] || d.from) + '</strong>';
                html += '<span style="font-size:0.75em;color:#888">R' + d.round + '</span>';
                html += '</div>';
                html += '<div style="font-size:0.85em;color:#ccc;margin:2px 0">→ ' + (Config.ROLE_LABELS[d.to] || d.to) + '</div>';
                var askLabel = (Engine.DEAL_TYPES && Engine.DEAL_TYPES[d.askType]) ? Engine.DEAL_TYPES[d.askType].label : d.askType;
                var offerLabel = (Engine.DEAL_TYPES && Engine.DEAL_TYPES[d.offerType]) ? Engine.DEAL_TYPES[d.offerType].label : d.offerType;
                html += '<div style="font-size:0.8em;color:#aaa">Asked: ' + escapeHtml(askLabel) + (d.askBillName ? ' "' + escapeHtml(d.askBillName) + '"' : '') + '</div>';
                html += '<div style="font-size:0.8em;color:#aaa">Offered: ' + escapeHtml(offerLabel) + (d.offerBillName ? ' "' + escapeHtml(d.offerBillName) + '"' : '') + '</div>';
                html += '<div style="font-size:0.85em;margin-top:2px"><span style="color:' + statusColor + '">' + statusIcon + ' ' + d.status.charAt(0).toUpperCase() + d.status.slice(1) + '</span>';
                if (d.resolvedRound && d.resolvedRound !== d.round) html += ' <span style="font-size:0.8em;color:#666">(R' + d.resolvedRound + ')</span>';
                html += '</div></div>';
            }
        }
        html += '</div>';
        showModal('📋 Deal History', html, [
            { label: 'Close', action: 'closeModal', className: 'btn-secondary' }
        ]);
    }

    function showPassedLawsModal() {
        var state = currentState;
        var passed = state.passedBills || [];
        var uncon = state.unconstitutionalBills || [];
        var html = '<div style="padding:10px;max-height:400px;overflow-y:auto">';

        if (passed.length === 0 && uncon.length === 0) {
            html += '<p style="color:#888;text-align:center">No laws have been passed yet.</p>';
        }

        // Passed Bills (Laws)
        if (passed.length > 0) {
            html += '<h4 style="margin:0 0 8px 0;color:#4CAF50">✅ Enacted Laws (' + passed.length + ')</h4>';
            for (var i = passed.length - 1; i >= 0; i--) {
                var b = passed[i];
                var partColor = getPartisanColor(b.partisanship);
                var partLabel = b.partisanship <= 7 ? 'Conservative' : (b.partisanship >= 14 ? 'Liberal' : 'Moderate');
                html += '<div style="background:rgba(76,175,80,0.08);border:1px solid #4CAF50;border-left:4px solid ' + partColor + ';border-radius:6px;padding:8px 10px;margin:4px 0">';
                html += '<div style="display:flex;justify-content:space-between;align-items:center">';
                html += '<strong style="color:white">' + escapeHtml(b.name) + '</strong>';
                // Markers
                var badges = '';
                if (b.markers && b.markers.indexOf('C') !== -1) badges += '<span style="background:#4CAF50;color:white;padding:1px 6px;border-radius:3px;font-size:0.75em;margin-left:4px">Constitutional ✅</span>';
                if (b.signed) badges += '<span style="background:#2196F3;color:white;padding:1px 6px;border-radius:3px;font-size:0.75em;margin-left:4px">Signed ✍️</span>';
                if (b.isImpeachment) badges += '<span style="background:#f44336;color:white;padding:1px 6px;border-radius:3px;font-size:0.75em;margin-left:4px">Impeachment</span>';
                if (b.isPackCourts) badges += '<span style="background:#9C27B0;color:white;padding:1px 6px;border-radius:3px;font-size:0.75em;margin-left:4px">Pack Courts</span>';
                if (b.isTaxCuts) badges += '<span style="background:#FF9800;color:white;padding:1px 6px;border-radius:3px;font-size:0.75em;margin-left:4px">Tax Cuts</span>';
                if (b.isRepeal) badges += '<span style="background:#795548;color:white;padding:1px 6px;border-radius:3px;font-size:0.75em;margin-left:4px">Repeal</span>';
                if (b.certiorariUsed) badges += '<span style="background:#FF5722;color:white;padding:1px 6px;border-radius:3px;font-size:0.75em;margin-left:4px">Cert Granted</span>';
                html += '<div>' + badges + '</div>';
                html += '</div>';
                html += '<div style="display:flex;gap:12px;margin-top:4px;font-size:0.85em;color:#aaa">';
                html += '<span style="color:' + partColor + '">Part: ' + b.partisanship + ' (' + partLabel + ')</span>';
                html += '<span>Pop: ' + b.popularity + '</span>';
                html += '<span>Leg: ' + b.legality + '</span>';
                html += '</div>';
                if (b.vpEarned) {
                    var vpParts = [];
                    if (b.vpEarned.president) vpParts.push('🏛️ Pres ' + (b.vpEarned.president > 0 ? '+' : '') + b.vpEarned.president);
                    if (b.vpEarned.house) vpParts.push('🏠 House ' + (b.vpEarned.house > 0 ? '+' : '') + b.vpEarned.house);
                    if (b.vpEarned.senate) vpParts.push('🏢 Senate ' + (b.vpEarned.senate > 0 ? '+' : '') + b.vpEarned.senate);
                    if (b.vpEarned.supremeCourt) vpParts.push('⚖️ SC ' + (b.vpEarned.supremeCourt > 0 ? '+' : '') + b.vpEarned.supremeCourt);
                    if (vpParts.length > 0) {
                        html += '<div style="font-size:0.8em;color:#888;margin-top:2px">VP: ' + vpParts.join(' | ') + '</div>';
                    }
                }
                html += '</div>';
            }
        }

        // Unconstitutional Bills
        if (uncon.length > 0) {
            html += '<h4 style="margin:12px 0 8px 0;color:#f44336">❌ Struck Down — Unconstitutional (' + uncon.length + ')</h4>';
            for (var u = uncon.length - 1; u >= 0; u--) {
                var ub = uncon[u];
                var uPartColor = getPartisanColor(ub.partisanship);
                var uPartLabel = ub.partisanship <= 7 ? 'Conservative' : (ub.partisanship >= 14 ? 'Liberal' : 'Moderate');
                html += '<div style="background:rgba(244,67,54,0.08);border:1px solid #f44336;border-left:4px solid ' + uPartColor + ';border-radius:6px;padding:8px 10px;margin:4px 0">';
                html += '<strong style="color:#f44336">' + escapeHtml(ub.name) + '</strong>';
                html += '<span style="background:#f44336;color:white;padding:1px 6px;border-radius:3px;font-size:0.75em;margin-left:8px">Unconstitutional ❌</span>';
                html += '<div style="display:flex;gap:12px;margin-top:4px;font-size:0.85em;color:#aaa">';
                html += '<span style="color:' + uPartColor + '">Part: ' + ub.partisanship + ' (' + uPartLabel + ')</span>';
                html += '<span>Pop: ' + ub.popularity + '</span>';
                html += '<span>Leg: ' + ub.legality + '</span>';
                html += '</div></div>';
            }
        }

        html += '</div>';
        showModal('📚 Passed Laws & Rulings', html, [
            { label: 'Close', action: 'closeModal', className: '' }
        ]);
    }

    function showModal(title, bodyHtml, buttons) {
        var overlay = document.getElementById('modal-overlay');
        var modalTitle = document.getElementById('modal-title');
        var modalBody = document.getElementById('modal-body');
        var modalFooter = document.getElementById('modal-footer');
        if (!overlay || !modalTitle || !modalBody || !modalFooter) return;
        modalTitle.textContent = title;
        modalBody.innerHTML = bodyHtml;
        var footerHtml = '';
        for (var i = 0; i < buttons.length; i++) {
            var b = buttons[i];
            footerHtml += '<button class="btn ' + (b.className || '') + '" data-action="' + b.action + '">' + b.label + '</button>';
        }
        modalFooter.innerHTML = footerHtml;
        overlay.style.display = 'flex';
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
        var content = document.getElementById('game-content');
        var html = '<div class="game-over">';

        if (state.stabilityCollapse) {
            html += '<h1 style="color:#f44336">💥 Government Collapse!</h1>';
            html += '<div class="winner-display" style="border-color:#f44336;text-align:center">';
            html += '<h2>🏚️ Nobody Wins</h2>';
            html += '<p style="color:#ccc;margin:8px 0">Country stability reached 0. The government has collapsed.</p>';
            html += '<p style="color:#f44336;font-style:italic">All players lose — the nation falls into chaos.</p>';
            html += '</div>';
        } else {
            var winner = Engine.getWinner();
            html += '<h1>🏛️ Game Over!</h1>';
            html += '<div class="winner-display" style="border-color:' + Config.ROLE_COLORS[winner.role] + '">';
            html += '<h2>' + Config.ROLE_ICONS[winner.role] + ' ' + Config.ROLE_LABELS[winner.role] + ' Wins!</h2>';
            html += '<p class="winner-vp">' + winner.vp + ' Victory Points</p>';
            html += '</div>';
        }

        // Enhanced final scores with VP breakdown
        html += '<div class="final-scores" style="max-width:600px">';
        html += '<h3>Final Scores</h3>';
        var roles = Config.ROLES;
        var sortedRoles = roles.slice().sort(function(a, b) { return state[b].vp - state[a].vp; });
        for (var i = 0; i < sortedRoles.length; i++) {
            var r = sortedRoles[i];
            var rs = state[r];
            var rank = i + 1;
            var medal = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : '4️⃣'));
            html += '<div class="final-score-card" style="border-left: 4px solid ' + Config.ROLE_COLORS[r] + '">';
            html += '<div style="display:flex;justify-content:space-between;align-items:center;width:100%">';
            html += '<span>' + medal + ' ' + Config.ROLE_ICONS[r] + ' ' + Config.ROLE_LABELS[r] + '</span>';
            html += '<span class="final-vp">' + rs.vp + ' VP</span>';
            html += '</div>';

            // VP sources breakdown
            if (state.vpSources && state.vpSources[r] && state.vpSources[r].length > 0) {
                var sourceSums = {};
                for (var si = 0; si < state.vpSources[r].length; si++) {
                    var src = state.vpSources[r][si];
                    sourceSums[src.source] = (sourceSums[src.source] || 0) + src.amount;
                }
                html += '<div style="font-size:0.75em;color:#888;margin-top:4px;padding-left:24px">';
                var sourceKeys = Object.keys(sourceSums);
                for (var sk = 0; sk < sourceKeys.length; sk++) {
                    html += sourceKeys[sk] + ': ' + (sourceSums[sourceKeys[sk]] > 0 ? '+' : '') + sourceSums[sourceKeys[sk]] + 'VP';
                    if (sk < sourceKeys.length - 1) html += ' • ';
                }
                html += '</div>';
            }
            html += '</div>';
        }
        html += '</div>';

        // Game stats
        html += '<div class="game-stats" style="max-width:600px;width:100%;margin-top:12px">';
        html += '<h3 style="color:var(--text-secondary);margin-bottom:8px">📊 Game Stats</h3>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
        html += '<div class="stat-card" style="background:var(--bg-panel);padding:8px 12px;border-radius:6px"><span style="color:#888;font-size:0.8em">Bills Passed</span><br><strong>' + (state.passedBills ? state.passedBills.length : 0) + '</strong></div>';
        html += '<div class="stat-card" style="background:var(--bg-panel);padding:8px 12px;border-radius:6px"><span style="color:#888;font-size:0.8em">Events</span><br><strong>' + (state.eventHistory ? state.eventHistory.length : 0) + '</strong></div>';
        html += '<div class="stat-card" style="background:var(--bg-panel);padding:8px 12px;border-radius:6px"><span style="color:#888;font-size:0.8em">Deals Made</span><br><strong>' + (state.dealHistory ? state.dealHistory.length : 0) + '</strong></div>';
        html += '<div class="stat-card" style="background:var(--bg-panel);padding:8px 12px;border-radius:6px"><span style="color:#888;font-size:0.8em">Final Stability</span><br><strong>' + (state.stability !== undefined ? state.stability + '/10' : 'N/A') + '</strong></div>';
        html += '</div></div>';

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
        if (!msg.timestamp) msg.timestamp = Date.now();
        chatMessages.push(msg);
        if (currentState) renderGame(currentState);
    }

    // --- 6.3 Recommended Actions ---
    function getRecommendedActions(state, role) {
        var recommended = [];
        var actions = Engine.getAvailableActions(role);
        var actionIds = actions.map(function(a) { return a.id; });

        // If event active and role can resolve → recommend resolveEvent
        if (state.activeEvent && !state.activeEvent.resolved && actionIds.indexOf('resolveEvent') !== -1) {
            recommended.push('resolveEvent');
        }

        // If bill on floor and role can pass → recommend pass action
        var bills = state.bills || [];
        if (bills.length > 0) {
            if (role === 'house' && actionIds.indexOf('housePassBill') !== -1) {
                recommended.push('housePassBill');
            } else if (role === 'senate' && actionIds.indexOf('senatePassBill') !== -1) {
                recommended.push('senatePassBill');
            } else if (role === 'president' && actionIds.indexOf('signBill') !== -1) {
                recommended.push('signBill');
            } else if (role === 'supremeCourt' && actionIds.indexOf('judicialReview') !== -1) {
                recommended.push('judicialReview');
            }
        }

        // If no recommendations yet → recommend primary VP action for role
        if (recommended.length === 0) {
            var primaryActions = {
                president: 'executiveOrder',
                house: 'caucusMeeting',
                senate: 'debate',
                supremeCourt: 'generalCourt'
            };
            var primary = primaryActions[role];
            if (primary && actionIds.indexOf(primary) !== -1) {
                recommended.push(primary);
            }
        }

        return recommended;
    }

    // --- 6.2 Tutorial ---
    var TUTORIAL_STEPS = [
        {
            title: 'Welcome to Branches of Power! 🏛️',
            body: '<p>You\'re about to play as one of the <strong>4 branches</strong> of the US government: <span style="color:#DAA520">President</span>, <span style="color:#2E8B57">House</span>, <span style="color:#4169E1">Senate</span>, or <span style="color:#6A0DAD">Supreme Court</span>.</p>' +
                  '<p>Each role has unique actions. Compete to earn the most <strong>Victory Points (VP)</strong> while keeping the government stable!</p>'
        },
        {
            title: 'Understanding Your Stats 📊',
            body: '<p><strong>VP (Victory Points)</strong> — Your score. Highest VP at game end wins!</p>' +
                  '<p><strong>PC (Political Capital)</strong> — Spent on powerful actions (House & Senate).</p>' +
                  '<p><strong>Actions</strong> — You get 4 actions per round. Spend them wisely!</p>' +
                  '<p><strong>Popularity</strong> — President\'s public approval. Enables powerful moves above 15.</p>' +
                  '<p><strong>JP (Judicial Points)</strong> — Supreme Court resource for rulings.</p>'
        },
        {
            title: 'Bills & Legislation 📜',
            body: '<p>Bills are the heart of the game. Each bill has 3 stats:</p>' +
                  '<p><strong>Partisanship</strong> (1-20) — Determines which legislators vote yes.</p>' +
                  '<p><strong>Popularity</strong> (1-20) — Affects VP earned when signed.</p>' +
                  '<p><strong>Legality</strong> (1-20) — Determines if the Supreme Court strikes it down.</p>' +
                  '<p>Bill lifecycle: <strong>Create → House Vote → Senate Vote → President Signs</strong></p>'
        },
        {
            title: 'Your Actions ⚡',
            body: '<p>Look for actions with a <span style="color:#ffd700">⭐ gold star</span> — these are <strong>recommended</strong> based on the current game state.</p>' +
                  '<p>Hover over any action button to see a <strong>tooltip</strong> explaining what it does.</p>' +
                  '<p><strong>Tip:</strong> Balance VP-gaining actions with strategic moves. Don\'t forget about stability!</p>'
        },
        {
            title: 'Stability & Events ⚡',
            body: '<p>The <strong>Stability gauge</strong> (top bar) tracks national health. If it hits 0, <span style="color:#f44336">everyone loses!</span></p>' +
                  '<p><strong>Random events</strong> appear and require cooperative resolution. Ignoring them costs stability and triggers penalties.</p>' +
                  '<p>Work together on events, but compete for VP. Good luck! 🎲</p>'
        }
    ];

    function renderTutorial(step) {
        // Remove any existing tutorial overlay
        var existing = document.getElementById('tutorial-overlay');
        if (existing) existing.remove();

        if (step >= TUTORIAL_STEPS.length) {
            dismissTutorial();
            return;
        }

        var s = TUTORIAL_STEPS[step];
        var overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.className = 'tutorial-overlay';
        overlay.innerHTML =
            '<div class="tutorial-card">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
            '<h2>' + s.title + '</h2>' +
            '<span style="color:#888;font-size:0.85em">' + (step + 1) + '/' + TUTORIAL_STEPS.length + '</span>' +
            '</div>' +
            s.body +
            '<div class="tutorial-buttons">' +
            '<button class="tutorial-skip" data-action="tutorialSkip">Skip Tutorial</button>' +
            '<button class="tutorial-next" data-action="' + (step < TUTORIAL_STEPS.length - 1 ? 'tutorialNext' : 'tutorialSkip') + '">' +
            (step < TUTORIAL_STEPS.length - 1 ? 'Next →' : 'Start Playing! 🎮') +
            '</button>' +
            '</div>' +
            '</div>';
        document.body.appendChild(overlay);
    }

    function dismissTutorial() {
        tutorialActive = false;
        var overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.remove();
        try { localStorage.setItem('bop_tutorial_done', 'true'); } catch (e) { /* graceful degradation */ }
    }

    // --- 6.4 How-To-Play Modal ---
    function showHowToPlayModal() {
        var html = '<div style="max-height:450px;overflow-y:auto;padding:4px">';
        html += '<h4 style="color:#DAA520;margin:0 0 6px">🏛️ Game Overview</h4>';
        html += '<p style="font-size:0.9em;margin-bottom:10px">Branches of Power is a 4-player strategy game where each player controls a branch of the US government. Compete to earn the most <strong>Victory Points</strong> over multiple rounds while keeping national stability above zero.</p>';

        html += '<h4 style="color:#DAA520;margin:8px 0 6px">👥 Roles</h4>';
        html += '<div style="font-size:0.9em">';
        html += '<p><span style="color:#DAA520">🏛️ President</span> — Signs bills into law for big VP. Uses popularity for powerful moves like Bully Pulpit. Appoints Supreme Court justices.</p>';
        html += '<p><span style="color:#2E8B57">🏠 House</span> — Creates and votes on bills. Builds political capital (PC) for earmarks and investigations. Can impeach the President.</p>';
        html += '<p><span style="color:#4169E1">🏛️ Senate</span> — Confirms bills and justices. Uses filibuster and stall tactics. Can shut down the government.</p>';
        html += '<p><span style="color:#6A0DAD">⚖️ Supreme Court</span> — Reviews bills for constitutionality. Builds judicial points (JP) for landmark rulings. Most VP from striking down laws.</p>';
        html += '</div>';

        html += '<h4 style="color:#DAA520;margin:8px 0 6px">📜 Bill Lifecycle</h4>';
        html += '<p style="font-size:0.9em">Create Bill → <span style="color:#2E8B57">House Vote</span> → <span style="color:#4169E1">Senate Vote</span> → <span style="color:#DAA520">President Signs/Vetoes</span> → <span style="color:#6A0DAD">SC may review</span></p>';

        html += '<h4 style="color:#DAA520;margin:8px 0 6px">⭐ Key VP Actions</h4>';
        html += '<div style="font-size:0.85em">';
        html += '<p><span style="color:#DAA520">President:</span> Sign Bill (+4), Bully Pulpit (+5), Executive Order (+1)</p>';
        html += '<p><span style="color:#2E8B57">House:</span> Pass Bill (variable), Earmark (+4), Subpoena (+2)</p>';
        html += '<p><span style="color:#4169E1">Senate:</span> Pass Bill (variable), Investigation (+2), Nominations (+1)</p>';
        html += '<p><span style="color:#6A0DAD">Supreme Court:</span> Judicial Review (up to +6), Landmark Ruling (+5), General Court (+2)</p>';
        html += '</div>';

        html += '</div>';

        showModal('❓ How to Play', html, [
            { label: 'Got it!', action: 'closeModal', className: 'btn-primary' }
        ]);
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
