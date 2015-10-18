var cassandra = require('/usr/lib/node_modules/cassandra-driver'),
    events = require("events"),
    curl = require('/usr/lib/node_modules/curlrequest');

module.exports = {
  // This function sends a request to a node to be added to the ring
	add: function addC(conf, callback) {
    // seed-> the node that managenode runs
    // node-> the canditate node to join ring
    // port-> the port that addnode listen on candidate node
    // retry-> number of retries
    // count-> how many times retry happened so far
    // added-> this value will be returned
    // exit-> if an error happened this var will be true.
    var seed,
        node,
        port,
        retry,
        count,
        added = false,
        exit = false;

    // Give default vaules to variables.
    if (conf.seed == null || conf.node == null) {
      console.error('Please provide seed and ip.');
      return callback(false);
    }
    else {
      seed = conf.seed;
      node = conf.node; 
    }

    if (conf.port == null) {
      port = 8089;
    }
    else {
      port = conf.port;
    }

    if (conf.retry == null) {
      retry = 2;
    }
    else {
      retry = conf.retry;
    }

    if (conf.count == null) {
      count = 1;
    }
    else {
      count = conf.count;
    }

    
    var client = new cassandra.Client({contactPoints: [seed]});

    // Connect to seed node 
    client.connect(function (err) {
      if (err) {
        client.shutdown();
        console.error('There was an error when connecting with Cassandra', err);
        exit = true;
      }
    });

    // Emitted when a new host is added to the cluster.
    // Will make added=true
    client.on('hostAdd', function(host) {
      console.log('Node %s is now UP.', host.address);
      client.shutdown();
      added = true;
    });

    // Emitted when a host in the cluster changed status from up to down.
    // Will make added=true
    client.on('hostUp', function(host) {
      console.log('Node %s is now UP.', host.address);
      client.shutdown();
      added = true;
    });

    // If there wasn't an error send an "add request" to candidate node.
    if (!exit) {
      curl.request({ url: node + ':' + port }, function (err, stdout, meta) {
        console.log(stdout);

        if (err) {
          console.error("Error: ", err);
          client.shutdown();
          return callback(false);
        }

        // If node addded succesfull return true
        if (added) {
          return callback(true);
        }

        // If node wasn't added successfully send another request. 
        if (count < retry) {
          count++;
          setTimeout(addC({seed: seed, node: node, port: port, retry: retry, count: count}, function(added) {
            client.shutdown();
            callback(added);
          }),1000);
        }
        // If retry limit exceeded return false.
        else {
          console.log('Retry limit exceeded.');
          client.shutdown();
          return callback(false);
        }
      });
    }
    // If there was an error return false.
    else {
      return callback(false);
    }     
  },
  // This function sends a request to a node to be decommissioned.
	decommission: function decommission(conf, callback) {
    // seed-> the node that managenode runs
    // node-> the canditate node to join ring
    // port-> the port that addnode listen on candidate node
    // retry-> number of retries
    // count-> how many times retry happened so far
    // added-> this value will be returned
    // exit-> if an error happened this var will be true.
    var seed,
        node,
        port,
        retry,
        count,
        decommissioned = false,
        exit = false;

    // Give default vaules to variables.
    if (conf.seed == null || conf.node == null) {
      console.error('Please provide seed and ip.');
      callback(false);
    }
    else {
      seed = conf.seed;
      node = conf.node; 
    }

    if (conf.port == null) {
      port = 8088;
    }
    else {
      port = conf.port;
    }

    if (conf.retry == null) {
      retry = 2;
    }
    else {
      retry = conf.retry;
    }

    if (conf.count == null) {
      count = 1;
    }
    else {
      count = conf.count;
    }

    var client = new cassandra.Client({contactPoints: [seed]});

    // Connect to seed node
    client.connect(function (err) {
      if (err) {
        client.shutdown();
        console.error('There was an error when connecting with Cassandra', err);
        exit = true;
      }
    });

    // Emitted when a host is removed from the cluster.
    client.on('hostRemove', function(host) {
      console.log('Node %s is not part of the ring anymore.', host.address);
      client.shutdown();
      decommissioned = true;
    });

    // If there wasn't an error send a "remove request" to candidate node.
    if (!exit) {
      curl.request({ url: node + ':' + port }, function (err, stdout, meta) {
        console.log(stdout);

        if (err) {
          console.error("Error: ", err);
          client.shutdown();
          return callback(false);
        }

        // If node decommissioned succesfull return true
        if (decommissioned) {
          return callback(true);
        }

        // If node wasn't decommissioned successfully send another request.
        if (count < retry) {
          count++;
          setTimeout(decommission({seed: seed, node: node, port: port, retry: retry, count: count}, function(decommissioned) {
            client.shutdown();
            callback(decommissioned);
          }),1000);
        }
        // If retry limit exceeded return false.
        else {
          console.log('Retry limit exceeded.');
          client.shutdown();
          return callback(false);
        }
      });
    }
    // If there was an error return false.
    else {
      return callback(false);
    }     
  },
  // This function returns all the nodes of the ring.
	getHosts: function getHosts(callback) {
    var hosts;

    // Open config file.
    var config;
    var json = fs.readFileSync('config.json', "utf8");
    var config = JSON.parse(json);


    // Global variables.
    var seedNode = config.seedNode;
        

    var client = new cassandra.Client({ contactPoints: [seedNode]});

    client.connect(function(err) {
      if (err) {
        client.shutdown();
        return console.error('There was an error when connecting', err);
      }

      hosts = client.hosts.keys();

      client.shutdown();

      return callback(hosts);
    });
  }
}