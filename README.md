# Medulla
`medulla` is a simple, no-dependency node.js server.

## Features
- The server use several workers for multithreaded request handling.
- Do no need daemons, set [flag](#list-of-all-settings-with-default-values) `watch:true` 
and server will do restart workers when detect changes in modules, 
and update cache when changed scripts (files with [prop](#main-module) `type:cached`).
- Can work as a proxy server and forwarding requests to the specified domain.

**(!)** *module in development, this is unstable version with incomplete functional.*  

If you found bugs or you have suggestions for improvement, please feel free to submit them to e-mail:
[mailbox@mothgears.com](mailto:mailbox@mothgears.com)

## Installation
[npm](https://www.npmjs.com/package/medulla)  
`npm i -S medulla`
  
[git](https://github.com/mothgears/medulla.git)  
`git clone https://github.com/mothgears/medulla.git`

## Usage
#### Entry point and config
Create an entry point (e.g. server.js) and require medulla with some settings (for example):
```es6
require('medulla')({
    serverApp : "./myApp.js"
    platforms :{
        "win32" : {"forcewatch":false},
        "linux" : {"forcewatch":true}
    }
});
```

#### List of all settings with default values
- `serverApp: "./app.js"`  
Path to your app main module.

- `serverDir: process.cwd()`  
Path to app dir.

- `port: 3000`  
Server port.

- `watch: true`  
If set "true", the server watch for files from watchedFiles and automatically update the cache each time it changes.

- `forcewatch: false`  
Set true if "fs.watch" don't work correctly and server not reacting on file changes.

- `platforms: {}`  
Individual configs for specific platforms (process.platform) in format "platform_name" : {"setting":"value"}.

- `hosts: {}`  
Individual configs for specific hosts (os.hostname()) in format "hostname" : {"setting":"value"}.

- `pluging: {}`  
Server plugins in format "pluginModuleName" : "{plugin-settings}".

- `devPlugins: {}`  
This plugins used only in dev mode (-dev).

- `devMode: false`  
If set "true", the devPlugins will be included.

- `proxyCookieDomain: "localhost"`  
Proxy cookie domain name.

- `logging: {level:'trace', dir:process.cwd(), separatedTypes:false}`  
Async logging to file for "console.log()" and "console.error()" methods.

#### Main module
Create the main module of your app (e.g. myApp.js) and set access rules for files on server use `publicAccess` list
```es6
module.exports.publicAccess = {
    //access rules in format 'url:{params}'
    
    "~*?" : "public_html/~*?", //access to all files from "public_html" folder and subfolders
    "pic/*.png" : "images/*.png", //access to all png files directly from "images" folder
};
```
- `~`  
File dir/path
- `*`  
File name
- `?`  
File extension


Also add `watchedFiles` list (files must exist on server), these files will be watched by server
```es6
module.exports.watchedFiles = {
    //indexed files in format 'url:{params}'
    
    //Templates for search
    "scripts/*.js"      : {type:"cached", src:"bin/*.js"}, //all js files directly from "bin" folder
    
    //Concrete files
    "readme.txt"        : {type:"file"},
    "styles/main.css"   : {type:"cached"},
    "client-script.es6" : {type:"cached", src:"bin/client-script.es6"}
};
```
**(!)** *unlike a `publicAccess` list, this list is not filters or directories, just files, therefore removing or adding this files on server (when medulla is launched) may throw error.*  
**(!)** *don't add modules to watchedFiles, required modules added automatically.*

- `type:"file"`  
Will read file from disc in every request.  
- `type:"cached"`  
Add file content to variable (for each worker).
- `isPage:false`  
Included medulla js code to page (use for html-pages).
  
Default path to file is url, but you may specify it directly use `src` param.  

To share included modules also as js script, use `medulla.require` function instead of `require`:
```es6
const myModule1 = medulla.require('./myModule1.js', {url:'client-module1.js', type:'cached'});
const myModule2 = medulla.require('./myModule2.js', {url:'client-module2.js', type:'file'});
```

Add extra mime types in format {"ext":"mime"}.
```es6
module.exports.mimeTypes : {
    "es6" : "application/javascript"
},
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
    //{target:"mysite.net", isPage:(request.url === '/')} - for proxying this request
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
and open the site in browser (e.g. localhost:3000)

#### Console commands
  - `version` - show current module version  
  - `stop` - shutdown server

## Plugins
Dev plugin for hot reload page, scripts and styles - in development.

## License
MIT
