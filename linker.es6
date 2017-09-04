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
	const mod_path = require('path');
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

	worker.onEntryPointModify = ()=>{}

	//[!] ???
	/*worker.onCacheModify = ()=>{
		console.info('OCM');

		const serversidePrepare = path=> {
			let loader = reqLoaderByUrl(path);
			if (loader) {
				if (loader.serversidePrepare) loader.serversidePrepare(worker, path, serversidePrepare);
			} else {
				console.warn(`loader for module "${path}" not installed`);
			}
		};
		serversidePrepare(worker.settings.clientApp);
	}*/
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