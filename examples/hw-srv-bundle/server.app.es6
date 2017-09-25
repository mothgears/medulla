const sayHello = require('./say-hello.es6');

module.exports.onRequest = io=>io.send(sayHello('world'));