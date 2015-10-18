# Automated Control Of Elasticity For The NoSQL Dabase Cassandra

## Abstract
This project was the result of the work of [Nikos M. Anninos](https://github.com/maliaris7) and [Panos Bletsos](https://github.com/Panagiotis-Bletsos) for the course "Big Data Management" at Ionian University, Department of Informatics. The goal of this project is to resize automaticaly the NoSQL database <b>Cassandra</b> based on user's configurations. We used Okeanos platform to create our VMs and Ganglia monitoring tool to check the load. In our approach only the CPU usage of the cluster is being measured and according to user's policy the app adds or removes, as many nodes as the user has definied, from Cassandra's ring.

## Prerequisites
To use this app you have to install the following tools first.
<p></p>
* Cassandra v. 2.0.15
* Ganglia Monitoring Tool v 3.6.0
* nodejs
  * cassandra-driver
  * async
  * shelljs
  * xml2js
  * curlrequest
  
## Architecture

![Architecture of the system](https://github-cloud.s3.amazonaws.com/assets/5760599/10566297/33462b6c-75ec-11e5-855e-64008c2a856a.jpg)

The app is differentiated in two parts.
 The first one is the daemons that run on <b>Master Node</b> (master node could be any node of the Cassandra's ring, preferably a seed node with the most resources). This node checks the load of the cluster and adds or removes nodes from it according to the configurations.
Note that this is the node that `ganglia-gmetad` is running too.
  The second part is the one that runs on remaining nodes of Cassandra's ring and and listens to requests from Master Node to be added or to be removed from the ring.
 
### Monitoring

System checks for the cpu load every minute and after 5 minutes the average of the 5 last checks is being computed. If that average is above the `max_cpu_load` that user definied then the system add nodes to ring, else if the average is below the `min_cpu_load` then the system remove nodes, otherwise no op is happening.

### Manage Nodes

If nodes have to be added to the system adds as many nodes as the user definied.

To do so, Master Node chooses randomly nodes that are not part of the cluster and sends a request to be added to it. A request is being sent as many times as the user defined or until the node was added to the cluster succesfuly, then a request is being sent to the next node.

The same procedure it being followed when nodes have to be removed from the ring.

