const removeComments = (str)=>{
	let uid = '_' + +new Date(),
		primatives = [],
		primIndex = 0;

	return str.replace(/(['"])(\\\1|.)+?\1/g, (match)=>{
			primatives[primIndex] = match;
			return (uid + '') + primIndex++;
		})
		//(/([^\/])(\/(?!\*|\/)(\\\/|.)+?\/[gim]{0,3})/g)
		.replace(/([^\/])(\/(?![*\/])(\\\/|.)+?\/[gim]{0,3})/g, (match, $1, $2)=>{
			primatives[primIndex] = $2;
			return $1 + (uid + '') + primIndex++;
		})
		.replace(/\/\/.*?\/?\*.+?(?=\n|\r|$)|\/\*[\s\S]*?\/\/[\s\S]*?\*\//g, '')
		.replace(/\/\/.+?(?=\n|\r|$)|\/\*[\s\S]+?\*\//g, '')
		.replace(new RegExp('\\/\\*[\\s\\S]+' + uid + '\\d+', 'g'), '')
		.replace(new RegExp(uid + '(\\d+)', 'g'), (match, n)=>primatives[n]);
};

module.exports = (mcode)=>{
	let requires = [];

	mcode = removeComments(mcode).replace(/\s+/g, '');
	mcode = mcode.split('require(');
	mcode.shift();
	for (let r of mcode) {
		r = r.split(')')[0];
		if (r && r[0] === '"' || r[0] === "'") {
			r = r.replace(/["']/g, "");
			if (r) {
				try {
					r = require.resolve(r);
				} catch (e) {
					r = null;
				}
				if (r) requires.push(r);
			}
		}
	}

	return requires;
};