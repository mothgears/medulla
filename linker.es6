//GLOBAL: SPLIT LOADER BY EXP
module.exports.medullaGlobal = medulla=>{
	medulla.settings.loadersByExt = {};
	let lkeys = Object.keys(medulla.settings.loaders);
	for (let l of lkeys) {
		let exts = l.split(' ');
		let path = medulla.settings.loaders[l];
		for (let ext of exts) medulla.settings.loadersByExt[ext] = path;
	}
};

//WORKER
module.exports.medullaWorker = worker=> {
	//LIBS
	const
		mod_path = require('path'),
		mod_fs   = require('fs');

	//
	const getLoaderByUrl = url => {
		let loaderPath = worker.settings.loadersByExt[mod_path.extname(url)];
		if (loaderPath) return require(loaderPath);

		return null;
	};

	//[!] MODIFICATOR
	worker.cacheModificator = (content, src, url) => {
		let loader = getLoaderByUrl(url);

		if (url.startsWith('./')) url = url.substr(2);

		if (loader && loader.serversideModify) return loader.serversideModify(worker, url, content);

		return content;
	};

	worker.toClient('window.process = {env:{}};');
	worker.toClient('process.env.NODE_ENV = "production";'); //<<
	worker.toClient('window.require_modules = window.require_modules || {};');
	worker.toClient(()=>{
		window.require_resolve = function(path) {
			if (path.substr(0, 3) === '../') {
				console.log(path);
				path = window.require_filepath + path.substr(2);
			}
			return path;
		}
	});

	const clientModulesList = {};

	const pathResolve = (mod, parentFile, nodeModule)=>{
		//if (parentFile === '/srv/www/oms.loc/www/lib/lab/react-demo/node_modules/redux/lib/index.js')
		//	console.log('CHILDREN, pathResolve NODE MODULES:' + nodeModule);

		let moduleStyle = false;

		if (mod_path.extname(mod) === '') {
			try {
				mod = worker.settings.requireResolve(mod);
				moduleStyle = true;
				nodeModule = true;
			} catch (e) {}

			//if (mod_fs.existsSync(mod + '/index.js'))*/ mod += '/index.js';
		}

		if (!moduleStyle) {
			let parentDir = process.cwd();
			if (parentFile) parentDir = mod_path.dirname(parentFile);
			mod = mod_path.resolve(parentDir, mod);
			if (mod_path.extname(mod) === '') {
				//console.log(mod);
				mod += '.js';
			}
		}

		//console.log(mod);

		//if (parentFile === '/srv/www/oms.loc/www/lib/lab/react-demo/node_modules/redux/lib/index.js')
		//	console.log('CHILDREN, his pathResolve NODE MODULES resulted:' + nodeModule);

		return {
			serverPath: mod,
			browserPath: nodeModule ? null : mod.substr(process.cwd().length+1)
		}

		/*let fp = mod;

		//if (parent && (mod.startsWith('./') || mod.startsWith('/'))) fp = mod_path.resolve(parent, mod);
		//else fp = mod_path.resolve(mod);

		if (parent) {
			fp = mod_path.resolve(parent, mod);

			if (mod.startsWith('./') || mod_path.extname(mod) !== '') {
				fp = mod_path.resolve(parent, mod);
			} else {
				try {
					fp = worker.settings.requireResolve(mod);
				} catch (e) {}
			}
		} else {
			try {
				fp = worker.settings.requireResolve(mod);
			} catch (e) {}
		}

		fp = fp.substr(worker.settings.serverDir.length+1);

		//if (mod_path.extname(fp) === '') fp += '.js';

		return fp;*/
	};

	const addToFileSystem = (mod, parent = null, nodeModule = false)=>{

		//if (parent === '/srv/www/oms.loc/www/lib/lab/react-demo/node_modules/redux/lib/index.js')
		//	console.log('CHILDREN, nodeModule from parent:' + nodeModule);

		let {browserPath, serverPath} = pathResolve(mod, parent, nodeModule);

		//if (parent === '/srv/www/oms.loc/www/lib/lab/react-demo/node_modules/redux/lib/index.js')
		//	console.log('CHILDREN, from HIS resolves:' + Boolean(browserPath));

		//if (mod.startsWith('./')) mod = mod.substr(2);

		let content = '';

		/*if (process.env.mainWorker === '1')
			if (fp.indexOf('invariant') >= 0)
				console.info('included: '+mod);*/

		if (!clientModulesList[serverPath]) {
			//let isFP = false;

			try {
				content = mod_fs.readFileSync(serverPath, 'utf8');
			} catch (e) {
				content = null;

				/*try {
					content = mod_fs.readFileSync(fp, 'utf8');
					isFP = true;
				} catch (err) {
					content = null;
				}*/
			}

			if (content !== null) {
				if (mod_path.extname(serverPath) === '.js') {
					let depends = worker.getRequires(content, r=>r);
					//if (serverPath === '/srv/www/oms.loc/www/lib/lab/react-demo/node_modules/redux/lib/index.js')
					//	console.log('THIS FILE, to childs:' + Boolean(browserPath));
					for (let m of depends) addToFileSystem(m, serverPath, !Boolean(browserPath));
				}

				//>> LOADER IN BROWSER OR TOTAL? <<
				if (browserPath) {
					let loader = getLoaderByUrl(browserPath);
					worker.pluginsFileSystem[serverPath] = loader.params || {bundle:true, url:browserPath};
				} else {
					const CODE =
						'\n'+'require_modules["'+serverPath+'"] = function (module) {' +
						'\n'+'window.require_filepath = "'+serverPath+'";'+
						'\n'+ content +'\n/**//*};';
					worker.toClient(CODE);
				}

				/*if (isFP) {
					const CODE =
						'\n'+'require_modules["'+fp+'"] = function (module) {' +
						'\n'+'window.require_filepath = "'+fp+'";'+
						'\n'+ content +'\n/**//*};'+
						'\n'+'require_modules["'+mod+'"] = require_modules["'+fp+'"];';
					worker.toClient(CODE);
				} else {
					let loader = getLoaderByUrl(mod);

					//let pfmod = mod;
					//if (pfmod.startsWith('./'))         pfmod = pfmod.substr(2);
					//if (mod_path.extname(pfmod) === '') pfmod += '.js';

					worker.pluginsFileSystem[mod] = loader.params || {bundle:true};
				}*/

				clientModulesList[serverPath] = true;//{isFP, mods: [mod]};


			} else console.error('Module "'+serverPath+'" not found, incorrect path to file.');
		} /*else {
			if (
				clientModulesList[fp].isFP &&
				clientModulesList[fp].mods.indexOf(mod) < 0
			) {
				clientModulesList[fp].mods.push(mod);
				const CODE = '\nrequire_modules["'+mod+'"] = require_modules["'+fp+'"];';
				worker.toClient(CODE);
			}
		}*/
	};

	let actualModulesList = null;

	const checkFileSystem = (mod, parentFile = null)=>{
		/*let {browserPath, serverPath} = pathResolve(mod, parentFile);
		actualModulesList[serverPath] = true;

		let added = false;

		if (mod_path.extname(serverPath) === '.js') {
			let actualDepends = null;
			try {
				actualDepends = worker.getRequires(mod_fs.readFileSync(serverPath, 'utf8'), r=>r);
			} catch (e) {
				serverPath = null;
				actualDepends = [];
			}

			for (let m of actualDepends) added = added || checkFileSystem(m, serverPath)
		}

		//TRUE IF FILE ADDED OR PHISICALLY REMOVED
		return !mod_fs.existsSync(serverPath) || !clientModulesList[serverPath] || added;*/
		return false;
	};

	addToFileSystem(worker.settings.clientEntryPoint);

	//[!] MODIFY CACHE
	worker.onCacheModify = ()=>{
		actualModulesList = {};
		if (!worker.settings.devMode) {
			worker.restartServer();
		} else if (checkFileSystem(worker.settings.clientEntryPoint)) {
			worker.restartServer();
		} else {
			let keys = Object.keys(clientModulesList);
			for (let registred of keys) if (!actualModulesList[registred]) {
				worker.restartServer();
				return;
			}
		}
	}
};

//MASTER
module.exports.medullaMaster = master=>{
	const fs = require('fs');
	const path = require('path');

	//[!] CLIENT ADD "REQUIRE", JOIN E.P. TO ONLOAD
	master.toClient('./linker.client.js');

	//[!] CLIENT ADD LOADERS
	let lkeys = Object.keys(master.settings.loaders);
	for (let l of lkeys) {
		let path = master.settings.loaders[l];
		let lbody = require(path).clientsideRequire;
		if (lbody) {
			path = path.replace(/\\/g, '/');
			master.toClient('window.require.loaders["'+path+'"] = ');
			master.toClient(lbody);
		}
	}
};