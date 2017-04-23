# medulla: a Node.js server
`medulla` is a node.js multithreaded server with proxy

## Attention!
module in dev, this is alpha version

## Installing
```
npm install --save medulla
```

## Usage
#### Base example
git [`https://github.com/mothgears/medulla-example.git`](https://github.com/mothgears/medulla-example.git)

#### Index file and config
Create an entry point (e.g. index.js):
```js
require('medulla')({
    "serverDir"  :"../../",    //path to app dir
    "serverApp"  : "./app.js", //path to your app main module
    "watch"      : true,       //for watch files on server (in fileIndex)
    "devMode"    : false,      //for using devPlugins
    "forcewatch" : false,      //set true if fs.watch don't work correctly
    "hosts"      : {           //individual configs for specific hosts
    	"hostname" : {"setting":"value"} 
    },
    "pluging"    : {
    	"plugin-name" : "{plugin-settings}"
    }, 
    "devPlugins" : {}          //plugins used only with devMode:true
});
```

#### Main module file
Create the main module file (e.g. app.js) and add special settings
```es6
module.exports.settings = {
	port       : 3001,              //default: 3000
	watchFiles : false,             //add files with "type:file" to watchlist, default: false
	mimeTypes  : "./mimeTypes.json" //path to mimeTypes file
};
```

and file index (files must exist on server)
```es6
module.exports.fileIndex = {
    "readme.txt"        : {type:"file"},
    "image.png"         : {type:"file", src:"images/sample.png"},
    
    "styles/main.css"   : {type:"cached"},
    "client-script.es6" : {type:"cached", src:"bin/client-script.es6"},
    
    "scripts/*.js"      : {type:"cached", src:"bin/*.js"}
};
```
type:"file"   - will read file from disc in every request

type:"cached" - add file content to variable (for each worker)

Default path to file is url, but you may specify it directly use 'src' param.

Describe the worker function
```es6
module.exports.onRequest = (request, response)=>{
    response.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});
    response.write('<html><body>It works!</body></html>');
    
    return 1; 
    //1   - for including medulla-plugins code in responce body (use with page html)
    //404 - for "404 Not Found"
    //0   - pure responce, use it other cases (json or other api data)
    //{target:"mysite.net", includePlugins:(request.url === '/')} - for proxying this request
};
```
#### Start server
for start run the "entry point" script
```
node index.js
```

## Plugins
Plugins in development

## License
MIT
