const ms = medulla.require('./scripts/multiscript.es6', {url:'ms.js', type:'cached'});

module.exports = {
	publicAccess: {
		'~*?'       : 'public/~*?',  //all files from directory
		'pic/*.png' : 'images/*.png',//,//add .png files directly from directory
		'readme.txt': 'readme.txt'   //concrete file
	},

	watchedFiles: {
		"~*.js"             : {src:"scripts/~*.js", reload:'force'}, //type:"cached",
		"client-script.es6" : {src:"scripts/client-script.es6"},
		"styles/*.css"      : {reload:'hot'},
		"realpage"          : {src:"realpage.html", isPage:true}
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

		return 1;
		//return 1   - for including medulla-plugins code in responce body (use with page html)
		//return 404 - for "404 Not Found"
		//return 0   - pure responce, use it other cases (json or other api data)
		//return {target:"mysite.net", isPage:(request.url === '/')} - for proxying this request
	}
};
//setTimeout(()=>{FEF.n.x = 5 + jui; console.log('X');}, 100);