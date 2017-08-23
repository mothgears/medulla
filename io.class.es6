const
	mod_proxy = require('./proxy.es6'),
	mod_url   = require('url');

const
	setDefault = (p, v) => (p === undefined) ? v : p;

module.exports = class {
	constructor (handlers, request, response, config = {}) {
		this.handlersRequest = handlers;
		this.counter         = -1;
		this.request         = request;
		this.response        = response;
		this.modifyResponse  = config.modifyResponse;
		this.modificator     = config.modificator;
		this.onResponseError = config.onResponseError;
		this.getResponseBody = setDefault(config.getResponseBody, true);
		this.autoHandle      = setDefault(config.autoHandle     , true);

		this.output              = '404 Not Found';
		this.response.statusCode = 404;
		this.response.headers    = {'content-type': "text/html; charset=utf-8"};
		this._input              = null;

		if (this.autoHandle) this.handle();
	}

	//Params
	get url    () {return this.request.url;}
	get method () {return this.request.method;}
	get input  () {return this._input;}

	get code   ()      {return this.response.statusCode;}
	set code   (value) {this.response.statusCode = value;}

	set (header, value) {
		if      (typeof header === 'object') this.response.headers = header;
		else if (typeof header === 'string') {
			if (value) this.response.headers[header]   = value;
			else this.response.headers['content-type'] = header;
		}
	}
	get (headername) {return this.request.headers[headername];}

	//Methods
	next () {
		this.counter++;

		let handler = this.handlersRequest[this.counter];

		if (handler) {
			try {
				handler(this, this.request, this.response);
			} catch (e) {
				if (this.onResponseError) this.onResponseError(e, this.request, this.response);
			}
		} else this.send();
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
		if (head !== null) this.response.headers    = head;
		if (code !== null) this.response.statusCode = code;

		if (
			this.modificator &&
			this.modifyResponse &&
			this.response.headers['content-type'] &&
			this.response.headers['content-type'].substr(0,9) === 'text/html'
		) this.output += this.modificator;

		this.response.end(this.output);
	}

	forward (target) {
		mod_proxy.forward(
			target,
			this.request,
			this.response,
			this.modifyResponse,
			this.modificator,
			this.method === 'POST' ? this.input : ''
		);
	}

	handle () {
		if (this.request.method === 'GET') {
			this._input = mod_url.parse(this.request.url).query;
			this.next();
		} else {
			let body = '';
			this.request.on('data', chunk=>{
				body += chunk;
				if (body.length > 1e6) this.request.connection.destroy();
			}).on('end', ()=>{
				this._input = body;
				this.next();
			});
		}
	}
};