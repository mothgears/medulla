module.exports.serversideModify = (worker, url, content, alias, hotloaded)=>{
	worker.toClient(`<link rel="stylesheet" href="${url}">`+'\n');
	return content;
};

module.exports.params = ()=> ({reload:'hot'});

module.exports.clientsideRequire = function() {
	return null;
};