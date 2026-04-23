// Branches of Power — Main Entry Point
// Game initialization, version, event wiring

var Game = (function() {
    'use strict';

    var VERSION = Config.VERSION;

    function init() {
        console.log('Branches of Power v' + VERSION + ' — Initializing...');

        // Initialize UI
        UI.init();

        // Wire up network events
        Network.onStateUpdate(function(state) {
            Engine.setState(state);
            UI.renderGame(state);
        });

        Network.onLobbyUpdate(function(lobby) {
            UI.renderLobby();
        });

        Network.onChatMessage(function(msg) {
            UI.addChatMessage(msg);
        });

        Network.onActionResult(function(result) {
            if (result.result && result.result.message) {
                UI.showToast(result.result.message, result.result.success ? 'success' : 'error');
            }
        });

        Network.onVoteRequest(function(data) {
            UI.showVoteModal(data.description);
        });

        Network.onError(function(err) {
            UI.showToast('Connection error: ' + (err.message || err.type || 'Unknown'), 'error');
        });

        // Show main menu
        UI.renderMainMenu();

        console.log('Branches of Power v' + VERSION + ' — Ready!');
    }

    return {
        VERSION: VERSION,
        init: init
    };
})();

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    Game.init();
});
