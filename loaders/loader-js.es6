module.exports.serversideModify = (worker, url, content)=>{
	const CODE =
		'(require_modules = window.require_modules || {})["'+url+'"] = function (module) {\n'+ content +'\n/**/};';

	if (worker.settings.devMode) {
		worker.toClient(`<script src="${url}"></script>`);
		return CODE;
	} else {
		worker.toClient(CODE);
		return null;
	}
};

module.exports.clientsideRequire = function() {
	return function (path) {
		var m = window.require_modules[path];
		if (!m) {
			console.error('medulla-linker: Module "'+path+'" not found, available modules:');
			console.info(require_modules);

			return null;

		} else if (typeof m === 'function') {
			var exp = {default: null};
			var newModule = {exports:exp};
			window.exports = exp;
			m(newModule);
			window.exports = null;
			window.require_modules[path] = newModule;
			m = newModule;
		}

		return m.exports;
	}
};