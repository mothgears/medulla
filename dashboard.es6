module.exports.medullaMaster = master=>{

	master.onMessage('dashboard_get', ()=>{
		master.sendMessage({
			type:'dashboard_data',
			data: JSON.stringify(master.medullaStats)
		});
	});

};

module.exports.medullaWorker = worker=>{

	//Client
	const
		CLIENT_JS   = require('./dashboard-client.js'),
		CLIENT_HTML = require('./dashboard-tpl.es6');

	let res = null;

	process.on('message', msg=>{
		if (msg.type === 'dashboard_data' && res) {
			data = JSON.parse(msg.data);
			data.worktime = ((Date.now() / 1000) - data.medullaLauchedTS) / 60;
			data.withpass = worker.settings.dashboardPassword;
			res.end(CLIENT_HTML(data));
			res = null;
		}
	});

	worker.onRequest = (io, request, response)=>{
		if (io.url === '/medulla_dashboard.js') {
			io.code = 200;
			io.headers["Content-Type"] = "application/javascript; charset=utf-8";
			io.body += `(${CLIENT_JS.toString()})();`;
			io.end();
		}

		if (io.url === '/medulla-dashboard') {
			if (io.method === 'GET') {
				if (request.url === '/medulla-dashboard') {
					response.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});
					res = response;
					process.send({type:'dashboard_get'});
					return -1; //WAIT
				}
			} else if (request.method === 'POST') {
				let body = '';
				request.on('data', chunk=>{
					body += chunk;
					if (body.length > 1e6) request.connection.destroy();
				}).on('end', ()=>{
					let post = JSON.parse(body);

					if (post.act === 'stop') {
						if (!worker.settings.dashboardPassword || post.key === worker.settings.dashboardPassword) {
							response.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});
							response.end('SERVER STOPPED/RESTARTED.');
							worker.stopServer();
						} else {
							response.writeHeader(403, {"Content-Type": "text/html; charset=utf-8"});
							response.end();
						}
					}
				});
				return -1; //WAIT
			}
		}
	}
};