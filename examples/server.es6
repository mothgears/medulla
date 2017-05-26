require('../index.es6')({
	port      : 3000,       //port
	serverApp : "./app.es6",//path to your app main module
	logging   : { //logging params
		level:"error", //log only error
		separatedTypes:true
	},
	platforms :{ //platforms settings
		"win32" : {forcewatch:false},
		"linux" : {forcewatch:true}
	}
});