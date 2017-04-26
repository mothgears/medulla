# Medulla
`medulla` is a simple, no-dependency, node.js server.

## Features
- The server use several workers for multithreaded request handling.
- Do no need daemons, set [flag](#index-file-and-config) `watch:true` 
and server will do restart workers when detect changes in modules, 
and update cache when changed scripts (files with [prop](#file-index) `type:cached`).
- Can work as a proxy server and forwarding requests to the specified domain.

**(!)** *Module in development, this is unstable version with incomplete functional.*  
Feedback:
[mailbox@mothgears.com](mailto:mailbox@mothgears.com)

## Example project
[https://github.com/mothgears/medulla-example.git](https://github.com/mothgears/medulla-example.git)

## Installation

[npm](https://www.npmjs.com/package/medulla)  
`npm i -S medulla`
  
[git](https://github.com/mothgears/medulla.git)  
`git clone https://github.com/mothgears/medulla.git`

## Usage
With the `watch: true` setting, the server watch for files from fileIndex and automatically restart workers or update the cache each time it changes.

#### Entry point and config
Create an entry point (e.g. server.js) and add to it:
```js
require('medulla')({
    serverDir  :"../../",    //path to app dir
    serverApp  : "./app.js", //path to your app main module
    watch      : true,       //for watch files on server (from fileIndex)
    forcewatch : false,      //set true if fs.watch don't work correctly
    hosts      : {           //individual configs for specific hosts
    	"hostname" : {"setting":"value"} 
    },
    pluging    : {
    	"plugin-name" : "{plugin-settings}"
    }, 
    devPlugins : {},         //plugins used only in de mode (-dev)
    proxyCookieDomain : "localhost"
});
```

#### Main module
Create the main module of your app (e.g. app.js) and add to it special settings
```es6
module.exports.settings = {
	port       : 3001,              //default: 3000
	watchFiles : false,             //add files with "type:file" to watchlist, default: false
	mimeTypes  : "./mimeTypes.json" //path to mimeTypes file
};
```

#### File index
Then add 'file index' to main module (files must exist on server).  
**(!)** *don't add modules here, required modules added automatically.*
```es6
module.exports.fileIndex = {
	"readme.txt"        : {type:"file"},
	"*.png"             : {type:"file", src:"images/*.png"},

	"scripts/*.js"      : {type:"cached", src:"bin/*.js"},

	"styles/main.css"   : {type:"cached"},
	"client-script.es6" : {type:"cached", src:"bin/client-script.es6"}
};
```
`type:"file"`   - will read file from disc in every request  
`type:"cached"` - add file content to variable (for each worker)  
Default path to file is url, but you may specify it directly use `src` param.  

To share included modules also as js script, use `medulla.require` function instead of `require`:
```es6
const myModule1 = medulla.require('./myModule.js', {url:'client-module.js', type:'cached'});
const myModule2 = medulla.require('./myModule.js', {url:'client-module.js', type:'file'});
```

Describe the worker function
```es6
module.exports.onRequest = (request, response)=>{
    if (request.url !== '/') return 404;

    response.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});
    response.write('<html><body>It works!</body></html>');
    
    return 1; 
    //1   - for including medulla-plugins code in responce body (use with page html)
    //404 - for "404 Not Found"
    //0   - pure responce, use in other cases (json or other api data)
    //{target:"mysite.net", includePlugins:(request.url === '/')} - for proxying this request
};
```

#### Start server
For start the server run the your "entry point" script:
```
node server.js
```

or for start the server with dev plugins, launch it with parameter:
```
node server.js -dev
```
and open the site in browser (e.g. localhost:3001)

#### Console commands
  - `version` - show current module version  
  - `stop` - shutdown server

## Plugins
Dev plugin for hot reload page, scripts and styles - in development.

## License
MIT
