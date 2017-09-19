module.exports.onRequest = (io, req, res)=>{
	io.send('<div class="hello-container"></div>');
};