(()=>{
	const h = it=>`Hello ${it}!`;

	//SERVER SIDE CODE
	if (typeof global === 'object' && global) {
		console.log(h('server'));

	//CLIENT SIDE CODE
	} else if (typeof window === 'object' && window) {
		console.log(h('client'));
	}
})();