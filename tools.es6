const
	_00  = n=>n<10  ? ('0'+n)      : n,
	_000 = n=>n<100 ? ('0'+_00(n)) : n;

module.exports = {
	_00,
	_000,
	dateFormat(date=new Date()) {
		let hour  = _00(date.getHours());
		let min   = _00(date.getMinutes());
		let sec   = _00(date.getSeconds());
		let day   = _00(date.getDate());
		let month = _00(date.getMonth() + 1);
		let year  = date.getFullYear();
		return year + "." + month + "." + day + " " + hour + ":" + min + ":" + sec;
	}
};

/*exports.install = target=>{
	let keys = Object.keys(exports);
	for (let key of keys) {
		target[key] = exports[key];
	}

	return exports;
};*/