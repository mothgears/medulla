module.exports.serversideModify = (worker, url, content)=>{
	//console.info(url);

	const CODE =
		'(window.require_modules = window.require_modules || {})["'+url+'"] = "'+ content +'";';

	if (worker.settings.devMode) {
		worker.toClient(`<script src="${url}"></script>`);
		return CODE;
	} else {
		worker.toClient(CODE);
		return null;
	}
};

module.exports.params = {bundle:true, reload:'force'};

module.exports.clientsideRequire = function() {
	return function (path) {
		var m = window.require_modules[path];
		if (typeof m === 'undefined') {
			console.error('medulla-linker: File "'+path+'" not found, available modules:');
			console.info(require_modules);

			return null;
		}
		return m;
	}
};