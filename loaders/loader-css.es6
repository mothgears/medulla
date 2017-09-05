module.exports.serversideModify = (worker, url, content)=>{
	worker.toClient(`<link rel="stylesheet" href="${url}">`+'\n');
	return content;
};

module.exports.clientsideRequire = function() {
	return null;
};