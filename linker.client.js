window.require = function (path) {
	var loader = loaderByModulePath(path);
	if (loader) return loader(path);

	return null;
};

require.loaders = {};

function loaderByModulePath (path) {
	var spl = path.split('/');
	if (spl.length === 1) spl = path.split('\\');

	if (spl[spl.length-1].indexOf('.') < 0) {
		path += '.js';
	}

	var ext = path.split('.');
	ext = '.'+ext[ext.length-1];
	var loaderPath = window.medulla.settings.loadersByExt[ext];

	if (loaderPath) {
		loaderPath = loaderPath.replace(/\\/g, '/');

		return window.require.loaders[loaderPath];
	}

	console.error('medulla-linker: Loader for "'+path+'" not found');
	return null;
}

window.addEventListener('load', function () {
	require(window.medulla.settings.clientApp);
});