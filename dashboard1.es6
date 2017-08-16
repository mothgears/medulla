module.exports.medullaMaster = master=>{

	master.onMessage('dashboard_get', ()=>{
		master.sendMessage({
			type:'dashboard_get',
			data: JSON.stringify(master.medullaStats)
		});
	});

};

module.exports.medullaWorker = worker=>{
	const
		CLIENT_JS   = require('./dashboard-client.js'),
		CLIENT_HTML = require('./dashboard-tpl.es6');

	worker.onRequest = (req, res)=>{
		if (req.url === '/medulla_dashboard.js') {
			res.send(`(${CLIENT_JS.toString()})();`, "application/javascript; charset=utf-8");

		} else if (req.url === '/medulla-dashboard') {
			if (req.method === 'GET') {

				worker.askMaster({type:'dashboard_get'}, msg=>{
					data = JSON.parse(msg.data);
					data.worktime = ((Date.now() / 1000) - data.medullaLauchedTS) / 60;
					data.withpass = worker.settings.dashboardPassword;
					res.end(CLIENT_HTML(data));
				});

			} else if (req.method === 'POST') {
				let data = JSON.parse(req.data);

				if (data.act === 'stop') {
					if (!worker.settings.dashboardPassword || data.key === worker.settings.dashboardPassword) {
						res.send('SERVER STOPPED/RESTARTED.');
						worker.stopServer();
					} else res.send(403);
				}
			}
		} else res.next();
	}
};