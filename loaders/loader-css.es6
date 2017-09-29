module.exports.serversideModify = (worker, url, content)=>{
	worker.toClient(`<link rel="stylesheet" href="${url}">`+'\n');
	return content;
};

module.exports.params = {bundle:true, reload:'hot'};

module.exports.clientsideRequire = function() {
	return null;
};