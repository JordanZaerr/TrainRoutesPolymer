var express = require("express"),
	http = require("http"),
	path = require("path"),
	request = require("request"),
	parser = require("xml2js"),
	Q = require("q"),
	imageMap = {"701":"img/blue.png", "703":"img/red.png", "704":"img/green.png", "720":"img/purple.png"},
	app = express();

app.set('port', (process.env.PORT || 3000));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/route', function(req,res){
	var routeNum = req.query.number || "703";
	var routesToGrab = [];

	if(routeNum == '-1'){
		routesToGrab = [
		getTrainData("701"),
		getTrainData("703"),
		getTrainData("704"),
		getTrainData("720")
		];
	}
	else{
		routesToGrab.push(getTrainData(routeNum));
	}

	Q.all(routesToGrab)
	.then(function(values){
		var flattened = values.reduce(function(p,c){ return p.concat(c); }, []);
		res.send(JSON.stringify(flattened));
	})
	.catch(function(error){
		console.log('Error with getting route data: ' + error);
	});
});

function getTrainData(routeNum){
	var deferred = Q.defer();
	var result = request("http://api.rideuta.com/SIRI/SIRI.svc/VehicleMonitor/ByRoute?route=" + routeNum + "&usertoken=UOJCQBT0TIZ",
		function(error, response, body){
			var trainData = [];	
			parser.parseString(body, function(err, result){
				if(err || !result.Siri){
					deferred.reject(err || 'Invalid response');
					return;
				}
				var trains = result.Siri.VehicleMonitoringDelivery[0].VehicleActivity[0].MonitoredVehicleJourney;
				if(!trains) return;
				trains.forEach(function(train){
					trainData.push({
						"direction" : train.DirectionRef[0].toLowerCase(),
						"vehicleId" : train.VehicleRef[0],
						"longitude" : train.VehicleLocation[0].Longitude[0],
						"latitude" : train.VehicleLocation[0].Latitude[0],
						"icon" : imageMap[routeNum] || 'img/black.png'
					});
				});
			});
			deferred.resolve(trainData);
		});
	return deferred.promise;
};

var server = app.listen(app.get('port'), function(){
	console.log('Listening on port %d', server.address().port);
});