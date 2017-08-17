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
		if (io.url === '/medulla-dashboard.js') {
			io.includeMedullaCode = false;
			io.send(`(${CLIENT_JS.toString()})();`, 'application/javascript; charset=utf-8');

		} else if (io.url === '/medulla-dashboard') {
			io.includeMedullaCode = false;
			if (io.method === 'GET') {

				worker.askMaster({type:'dashboard_get'}, msg=>{
					data = JSON.parse(msg.data);
					data.worktime = ((Date.now() / 1000) - data.medullaLauchedTS) / 60;
					data.withpass = worker.settings.dashboardPassword;
					io.send(CLIENT_HTML(data));
				});

			} else if (io.method === 'POST') {
				let data = JSON.parse(io.input);

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