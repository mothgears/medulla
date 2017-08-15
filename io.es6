const proxy = require('./proxy.es6');

const handleRequest = (handler, io, request, response, errorHandle)=>{
	if (handler) {
		try {
			handler(io, request, response);
		} catch (e) {
			errorHandle(e, 'MODULE ERROR', 'none'); //Nothing

			response.writeHeader(500, {"Content-Type": "text/html; charset=utf-8"});
			let stack = e.stack.replace(/at/g, '<br>@ at');
			response.write(`
				<head>
					<meta charset="UTF-8">
					<script>${process.env.pluginsJS}</script>
				</head>
				<body>SERVER ERROR<br><br>${stack}</body>
			`);
		}
	} else io.send();
};

class IO {
	constructor () {
		//...
	}
}

module.exports = (request, response, handlersRequest, includeMedullaCode, errorHandle, clientHTML, proxyCookieDomain)=>{
	const io = new IO();

	io.send = ()=>{
		let modify = (
			io.includeMedullaCode &&
			response.headers['content-type'] &&
			response.headers['content-type'].substr(0,9) === 'text/html'
		);

		if (modify) io.body += clientHTML+`<script>${process.env.pluginsJS}</script>`;
		response.writeHeader(io.code, io.headers);
		response.write(io.body);
		response.end();
	};

	let hi = -1;
	io.next = ()=>{
		hi++;
		handleRequest(handlersRequest[hi], io, request, response, errorHandle);
	};
	io.forward = target=>{
		proxy.forward(target, io.includeMedullaCode, request, response, clientHTML, proxyCookieDomain);
	};

	io.url     = request.url;
	io.body    = '404 Not Found';
	io.headers = {"Content-Type": "text/html; charset=utf-8"};
	io.code    = 404;
	io.includeMedullaCode = includeMedullaCode;

	io.next();
};