// Dependencies

var http = require('http'),
    url = require('url'),
    exec = require('child_process').exec;
    async = require('async');
 

// Server Config

var host = "xxx.xxx.xxx.xxx",
    port = "8088",
    thisServerUrl = "http://" + host + ":" + port;
 

// Main

var server = http.createServer(function (req, res) {
 
  res.writeHead(200, {'Content-Type': 'text/plain'});
 
  async.series([
    function(callback) {
      // Deactivate a node by streaming its data to another node.
      var decommission = exec('nodetool -h localhost decommission', function (error, stdout, stderr) {
        var result = 'command: decommission {"stdout":' + stdout + '}';
        res.write(result + '\n');

        callback();
      });
    },

    function(callback) {
      // Stop Cassandra Daemon.
      setTimeout(function() {
        var stopCassandra = exec('sudo pkill -f CassandraDaemon', function (error, stdout, stderr) {
          var result = 'command: kill Cassandra Daemon {"stdout:' + stdout + '}';
          res.write(result + '\n');

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
// Change this value according to the time that decommission takes to complete.
server.timeout = 3600000;
console.log('Server running at ' + thisServerUrl );