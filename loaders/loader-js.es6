module.exports.serversideModify = (worker, url, content)=>{
	const CODE =
		'(window.require_modules = window.require_modules || {})["'+url+'"] = function (module) {'+
		'\n'+'window.require_filepath = "";'+
		'\n'+ content +'\n/**/};';

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
		path = require_resolve(path);

		var pathOrigin = path;
		if (path.slice(-3) !== '.js') path += '.js';
		var m = window.require_modules[path];

		if (!m) {
			if (path.substr(0, 2) === './') {
				m =
					window.require_modules[path.substr(1)] ||
					window.require_modules[path.substr(2)];
			} else if (path.substr(0, 1) === '/') {
				m =
					window.require_modules['.'+path] ||
					window.require_modules[path.substr(1)];
			} else if (path[0] !== '/' && path[0] !== '.') {
				m =
					window.require_modules['/' + path] ||
					window.require_modules['./' + path];
			}
		}

		if (!m) {
			console.error('medulla-linker: Module "'+pathOrigin+'" not found, available modules:');
			console.info(require_modules);

			return null;

		} else if (typeof m === 'function') {
			var exp = {default: null};
			var newModule = {exports:exp};

			let prevext = null;
			let prevpath = null;
			if (window.exports) prevext = window.exports;
			if (window.require_filepath) prevpath = window.require_filepath;
			window.exports = exp;
			//window.require_filepath = '';

			m(newModule);

			window.require_filepath = prevpath;
			window.exports = prevext;

			window.require_modules[pathOrigin] = newModule;
			m = newModule;
		}

		return m.exports;
	}
};