require('../index.es6')({
	port      : 3000,       //port
	serverApp : "./app.es6",//path to your app main module
	logging   : {dir:"./logs"}
});