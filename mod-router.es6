module.exports.medullaMaster = api=>{
	let node = {};

	api.onRequest = ()=>{
		//...
	};

	const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATH', 'OPTIONS'];

	class RouteNode {
		constructor (handler) {

		}
	}

	//
	let addRoute = (path, handler)=>{

		let method = path.split(':', 1)[0];
		if (METHODS[method]) {
			path = path.substr(method.length + 1);
		} else method = null;

		path = path.split(/[{}]/g);

		let param = false;
		for (let token of path) {
			param = !param;

		}
	};

	//node var
	//node a
	//node b
	//node rx a
	//node rxb

	let parse = (path, nodes)=>{
		let names = Object.keys(nodes);

		let bestNode = {name:null, node:null};
		for (let name of names) {
			let node = node[name];

			if (name === '<>') {
				if(!bestNode.node) {
					if (node.isRegExp) {
						let rx = new RegExp(name);
						if (path.test(rx)) {
							bestNode = {name, };
							break;
						}
					} else {

					}
				}
			} else if (path.startsWith(name))
				if (name.length > bestToken.length) bestToken = name;
		}

		if (bestToken) {
			path = path.substr(bestToken.length);
			parse(path, node[bestToken]);
		}
	};
};

/*if (mm.routes) {
	let keys = Object.keys(mm.routes);
	for (let r of keys) addRoute(r, mm.routes[r]);
}*/

/*//ROUTER
const createNode = (route, tokens, node = routes) =>{
	let token = tokens.shift();
	if (token.startsWith('{') && token.endsWith('}')) {
		//let v = token.substring(1, token.length-1);
		token = '$';
	}

	if (tokens.length > 0) {
		if (node[token]) {
			node = node[token];
			createNode(route, tokens, node);
		} else {
			node = node[token] = {};
			createNode(route, tokens, node);
		}
	} else {
		if (node[token]) {
			node = node[token];
			node[''] = route;
		} else {
			node = node[token] = {};
			node[''] = route;
		}
	}
};

const addRoute = (url, handler)=>{
	let tokens = url.split('/');
	createNode(handler, tokens);
};*/

/*const isRoute = (routepath, node=routes, v = [])=>{
	let token = routepath.shift();

	//Search Token
	if (node[token]) {
		node = node[token];

		if (routepath.length > 0) {
			return isRoute(routepath, node);
		} else {
			if (node[''] && typeof node[''] === 'function') {
				return data=>node[''](...v, data);
			} else return null;
		}
	} else if (node['$']) {
		node = node['$'];
		v.push(token);

		if (routepath.length > 0) {
			return isRoute(routepath, node, v);
		} else {
			if (node[''] && typeof node[''] === 'function') {
				return data=>node[''](...v, data);
			} else return null;
		}
	}
	return null;
};

const routeWork = (route, request, response, GET, POST)=> {
	let wait = false;

	route = route({request, GET, POST});

	if (route instanceof Promise) {
		wait = true;
		route.then(r=>{
			if (typeof r === 'string') r = {content:r};
			response.writeHeader(r.code || 200, r.headers || {"Content-Type": "text/html; charset=utf-8"});
			if (r.code === 404 && r.content === undefined) r.content = '404 Not Found';
			response.write(r.content || '');
			if (r.includePlugins === undefined) r.includePlugins = settings.includePlugins;
			if (r.includePlugins) {
				response.write(clientHTML+`<script>${process.env.pluginsJS}</script>`);
			}
			response.end();
		});
	} else {
		if (typeof route === 'string') route = {content:route};
		response.writeHeader(route.code || 200, route.headers || {"Content-Type": "text/html; charset=utf-8"});
		if (route.code === 404 && route.content === undefined) route.content = '404 Not Found';
		response.write(route.content || '');
		if (route.includePlugins === undefined) route.includePlugins = settings.includePlugins;
		if (route.includePlugins) {
			response.write(clientHTML+`<script>${process.env.pluginsJS}</script>`);
		}
	}

	return wait;
};*/

/*if (route = isRoute(routepath)) {
	let
		usp  = new mod_url.URLSearchParams(parsedURL.search),
		GET  = {},
		POST = {};

	if (request.method === 'GET') {
		usp.forEach((value, name)=>{GET[name] = value;});
		wait = routeWork(route, request, response, GET, POST);
	} else if (request.method === 'POST') {
		wait = true;
		let body = '';
		request.on('data', data=>{
			body += data;
			if (body.length > 1e6) request.connection.destroy();
		});
		request.on('end', ()=>{
			POST = mod_qs.parse(body);
			if (!routeWork(route, request, response, GET, POST)) response.end();
		});
	}
}*/