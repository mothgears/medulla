(()=>{
	if (typeof global === 'object' && global) { //AS MODULE
		module.exports.medullaPlugin = {
			useOnClient: true
		};

		//PLUGIN SETTINGS
		global.settings.wsPort = global.settings.wsPort || 8888;

		//Start web socket
		global.ws_clients = {};
		global.ws_server = new (require('ws').Server)({port: global.settings.wsPort});
		let index = 0;
		global.ws_server.on('connection', ws=>{
			index++;
			if (index >= 1000000) index = 1;
			let id = index;

			ws.on('close', ()=>{
				delete global.ws_clients[id];
			});

			if (global.ws_clients[id]) {
				global.ws_clients[id].close();
				delete global.ws_clients[id];
			}
			global.ws_clients[id] = ws;

			ws.send('MEDSIG_WSID@'+id);
		});

	} else if (typeof window === 'object' && window) { //AS SCRIPT
		window.webSocket = window.webSocket || new WebSocket('ws://localhost:'+(window.settings.wsPort || 8888));

		window.webSocket.addEventListener('message', (event)=>{
			let msg = event.data;
			if (msg.startsWith('MEDSIG_WSID@')) {
				window.webSocket.client_id = JSON.parse(msg.split('@')[1]);
			}
		});
	}
})();