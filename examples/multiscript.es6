(()=>{
	const h = it=>`Hello ${it}!`;

	//SERVER SIDE CODE
	if (typeof global === 'object' && global) {
		console.log(h('server'));
		setTimeout(require('./subdir/server-script.es6'), 10000);

	//CLIENT SIDE CODE
	} else if (typeof window === 'object' && window) {
		console.log(h('client'));
	}
})();