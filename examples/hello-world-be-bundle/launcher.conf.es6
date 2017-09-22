require('medulla').launch({
	serverEntryPoint : "./server.es6",
	platforms : {
		"win32" : {"forcewatch":false},
		"linux" : {"forcewatch":true}
	}
});