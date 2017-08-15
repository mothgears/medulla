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

	worker.onRequest = io=>{
		if (io.url === '/medulla_dashboard.js') {
			io.send(`(${CLIENT_JS.toString()})();`, "application/javascript; charset=utf-8");

		} else if (io.url === '/medulla-dashboard') {
			if (io.method === 'GET') {

				worker.askMaster({type:'dashboard_get'}, msg=>{
					data = JSON.parse(msg.data);
					data.worktime = ((Date.now() / 1000) - data.medullaLauchedTS) / 60;
					data.withpass = worker.settings.dashboardPassword;
					io.pure(CLIENT_HTML(data));
				});

			} else if (io.method === 'POST') {
				let data = JSON.parse(io.data);

				if (data.act === 'stop') {
					if (!worker.settings.dashboardPassword || data.key === worker.settings.dashboardPassword) {
						io.send('SERVER STOPPED/RESTARTED.');
						worker.stopServer();
					} else io.send(403);
				}
			}
		} else io.next();
	}
};