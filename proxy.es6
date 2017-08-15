const
	mod_url  = require('url'),
	mod_http = require('http'),
	mod_zlib = require('zlib');

const rewriteCookieDomain = (header, config)=>{
	if (Array.isArray(header)) {
		return header.map(function (headerElement) {
			return rewriteCookieDomain(headerElement, config);
		});
	}
	let cookieDomainRegex = /(;\s*domain=)([^;]+)/i;

	if (typeof header === 'string') return header.replace(cookieDomainRegex, function(match, prefix, previousDomain) {
		let newDomain;
		if (previousDomain in config) {
			newDomain = config[previousDomain];
		} else if ('*' in config) {
			newDomain = config['*'];
		} else {
			return match;
		}
		if (newDomain) {
			return prefix + newDomain;
		} else {
			return '';
		}
	});
};

const writeHeaders = (res, proxyRes, modifyLength = null, proxyCookieDomain)=>{
		setHeader = (key, header)=>{
			if (header === undefined) return;
			if (proxyCookieDomain && key.toLowerCase() === 'set-cookie') {
				header = rewriteCookieDomain(header, proxyCookieDomain);
			}
			res.setHeader(String(key).trim(), header);
		};

	if (typeof proxyCookieDomain === 'string') proxyCookieDomain = { '*': proxyCookieDomain };

	Object.keys(proxyRes.headers).forEach(key=>{
		let header = proxyRes.headers[key];
		if (modifyLength && key.toLowerCase() === 'content-length') {header = modifyLength;}
		setHeader(key, header);
	});
};

module.exports.forward = (target, includeMedullaCode, request, response, clientHTML, proxyCookieDomain)=>{
	request.headers['host'] = target;

	let ph = mod_url.parse(request.url);
	let options = {
		headers : request.headers,
		host    : target,
		hostname: ph.hostname,
		path    : ph.path,
		port    : ph.port,
		method  : request.method
	};
	let targetRequest = mod_http.request(options, targetResponse=>{

		let modify = (
				includeMedullaCode &&
				targetResponse.headers['content-type'] &&
				targetResponse.headers['content-type'].substr(0,9) === 'text/html'
			),
			b = Buffer.from(clientHTML+`<script>${process.env.pluginsJS}</script>`, 'utf8'),
			body = [];

		targetResponse.on('data', chunk=>{
			body.push(chunk);
		});
		targetResponse.on('end' , ()=>{
			body = Buffer.concat(body);
			if (modify) {
				if (targetResponse.headers['content-encoding'] === 'gzip')
					body = mod_zlib.gzipSync(Buffer.concat([mod_zlib.unzipSync(body), b]));
				else
					body = Buffer.concat([body, b]);
			}

			response.statusCode = targetResponse.statusCode;
			writeHeaders(response, targetResponse, modify?body.length:null, proxyCookieDomain);
			response.write(body, 'binary');
			response.end();
		});
	});

	request.on('data', chunk=>targetRequest.write(chunk, 'binary'));
	request.on('end', ()=>targetRequest.end());
};