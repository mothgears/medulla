module.exports.medullaMaster = io=>{

	io.onMessage('dashboard_get', msg=>{
		let data = JSON.stringify(io.medullaStats);
		io.sendMessage({type:'dashboard_data', data});
	});
};

module.exports.medullaWorker = io=>{
	let
		data = {},
		need_resp = null;

	const PW = io.settings.dashboardPassword;

	process.on('message', (msg)=>{
		if (msg.type === 'dashboard_data') {
			data = JSON.parse(msg.data);
		}

		if (need_resp) {
			let worktime = ((Date.now() / 1000) - data.medullaLauchedTS) / 60;
			let output = `
			<html>
				<body>
					Server lauched on: ${data.medullaLauched}<br>
					Workers lauched on: ${data.workersLauched}<br>
					<br>
					Total workers lauched: ${data.totalWorkers}<br>
					<br>
					Requests: ${data.requests} (updated once a minute)<br>
					Requests per minute: ${(data.requests / worktime).toFixed(2)}<br>
					<br>
					<span id="button_stop" style="cursor: pointer"><u>Stop/Restart server</u></span>
				</body>
				<script src="medulla_dashboard.js${PW?'?password='+PW:''}"></script>
			</html>
			`;
			need_resp({content:output, includePlugins:false});
			need_resp = null;
		}
	});

	const noAccess = (password, response)=>{
		let pw = password || null;
		if (pw !== io.settings.dashboardPassword) return {
			code: 403,
			content: 'Forbidden.',
			includePlugins: false
		};
		return null;
	};

	io.addRoute('medulla_dashboard', ({GET, POST})=>{
		let noAcc = noAccess(GET.password || POST.password);
		if (noAcc) return noAcc;

		if (POST.do === 'stop') {
			io.stopServer();
			return '';
		} else {
			need_resp = true;
			return new Promise(done=>{
				process.send({type:'dashboard_get'});
				need_resp = done;
			});
		}
	});

	const JS = ()=>{
		document.querySelector('#button_stop').addEventListener('click', ()=>{
			fetch(`/medulla_dashboard`, {
				credentials: 'same-origin',
				headers: {
					"X-Requested-With": "XMLHttpRequest",
					"Content-type": "application/x-www-form-urlencoded; charset=UTF-8"
				},
				method: 'POST',
				body: `do=stop${PW?'&password='+PW:''}`
			}).then(r=>{
				console.log('Stopped');
				location.reload();
			}).catch(r=>{
				console.log('RRR');
			});
		});
	};

	io.addRoute('medulla_dashboard.js', ({GET})=>{
		let noAcc = noAccess(GET.password);
		if (noAcc) return noAcc;

		return {
			content: `const PW=${PW?'"'+PW+'"':null}; (${JS.toString()})();`,
			includePlugins: false
		};
	});
};