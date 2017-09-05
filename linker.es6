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
	const
		mod_path = require('path'),
		mod_fs = require('fs');

	const reqLoaderByUrl = url => {
		let loaderPath = worker.settings.loadersByExt[mod_path.extname(url)];
		if (loaderPath) return require(loaderPath);

		return null;
	};

	//[!] MODIFICATOR
	worker.cacheModificator = (content, src, url) => {
		let loader = reqLoaderByUrl(url);
		if (loader && loader.serversideModify) return loader.serversideModify(worker, url, content);

		return content;
	};

	worker.toClient('window.process = {env:{}};');
	worker.toClient('process.env.NODE_ENV = "production";');
	worker.toClient('window.require_modules = window.require_modules || {}');

	//worker.settings.bridge = m=>require.resolve(m);

	//const clientModulesMemory = [];
	const clientModulesList = {};

	const getFullPath = (mod, parent)=>{
		let fp = mod;

		if (parent) {
			if (mod.startsWith('./') || mod.indexOf('.js') >= 0) {
				fp = mod_path.resolve(parent, mod);
			} else {
				try {
					fp = worker.settings.bridge(mod);
				} catch (e) {}
			}
		} else {
			try {
				fp = worker.settings.bridge(mod);
			} catch (e) {}
		}

		if (mod_path.extname(fp) === '') fp += '.js';

		return fp;
	};

	const addToFileSystem = (mod, parent = null)=>{
		let fp = getFullPath(mod, parent);
		//fp, mod

		let content = '';

		/*if (process.env.mainWorker === '1')
			if (fp.indexOf('invariant') >= 0)
				console.info('included: '+mod);*/

		if (!clientModulesList[fp]) {
			let isFP = false;

			try {
				content = mod_fs.readFileSync(mod, 'utf8');
			} catch (e) {
				content = mod_fs.readFileSync(fp, 'utf8');
				isFP = true;
			}

			let depends = worker.getRequires(content, r=>r, (process.env.mainWorker === '1')?fp:null);
			for (let m of depends) addToFileSystem(m, mod_path.dirname(fp));

			if (isFP) {
				const CODE =
					'\nrequire_modules["'+fp+'"] = function (module) {\n'+ content +'\n/**/};'
					+'\nrequire_modules["'+mod+'"] = require_modules["'+fp+'"];';
				worker.toClient(CODE);
			} else {
				worker.pluginsFileSystem[mod] = {reload:'force'};
				//clientModulesMemory.push(mod);
			}

			clientModulesList[fp] = {isFP, mods: [mod]};
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

	const checkFileSystem = (mod, parent)=>{
		let fp = getFullPath(mod, parent);

		let depends = worker.getRequires(mod_fs.readFileSync(fp, 'utf8'), r=>r);
		let added = false;
		for (let m of depends) added = added || checkFileSystem(m, mod_path.dirname(fp));
		return !clientModulesList[fp] || added;
	};

	addToFileSystem(worker.settings.clientApp);

	//[!] MODIFY CACHE
	worker.onCacheModify = ()=>{
		if (checkFileSystem(worker.settings.clientApp)) {
			worker.restartServer();
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