module.exports.serversideModify = (worker, url, content)=>{
	const CODE =
		'(window.require_modules = window.require_modules || {})["'+url+'"] = function (module) {\n'+ content +'\n/**/};';

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
		var pathOrigin = path;
		var m = window.require_modules[path];

		if (!m) {
			if (!(path[0] === '.' && path[1] === '/')) path = './' + path;
			m = window.require_modules[path];
		}

		if (!m) {
			if (path[0] === '.' && path[1] === '/') path = path.slice(2);
			m = window.require_modules[path];
		}

		if (!m) {
			console.error('medulla-linker: Module "'+pathOrigin+'" not found, available modules:');
			console.info(require_modules);

			return null;

		} else if (typeof m === 'function') {
			var exp = {default: null};
			var newModule = {exports:exp};

			let prevext = null;
			if (window.exports) prevext = window.exports;
			window.exports = exp;

			m(newModule);

			window.exports = prevext;

			window.require_modules[pathOrigin] = newModule;
			m = newModule;
		}

		return m.exports;
	}
};