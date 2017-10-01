module.exports.fileSystem = {
	"say-hello.js"  : {reload:'force'},
	"client.app.js" : {reload:'force'}
};

module.exports.onRequest = io=>{
	if (io.url !== '/') io.send(404);
	else io.send(`
		<html>
			<head>
				<script src="say-hello.js"></script>
				<script src="client.app.js"></script>
			</head>
			<body>
				<div class="root"></div>
			</body>
		</html>
	`);
};