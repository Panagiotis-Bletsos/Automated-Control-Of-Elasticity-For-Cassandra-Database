// Dependencies

var http = require('http'),
    url = require('url'),
    exec = require('child_process').exec,
    async = require('/usr/local/lib/node_modules/async');
 
/*
* Server Config
*/
// Insert the ip and the port that this daemon will run.
var host = "xxx.xxx.xxx.xxx",
    port = "8089",
    thisServerUrl = "http://" + host + ":" + port;
 
/*
* Main
*/
var server = http.createServer(function (req, res) {
  async.series([
    //Stop cassandra daemon.
    function(callback) {
      var stopCassandra = exec('sudo pkill -f CassandraDaemon', function (error, stdout, stderr) {
        var result = "command: stopCassandra"

        console.log(result);

        callback();
      });
    },
    // Remove old data
    function(callback) {
      setTimeout(function() {
        var removeData = exec('sudo rm -rf /var/lib/cassandra/data/*', function (error, stdout, stderr) {
          var result = 'command: removeData {"stdout":' + stdout + '}';
          res.write(result + '\n');
          console.log(result);

          callback();
        });
      },1000);
    },
    // Remove old log files.
    function(callback) {
      setTimeout(function() {
        var removeLog = exec('sudo rm -rf /var/lib/cassandra/commitlog/*', function (error, stdout, stderr) {
          var result = 'command: removeLog {"stdout":' + stdout + '}';
          res.write(result + '\n');
          console.log(result);

          callback();
        });
      }, 1000);
    },
    // Remove old caches.
    function(callback) {
      setTimeout(function() {
        var removeCache = exec('sudo rm -rf /var/lib/cassandra/saved_caches/*', function (error, stdout, stderr) {
          var result = 'command removeCache {"stdout":' + stdout + '}';
          res.write(result + '\n');
          console.log(result);

          callback();
        });

      }, 1000); 
    },
    // Start cassandra
    function(callback) {
      setTimeout(function() {
        var startCassandra = exec('sudo cassandra', function (error, stdout, stderr) {
          var result = 'command startCassandra {"stdout":' + stdout + '}';
          res.write(result + '\n');

          console.log(result);

          callback();
        });
      }, 1000);
    }
    ], function(err) { 
        if (err) return next(err);
        res.end('done\n');
    });
 
}).listen(port, host);

// request timeout
// Change this value according to the time that "start" takes to complete.
server.timeout = 3600000;
console.log('Server running at ' + thisServerUrl );