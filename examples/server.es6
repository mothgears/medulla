require('../index.es6')({
	port      : 3000,       //port
	serverApp : "./app.es6" //path to your app main module
	/*devPlugins : {
		'medulla-hotcode':{}
	},
	hosts:{
		"Home-pc":{"devMode":true, "forcewatch":false},
		"debian" :{"devMode":true, "forcewatch":true}
	},*/
});