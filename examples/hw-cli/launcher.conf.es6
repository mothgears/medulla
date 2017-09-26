require('medulla').launch({
	serverEntryPoint : "./server.app.es6",
	port: 3000,
	platforms : {
		"win32" : {"forcewatch":false},
		"linux" : {"forcewatch":true}
	}
});