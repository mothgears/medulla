require('medulla').launch({
	serverEntryPoint : "./server.app.es6",
	platforms : {
		"win32" : {"forcewatch":false},
		"linux" : {"forcewatch":true}
	}
});