module.exports.medullaMaster = io=>{

	io.onMessage('dashboard_get', msg=>{
		let data = JSON.stringify(io.medullaStats);
		io.sendMessage({type:'dashboard_data', data});
	});

	/*medulla.ws.on('connection', ws=>{

		ws.on('message', msg=>{
			if (msg === 'MEDSIG_RESTART') {
				if (restart) {
					restart(()=>{
						let cids = Object.keys(medulla.wsClients);
						for (let id of cids) medulla.wsClients[id].send('MEDSIG_REFRESH');
					});
					restart = null;
				} else {
					let cids = Object.keys(medulla.wsClients);
					for (let id of cids) medulla.wsClients[id].send('MEDSIG_REFRESH');
				}
			} else if (msg === 'MEDSIG_PAGELOADED') {
				if (error) sendError(error);
			}
		});

	});*/
};

module.exports.medullaWorker = io=>{
	const { URL , URLSearchParams } = require('url');

	let data = {},
	    need_resp = null;

	process.on('message', (msg)=>{
		if (msg.type === 'dashboard_data') {
			data = JSON.parse(msg.data);
		}

		if (need_resp) {
			let output = `
			<html>
				<body>
					Server lauched on: ${data.medullaLauched}<br>
					Workers lauched on: ${data.workersLauched}<br>
					<br>
					Total workers lauched: ${data.totalWorkers}<br><br>
					Requests: ${data.requests}<br>
					Requests per minute: ${data.requests / data.worktime}<br>
					(updated every minute)
				</body>
			</html>
			`;
			need_resp.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});
			need_resp.write(output);
			need_resp.end();
			need_resp = null;
		}
	});

	io.routes['dashboard'] = (request, response, url)=>{
		let urlSearchParams = new URLSearchParams(url.search);

		let pw = urlSearchParams.get('password');
		if (pw !== io.settings.dashboardPassword) {
			response.writeHeader(403, {"Content-Type": "text/html; charset=utf-8"});
			response.write('Forbidden.');
			response.end();
			return false;
		} else {
			need_resp = response;
			process.send({type:'dashboard_get'});
			return true; //wait
		}
	};
};