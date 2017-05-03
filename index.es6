//MEDULLA NODE SERVER
module.exports = customSettings=>{
	const cluster = require('cluster');
	const fs      = require('fs');
	const os      = require('os');
	const threads = os.cpus().length;

	//GLOBAL SERVER INTERFACE
	global.medulla = {};

	//SETTINGS
	let settings = medulla.settings = {
		port              : 3000,
		wsPort            : 9000,
		serverDir         : '../../',
		serverApp         : './app.js',
		hosts             : {},
		forcewatch        : false,
		watchFiles        : false,
		plugins           : {'./mod-ws.es6':{}},
		watch             : true,
		devMode           : process.argv.indexOf('-dev') >= 0,
		proxyCookieDomain : 'localhost',
		devPlugins        : {},
		mimeTypes         : require('./mimeTypes.json')
	};

	//ADD CUSTOM SETTINGS
	if (customSettings) {
		let keys = Object.keys(customSettings);
		for (let key of keys) {
			let s = settings[key];
			if (typeof s === 'object') {
				let ks = Object.keys(customSettings[key]);
				for (let k of ks) settings[key][k] = customSettings[key][k];
			}
			else settings[key] = customSettings[key];
		}
	}

	let hostSettings = settings.hosts[os.hostname()];
	if (hostSettings) {
		let keys = Object.keys(hostSettings);
		for (let key of keys) settings[key] = hostSettings[key];
	}
	if (settings.devMode) {
		let keys = Object.keys(settings.devPlugins);
		for (let key of keys) settings.plugins[key] = settings.devPlugins[key];
	}
	delete settings.hosts;
	delete settings.devPlugins;

	let pluginIndex = {}; //PLUGINS ORDER
	let pInd = 0;
	let plugins = Object.keys(settings.plugins);
	for (let plugin of plugins) {
		let plugSettings = settings.plugins[plugin];
		if (plugSettings) {
			let skeys = Object.keys(plugSettings);
			for (let skey of skeys) settings[skey] = plugSettings[skey];
		}
		plugin = require.resolve(plugin);
		pluginIndex[plugin] = pInd++;
	}
	let pluginsByPriority = {};
	let prevPlugin = null;
	plugins.sort(); //FOR IGNORE DUBLICATES
	for (let plugin of plugins) {
		plugin = require.resolve(plugin);
		if (plugin !== prevPlugin) {
			pluginsByPriority[pluginIndex[plugin]] = plugin;
		}
	}
	pluginIndex = Object.keys(pluginsByPriority);
	pluginIndex.sort();

	//MASTER
	if (cluster.isMaster) {
		//COMMANDS
		process.openStdin().addListener("data", cmd=>{
			cmd = cmd.toString().trim();
			const acts = {
				'version':()=>console.info(require('./package.json').version),
				'stop'   :()=>{
					let keys = Object.keys(cluster.workers);
					for (let key of keys) cluster.workers[key].send({type:'end', exitcode:2});
				}
			};
			(acts[cmd] || (()=>{console.log('command not defined')}))();
		});

		//
		let handlersModify   = [],
			handlersLaunch   = [],
			handlersShutdown = [],
			handlersError    = [];

		let pluginsJS = '',
			workerPlugins = [],
			ordersToStart = 0,
			watchers = {},
			onRestartEnd = [],
			error = null,
			lauched = 0,
			exits = 0,
			indexName = undefined;

		//PLUGINS
		for (let pid of pluginIndex) {
			let plugin = pluginsByPriority[pid];
			let p = require(plugin);
			if (p.medullaPlugin.useOnClient) pluginsJS += fs.readFileSync(require.resolve(plugin), 'utf8');
			if (p.medullaPlugin.useOnWorker) workerPlugins.push(plugin);
			if (p.medullaPlugin.onModify)    handlersModify.push(p.medullaPlugin.onModify);
			if (p.medullaPlugin.onLaunch)    handlersLaunch.push(p.medullaPlugin.onLaunch);
			if (p.medullaPlugin.onShutdown)  handlersShutdown.push(p.medullaPlugin.onShutdown);
			if (p.medullaPlugin.onError)     handlersError.push(p.medullaPlugin.onError);
		}
		pluginsJS = 'window.medulla = {settings:'+JSON.stringify(settings)+'};'+pluginsJS;

		const startServer = msg=>{
			console.log(msg);
			for (let i = 0; i < threads; i++) {
				let pars = {
					pluginsJS,
					workerPlugins:JSON.stringify(workerPlugins),
					mainWorker: (i+1 === threads)?'1':'0'
				};
				if (indexName) pars['indexName'] = indexName;
				cluster.fork(pars).on('message', medulla._handle);
			}
		};

		const restartServer = (after=null)=>{
			if (ordersToStart === handlersModify.length) {
				if (after) onRestartEnd.push(after);

				if (Object.keys(cluster.workers).length > 0) {
					//STOP ALL WORKERS
					let keys = Object.keys(cluster.workers);
					for (let key of keys) cluster.workers[key].send({type: 'end', exitcode: '3'});
				} else startServer('workers restarted');
				ordersToStart = 0;
			}
			ordersToStart++;
		};

		const outputError = error=>{
			console.error(
				'\n-------------'+error.title+'-------------\n',
				error.value,
				'\n--------------------------------------\n'
			);
		};

		const paramsEqual = (a,b)=>{
			let keys = Object.keys(a);
			for (let key of keys) {
				if (a[key] !== b[key]) return false;
			}
			keys = Object.keys(b);
			for (let key of keys) {
				if (a[key] !== b[key]) return false;
			}
			return true;
		};

		medulla._handle = msg=>{
			//UPDATE WATCHERS AFTER START WORKERS
			if (msg.type === 'update_watchers') {
				let fileIndex = JSON.parse(msg.fileIndex);

				let keys = Object.keys(watchers);
				for (let fid of keys) {
					if (!fileIndex[fid] || !paramsEqual(watchers[fid].fileparam.params, fileIndex[fid].params) ) {
						//REMOVE WATCHER
						watchers[fid].close();
						delete watchers[fid];

						console.log(`index rem "${fid}"`);
					}
				}

				keys = Object.keys(fileIndex);
				for (let fid of keys) {
					if (!watchers[fid]) {
						console.log(`index add "${fid}"`);

						//ADD WATCHER
						let fileparam = fileIndex[fid];
						if (fileparam.module) {
							let onFileChange = eventType => {
								if (eventType === 'change') {
									//console.info('modified ' + fid);

									//RESTART OR WISH TO RESTART
									ordersToStart = 0;
									for (let h of handlersModify) h(fid, fileparam, restartServer);
									restartServer();

									//FORCEWATCH
									if (settings.forcewatch && watchers[fid].noWatch) {
										watchers[fid].close();
										watchers[fid] = fs.watch(fid, {}, onFileChange);
										watchers[fid].fileparam = fileparam;
									}
								} else if (settings.forcewatch) watchers[fid].noWatch = true;
							};
							watchers[fid] = fs.watch(fid, {}, onFileChange);
							watchers[fid].fileparam = fileparam;

						} else {
							let onFileChange = eventType => {
								if (eventType === 'change') {
									//console.info('modified ' + fid);
									//UPDATE ALL WORKERS
									if (fileparam.params.type === 'cached') {
										let keys = Object.keys(cluster.workers);
										for (let key of keys) cluster.workers[key].send({
											type : 'updateCache',
											url  : fid,
											path : fileparam.params.src || fid
										});
									}
									for (let h of handlersModify) h(fid, fileparam);

									//FORCEWATCH
									if (settings.forcewatch && watchers[fid].noWatch) {
										watchers[fid].close();
										watchers[fid] = fs.watch(fileparam.params.src || fid, {}, onFileChange);
										watchers[fid].fileparam = fileparam;
									}
								} else if (settings.forcewatch) watchers[fid].noWatch = true;
							};
							watchers[fid] = fs.watch(fileparam.params.src || fid, {}, onFileChange);
							watchers[fid].fileparam = fileparam;
						}
					}
				}
			} else if (msg.type === 'worker_launched') {
				lauched++;
				if (lauched === threads) {
					lauched = 0;
					if (onRestartEnd.length > 0) {
						console.log('WRR LAUNCHED');

						for (let h of onRestartEnd) h();
						onRestartEnd.length = 0;
					}

					for (let h of handlersLaunch) h();
				}

			} else {
				if (!error && msg.error) error = {value:msg.error, title:msg.title};

				if (msg.indexName) indexName = msg.indexName;

				let exitcode = null;
				if      (msg.type === 'pause'  ) exitcode = '1';
				else if (msg.type === 'stop'   ) exitcode = '2';
				else if (msg.type === 'restart') exitcode = '3';
				else if (msg.type === 'none') {
					if (error) {
						outputError(error);
						for (let h of handlersError) h(error);
						error = null;
					}
				}

				if (exitcode) {
					let keys = Object.keys(cluster.workers);
					for (let key of keys) try {
						cluster.workers[key].send({type:'end', exitcode});
					} catch(e){}
				}
			}
		};

		cluster.on('exit', (w, code)=>{
			exits++;
			if (exits >= threads) { //ALL WORKERS CLOSED
				exits = 0;
				lauched = 0;

				if (error) {
					outputError(error);
					for (let h of handlersShutdown) h(error);
					for (let h of handlersError)    h(error);
					error = null;
				}

				if (code === 3) { //RESTART
					startServer('workers restarted');
				} else if (code === 2) { //MEDULLA EXIT
					console.log('medulla stopped');
					process.exit();
				} else if (code ===  1) {
					console.log('workers paused');
				}
			}
		});

		startServer('medulla started');

	} else {
		//LIBS
		const getSubmodules = require('./mod-requires.es6');
		const mod_path = require('path');
		const mod_http = require('http');
		const mod_url  = require('url');
		const mod_zlib = require('zlib');

		//PLUGINS
		let workerPlugins = JSON.parse(process.env.workerPlugins);
		for (let plugin of workerPlugins) require(plugin);

		//medulla.require
		let modulesParams = {};
		medulla.require = (mdl, clientSide = null)=>{
			mdl = require.resolve(settings.serverDir + mdl);
			modulesParams[mdl] = clientSide;
			return require(mdl);
		};

		//ERROR HANDLER
		const errorHandle = (err, title, type)=>process.send({type, error:err.stack, title});
		process.on('uncaughtException', err=>{
			if (err.stack.indexOf('bind EADDRINUSE null') >= 0) {//Port error
				errorHandle(err, 'PORT ERROR'  , 'restart');
			} else if (err.stack.split('at ')[1].indexOf('medulla.') >= 0) {
				errorHandle(err, 'SERVER ERROR', 'stop'); //Critical, stop server
			} else {
				errorHandle(err, 'MODULE ERROR', 'none'); //Nothing
			}
		});

		let handlerRequest = null,
			watchedFiles   = {},
			cache          = {},
			files          = {};

		//MESSAGE HANDLER
		process.on('message', function(msg) {
			if      (msg.type === 'updateCache') cache[(msg.url || msg.path)] = {
				content: fs.readFileSync(msg.path, 'utf8'),
				srcPath: msg.path
			};
			else if (msg.type === 'end'        ) process.exit(parseInt(msg.exitcode)); //WORKER ENDED BY MASTER
		});

		const addToWatchedFiles = (fid, params) => {
			if (settings.watchFiles || params.type !== 'file') watchedFiles[fid] = {
				module : false,
				params : params,
				mimeType : settings.mimeTypes[mod_path.extname(fid).slice(1)]
			};

			if      (params.type === 'file'  ) files[fid] = params.src || fid;
			else if (params.type === 'cached') cache[fid] = {
				content: fs.readFileSync(params.src || fid, 'utf8'),
				srcPath: params.src || fid
			};
		};

		medulla.indexName = process.env.indexName;
		medulla.restart = (indexName = global.medulla.indexName)=>{
			global.medulla.indexName = indexName;
			process.send({type:'restart', indexName: global.medulla.indexName});
		};

		//REQUIRE MAIN MODULE
		let mm = {};

		try {
			if (typeof settings.serverApp === 'string') {
				mm = require(settings.serverDir + settings.serverApp)
			} else if (typeof settings.serverApp === 'function') {
				settings.serverApp(mm);
			}
		} catch(err) {
			errorHandle(err, 'MODULE ERROR', 'pause');
			process.exit(1);
		}

		/*if (mm.settings) {
			let keys = Object.keys(mm.settings);
			for (let key of keys) settings[key] = mm.settings[key];

			if (settings.mimeTypes) settings.mimeTypes = require(settings.mimeTypes);
		}*/
		if (mm.fileIndex) {
			if (global.medulla.indexName) mm.fileIndex = mm.fileIndex[global.medulla.indexName];

			let fileIndexFiles = Object.keys(mm.fileIndex);
			for (let fid of fileIndexFiles) {
				let params = mm.fileIndex[fid];

				if (fid.indexOf('*') >= 0) { //TEMPLATE PROCESSING
					let pathTo = (params.src || fid).split('*');
					let dir = pathTo[0];
					let ext = pathTo[1];
					let recursive = dir.endsWith('~');
					if (recursive) dir = dir.slice(0, -1);
					if (!dir) dir = './'; //currentDir

					const processDir = (dir, sdir='')=>{
						let files = fs.readdirSync(dir);

						//FOR EACH FILE
						files.forEach(filename => {
							let path = dir+filename;
							let stat = fs.statSync(path);
							if (stat && stat.isDirectory()) {
								if (recursive) processDir(path+'/', sdir+filename+'/');
							}

							else if (stat && stat.isFile() && mod_path.extname(filename) === ext) {
								let name = mod_path.basename(filename, ext);

								let fileParams = Object.assign({}, params);
								fileParams.src = dir+filename;
								let fileId = fid.replace('*', name);
								if (recursive) fileId = fileId.replace('~', sdir);

								addToWatchedFiles(fileId, fileParams);
							}
						});
					};

					processDir(dir);

				} else {
					addToWatchedFiles(fid, params);
				}
			}
		}
		if (mm.onRequest) handlerRequest = mm.onRequest;

		const installModule = filepath=>{
			let code = null;
			try {
				code = fs.readFileSync(filepath, 'utf8');
			} catch (e) {
				return;
			}

			let m = require(filepath);

			if (modulesParams[filepath]) m.clientSide = modulesParams[filepath];
			watchedFiles[filepath] = {
				module : true,
				url    : (m.clientSide ? m.clientSide.url : null),
				params : (m.clientSide ? m.clientSide : {})
			};

			if (m.clientSide) {
				if      (m.clientSide.type === 'file'    ) files[m.clientSide.url] = filepath;
				else if (m.clientSide.type === 'cached'  ) cache[m.clientSide.url] = {
					content: code,
					srcPath: filepath
				};
			}

			//INSTALL DYNAMIC MODULES (INCLUDED IN FUNCTION)
			let submods = getSubmodules(code);
			for (let submod of submods) {
				if (!require.cache[submod]) installModule(submod);
			}
		};

		//GET ALL REQUIRED MODULES
		let staticModules = Object.keys(require.cache);
		for (let filepath of staticModules) installModule(filepath);

		//SEND FILEINDEX TO MASTER (ONLY ONE WORKER)
		if (settings.watch && process.env.mainWorker === '1') process.send({
			type:'update_watchers',
			fileIndex: JSON.stringify(watchedFiles)
		});

		const rewriteCookieDomain = (header, config)=>{
			if (Array.isArray(header)) {
				return header.map(function (headerElement) {
					return rewriteCookieDomain(headerElement, config);
				});
			}
			let cookieDomainRegex = /(;\s*domain=)([^;]+)/i;

			if (typeof header === 'string') return header.replace(cookieDomainRegex, function(match, prefix, previousDomain) {
				let newDomain;
				if (previousDomain in config) {
					newDomain = config[previousDomain];
				} else if ('*' in config) {
					newDomain = config['*'];
				} else {
					return match;
				}
				if (newDomain) {
					return prefix + newDomain;
				} else {
					return '';
				}
			});
		};

		const writeHeaders = (res, proxyRes, modifyLength = null)=>{
			let rewriteCookieDomainConfig = settings.proxyCookieDomain,
				setHeader = (key, header)=>{
					if (header === undefined) return;
					if (rewriteCookieDomainConfig && key.toLowerCase() === 'set-cookie') {
						header = rewriteCookieDomain(header, rewriteCookieDomainConfig);
					}
					res.setHeader(String(key).trim(), header);
				};

			if (typeof rewriteCookieDomainConfig === 'string') {
				rewriteCookieDomainConfig = { '*': rewriteCookieDomainConfig };
			}

			Object.keys(proxyRes.headers).forEach(key=>{
				let header = proxyRes.headers[key];
				if (modifyLength && key.toLowerCase() === 'content-length') {header = modifyLength;}
				setHeader(key, header);
			});
		};

		const nomt = ext=>console.info(`Mime type for extension "${ext}" not found, extend mime types.`);

		//SERVER
		mod_http.createServer((request, response)=>{
			let wait = false;

			let path = request.url.slice(1);
			let ext  = mod_path.extname(path).slice(1);
			let mt   = ext?settings.mimeTypes[ext]:null;

			/*if (path === 'medulla-plugins.js') {
				response.writeHeader(200, {"Content-Type": (mt?mt:"application/javascript")+"; charset=utf-8"});
				response.write(process.env.pluginsJS);
			} else*/

			if (files[path]) {
				if (!mt) nomt(ext);
				response.writeHeader(200, {"Content-Type": (mt?mt:"text/html")+"; charset=utf-8"});
				response.write(fs.readFileSync(files[path]));
			} else if (cache[path]) {
				let ext = mod_path.extname(cache[path].srcPath).slice(1);
				let mt  = (ext && settings.mimeTypes[ext])?settings.mimeTypes[ext]:mt;

				if (!mt) nomt(ext);
				response.writeHeader(200, {"Content-Type": (mt?mt:"text/html")+"; charset=utf-8"});
				response.write(cache[path].content);
			} else {
				try {
					let result = handlerRequest(request, response);
					if (result === 404) {
						console.log('404');
						response.writeHeader(404);
						response.write('404 Not Found');
					}
					else if (result === 1) response.write(`<script>${process.env.pluginsJS}</script>`);
					else if (typeof result === 'object') {
						wait = true;

						request.headers['host'] = result.target;

						let ph = mod_url.parse(request.url);
						let options = {
							headers : request.headers,
							host    : result.target,
							hostname: ph.hostname,
							path    : ph.path,
							port    : ph.port,
							method  : request.method
						};
						let targetRequest = mod_http.request(options, targetResponse=>{

							let modify = (
									result.includePlugins &&
									targetResponse.headers['content-type'] &&
									targetResponse.headers['content-type'].substr(0,9) === 'text/html'
								),
								b = Buffer.from(`<script>${process.env.pluginsJS}</script>`, 'utf8'),
								body = [];

							targetResponse.on('data', chunk=>{
								body.push(chunk);
							});
							targetResponse.on('end' , ()=>{
								body = Buffer.concat(body);
								if (modify) {
									if (targetResponse.headers['content-encoding'] === 'gzip')
										body = mod_zlib.gzipSync(Buffer.concat([mod_zlib.unzipSync(body), b]));
									else
										body = Buffer.concat([body, b]);
								}

								response.statusCode = targetResponse.statusCode;
								writeHeaders(response, targetResponse, modify?body.length:null);
								response.write(body, 'binary');
								response.end();
							});
						});

						request.on('data', chunk=>targetRequest.write(chunk, 'binary'));
						request.on('end', ()=>targetRequest.end());
					}
				} catch(e) {
					response.writeHeader(500, {"Content-Type": "text/html; charset=utf-8"});
					let stack = e.stack.replace(/at/g,'<br>@ at');
					response.write(`
						<head>
							<meta charset="UTF-8">
							<script>${process.env.pluginsJS}</script>
						</head>
						<body>SERVER ERROR<br><br>${stack}</body>
					`);
				}
			}
			if (!wait) response.end();
		}).listen(settings.port);

		process.send({type:'worker_launched'});
	}
};