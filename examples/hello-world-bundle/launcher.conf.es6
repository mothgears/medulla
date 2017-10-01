require('medulla').launch({
	serverEntryPoint : "server.app.es6",
	clientEntryPoint : "client.app.js",
	platforms : {
		"win32" : {"forcewatch":false},
		"linux" : {"forcewatch":true}
	},
	requireResolve: m=>require.resolve(m)
});