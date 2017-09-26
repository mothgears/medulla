require('medulla').launch({
	serverEntryPoint : "./server.es6",
	clientEntryPoint : "./client.js",
	platforms : {
		"win32" : {"forcewatch":false},
		"linux" : {"forcewatch":true}
	},
	bundler: m=>require.resolve(m)
});