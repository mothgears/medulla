module.exports.onRequest = io=>{
	if (io.url !== '/') io.send(404);
	else io.send(`
		<html>
			<head>
				<script src="say-hello.js"></script>
				<script src="client.js"></script>
			</head>
			<body></body>
		</html>
	`);
};