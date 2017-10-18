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
	worker.cacheModificator = (content, src, url, moduleAlias, isLib) => {
		let loader = getLoaderByUrl(url);

		if (loader && loader.serversideModify) return loader.serversideModify(worker, url, content, moduleAlias, !isLib);

		return content;
	};

	worker.toClient('\n'+'window.process = {env:{}};');
	worker.toClient('\n'+'process.env.NODE_ENV = "production";'); //<<
	worker.toClient('\n'+'window.require_modules = window.require_modules || {};');
	worker.toClient('\n'+'window.MODULES_DIR = "'+'node_modules'+'";');
	worker.toClient(()=>{
		window.require_resolve = function(path) {

			//PATH IS RESOLVED
			if (path.substr(0, 6) === 'host:/') return path;

			//IS LIB by ALIAS
			if (path.indexOf('/') < 0) return path;

			//IS JS FILE
			const li = path.lastIndexOf('/');
			if (path.indexOf('.', li<0?0:li) < 0) path += '.js';

			var dir = window.require_filedir || '';
			if (dir) dir += '/';
			dir = 'host:/'+dir;

			if (path.substr(0, 3) === '../') {
				dir = dir.substr(0, dir.length-1).split('/');
				dir.pop();
				dir = dir.join('/');
				path = dir + '/' + path.substr(3);

			} else if (path.substr(0, 2) === './') {
				path = dir + path.substr(2);
				//console.log(path);

			} else if (path.substr(0, 1) === '/') {
				console.log('IRROROR!');
				path = '{ERROR: INCORRECT PATH}';

			} else {
				path = 'host:/' + window.MODULES_DIR + '/' + path;
			}

			return path;
		}
	});

	const clientModulesList = {};

	const pathResolve = (mod, parentFile, isLib = false)=>{
		let isModule = false;
		const originMod = mod;

		if (mod.startsWith('./') || mod.startsWith('../')) { //ITS RELATIVE PATH
			let parentDir = worker.settings.serverDir;
			if (parentFile) parentDir = mod_path.dirname(parentFile);
			mod = mod_path.resolve(parentDir, mod);

			if (mod_path.extname(mod) === '') {
				if (!mod_fs.existsSync(mod)) mod += '.js';
			}

		} else if (mod.startsWith('/')) { //ITS LINUX ABSOLUTE PATH
			console.error('Absolute path not');

		} else { //ITS LIB OR PATH TO LIB FILE
			if (mod.indexOf('/') < 0) {
				isModule = true;
				isLib    = true;
			}

			try {
				mod = worker.settings.requireResolve(mod);
			} catch (err) {
				console.error('Module "'+mod+'" not found, incorrect path to file.');
				mod = '';
			}
		}

		mod = mod.replace(/\\/g, '/'); //IF WINDOWS

		//if (process.env.mainWorker === '1') console.info(mod.substr(process.cwd().length+1));

		return {
			serverPath: mod,
			browserPath: mod.substr(process.cwd().length+1),
			isLib,
			moduleAlias: isModule ? originMod : null
		}
	};

	const addToFileSystem = (mod, parent = null, parentIsLib = false)=>{

		let {browserPath, serverPath, isLib, moduleAlias} = pathResolve(mod, parent, parentIsLib);

		if (serverPath) {
			let content = '';

			if (!clientModulesList[serverPath]) {

				try {
					content = mod_fs.readFileSync(serverPath, 'utf8');
				} catch (e) {
					content = null;

				}

				if (content !== null) {
					let loader = getLoaderByUrl(browserPath);

					if (loader.addToFileSystem) {
						loader.addToFileSystem(worker, content, serverPath, isLib, addToFileSystem);
					}

					let params = loader.params();
					params.bundle      = true;
					params.url         = browserPath;
					params.isLib       = isLib;
					params.moduleAlias = moduleAlias;

					worker.pluginsFileSystem[serverPath] = params;

					clientModulesList[serverPath] = true;
				} //else console.error('Module "'+serverPath+'" not found, incorrect path to file.');
			}
		}
	};

	let actualModulesList = null;

	//<<< FIX FUNCTION
	const checkFileSystem = (mod, parentFile = null)=>{
		let {serverPath} = pathResolve(mod, parentFile);
		actualModulesList[serverPath] = true;

		let added = false;

		let loader = getLoaderByUrl(serverPath);
		if (loader.checkFileSystem) {
			added = loader.checkFileSystem(worker, serverPath, added, checkFileSystem);
		}

		//TRUE IF FILE ADDED OR PHISICALLY REMOVED
		return !mod_fs.existsSync(serverPath) || !clientModulesList[serverPath] || added;
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