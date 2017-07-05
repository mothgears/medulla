# Medulla
`medulla` is a simple, no-dependency node.js server.

## Features
- The server use several workers for **multithreaded** request handling.
- **Caches files** from `watchedFiles` list (use for scripts, styles, texts etc.)
- **Do no need "demonizers" and manually restarting**, set [flag](#list-of-all-settings-with-default-values) `watch:true` 
and server will do restart workers when detect changes in app modules, 
and update cache when changed scripts (files with [prop](#main-module) `type:cached`).
- Can work as a **proxy server** and forwarding requests to the specified domain.
- Supports the **logging to files** for commands `console.log()`, `consol.warn()`, `console.error()`.
- Has [plugin](https://www.npmjs.com/package/medulla-hotcode) fot **hot reload css-slyles, js-scripts, and auto refreshing page** even as proxy (external dev-server mode).

**(!)** *module in development, this is unstable version with incomplete functional.*  
If you found bugs or you have suggestions for improvement, please feel free to submit them to e-mail:
[mailbox@mothgears.com](mailto:mailbox@mothgears.com)

## Installation
As [npm](https://www.npmjs.com/package/medulla) package  
`npm i -S medulla`
  
As [git](https://github.com/mothgears/medulla.git) repository  
`git clone https://github.com/mothgears/medulla.git`

## Plugins
- [medulla-hotcode](https://www.npmjs.com/package/medulla-hotcode)  
Plugin for hot reload pages, scripts and styles directly in browser.

## Usage
#### Entry point and config
Create an entry point (e.g. server.js) and require medulla with some settings (for example):
```es6
//server.js

require('medulla')({
    serverApp : "./myApp.js"
    platforms :{
        "win32" : {"forcewatch":false},
        "linux" : {"forcewatch":true}
    }
});
```
**(!)** *if you change this file, you need restart medulla.*  


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
Set true if "fs.watch" don't work correctly (with some OS/IDE) and server not reacting on file changes.

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
Proxy cookie domain name (for proxy mode).

- `logging: {level:'trace', dir:process.cwd(), separatedTypes:false}`  
Async logging to file for "console.log()", "console.warn()" and "console.error()" methods.  
  - `level: 'trace'`  
  is min level for logging, can be "trace", "warning" or "error".
  - `dir: process.cwd()`  
  directory for .log files.
  - `separatedTypes: false`  
  split log into several files by level.
  
- `watchIgnore: {f=>f.endsWith('___jb_tmp___'), f=>f.endsWith('___jb_old___')}`  
Rules for ignoring files when watching (does not apply to `required` modules)  
Example: `(path) => return true if need ignore this file or directory`

#### Main module
Create the main module of your app (e.g. myApp.js) and set access rules for files on server use `publicAccess` list:
```es6
//myApp.js

module.exports.publicAccess = {
    //access rules in format 'src:{params}'
    
    "readme.txt"      : "readme.txt",
    "public_html/~*?" : "~*?", //access to all files from "public_html" folder and subfolders
    "images/*.png"    : "pic/*.png", //access to all png files directly from "images" folder
};
```
- `~`  
File dir/path
- `*`  
File name
- `?`  
File extension


Also add `watchedFiles` list (files must exist on server), these files will be watched by server if `watch: true`:
```es6
//myApp.js

module.exports.watchedFiles = {
    //indexed files in format 'src:{params}'
    
    //Templates for search
    "bin/*.js" : {type:"cached", url:"scripts/*.js"}, //all js files directly from "bin" folder
    
    //Concrete files
    "styles/main.css"       : {type:"cached"},
    "bin/client-script.es6" : {type:"cached", url:"client-script.es6"}
};
```
**(!)** *don't add modules to watchedFiles, required modules added automatically.*  
**(!)** *this list is creating watchers, therefore on some OS, directories which contain this files/folders may be blocked for rename or delete till template target-files/folders will not be removed from `watchedFiles` list or from disk.*  

- `type:"cached"`  
*(Default value)*  
Add file content to variable (for each worker).
- `type:"file"`  
Will read file from disc in every request.  
- `isPage:false`  
If set is true, medulla js code (plugins) will be included to this page (use for all html-pages).
  
Default url is path to file, but you may specify it directly use `url` param.  

To share included modules also as js script, use `medulla.require` function instead of `require`:
```es6
//Sample

const myModule1 = medulla.require('./myModule1.js', {url:'client-module1.js', type:'cached'});
const myModule2 = medulla.require('./myModule2.js', {url:'client-module2.js', type:'file'});
```

Add extra mime types in format {"ext":"mime"}:
```es6
//myApp.js

module.exports.mimeTypes : {
    "es6" : "application/javascript"
},
```

Describe the worker function:
```es6
//myApp.js

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

## License
MIT
