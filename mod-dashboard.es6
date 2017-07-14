module.exports.medullaMaster = io=>{
	io.messageHandlers['dashboard_get'] = ()=>{
		let data = JSON.stringify(io.medullaStats);

		let keys = Object.keys(io.cluster.workers);
		for (let key of keys) try {
			io.cluster.workers[key].send({type:'dashboard_data', data});
		} catch(e){}
	}

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
					Workers: ${data.totalWorkers}<br>
				</body>
			</html>
			`;
			need_resp.write(output);
			need_resp.end();
			need_resp = null;
		}
	});

	io.routes['serverstat'] = (request, response)=>{
		//To Master
		need_resp = response;

		response.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});
		process.send({type:'dashboard_get'});

		return true;
	};
};