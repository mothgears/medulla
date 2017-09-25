const flags = module.exports.flags = require('./flags.es6');

//GLOBAL SERVER INTERFACE
global.medulla = {};

//MEDULLA NODE SERVER
module.exports.launch = customSettings=>{
	//LIBS
	const
		cluster   = require('cluster'),
		fs        = require('fs'),
		os        = require('os'),
		mod_path  = require('path'),
		mimeTypes = require('./mimeTypes.json'),
		settings  = require('./default.settings.es6'),
		{_00, _000, dateFormat} = require('./tools.es6');

	const
		threads = os.cpus().length;

	let protectedSettings = [
		'dashboardPassword',
		'serverDir',
		'serverEntryPoint',
		'loaders'
	];

	const mergeSettings = mergedSettings=>{
		let keys = Object.keys(mergedSettings);
		for (let key of keys) {
			let s = settings[key];
			if (s !== null && typeof s === 'object') {
				let ms = mergedSettings[key];
				if (Array.isArray(s)) {
					for (let el of ms) {
						if (settings[key].indexOf(el) < 0) settings[key].push(el);
					}
				} else {
					let ks = Object.keys(ms);
					for (let k of ks) settings[key][k] = ms[k];
				}
			} else settings[key] = mergedSettings[key];
		}
	};

	//ADD CUSTOM SETTINGS
	mergeSettings(customSettings);

	if (settings.clientEntryPoint) {settings.plugins['./linker.es6'] = {}}
	if (settings.hotcode && settings.hotcode.enabled && settings.devMode) {settings.plugins['./hotcode.es6'] = {}}

	let platformSettings = settings.platforms[process.platform];
	if (platformSettings) mergeSettings(platformSettings);
	delete settings.platforms;

	let separatedHosts = {};
	for (let h of Object.keys(settings.hosts)) {
		if (h.indexOf(', ') >= 0) {
			let shs = h.split(', ');
			for (let sh of shs) separatedHosts[sh] = settings.hosts[h];
		} else separatedHosts[h] = settings.hosts[h];
	}
	settings.hosts = separatedHosts;
	let hostSettings = settings.hosts[os.hostname()];
	if (hostSettings) mergeSettings(hostSettings);
	delete settings.hosts;

	//ASYNC LOGGING
	if (settings.logging && settings.logging.level) {
		const levels = ['','error','warning','trace'];

		let maxLevel = levels.indexOf(settings.logging.level);
		if (maxLevel <= 0) maxLevel = settings.logging.level;

		const
			f = ['', console.error, console.warn, console.log],
			consoleStream = [],
			writeLog = ()=>{
				if (consoleStream.length > 0) {
					let rec = consoleStream.shift(),
						now = new Date(),
						ms = now.getUTCMilliseconds(),
						s = now.getUTCSeconds(),
						m = now.getUTCMinutes(),
						h = now.getUTCHours(),
						D = now.getUTCDate(),
						M = now.getUTCMonth()+1,
						Y = now.getUTCFullYear();
					rec.value = `UTC ${_00(h)}:${_00(m)}:${_00(s)}.${_000(ms)} ${rec.value}`;
					now = `${Y}-${_00(M)}-${_00(D)}`;

					let levelLabel = levels[rec.level],
						sls = settings.logging.separatedTypes;

					fs.appendFile(
						mod_path.resolve(settings.logging.dir, `${sls?(`${levelLabel}s-`):''}${now}.log`),
						rec.value, err=>{if (!err) writeLog();}
					);
				}
			},

			console_write = (level, ...args)=>{
				const label = `[${levels[level].toUpperCase()}]`;

				if (maxLevel >= level) {
					let str = label+' '+args.join('');
					consoleStream.push({value: str+'\n', level});
					writeLog();
				}

				f[level](label, ...args);
			};

		console.log   = (...args)=>console_write(3, ...args);
		console.warn  = (...args)=>console_write(2, ...args);
		console.error = (...args)=>console_write(1, ...args);
	}

	if (settings.devMode) {
		let keys = Object.keys(settings.devPlugins);
		for (let key of keys) settings.plugins[key] = settings.devPlugins[key];
	}
	delete settings.devPlugins;

	//PLUGINS
	let pluginIndex = {};
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
	plugins.sort();
	for (let plugin of plugins) {
		plugin = require.resolve(plugin);
		if (plugin !== prevPlugin) {
			pluginsByPriority[pluginIndex[plugin]] = plugin;
		}
	}
	pluginIndex = Object.keys(pluginsByPriority);
	pluginIndex.sort();

	//PLUGINS GLOBAL
	for (let pid of pluginIndex) {
		let plugin = pluginsByPriority[pid];
		let p = require(plugin);
		let io = {settings};
		if (p.medullaGlobal) p.medullaGlobal(io);
	}

	//MASTER
	//------------------------------------------------------------------------------------------------------------------
	if (cluster.isMaster) {
		const stopServer = ()=>{
			let keys = Object.keys(cluster.workers);
			for (let key of keys) cluster.workers[key].send({type: 'end', exitcode: 2});
		};

		const sendMessage = msg=>{
			let keys = Object.keys(cluster.workers);
			for (let key of keys) try {
				cluster.workers[key].send(msg);
			} catch (e) {}
		};

		const updateCacheTotal = ()=>{
			sendMessage({type: 'updateCache'});
		};

		//COMMANDS
		process.openStdin().addListener("data", cmd=>{
			cmd = cmd.toString().trim();
			const acts = {
				'cache-update' : updateCacheTotal,
				'stop'         : stopServer,
				'version'      : ()=>console.info(require('./package.json').version)
			};
			(
				acts[cmd] || (()=>{console.log('command not defined')})
			)();
		});

		//
		let
			handlersModify   = [],
			handlersLaunch   = [],
			handlersShutdown = [],
			handlersError    = [],

			pluginsJS        = '',
			messageHandlers  = {},
			workerPlugins    = [],
			ordersToStart    = 0,
			watchers         = {},
			watchTimeouts    = {},
			onRestartEnd     = [],
			error            = null,
			lauched          = 0,
			exits            = 0,
			templates        = [],
			workersQueue     = [],
			commonStorage    = "{}",
			addedFiles       = {},
			medullaStats     = {
				medullaLauched   : dateFormat(),
				medullaLauchedTS : Date.now() / 1000,
				requests         : 0,
				workersLauched   : '-'
			};

		const toClient = func=>{
			if (typeof func === 'function') {
				let body = func.toString();
				body = body.slice(body.indexOf("{")+1, body.lastIndexOf("}"));
				pluginsJS += '\n(()=>{\n'+body+'\n})();\n';
			} else if (func.startsWith('./') && func.endsWith('.js')) {
				pluginsJS += fs.readFileSync(require.resolve(func), 'utf8');
			} else pluginsJS += func;
		};

		const onMessage = (type, handler)=> {
			messageHandlers[type] = handler;
		};

		//PLUGINS
		for (let pid of pluginIndex) {
			let plugin = pluginsByPriority[pid];
			let p = require(plugin);
			if (p.medullaMaster) {
				let io = {
					cluster,
					medullaStats,
					onMessage,
					sendMessage,
					settings,
					stopServer,
					toClient
				};
				p.medullaMaster(io);
				if (io.onModify)   handlersModify.push(io.onModify);
				if (io.onLaunch)   handlersLaunch.push(io.onLaunch);
				if (io.onShutdown) handlersShutdown.push(io.onShutdown);
				if (io.onError)    handlersError.push(io.onError);
			}
			if (p.medullaWorker) workerPlugins.push(plugin);
			if (p.medullaClient) toClient(p.medullaClient)
		}

		let publicSettings = {};
		let settingsKeys = Object.keys(settings);
		for (let sk of settingsKeys) {
			if (protectedSettings.indexOf(sk) < 0) publicSettings[sk] = settings[sk];
		}
		pluginsJS = 'window.medulla = {settings:'+JSON.stringify(publicSettings)+'};'+pluginsJS;

		process.on('uncaughtException', err=>{
			if (err.code === 'EPERM' && err.syscall === 'Error watching file for changes:') {
				console.warn('Removing folder.');
			} else {
				//stopServer();
				throw err;
			}
		});

		const startServer = msg=>{
			console.log(msg);
			console.info('indexing...');

			commonStorage = "{}";

			for (let i = 0; i < threads; i++) {
				let pars = {
					mainWorker    : (i+1 === threads)?'1':'0',
					pluginsJS,
					workerPlugins : JSON.stringify(workerPlugins)
				};
				cluster.fork(pars).on('message', _handle);
			}
		};

		const restartServer = (after=null)=>{
			if (ordersToStart === handlersModify.length) {
				if (after) onRestartEnd.push(after);

				if (Object.keys(cluster.workers).length > 0) {
					//STOP ALL WORKERS
					let keys = Object.keys(cluster.workers);
					for (let key of keys) try {
						cluster.workers[key].send({
							type     : 'end',
							exitcode : '3'
						});
					} catch (e) {}
				} else startServer('workers restarted');
				ordersToStart = 0;
			}
			ordersToStart++;
		};

		const outputError = err=>{
			console.error(
				'\n-------------'+err.title+'-------------\n',
				err.value,
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

		const fileIsUponTemplate = path =>{
			path = mod_path.resolve(path);
			let ext      = mod_path.extname(path);
			let dir      = mod_path.dirname(path);
			let filename = mod_path.basename(path, ext);

			for (let tpath of templates) {
				if (tpath.indexOf('~') >= 0) {
					let xpath = mod_path.resolve(tpath).split('~');
					xpath[0] = xpath[0].slice(0, -1);
					if (!xpath[0] || dir.startsWith(xpath[0])) {
						xpath[1] = xpath[1]
							.replace('*', filename)
							.replace('?', ext);
						let xext      = mod_path.extname(xpath[1]);
						let xfilename = mod_path.basename(xpath[1], xext);
						if (xext === ext && xfilename === filename) return true;
					}
				} else {
					let xpath = mod_path.resolve(tpath)
						.replace('~', dir+'/')
						.replace('*', filename)
						.replace('?', ext);
					if (xpath === path) return true;
				}
			}

			return false;
		};

		function _handle (msg) {
			//UPDATE WATCHERS AFTER START WORKERS
			if (msg.type === 'update_watchers') {
				addedFiles = {};

				//clearInterval(indexing);
				let fileIndex = JSON.parse(msg.fileIndex);

				templates = JSON.parse(msg.templates);

				let keys = Object.keys(watchers);
				for (let filepath of keys) {
					if (
						!fileIndex[filepath] ||
						!paramsEqual(watchers[filepath].fileparam.params, fileIndex[filepath].params)
					) {
						//REMOVE WATCHER
						if (watchers[filepath]) watchers[filepath].close();
						delete watchers[filepath];
						console.info(`index rem: "${filepath}"`);
					}
				}

				keys = Object.keys(fileIndex);
				for (let filepath of keys) {
					if (!watchers[filepath]) {
						//ADD WATCHER
						let fileparam = fileIndex[filepath];

						//TEST FILE EXIST
						if (!fs.existsSync(filepath)) {
							console.warn(`index err: "${filepath}" not found on server`);
							continue;
						}
						console.info(`index add: "${filepath}"` + (fileparam.url?` as "${fileparam.url}"`:''));

						if (fileparam.module) {
							let onFileChange = (eventType, fn)=>{
								const onmod = ()=>{
									//RESTART OR WISH TO RESTART
									ordersToStart = 0;
									for (let h of handlersModify) h(filepath, fileparam, restartServer);
									restartServer();

									//FORCEWATCH
									if (settings.forcewatch && watchers[filepath].noWatch) {
										if (watchers[filepath]) watchers[filepath].close();
										try {
											watchers[filepath] = fs.watch(filepath, {}, onFileChange);
											watchers[filepath].fileparam = fileparam;
										} catch (e) {
											setTimeout(()=>{
												console.warn('used reserve watch: '+filepath);
												if (watchers[filepath]) watchers[filepath].close();
												watchers[filepath] = fs.watch(filepath, {}, onFileChange);
												watchers[filepath].fileparam = fileparam;
											}, 250);
										}
									}
									delete watchTimeouts[fn];
								};
								if (eventType === 'rename') {
									//console.log('RENAME:'+fn);
									if (!watchTimeouts[fn]) watchTimeouts[fn] = setTimeout(onmod, 25, 'async');
									else if (settings.forcewatch) watchers[filepath].noWatch = true;
								} else if (eventType === 'change') {
									//console.log('CHANGE:'+fn);
									if (watchTimeouts[fn]) clearTimeout(watchTimeouts[fn]);
									onmod('sync');
								}
							};
							watchers[filepath] = fs.watch(filepath, {}, onFileChange);
							watchers[filepath].fileparam = fileparam;

						} else if (fileparam.params.type === 'folder') {
							let onFolderChange = (eventType, f) => {
								let path = mod_path.resolve(filepath, f).replace(/\\/g, '/');
								for (let ign of settings.watchIgnore) if (ign(path)) return;

								if (eventType === 'rename') {
									const testFile = type=>{
										setTimeout(()=>{
											fs.stat(path, (err, stats)=>{
												let re = false;

												if (type === 'added' && !err) {
													if (stats.isDirectory() || fileIsUponTemplate(path)) {
														console.info(type+': '+path);
														re = true;
														addedFiles[path] = true;
													}
												} else if (type === 'removed' && err) {
													console.info(type+': '+path);
													re = true;
													delete addedFiles[path];
													if (watchers[path]) {
														watchers[path].close();
														delete watchers[path];
													}
													console.info(`index rem "${path}"`);
												}

												if (re) {
													ordersToStart = 0;
													for (let h of handlersModify) h(filepath, fileparam, restartServer);
													restartServer();
												}
											});
										}, 250);
									};

									if (!watchers[path] && !addedFiles[path]) testFile('added');
									else testFile('removed');
								}
							};
							watchers[filepath] = fs.watch(filepath, {}, onFolderChange);
							watchers[filepath].fileparam = fileparam;

						} else {
							let onFileChange = (eventType, fn)=>{
								const onmod = ()=>{
									//console.log('DO CHANGE:'+type);

									//UPDATE ALL WORKERS
									if (fileparam.params.type === 'cached') sendMessage({
										includeMedullaCode : fileparam.params.includeMedullaCode,
										path               : filepath,
										type               : 'updateCache',
										url                : fileparam.params.url || filepath
									});

									for (let h of handlersModify) h(filepath, fileparam);

									//FORCEWATCH
									if (settings.forcewatch && watchers[filepath].noWatch) {
										if (watchers[filepath]) watchers[filepath].close();
										try {
											watchers[filepath] = fs.watch(filepath, {}, onFileChange);
											watchers[filepath].fileparam = fileparam;
										} catch (e) {
											setTimeout(()=>{
												console.warn('used reserve watch: '+filepath);
												if (watchers[filepath]) watchers[filepath].close();
												watchers[filepath] = fs.watch(filepath, {}, onFileChange);
												watchers[filepath].fileparam = fileparam;
											}, 250);
										}
									}
									delete watchTimeouts[fn];
								};
								if (eventType === 'rename') {
									//console.log('RENAME:'+fn);
									if (!watchTimeouts[fn]) watchTimeouts[fn] = setTimeout(onmod, 25, 'async');
									else if (settings.forcewatch) watchers[filepath].noWatch = true;
								} else if (eventType === 'change') {
									//console.log('CHANGE:'+fn);
									if (watchTimeouts[fn]) clearTimeout(watchTimeouts[fn]);
									onmod('sync');
								}
							};
							watchers[filepath] = fs.watch(filepath, {}, onFileChange);
							watchers[filepath].fileparam = fileparam;
						}
					}
				}

			} else if (msg.type === 'worker_launched') {
				lauched++;
				if (lauched === threads) {
					lauched = 0;
					if (onRestartEnd.length > 0) {
						for (let h of onRestartEnd) h();
						onRestartEnd.length = 0;
					}

					for (let h of handlersLaunch) h();
					medullaStats.totalWorkers = threads;
					medullaStats.workersLauched = dateFormat();
					console.info('workers launched');
				}

			} else if (msg.type === 'get_in_line') {
				workersQueue.push(msg.wid);
				if (workersQueue.length === 1) {
					cluster.workers[msg.wid].send({
						type    : 'your_turn',
						storage : commonStorage
					});
				}
			} else if (msg.type === 'free_control') {
				commonStorage = msg.storage;

				workersQueue.shift();
				if (workersQueue.length >= 1) {
					let wid = workersQueue.shift();
					cluster.workers[wid].send({
						type    : 'your_turn',
						storage : msg.storage
					});
				}
			} else if (msg.type === 'stats_rpm') {
				medullaStats.requests += msg.value;
			} else if (messageHandlers[msg.type]) {
				messageHandlers[msg.type](msg);
			} else {
				if (!error && msg.error) error = {value: msg.error, title: msg.title};

				let exitcode = null;
				if      (msg.type === 'pause')   exitcode = '1';
				else if (msg.type === 'stop')    exitcode = '2';
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
						cluster.workers[key].send({type: 'end', exitcode});
					} catch (e) {}
				}
			}
		}

		cluster.on('exit', (w, code)=>{
			exits++;
			if (exits >= threads) {
				exits = 0;
				lauched = 0;
				medullaStats.totalWorkers = 0;

				if (error) {
					outputError(error);
					for (let h of handlersShutdown) h(error);
					for (let h of handlersError)    h(error);
					error = null;
				}

				//RESTART
				if (code === 3) {
					startServer('workers restarted');

				//MEDULLA EXIT
				} else if (code === 2) {
					console.log('medulla stopped');
					process.exit();

				} else if (code ===  1) {
					console.log('workers paused');
				}
			}
		});

		startServer('medulla started');

	//------------------------------------------------------------------------------------------------------------------
	} else {
		const
			getRequires = require('./detectRequires.es6'),
			mod_http    = require('http'),
			mod_url     = require('url'),
			IO = require('./io.es6');

		class MedullaIO extends IO {
			get includeMedullaCode ()      {return this.modifyResponse;}
			set includeMedullaCode (value) {this.modifyResponse = value;}
		}

		let
			handlersRequest = [],
			watchedFiles    = {},
			cache           = {},
			templates       = [],
			clientHTML      = '';

		let clientJS = process.env.pluginsJS;

		//TO CLIENT
		const toClient = func=>{
			if (typeof func === 'function') {
				let body = func.toString();
				body = body.slice(body.indexOf("{") + 1, body.lastIndexOf("}"));
				clientJS += '\n(()=>{\n'+body+'\n})();\n';
			} else if (func[0] === '<') {
				clientHTML += func;
			} else {
				clientJS += func;
			}
		};

		//PLUGINS
		let
			workerPlugins = JSON.parse(process.env.workerPlugins),
			pluginsFileSystem = {},
			cacheModificators = [],
			handlersCacheModify = [];

		const stopServer = ()=>{
			process.send({type: 'stop'})
		};

		const restartServer = ()=>{
			process.send({type: 'restart'})
		};

		let waiters = {};
		const askMaster = (msg, resmsg)=>{
			waiters[msg.type] = resmsg;
			process.send(msg);
		};

		//TOOLS
		let getCallerFile = ()=>{
			try {
				let
					err         = new Error(),
					callerfile  = '',
					currentfile = '';

				let origin = Error.prepareStackTrace;
				Error.prepareStackTrace = (e, stack)=>stack;
				currentfile = err.stack.shift().getFileName();

				while (err.stack.length) {
					callerfile = err.stack.shift().getFileName();

					if (currentfile !== callerfile) {
						Error.prepareStackTrace = origin;

						return callerfile;
					}
				}

				Error.prepareStackTrace = origin;
			} catch (e) {}

			return undefined;
		};

		for (let plugin of workerPlugins) {
			let p = require(plugin);
			if (p.medullaWorker) {
				let api = {
					settings,
					toClient,
					getRequires,
					askMaster,
					stopServer,
					restartServer,
					pluginsFileSystem
				};
				p.medullaWorker(api);
				if (api.cacheModificator) cacheModificators.push(api.cacheModificator);
				if (api.onCacheModify)    handlersCacheModify.push(api.onCacheModify);
				if (api.onRequest)        handlersRequest.push(api.onRequest);
			}
		}

		//if (process.env.mainWorker === '1') console.info('pluginsJS cli: '+clientJS);

		//CROSSEND-REQUIRE
		let modulesParams = {};
		global.medulla.require = (mdl, clientSide = null)=>{
			let dir = mod_path.dirname(getCallerFile());
			mdl = require.resolve(mod_path.resolve(dir, mdl));
			modulesParams[mdl] = clientSide;

			return require(mdl);
		};

		//COMMON STORAGE
		let _commonStorageLocal = {},
			_proceduresQueue    = [];

		//COMMON
		global.medulla.common = procedure=>{
			_proceduresQueue.push(procedure);
			process.send({type: 'get_in_line', wid: cluster.worker.id});
		};

		//ERROR HANDLER
		const errorHandle = (err, title, type)=>process.send({type, error: err.stack, title});
		process.on('uncaughtException', err=>{
			//PORT ERROR
			if (err.stack.indexOf('bind EADDRINUSE null') >= 0) {
				errorHandle(err, 'PORT ERROR'  , 'restart');

			//CRITICAL ERROR
			} else if (err.stack.split('at ')[1].indexOf('medulla.') >= 0) {
				errorHandle(err, 'SERVER ERROR', 'stop');

			//APP ERROR
			} else {
				errorHandle(err, 'MODULE ERROR', 'none');
			}
		});

		//MESSAGE HANDLER
		process.on('message', msg=> {
			if (msg.type === 'updateCache') {
				if (msg.path) {
					let cache_trying = 5;
					const cacheFromFile = () => {
						fs.readFile(msg.path, 'utf8', (err, content) => {
							if (err) {
								cache_trying--;
								if (cache_trying > 0) setTimeout(cacheFromFile, 100);
								else {
									delete cache[msg.url];
									for (let h of handlersCacheModify) h();
								}

								return;
							}

							for (let cm of cacheModificators) content = cm(content, msg.path, msg.url);
							if (typeof content === 'string') cache[msg.url] = {
								content,
								srcPath            : msg.path,
								includeMedullaCode : msg.includeMedullaCode
							};
							for (let h of handlersCacheModify) h();
						});
					};
					cacheFromFile();
				} else if (msg.url) {
					delete cache[msg.url];
					for (let h of handlersCacheModify) h();
				} else {
					let urls = Object.keys(cache);
					let counter = 0;
					for (let url of urls) {
						counter++;
						fs.readFile(cache[url].srcPath, 'utf8', (err, content) => {
							if (err) return;
							for (let cm of cacheModificators) {
								content = cm(content, cache[url].srcPath, url);
							}
							if (typeof content === 'string') cache[url].content = content;
							counter--;
							if (counter <= 0) for (let h of handlersCacheModify) h();
						});
					}
				}

			//WORKER ENDED BY MASTER
			} else if (msg.type === 'end') {
				process.exit(parseInt(msg.exitcode, 10));

			} else if (msg.type === 'your_turn') {
				_commonStorageLocal = JSON.parse(msg.storage);

				for (let procedure of _proceduresQueue) procedure(_commonStorageLocal);
				_proceduresQueue.length = 0;

				process.send({type: 'free_control', storage: JSON.stringify(_commonStorageLocal)});

			} else if (waiters[msg.type]) {
				waiters[msg.type](msg);
				delete waiters[msg.type];
			}
		});

		//REQUIRE MAIN MODULE AND CREATE WATCHED FILES INDEX
		//--------------------------------------------------------------------------------------------------------------
		let
			mm              = {},
			mm_publicAccess = {},
			mm_watchedFiles = {};

		try {
			if (typeof settings.serverEntryPoint === 'string') {
				mm = require(mod_path.resolve(settings.serverDir, settings.serverEntryPoint))
			} else if (typeof settings.serverEntryPoint === 'function') {
				settings.serverEntryPoint(mm);
			}
		} catch (e) {
			errorHandle(e, 'MODULE ERROR', 'pause');
			process.exit(1);
		}

		mm.fileSystem = mm.fileSystem || {};

		if (pluginsFileSystem) {
			let keys = Object.keys(pluginsFileSystem);
			for (let fi of keys) {
				mm.fileSystem[fi] = pluginsFileSystem[fi];
			}
		}

		let keys = Object.keys(mm.fileSystem);
		for (let key of keys) {
			let params = mm.fileSystem[key];

			if (typeof params === 'string') mm_publicAccess[key] = params;
			else if (params.type === 'file') {
				mm_publicAccess[key] = params.url || key;
				if (settings.watchForChanges === flags.WATCH_ALL) {
					mm_watchedFiles[key] = params;
				}
			} else mm_watchedFiles[key] = params;
		}

		if (mm.mimeTypes) {
			let ks = Object.keys(mm.mimeTypes);
			for (let k of ks) mimeTypes[k] = mm.mimeTypes[k];
		}

		if (mm.onRequest) handlersRequest.push(mm.onRequest);

		const accessToFile = url=>{
			let ext      = mod_path.extname(url);
			let dir      = mod_path.dirname(url);
			let filename = mod_path.basename(url, ext);

			let tpaths = Object.keys(mm_publicAccess || {});

			for (let tpath of tpaths) {
				let turl = mm_publicAccess[tpath];
				let rurl = turl
					.replace('~', dir+'/')
					.replace('*', filename)
					.replace('?', ext);

				if (mod_path.resolve(rurl) === mod_path.resolve(url)) {
					let rpath = process.cwd() + '/' + tpath
						.replace('~', dir+'/')
						.replace('*', filename)
						.replace('?', ext);
					try {
						return fs.readFileSync(rpath);
					} catch (e) {
						if (e.code === 'ENOENT') {}
					}
				}
			}

			return null;
		};

		const addToWatchedFiles = (filepath, params, code = null) =>{
			filepath = mod_path.resolve(filepath).replace(/\\/g, '/');

			for (let ign of settings.watchIgnore) if (ign(filepath)) return;

			if (process.env.mainWorker === '1') watchedFiles[filepath] = {
				module   : Boolean(code),
				params   : (params ? params : {}),
				url      : (params ? params.url : null),
				mimeType : mimeTypes[mod_path.extname(filepath).slice(1)]
			};

			if (params) {
				if (params.type === 'cached') {
					try {
						let content = code || fs.readFileSync(filepath, 'utf8');
						for (let cm of cacheModificators) content = cm(content, filepath, params.url || filepath);
						if (typeof content === 'string') cache[params.url || filepath] = {
							content,
							srcPath            : filepath,
							includeMedullaCode : params.includeMedullaCode
						};
					} catch (err) {
						console.warn(`"${filepath}" not found`);
					}
				}
			}
		};

		//for (let ign of settings.watchIgnore) console.info(ign.toString());

		if (mm_watchedFiles) {
			let fileIndexFiles = Object.keys(mm_watchedFiles);
			for (let filepath of fileIndexFiles) {
				let params = mm_watchedFiles[filepath];
				params.type = params.type || 'cached';

				//TEMPLATE PROCESSING
				//if (filepath.search(/[*?~]/g) >= 0) {
				templates.push(filepath);

				let pathTo = filepath;

				let ext = null;
				if (pathTo.endsWith('?')) pathTo = pathTo.slice(0, -1);
				else ext = mod_path.extname(pathTo);

				let fln = mod_path.basename(pathTo, ext?ext:undefined);
				let dir = mod_path.dirname(pathTo);
				let recursive = fln.startsWith('~');
				if (recursive) {
					fln = fln.slice(1);
				}
				if (fln.indexOf('*') >= 0) fln = null;

				//DIR TO WATCHED INDEX
				dir = mod_path.resolve(dir);

				const dirToWatch = wdir=>{
					for (let ign of settings.watchIgnore) if (ign(wdir)) return;

					if (!watchedFiles[wdir]) {
						watchedFiles[wdir] = {
							module : false,
							params : {type: 'folder'}
						};
						let files = fs.readdirSync(wdir);
						files.forEach(dirname => {
							let path = mod_path.resolve(wdir, dirname);
							let stat = fs.statSync(path);
							if (stat && stat.isDirectory()) {
								if (recursive) dirToWatch(path);
							}
						});
					}
				};
				if (process.env.mainWorker === '1') dirToWatch(dir);

				const processDir = (pdir, sdir='')=>{
					let files = fs.readdirSync(pdir);

					//FOR EACH FILE
					files.forEach(filename => {
						let path = mod_path.resolve(pdir, filename);
						let stat = fs.statSync(path);

						let _ext = mod_path.extname(filename);
						let _fln = mod_path.basename(filename, _ext?_ext:undefined);

						if (stat && stat.isDirectory()) {
							if (recursive) processDir(path+'/', sdir+filename+'/');
						} else if (
							stat && stat.isFile() &&
							(!ext || ext === _ext) &&
							(!fln || fln === _fln)
						) {
							let _subext = mod_path.extname(filename);
							let _subfln = mod_path.basename(filename, _subext);

							let fileParams = Object.assign({}, params);
							let filePath = mod_path.resolve(pdir, _subfln+_subext);
							fileParams.url = (params.url || filepath).replace('*', _subfln).replace('?', _subext);
							if (recursive) fileParams.url = fileParams.url.replace('~', sdir);

							addToWatchedFiles(filePath, fileParams);
						}
					});
				};

				processDir(dir);
			}
		}

		const installModule = filepath=>{
			let code = null;
			try {
				code = fs.readFileSync(filepath, 'utf8');
			} catch (e) {
				return;
			}

			let clientSide = modulesParams[filepath];
			addToWatchedFiles(filepath, clientSide, code);

			//INSTALL DYNAMIC MODULES (INCLUDED IN FUNCTION) (ONLY IN MASTER)
			let submods = getRequires(code);
			if (process.env.mainWorker === '1') for (let submod of submods) {
				if (!require.cache[submod] && !watchedFiles[submod]) installModule(submod);
			}
		};

		//GET ALL REQUIRED MODULES
		let staticModules = Object.keys(require.cache);
		for (let filepath of staticModules) installModule(filepath);

		//SEND WATCHED FILES INDEX TO MASTER (ONLY FIRST WORKER)
		if (settings.watchForChanges !== flags.WATCH_NO && process.env.mainWorker === '1') process.send({
			type      : 'update_watchers',
			fileIndex : JSON.stringify(watchedFiles),
			templates : JSON.stringify(templates)
		});

		//for (let h of handlersCacheModify) h();

		const nomt = ext=>{
			console.info(`Mime type for extension "${ext}" not found, extend mime types.`);

			return 'text/html';
		};

		let requests = 0;

		setInterval(()=>{
			process.send({type: 'stats_rpm', value: requests});
			requests = 0;
		}, 60000);

		//IO
		const io = new MedullaIO(handlersRequest, {
			onResponseError : e=>errorHandle(e, 'MODULE ERROR', 'none'),
			modifyResponse  : settings.includeMedullaCode,
			modificator     : clientHTML+`<script>${clientJS}</script>`
		});

		//LAUNCH
		mod_http.createServer((request, response)=>{
			requests++;

			let parsedURL = mod_url.parse(request.url, true);

			let path = parsedURL.pathname.slice(1);
			let ext  = mod_path.extname(path).slice(1);
			let mt   = (ext && mimeTypes[ext])?mimeTypes[ext]:null;
			let cnt  = null;

			//STATIC
			if (cache[path]) {
				ext = mod_path.extname(cache[path].srcPath).slice(1);
				mt = (ext && mimeTypes[ext]) ? mimeTypes[ext] : mt;
				if (!mt) mt = nomt(ext);
				response.writeHead(200, {"Content-Type": mt+"; charset=utf-8"});
				response.end(cache[path].content);
				if (cache[path].includeMedullaCode) response.write(clientHTML+`<script>${clientJS}</script>`);

			} else if ((cnt = accessToFile(path))) {
				if (!mt) mt = nomt(ext);
				response.writeHead(200, {"Content-Type": mt+"; charset=utf-8"});
				response.end(cnt);

			//REQUEST HANDLERS
			} else io.handle(request, response);

		}).listen(settings.port);

		process.send({type: 'worker_launched'});
	}
};