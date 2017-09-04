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

	//console.info(worker.settings.bridge('react'));

	worker.toClient('window.process = {env:{}};');

	const clientModulesMemory = [];
	//const fullpathes = {};
	const addToFileSystem = (mod, parent = null)=>{
		let fp = mod;

		//if (mod.indexOf('./') >= 0) console.info('iNX: '+mod);

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

		if (!fp.endsWith('.js') && !fp.endsWith('.es6') && !fp.endsWith('.jsx')) {
			fp += '.js';
		}

		let content = '';

		try {
			content = mod_fs.readFileSync(mod, 'utf8');
		} catch (e) {
			content = mod_fs.readFileSync(fp, 'utf8');
			//if (fp.indexOf('reactProdInvariant') >= 0) console.info('included: '+fp);
			const CODE = '\n(require_modules = window.require_modules || {})["'+mod+'"] = function (module) {\n'+ content +'\n/**/};';
			worker.toClient(CODE);
			mod = null;
		}

		let depends = worker.getRequires(content, r=>r, (process.env.mainWorker === '1')?fp:null);
		//if (process.env.mainWorker === '1') console.info('MOD: ['+fp+']');
		//if (process.env.mainWorker === '1') console.info(depends);
		for (let m of depends) addToFileSystem(m, mod_path.dirname(fp));

		if (mod) {
			worker.pluginsFileSystem[mod] = {reload:'force'};
			clientModulesMemory.push(mod);
		}
	};

	const checkFileSystem = (mod)=>{
		let depends = worker.getRequires(mod_fs.readFileSync(mod, 'utf8'), r=>r);
		let added = false;
		for (let m of depends) added = added || checkFileSystem(mod);
		return (clientModulesMemory.indexOf(mod) < 0) || added;
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