# Medulla
`medulla` is a simple, no-dependency node.js server.

## Features
- The server use several workers for multithreaded request handling.
- Do no need daemons, set [flag](#list-of-all-settings-with-default-values) `watch:true` 
and server will do restart workers when detect changes in modules, 
and update cache when changed scripts (files with [prop](#main-module) `type:cached`).
- Can work as a proxy server and forwarding requests to the specified domain.

**(!)** *module in development, this is unstable version with incomplete functional.*  
Feedback:
[mailbox@mothgears.com](mailto:mailbox@mothgears.com)

## Installation
[npm](https://www.npmjs.com/package/medulla)  
`npm i -S medulla`
  
[git](https://github.com/mothgears/medulla.git)  
`git clone https://github.com/mothgears/medulla.git`

## Usage
#### Entry point and config
Create an entry point (e.g. server.js) and require medulla with settings:
```es6
require('medulla')({
    serverApp : "./myApp.js"
});
```

#### List of all settings with default values
- `serverApp: "./app.js"`  
Path to your app main module.

- `serverDir: "../../"`  
Path to app dir.

- `port: 3000`  
Server port.

- `mimeTypes: {}`   
Additional mime types in format {"ext":"mime"}.

- `watch: true`  
If set "true", the server watch for files from fileIndex and automatically restart workers or update the cache each time it changes.

- `watchFiles: false`  
If set "true", the server will watch also for files with "type:file".

- `forcewatch: false`  
Set true if "fs.watch" don't work correctly and server not reacting on file changes.

- `hosts: {}`  
Individual configs for specific hosts in format "hostname" : {"setting":"value"}.

- `pluging: {}`  
Server plugins in format "pluginModuleName" : "{plugin-settings}".

- `devPlugins: {}`  
This plugins used only in dev mode (-dev).

- `devMode: false`  
If set "true", the devPlugins will be included.

- `proxyCookieDomain: "localhost"`  
Proxy cookie domain name.

#### Main module
Create the main module of your app (e.g. myApp.js) and add to it fileIndex (files must exist on server).  
**(!)** *don't add modules here, required modules added automatically.*
```es6
module.exports.fileIndex = {
    //indexed files in format 'url:{params}'
    
    //Templates
    "~*.png"            : {type:"file", src:"images/~*.png"}, //all png files from "images" folder and subfolders
    "scripts/*.js"      : {type:"cached", src:"bin/*.js"}, //all js files directly from "bin" folder
    
    //Concrete files
    "readme.txt"        : {type:"file"},
    "styles/main.css"   : {type:"cached"},
    "client-script.es6" : {type:"cached", src:"bin/client-script.es6"}
};
```
- `type:"file"`  
Will read file from disc in every request.  
- `type:"cached"`  
Add file content to variable (for each worker).
  
Default path to file is url, but you may specify it directly use `src` param.  

To share included modules also as js script, use `medulla.require` function instead of `require`:
```es6
const myModule1 = medulla.require('./myModule1.js', {url:'client-module1.js', type:'cached'});
const myModule2 = medulla.require('./myModule2.js', {url:'client-module2.js', type:'file'});
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
