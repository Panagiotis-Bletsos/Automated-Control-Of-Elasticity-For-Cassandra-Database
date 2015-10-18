
var async = require('/usr/lib/node_modules/async'),
    cassandraDriver = require('/usr/lib/node_modules/cassandra-driver'),
    cassandra = require('./manage-cassandra'),
    ganglia = require('./ganglia'),
    curl = require('/usr/lib/node_modules/curlrequest'),
    fs = require('fs'),
    url = require('url');

// Open config file.
var config;
var json = fs.readFileSync('config.json', "utf8");
var config = JSON.parse(json);


// Global variables.
var stats,
    checkStats = 0,
    cpu_total = 0,
    cpu_average = 0,
    started = false,
    stats_to_add = config.stats_to_add;
    stats_to_remove = config.stats_to_remove;
    retry = config.retry;
    timeout = config.timeout;
    seedNode = config.seedNode;
    total_available_hosts = config.total_available_hosts;
    numNodesToAdd = config.nodes_to_add;
    numNodesToRemove = config.nodes_to_remove;
    minNumOfNodes = config.min_nodes_online;

// Run forever.
async.whilst(
  function () { return true; },
  function (callback) {
    async.series([
      function (callback) {

        // Get stats from Ganglia.
        cassandra.getHosts(function (hosts) {
          stats = null;
          stats = ganglia.getStats(hosts, config.total_available_hosts, seedNode);

          // Get the total cpu of online nodes for five minutes.
          cpu_total += stats.cpu;

          checkStats++;

          return callback();
        });

      },
      function (callback) {
        if (checkStats == timeout) {
          console.log('New cycle');

          // Get the average cpu usage of online nodes every five minutes and check
          // if nodes have to add or to remove
          cpu_average = cpu_total / 5;

          console.log("Average CPU");
          console.log(cpu_average);


          cpu_total = 0;
          checkStats = 0;

        // If average cpu usage is over 25% add two more nodes.
          if (cpu_average > stats_to_add) {

            // Check if there is enough nodes in your cluster to add.
            if (stats.inactive.length < numNodesToAdd) {

              console.error('There is not enough nodes to add.');

              return callback();

            //END IF
            }
            else {
              // Randomly choose two nodes (IPs) to add.
              var nodesToAdd = stats.inactive.slice(0,numNodesToAdd);

              console.log("Nodes to add");
              console.log(nodesToAdd);

              // Variable to check when function have to end.
              var remainingNodesToAdd = 0;

              async.eachSeries(nodesToAdd, function eachSeries(node, callback) {

                // Adding procedure have started.
                // Program have to stop until node is added, or fail to be added, to the ring.
                started = true;

                // by [Datastax Documentation] - You have to wait two minutes before you add another node.
                // Check if function have to wait two minutes to add another node.
                // If node failed to be added to the cluster, don't wait.
              
                var shouldWait = true;

                // Add a node to the ring.
                cassandra.add({seed: seedNode, node: node}, function connect(isConnected) {
                  // Check if node added or not.
                  if (isConnected) {
                    console.log('Added to ring.');
                  }
                  else {
                    console.error('Could not be added to ring.');
                    shouldWait = false;
                  }

                  // Adding procedure have finished.
                  started = false;

                  remainingNodesToAdd++;
                
                  if (remainingNodesToAdd == numNodesToAdd) {
                    setTimeout(function timeout1() { return callback(); }, 1000);
                  }
                  else if (shouldWait) {
                    console.log('wait 2 minutes');
                    setTimeout (function wait2min(){ return callback(); }, 120100);
                  }
                  else if (!shouldWait) {
                    setTimeout(function timeout1() { return callback(); }, 1000);
                  }

                //END CONNECT
                });

              //END EACHSERIES  
              },
              // Procedure have tried to be add all nodes to the cluster.
              // Finish.
              function (err) {
                if (err) return next(err);

                return callback();
              }
              );

            //END ELSE
            }

          //END IF STATS
          }
          // If average cpu usage is above 17% decommission (two) nodes.
          else if (cpu_average < stats_to_remove) {
            //console.log("Average cpu");
            //console.log(stats.cpu);

            // Number of active nodes.
            var numActiveNodes = stats.active.length;

            console.log("Active nodes");
            console.log(stats.active);

            // Check if there are enough nodes in the ring to be removed.
            if ((numActiveNodes - minNumOfNodes) < numNodesToRemove) {

              console.error('There is not enough nodes to remove.');

              return callback();

            //END IF
            }
            else {
              // The nodes that will be removed from ring.
              var nodesToRemove = [];

              var count = numNodesToRemove,
                      i = 0;

              // Choose randomly the nodes that will be removed from cluster.
              // Seed node is exluded.
              do {
                if (stats.active[i] != '127.0.0.1') {
                  nodesToRemove.push(stats.active[i]);
                  count--;
                }
                i++;
              } while (count != 0 && i < numActiveNodes);

              var remainingNodesToRemove = 0;

              console.log("Nodes to remove");
              console.log(nodesToRemove)

              async.eachSeries(nodesToRemove, function eachSeries(node, callback) {

                started = true;

                var shouldWait = true;

                cassandra.decommission({seed: seedNode, node: node}, function dec(isDecommissioned) {
                  if (isDecommissioned) {
                    console.log('Removed from ring.');
                  }
                  else {
                    console.error('Could not be removed from ring.');
                    shouldWait = false;
                  }

                  started = false;

                  remainingNodesToRemove++;
                
                  if (remainingNodesToRemove == numNodesToRemove) {
                    setTimeout(function timeout1() { return callback(); }, 1000);
                    //return callback();
                  }
                  else if (shouldWait) {
                    console.log('Wait two minutes to start the decommission of another node.');
                    setTimeout (function wait2min(){ return callback(); }, 120100);
                  }
                  else if (!shouldWait) {
                    setTimeout(function timeout1() { return callback(); }, 1000);
                  }

                //END CONNECT
                });

              //END EACHSERIES  
              },
              function (err) {
                if (err) return next(err);

                return callback();
              }
              );

            //END ELSE
            }
          // END ELSE IF (STATS < CPU_AVERAGE)
          }
          // If there is no operation (add, decommission) to do just continue.
          else if (!started) {
            callback();

          //END ELSE IF
          }
        //END IF CHECK STATS
        }
        else {
          return callback();
        }

    //END FUNCTION
    }
    ],function (err) {
      if (err) return next(err);

      // Wait five minutes and check again the stats.
      
      setTimeout(function () {
        return callback();
      },60100);
    });
  },
  // This function will be called only if the execution of the daemon stoped with an error.
  function (err) {
    if (err) return next(err);

    console.log('end');
  }
);

// process.on('uncaughtException', function (err) {
//   console.log(err);
// })