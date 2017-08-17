const ms = medulla.require('./multiscript.es6', {url:'ms.js', type:'cached'});

module.exports = {

	fileSystem: {
		//Static files with public access from web
		'public/~*?'   : '~*?',        //all files from directory and subdirs
		'images/*.png' : 'pic/*.png',  //add .png files directly from directory
		'readme.txt'   : 'readme.txt',  //concrete file

		//Templates for watch
		"scripts/~*.js" : {url:"~*.js", reload:'force'}, //type:"cached",
		"styles/*.css"  : {reload:'hot'}, //'reload' prop for using with medulla-hotcode plugin
		"*.html"        : {url:"*", isPage:true},

		//Concrete files for watch
		"scripts/client-script.es6" : {url:"client-script.es6"}
	},

	mimeTypes : { //extend base mime Types
		"es6" : "application/javascript"
	},

	onRequest (io) {
		//Counter test

		/*
		//will not work correct on multithread systems, because 'global' is unique for each worker
		global.totalViews = global.totalViews || 0;
		global.totalViews++;
		console.info('incorrect counter of requests: ' + totalViews);
		*/

		//will work correct on multithread systems, because 'medulla.common storage' is shared between workers
		medulla.common(storage=>{
			storage.totalViews = storage.totalViews || 0;
			storage.totalViews++;
			console.info('correct counter of requests: ' + storage.totalViews)
		});

		if (io.url !== '/') io.send(404);
		else io.send(`
			<html>
				<head>
					<link href="styles/main.css" rel="stylesheet">
					<link href="styles/oppa.css" rel="stylesheet">
					<link href="styles/style2.css" rel="stylesheet">
					<script src="client-script.es6"></script>
					<script src="hello.js"></script>
					<script src="ms.js"></script>
				</head>
				<body><a href="readme.txt">-readme-</a><br>
				<a href="realpage">-html-</a><br><br>
				<a href="rtest/rtest2/temm.zip" download>-file-</a><br><br>
				<img src="pic/sample.png"><br><br>
				
				This file is disallow:<br>
				<a href="pic/sample_noa.txt">-file-</a><br><br>
				
				This image is disallow:<br>
				<img src="pic/sample_not.png">
				</body>
			</html>
		`);
	}
};
//setTimeout(()=>{FEF.n.x = 5 + jui; console.log('X');}, 100);