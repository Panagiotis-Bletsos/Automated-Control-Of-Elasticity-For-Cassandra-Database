var util = require('util'),
    shelljs = require('/usr/lib/node_modules/shelljs/global'),
    parseString = require('/usr/lib/node_modules/xml2js').parseString;
//exporting ganglia module 
module.exports = {
	//function responsible for colection and calculation of the cpu load.
	//parameters:
	//	hosts = table of active ganglia nodes ip's
	//totalAvailableHosts = hosts that can be added to the cluster if needed
	//	node = ip of node from witch the ganglia api will return the stats
	//	p = port used for the api request
	getStats: function getStats(hosts, totalAvailableHosts, node, p) {
    var xml = "",
        cpu = [],
        host = [],
        mem = [],
        total_cpu = 0,
        total_mem = [],
        t_mem = 0,
        total_free_mem = 0,
        average_cpu = 0,
        //number of available virtual machines
        host_num = totalAvailableHosts,
        free_mem_per = 0,
        active_nodes = [],
        inactive_nodes = [],
        ip,
        port;

    if (node == null) {
      console.error('Please provide ip to connect with ganglia.');
      return null;
    }
    else {
      ip = node;
    }

    if (port == null) {
      port = '8651';
    }
    else {
      port = p;
    }

	//execute netcat to create conection to the ganglia api and get the aggregated xml
    xml = exec('nc ' + ip + '  ' + port, {silent:true}).output;

	//parse aggregated xml string
    parseString(xml,{explicitCharkey : true }, function (err, result) {
    	
    	//itterate all active vm stats
      for (i = 0; i < host_num; i++){
      	
      	//get host ip
        host[i] = result.GANGLIA_XML.GRID[0].CLUSTER[0].HOST[i].$.IP;
        
        //get total ram of vm
        total_mem[i] = +result.GANGLIA_XML.GRID[0].CLUSTER[0].HOST[i].METRIC[25].$.VAL/(1024*1024);
        
        //get user cpu load
        var temp_cpu1 = +result.GANGLIA_XML.GRID[0].CLUSTER[0].HOST[i].METRIC[23].$.VAL;
        
        //get system cpu load
        var temp_cpu2 = +result.GANGLIA_XML.GRID[0].CLUSTER[0].HOST[i].METRIC[14].$.VAL;
        
        //total cpu load of vm
        cpu[i] = temp_cpu1 + temp_cpu2;
        //get amount of free ram of vm
        mem[i] = result.GANGLIA_XML.GRID[0].CLUSTER[0].HOST[i].METRIC[22].$.VAL/(1024*1024);
      }
    });

    for (i = 0; i < host_num; i++) {
    	//flag used to find inactive cassandra nodes
      var isInactive = true;

      for (j = 0; j <hosts.length; j++) {
			//cross reference active vm ips with active ganglia nodes ips in order to calculate the load of only the active ganglia nodes
        if (hosts[j].split(":",1) == host[i]) {
          total_cpu += cpu[i];
          total_free_mem += mem[i];
          t_mem += total_mem[i];
          active_nodes.push(host[i]);
          //flag the node as active cassandra node
          isInactive = false;
        }
      }
      
      //The ganglia api returns '127.0.0.1' instead of the actual ip of the vm whitch responds to the api call, causing the cross reference to 
		//exclude it ,thus flaging it as an inactive cassandra node , this statment  != '127.0.0.1' is used to exclude it from the inactive nodes array
      if (isInactive && host[i] != '127.0.0.1') {
        inactive_nodes.push(host[i]);
      }
      
		//The ganglia api returns '127.0.0.1' instead of the actual ip of the vm whitch responds to the api call, causing the cross reference to 
		//exclude it,this exeption is used to prevent the vm from being excluded from the calculation of the cpu load.
      if (host[i] == '127.0.0.1') {
        total_cpu += cpu[i];
        total_free_mem += mem[i];
        t_mem += total_mem[i];
        active_nodes.push(host[i]);
      }
    }
    
	//calculate average cpu load
    average_cpu = Math.round (total_cpu/hosts.length);
    //calculate percentage of free ram in the cluster
    free_mem_per = Math.round(( total_free_mem/t_mem)*100);
    
	//return object containing tha average cpu load , the percentage of free ram and tha active ganglia nodes ips
    var stats = { cpu:average_cpu , mem:free_mem_per , active:active_nodes, inactive:inactive_nodes };
    return stats;
  }
}