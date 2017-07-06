const ms = medulla.require('./scripts/multiscript.es6', {url:'ms.js', type:'cached'});

module.exports = {

	//Files with public access from web
	publicAccess: {
		'public/~*?'   : '~*?',        //all files from directory
		'images/*.png' : 'pic/*.png',  //add .png files directly from directory
		'readme.txt'   : 'readme.txt'  //concrete file
	},


	watchedFiles: {
		"scripts/~*.js"             : {url:"~*.js", reload:'force'}, //type:"cached",
		"scripts/client-script.es6" : {url:"client-script.es6"},
		"styles/*.css"              : {reload:'hot'}, //'reload' prop for using with medulla-hotcode plugin
		"realpage.html"             : {url:"realpage", isPage:true}
	},

	mimeTypes : { //extend base mime Types
		"es6" : "application/javascript"
	},

	onRequest (request, response) {
		if (request.url !== '/') return 404;

		response.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});
		response.write(`
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

		/*
		//Counter test
		//will not work correct on multithread systems, because 'global' is unique for each worker
		global.workerVariable = global.workerVariable || 0;
		global.workerVariable++;
		console.info('incorrect counter of requests: ' + workerVariable);
		*/

		//will work correct on multithread systems, because 'medulla.common storage' is shared between workers
		medulla.common(storage=>{
			storage.sharedVariable = storage.sharedVariable || 0;
			storage.sharedVariable++;
			console.info('correct counter of requests: ' + storage.sharedVariable)
		});

		return 1;
		//return 1   - for including medulla-plugins code in responce body (use with page html)
		//return 404 - for "404 Not Found"
		//return 0   - pure responce, use it other cases (json or other api data)
		//return {target:"mysite.net", isPage:(request.url === '/')} - for proxying this request
	}
};
//setTimeout(()=>{FEF.n.x = 5 + jui; console.log('X');}, 100);