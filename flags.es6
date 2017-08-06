exports.WATCH_NO    = Symbol();
exports.WATCH_ALL   = Symbol();
exports.WATCH_CACHE = Symbol();

exports.LOG_TRACE   = Symbol();
exports.LOG_WARNING = Symbol();
exports.LOG_ERROR   = Symbol();

/*exports.install = target=>{
	let keys = Object.keys(exports);
	for (let key of keys) {
		target[key] = exports[key];
	}

	return exports;
};*/