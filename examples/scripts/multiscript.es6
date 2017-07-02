(()=>{
	const h = it=>`Hello D ${it}!`;

	//SERVER SIDE CODE
	if (typeof global === 'object' && global) {
		console.log(h('server'));
		medulla.require('./subdir/server-script.es6')();

	//CLIENT SIDE CODE
	} else if (typeof window === 'object' && window) {
		console.log(h('client'));
	}
})();