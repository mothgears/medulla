# Medulla
multithreaded, no-dependency node.js server.

## Features
- **Quickly start** of app developing.
- [**Multithreaded**](#common-variables) request handling.
- **Caching files** from `watchedFiles` list (use for scripts, styles, texts etc.)
- **Automatically restart server** on app source changing. Set flag `watch:true` in configs, 
and server will do restart workers when detect changes in app modules, 
and update cache when changed scripts (files with [prop](#main-module) `type:cached`).
- **Built-in proxy** for forwarding requests.
- **Logging to files** for commands `console.log() / .warn() / .error()` if set.
- **Hot reload slyles and scripts, and auto refreshing page** using special [plugin](https://www.npmjs.com/package/medulla-hotcode).

```es6
//launcher.conf.js

const medulla = require('medulla');
medulla.launch({});
```

```es6
//app.js

module.exports.onRequest = (request, response)=>{
    if (request.url !== '/') return 404;
    response.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});
    response.write('Hello World!');
    return 1; 
};
```

**(!)** *module in development, this is unstable version with incomplete functional.*  
If you found bugs or you have suggestions for improvement, please feel free to submit them to e-mail:
[mailbox@mothgears.com](mailto:mailbox@mothgears.com)

## Installation
As [npm](https://www.npmjs.com/package/medulla) package  
`npm i -S medulla`
  
As [git](https://github.com/mothgears/medulla.git) repository (with examples)  
`git clone https://github.com/mothgears/medulla.git`

## Plugins
- [medulla-hotcode](https://www.npmjs.com/package/medulla-hotcode)  
Plugin for hot reload pages, scripts and styles directly in browser.

## Usage
#### Server launcher and config
Create launcher (e.g. launcher.conf.js) and require medulla with some settings (for example):
```es6
//launcher.conf.js

const medulla = require('medulla');

medulla.launch({
    serverApp : "./myServerApp.js"
    platforms :{
        "win32" : {"forcewatch":false},
        "linux" : {"forcewatch":true}
    }
});
```
**(!)** *if you change this file, you need restart medulla manually.*  

List of all available settings with default values:
- `serverApp: "./app.js"`  
Path to your app entry point.

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

- `logging: {level:medulla.flags.LOG_TRACE, dir:process.cwd(), separatedTypes:true}`  
Async logging to file for "console.log()", "console.warn()" and "console.error()" methods.  
  - `level: flags.LOG_TRACE`  
  min level for logging, can be: LOG_TRACE, LOG_WARNING or LOG_ERROR.
  - `dir: process.cwd()`  
  directory for .log files.
  - `separatedTypes: true`  
  split log into several files by level.
  
- `watchIgnore: {...}`  
Rules for ignoring files when watching
Represents a list of functions which return true if need ignore this file or directory.

- `dashboardPassword: null`  
Password for dashboard, if set, use: `http://yoursite/dashboard?password=yourpass`

- `includeSettings: true`  
if set true, plugin client code by default will be included to all routes

#### App main module (entry point)
Create the server-side main module of your app (e.g. myServerApp.js) and set access rules for files on server use `publicAccess` list:
```es6
//myServerApp.js

module.exports.publicAccess = {
    //access rules in format 'src:url'
    
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


Next, add `watchedFiles` list, these files will be watched by server (if medulla config `watch: true`) and cached (if file/template param `type:"cached"`):
```es6
//myServerApp.js

module.exports.watchedFiles = {
    //indexed files in format 'src:{params}'
    
    //set templates
    "bin/*.js" : {type:"cached", url:"scripts/*.js"}, //all js files directly from "bin" folder
    "styles/~*.css" : {type:"cached"} //all css files from "bin" folder and subfolders
    
    //or concrete files
    "styles2/main-new.css"  : {type:"cached"},
    "bin/client-script.es6" : {type:"cached", url:"client-script.es6"}
};
```
**(!)** *don't add modules to watchedFiles, required modules added automatically.*  
**(!)** *this list is creating watchers, therefore on some OS, directories which contain this files/folders may be blocked for rename or delete till template target files/folders will not be removed from `watchedFiles` list.*  

- `type:"cached"`  
*(Default value)*  
Add file content to variable (for each worker).
- `type:"file"`  
Will read file from disc in every request.  
- `includePlugins:false`  
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
//myServerApp.js

module.exports.mimeTypes : {
    "es6" : "application/javascript"
},
```

Describe routes
```es6
//myServerApp.js

module.exports.routes = {
    '':()=>{ //index page
        return '<html><body>Hello World!</body></html>';
    },
    
    'about/{beast}':(beast)=>{
        if (beast === 'rat') return 'rat is small';
        else if (beast === 'horse') return 'horse is big';
        else return {code:404}
    }
};
```
if you need 'get' data in route like `mysite.net/user/marko?info=age` use:
```es6
'user/{name}':(name, {GET})=>{ //index page
    return users[name][GET.info];
},
```

**also** you may describe the worker function for manually request handling:
```es6
//myServerApp.js

module.exports.onRequest = (request, response)=>{
    if (request.url !== '/') return 404;

    response.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});
    response.write('<html><body>Hellow World!</body></html>');
    
    return 1; 
    //1   - for including medulla-plugins code in responce body (use with html pages)
    //404 - for "404 Not Found"
    //0   - pure responce, use in other cases (json or other api data)
    //{target:"mysite.net", includePlugins:(request.url === '/')} - for proxying this request
};
```

#### Start server
For start the server run the laucher:
```
node launcher.conf.js
```

or for start the server with dev plugins, run it with parameter:
```
node launcher.conf.js -dev
```
and open the site in browser (e.g. `localhost:3000`)

#### Common variables
You may share variables between workers using `medulla.common` method like this:
```es6

module.exports.onRequest = (request, response)=>{
    if (request.url !== '/') return 404;

    //Counter of requests
    medulla.common(storage=>{
        storage.counter = storage.sharedVariable || 0;
        storage.sharedVariable++;
        console.info('Requests: ' + storage.sharedVariable)
    });

    response.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});
    response.write('<html><body>It works!</body></html>');
    
    return 1; 
};
```
#### Dashboard
You may see server status, or stop server use link: 
`http://yoursite/medulla_dashboard` (e.g. `localhost:3000/medulla_dashboard`)  
(or `http://yoursite/medulla_dashboard?password=yourpass` if `settings.dashboardPassword` is set)

#### Console commands
  - `version`  
  Show module current version.
  - `stop`  
  Shutdown server.

## License
MIT
