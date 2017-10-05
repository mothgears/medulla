const
	mod_proxy = require('./proxy.es6'),
	mod_url   = require('url');

const
	setDefault = (p, v) => (p === undefined) ? v : p;

class IO {
	constructor (handlers, config) {
		this.handlersRequest = handlers;
		this.modifyResponse  = config.modifyResponse;
		this.modificator     = config.modificator;
		this.onResponseError = config.onResponseError;
		this.getResponseBody = setDefault(config.getResponseBody, true);
	}

	//Params
	get url     () {return this.request.url;}
	get method  () {return this.request.method;}
	get input   () {return this._input;}
	get headers () {return this.request.headers;}

	get code ()      {return this.response.statusCode;}
	set code (value) {this.response.statusCode = value;}

	set (header, value) {
		if      (typeof header === 'object') {
			let keys = Object.keys(header);
			for (let h of keys) this.response.setHeader(h, header[h]);
		} else if (typeof header === 'string') {
			if (value) this.response.setHeader(header, value);
			else       this.response.setHeader('content-type', header);
		}
	}
	get (headername) {return this.request.headers[headername];}

	//Methods
	handle (request, response) {
		this.counter  = -1;
		this.request  = request;
		this.response = response;

		this._input = null;
		this.output = '404 Not Found';

		this.response.statusCode = 404;
		this.response.setHeader('content-type', 'text/html; charset=utf-8');

		if (this.request.method === 'GET') {
			this._input = mod_url.parse(this.request.url).query;
		} else {
			this._input = new Promise((res, rej)=>{
				try {
					let body = [];
					this.request.on('data', chunk=>{
						body.push(chunk);
						//if (body.length > 1e6) this.request.connection.destroy();
					}).on('end', ()=>{
						body = Buffer.concat(body);
						this._input = body;
						res(body);
					});
				} catch (err) {rej(err);}
			});
		}
		this.next();
	}

	next () {
		this.counter++;

		let handler = this.handlersRequest[this.counter];

		if (handler) {
			try {
				handler(this, this.request, this.response);
			} catch (e) {
				if (this.onResponseError) this.onResponseError(e);

				let stack = e.stack.replace(/ at /g, '<br>@ at ');
				this.response.writeHead(500, {"Content-Type": "text/html; charset=utf-8"});
				this.response.write(`
					<html>
						<head>
							<meta charset="UTF-8">
						</head>
						<body>
							SERVER ERROR<br><br>${stack}
							${this.modificator}
						</body>
					</html>
				`);
			}
		} else {
			this.send();
		}
	}

	send (...params) {
		let
			body = null,
			head = null,
			code = null;

		for (let param of params) {
			if (typeof param === 'string') {
				if (!body) body = param;
				else head = {"content-type": param}
			} else if (typeof param === 'number') {
				code = param;
			} else if (typeof param === 'object') {
				head = param;
			}
		}

		if (body && code === null) code = 200;

		if (body !== null) this.output              = body;
		if (code !== null) this.response.statusCode = code;
		if (head !== null) this.set(head);

		let ct = this.response.getHeader('content-type');

		if (
			this.modifyResponse &&
			this.modificator &&
			ct &&
			ct.substr(0,9) === 'text/html'
		) this.output += this.modificator;

		this.response.end(this.output);
	}

	forward (target) {
		mod_proxy.forward(
			target,
			this.request,
			this.response,
			this.modifyResponse,
			this.modificator/*,
			this.method === 'POST' ? this.input : ''*/
		);
	}
}

module.exports = IO;