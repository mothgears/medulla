window.require = function (path) {
	var loader = loaderByModulePath(path);
	if (loader) return loader(path);

	return null;
};

require.loaders = {};

function loaderByModulePath (path) {
	var ext = path.split('.');
	ext = '.'+ext[ext.length-1];
	var loaderPath = window.medulla.settings.loadersByExt[ext];

	if (loaderPath) {
		loaderPath = loaderPath.replace(/\\/g, '/');

		return window.require.loaders[loaderPath];
	}

	console.error('medulla-linker: Loader for "'+ext+'" files not found');
	return null;
}

window.addEventListener('load', function () {
	require(window.medulla.settings.clientApp);
});