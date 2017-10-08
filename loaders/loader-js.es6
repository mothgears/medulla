module.exports.serversideModify = (worker, url, content, alias, hotloaded)=>{
	const mod_path = require('path');

	let urldir = mod_path.dirname(url);
	if (urldir === '.') urldir = '';

	let CODE =
		'\n'+'(window.require_modules = window.require_modules || {})["host:/'+url+'"] = function (module) {'+
		'\n'+'window.require_filedir = "'+urldir+'";'+
		'\n'+ content +
		'\n'+'/**/window.require_filedir = null;};';

	if (alias) {
		CODE += '\n'+'window.require_modules["'+alias+'"] = window.require_modules["host:/'+url+'"];';
	}

	if (worker.settings.devMode && hotloaded) {
		worker.toClient(`<script src="${url}"></script>`);
		return CODE;
	} else {
		worker.toClient(CODE);
		return null;
	}
};

module.exports.params = ()=> ({reload:'force'});

module.exports.clientsideRequire = function() {
	return function (path) {
		path = require_resolve(path);

		var m = window.require_modules[path];

		if (!m) {
			console.error('medulla-linker: Module "'+path+'" not found, available modules:');
			console.info(require_modules);

			return null;

		} else if (typeof m === 'function') {
			var exp = {default: null};
			var newModule = {exports:exp};

			let prevext = null;
			let prevpath = null;
			if (window.exports) prevext = window.exports;
			if (window.require_filedir) prevpath = window.require_filedir;
			window.exports = exp;

			m(newModule);

			window.require_filedir = prevpath;
			window.exports = prevext;

			window.require_modules[path] = newModule;
			m = newModule;
		}

		return m.exports;
	}
};