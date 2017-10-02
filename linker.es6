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
	const reqLoaderByUrl = url => {
		let loaderPath = worker.settings.loadersByExt[mod_path.extname(url)];
		if (loaderPath) return require(loaderPath);

		return null;
	};

	//[!] MODIFICATOR
	worker.cacheModificator = (content, src, url) => {
		let loader = reqLoaderByUrl(url);

		//if (url.startsWith('./'))         url = url.substr(2);
		//if (mod_path.extname(url) === '') url += '.js';

		if (loader && loader.serversideModify) return loader.serversideModify(worker, url, content);

		return content;
	};

	worker.toClient('window.process = {env:{}};');
	worker.toClient('process.env.NODE_ENV = "production";'); //<<
	worker.toClient('window.require_modules = window.require_modules || {};');

	const clientModulesList = {};

	const pathResolve = (mod, parent)=>{
		let fp = mod;

		//if (parent && (mod.startsWith('./') || mod.startsWith('/'))) fp = mod_path.resolve(parent, mod);
		//else fp = mod_path.resolve(mod);

		if (parent) {
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

		if (mod_path.extname(fp) === '') fp += '.js';

		return fp;
	};

	const addToFileSystem = (mod, parent = null)=>{
		let fp = pathResolve(mod, parent);

		let content = '';

		/*if (process.env.mainWorker === '1')
			if (fp.indexOf('invariant') >= 0)
				console.info('included: '+mod);*/

		if (!clientModulesList[fp]) {
			let isFP = false;

			try {
				//console.info('RFS_1');
				content = mod_fs.readFileSync(mod, 'utf8');
			} catch (e) {
				try {
					//console.info('RFS_2');
					content = mod_fs.readFileSync(fp, 'utf8');
					isFP = true;
				} catch (err) {
					content = null;
				}
			}

			if (content !== null) {
				let depends = worker.getRequires(content, r=>r, (process.env.mainWorker === '1')?fp:null);
				for (let m of depends) addToFileSystem(m, mod_path.dirname(fp));

				if (isFP) {
					const CODE =
						'\nrequire_modules["'+fp+'"] = function (module) {\n'+ content +'\n/**/};'
						+'\nrequire_modules["'+mod+'"] = require_modules["'+fp+'"];';
					worker.toClient(CODE);
				} else {
					let loader = reqLoaderByUrl(mod);

					let pfmod = mod;
					//if (pfmod.startsWith('./'))         pfmod = pfmod.substr(2);
					//if (mod_path.extname(pfmod) === '') pfmod += '.js';

					worker.pluginsFileSystem[pfmod] = loader.params || {bundle:true};
				}

				clientModulesList[fp] = {isFP, mods: [mod]};
			} else console.error('Module "'+mod+'" not found, incorrect path to file.');
		} else {
			if (
				clientModulesList[fp].isFP &&
				clientModulesList[fp].mods.indexOf(mod) < 0
			) {
				clientModulesList[fp].mods.push(mod);
				const CODE = '\nrequire_modules["'+mod+'"] = require_modules["'+fp+'"];';
				worker.toClient(CODE);
			}
		}
	};

	let actualModulesList = null;
	const checkFileSystem = (mod, parent)=>{
		let fp = pathResolve(mod, parent);
		actualModulesList[fp] = true;

		let actualDepends = null;
		try {
			//console.info('RFS_3');
			actualDepends = worker.getRequires(mod_fs.readFileSync(fp, 'utf8'), r=>r);
		} catch (e) {
			fp = null;
			actualDepends = [];
		}

		let added = false;
		for (let m of actualDepends) added = added || checkFileSystem(m, mod_path.dirname(fp))

		//TRUE IF FILE ADDED OR PHISICALLY REMOVED
		return !fp || !clientModulesList[fp] || added;
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