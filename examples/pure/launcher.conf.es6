const medulla = require('../../index.es6');

medulla.launch({
	port: 3000,       //port
	serverEntryPoint: "./index.srv.es6", //path to your app main module
	watchForChanges: medulla.flags.WATCH_SOURCE, //watch only modules and cache
	logging: { //logging params
		dir: "logs",
		level: medulla.flags.LOG_WARNING, //log only errors and warnings
		separatedTypes:true
	},
	platforms: { //platforms settings
		"win32": {forcewatch:false},
		"linux": {forcewatch:true}
	},
	dashboardPassword:'saturn' //password for restart server from browser
});