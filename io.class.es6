const
	mod_url  = require('url'),
	mod_http = require('http'),
	mod_zlib = require('zlib');
	mod_proxy = require('./proxy.es6');

module.exports = class {
	constructor (req, res, hr, includeMedullaCode, errorHandle, clientHTML, proxyCookieDomain) {
		this._clientHTML = clientHTML;
		this._errorHandle = errorHandle;
		this._handlersRequest = hr;
		this._proxyCookieDomain = proxyCookieDomain;
		this._hi = -1;

		this._req       = req;
		this._res       = res;
		this._parsedURL = mod_url.parse(this._req.url, true);

		this.body            = '404 Not Found';
		this._res.headers    = {"Content-Type": "text/html; charset=utf-8"};
		this._res.statusCode = 404;
		this.includeMedullaCode = includeMedullaCode;

		if (this._req.method === 'GET') {
			this._data = this._parsedURL.query;
			this.next();
		} else {//PUT, POST, DELETE, ...
			let body = '';
			this._req.on('data', chunk=>{
				body += chunk;
				if (body.length > 1e6) this._req.connection.destroy();
			}).on('end', ()=>{
				this._data = body;
				this.next();
			});
		}
	}

	get url     () {return this._req.url;}
	get method  () {return this._req.method;}
	get headers () {return this._req.headers;}
	get data    () {return this._data;}

	get res     () {return this._res;}
	get req     () {return this._req;}

	get (name)        {return this._res.headers[name];}
	set (name, value) {this._res.headers[name] = value;}

	send (body = null, code = null, headers = null) {
		if (headers && typeof headers === 'string') headers = {"Content-Type":headers};

		if (headers) this._res.headers    = headers;
		if (code)    this._res.statusCode = code;

		if (this.includeMedullaCode) this.body += this._clientHTML+`<script>${process.env.pluginsJS}</script>`;
		this._res.write(body || this.body);
		this._res.end();
	}

	pure (body = '', code = 200, headers = "text/html; charset=utf-8") {
		this.includeMedullaCode = false;
		this.send(body, code, headers);
	}

	forward (target) {
		mod_proxy.forward(
			target,
			this.includeMedullaCode,
			this._req,
			this._res,
			this._clientHTML,
			this._proxyCookieDomain
		);
	}

	next () {
		this._hi++;
		let handler = this._handlersRequest[this._hi];

		if (handler) {
			try {
				handler(this, this._req, this._res);
			} catch (e) {
				this._errorHandle(e, 'MODULE ERROR', 'none'); //Nothing

				this._res.writeHeader(500, {"Content-Type": "text/html; charset=utf-8"});
				let stack = e.stack.replace(/at/g, '<br>@ at');
				this._res.write(`
					<head>
						<meta charset="UTF-8">
						<script>${process.env.pluginsJS}</script>
					</head>
					<body>SERVER ERROR<br><br>${stack}</body>
				`);
			}
		} else this.send();
	}
};