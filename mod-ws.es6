(()=>{
	if (typeof global === 'object' && global) { //AS MODULE
		module.exports.medullaPlugin = {
			useOnClient: true
		};

		let ws_srv = null;
		Object.defineProperty(medulla, "ws", {
			get () {
				if (!ws_srv) {
					ws_srv = new (require('ws').Server)({port: global.medulla.settings.wsPort});

					medulla.wsClients = {};
					medulla.settings.useWebSocket = true;

					let index = 0;
					ws_srv.on('connection', ws=>{
						index++;
						if (index >= 1000000) index = 1;
						let id = index;

						ws.on('close', ()=>{
							delete medulla.wsClients[id];
						});

						if (medulla.wsClients[id]) {
							medulla.wsClients[id].close();
							delete medulla.wsClients[id];
						}
						medulla.wsClients[id] = ws;

						ws.send('MEDSIG_WSID@'+id);
					});
				}
				return ws_srv;
			}
		});
	} else if (typeof window === 'object' && window) { //AS SCRIPT
		if (window.medulla.settings.useWebSocket) {
			window.medulla.ws = window.medulla.ws || new WebSocket('ws://localhost:'+window.medulla.settings.wsPort);
			window.medulla.ws.addEventListener('message', function (event) {
				let msg = event.data;
				if (msg.startsWith('MEDSIG_WSID@')) {
					window.medulla.ws.client_id = JSON.parse(msg.split('@')[1]);
				}
			});
		}
	}
})();