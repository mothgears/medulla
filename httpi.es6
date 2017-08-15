const
	mod_url   = require('url'),
	mod_http  = require('http'),
	mod_zlib  = require('zlib');
	mod_proxy = require('./proxy.es6');

module.exports = (req, res, handlersRequest, includeMedullaCode, errorHandle, clientHTML, proxyCookieDomain)=>{
	res.body               = '404 Not Found';
	res.headers            = {"Content-Type": "text/html; charset=utf-8"};
	res.statusCode         = 404;
	res.includeMedullaCode = includeMedullaCode;

	req.parsedURL = mod_url.parse(req.url, true);

	let hi = -1;

	res.forward = target=>{
		mod_proxy.forward(
			target,
			includeMedullaCode,
			req,
			res,
			clientHTML,
			proxyCookieDomain
		);
	};

	res.send = (...params)=>{
		let
			body = null,
			head = null,
			code = null;

		for (let param of params) {
			if (typeof param === 'string') {
				if (!body) body = param;
				else head = {"Content-Type": param}
			} else if (typeof param === 'number') {
				code = param;
			} else if (typeof param === 'object') {
				head = param;
			}
		}

		if (body) res.body       = body;
		if (head) res.headers    = head;
		if (code) res.statusCode = code;

		let modify = (
			res.includeMedullaCode &&
			res.headers['content-type'] &&
			res.headers['content-type'].substr(0,9) === 'text/html'
		);

		if (modify) res.body += clientHTML+`<script>${process.env.pluginsJS}</script>`;
		res.write(res.body);
		res.end();
	};

	res.next = ()=>{
		hi++;
		let handler = handlersRequest[hi];

		if (handler) {
			try {
				handler(req, res);
			} catch (e) {
				errorHandle(e, 'MODULE ERROR', 'none'); //Nothing

				res.writeHeader(500, {"Content-Type": "text/html; charset=utf-8"});
				let stack = e.stack.replace(/at/g, '<br>@ at');
				res.write(`
					<head>
						<meta charset="UTF-8">
						<script>${process.env.pluginsJS}</script>
					</head>
					<body>SERVER ERROR<br><br>${stack}</body>
				`);
				res.end();
			}
		} else res.send();
	};

	if (req.method === 'GET') {
		req.data = req.parsedURL.query;
		res.next();
	} else {
		let body = '';
		req.on('data', chunk=>{
			body += chunk;
			if (body.length > 1e6) req.connection.destroy();
		}).on('end', ()=>{
			req.data = body;
			res.next();
		});
	}
};