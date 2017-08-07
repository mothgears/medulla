const medulla = require('../index.es6');

medulla.launch({
	port      : 3000,       //port
	serverApp : "./app.es6",//path to your app main module
	watch     : false,
	logging   : { //logging params
		dir: "logs",
		level: medulla.flags.LOG_WARNING, //log only errors and warnings
		separatedTypes:true
	},
	platforms :{ //platforms settings
		"win32" : {forcewatch:false},
		"linux" : {forcewatch:true}
	}/*,
	dashboardPassword:'saturn'*/
});