const flags = module.exports.flags = require('./flags.es6');

module.exports = {
	port              : 3000,
	wsPort            : 9000,
	serverDir         : process.cwd(),
	serverEntryPoint  : './server.js',
	clientEntryPoint  : null,
	hosts             : {},
	platforms         : {},
	forcewatch        : false,
	plugins           : {
		'./mod-ws.es6':{},
		'./dashboard.es6':{}
	},
	devPlugins        : {},
	watchForChanges   : flags.WATCH_SOURCE,
	watchIgnore       : [
		f=>f.endsWith('___jb_tmp___'),
		f=>f.endsWith('___jb_old___'),
		f=>{
			let mind = f.lastIndexOf('/medulla/');
			return (mind>=0 && mind + 8 === f.lastIndexOf('/'));
		}
	],
	devMode           : process.argv.indexOf('-dev') >= 0,
	logging           : {
		level: flags.LOG_WARNING,
		separatedTypes: true,
		dir: process.cwd()
	},
	dashboardPassword : null,
	includeMedullaCode: true,
	hotcode: {
		enabled: true,
		showtraces: true,
		autoreload: 0
	},
	loaders    : {
		" .js .es6" : "./loaders/loader-js.es6",
		".css"     : "./loaders/loader-css.es6",
		".txt"     : "./loaders/loader-txt.es6"
	},
	bundler: m=>require.resolve(m)
};