    //Leaflet Map Section
    var map = L.map('map').setView([40.7, -111.9], 10);

  // load a tile layer
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.streets',
        accessToken: 'pk.eyJ1IjoiZHlsYW53b290dG9uIiwiYSI6ImNqamJ1NTQ0ZzN1cG8za29ncXdndHVkYTMifQ.QfUWU-MMXDfus5OMeRCf0Q'
    }).addTo(map);
    
   // load GeoJSON from an external file
  $.getJSON("data/oneRecord.geojson",function(data){
    // add GeoJSON layer to the map once the file is loaded
    L.geoJson(data,{
    pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {icon: ((feature.properties.PPM > .5) ? readingB : readingG)});
        }
    }).addTo(map);
    L.geoJson(data,{
        onEachFeature: function(feature, layer) {
            if (feature.properties && feature.properties.Sensor) {
                layer.bindPopup(feature.properties.Sensor, {closeButton: false, offset: L.point(0, -20)});
                layer.on('mouseover', function() { layer.openPopup(); });
                layer.on('mouseout', function() { layer.closePopup(); });
            }
        },
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {icon: ((feature.properties.PPM > .5) ? readingB : readingG)});
        }
    }).addTo(map);
    
    var legend = L.control({position: 'topright'});

    legend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'info legend'),
            grades = ["Sensor"],
            labels = ['good.png'];
    
        // loop through our density intervals and generate a label with a colored square for each interval
        for (var i = 0; i < grades.length; i++) {
            div.innerHTML +=
                grades[i] + (" <img src="+ labels[i] +" height='30' width='30'>") +'<br>';
                div.style.padding = "10";
                div.style.opacity = ".8";
                div.style.color = "black";
                div.style.backgroundColor = "#cccccc";

        }
    
        return div;
    };
    
    legend.addTo(map);
    
   });
  // Signal Analysis Section
  var modelData = [];
  
  // sets up the lats and lons for finding the closest model point
  var lats = [40.81048, 40.78696, 40.76345, 40.73993, 40.71642, 40.69291, 40.66939, 40.64588, 40.62236, 40.59885], 
      lons = [-111.713403, -111.7325994, -111.7517958, -111.7709922, -111.7901886, -111.809385, -111.8285814, -111.8477778, -111.8669742, -111.8861706, -111.905367, -111.9245634, -111.9437598, -111.9629562, -111.9821526, -112.001349],
      times = [],
      timesNumeric = [];
      
    // sets up the times to find closest time point on model
    
    let initialTime = new Date(2018,2,1,7)
       ,endTime     = new Date(2018,2,13,7)
       ,hourMillisec =  60 * 60 * 1000
   ;
   
   // Add an extra hour to each time point for the model
    for (let q = initialTime; q <= endTime; q = new Date(q.getTime() + hourMillisec)) {
      times.push(q);
      timesNumeric.push(q);
    }
    
  var processedData;
  
  //grabs the JSON data from sensors and model
  $.getJSON("data/AllSensorData.json",function(data){
      $.getJSON("data/stacked.json",function(stackedData){
            var spikeSelectDiv = d3.select(".spike-selector");
            
            //runs the signal detection code on the data
            processedData = performSignalDetection(data);

            var spikes = [];
            var modelPts = [];
            
            processedData.forEach(function(monitor){ // for each air quality monitor 
                if(isEmpty(monitor.signalDetection)|| !monitor.signalDetection){ //if it doesn't have any recordings, skip
                    return;
                }
                
                // determine the closest point in the model to the sensor
                let closestLat = closest(lats,monitor.coordinates[0]);
                let closestLon = closest(lons,monitor.coordinates[1]);
                let closestTimeIndex;

                for (var i = 0; i < monitor.signalDetection.signals.length-2 ; i++) { //for each measurment in the monitor

                    if ( parseInt(monitor.values[i+60].value) > 50 ){//&& monitor.signalDetection.signals[i][1] === 1 ) { //if the signal value is 1 (ie there is a peak), signals is not offset at there is no

                        
                        let spikeModelPts = []


                        // and find the closest time corresponding to that
                        closestTimeIndex = closestIndx(timesNumeric, Date.parse(monitor.values[i+60].date)) // parses the date to a number and and finds the closest value
                        let closestTimeIndexBeforeBefore = closestIndx(timesNumeric, Date.parse(monitor.values[i+60].date)-7200000)
                        let closestTimeIndexBefore = closestIndx(timesNumeric, Date.parse(monitor.values[i+60].date) -3600000) // parses the date to a number and and finds the closest value
                        let closestTimeIndexAfter = closestIndx(timesNumeric, Date.parse(monitor.values[i+60].date)+3600000) // parses the date to a number and and finds the closest value
                        let closestTimeIndexAfterAfter = closestIndx(timesNumeric, Date.parse(monitor.values[i+60].date)+7200000)
                        // add preceding model point
                        
                        spikeModelPts.push(stackedData.filter(function(point){
                            return point.lat == closestLat &&
                                  point.long == closestLon &&
                                  point.x == closestTimeIndexBeforeBefore;
                        }));
                        
                        spikeModelPts[spikeModelPts.length-1].time =  times[closestTimeIndexBeforeBefore];
                        
                        spikeModelPts.push(stackedData.filter(function(point){
                            return point.lat == closestLat &&
                                  point.long == closestLon &&
                                  point.x == closestTimeIndexBefore;
                        }));
                        
                        spikeModelPts[spikeModelPts.length-1].time =  times[closestTimeIndexBefore];
                        
                        //push the closest model point onto array
                        spikeModelPts.push(stackedData.filter(function(point){
                            return point.lat == closestLat &&
                                   point.long == closestLon &&
                                   point.x == closestTimeIndex;
                        }));
                        spikeModelPts[spikeModelPts.length-1].time =  times[closestTimeIndex];
                        
                        // add subsequent model point
                        spikeModelPts.push(stackedData.filter(function(point){
                            return point.lat == closestLat &&
                                  point.long == closestLon &&
                                  point.x == closestTimeIndexAfter;
                        }));
                        spikeModelPts[spikeModelPts.length-1].time =  times[closestTimeIndexAfter];
                        
                        // add subsequent model point
                        spikeModelPts.push(stackedData.filter(function(point){
                            return point.lat == closestLat &&
                                  point.long == closestLon &&
                                  point.x == closestTimeIndexAfterAfter;
                        }));
                        spikeModelPts[spikeModelPts.length-1].time =  times[closestTimeIndexAfterAfter];
                        
                        spikes.push({
                            id: monitor.id,
                            coordinates: monitor.coordinates,
                            closestModel: [closestLat,closestLon],
                            measurements: monitor.values.slice(i,i+120),// offset by 60 as the lag offsets the dates/times
                            reading: monitor.signalDetection.signals[i],
                            signal: monitor.signalDetection.signals.slice(i-60,i+60),
                            modelData: spikeModelPts
                        });
                    }
                }
            })
        // grabs only one spike per hour
        spikes = findValidSpikes(spikes);
        // adds a button for each of the spikes
        var spikeDivs = spikeSelectDiv.selectAll("div")
            .data(spikes)
            .enter()
            .append("button")
            .classed("btn",true)
            .classed("btn-primary",true)
            .attr("box-sizing", "border-box")
            .classed("spikes",true)
            .html(function(d){
                return d.id + "<br/> "+ d.measurements[60].date.slice(0,17)
            });
        
        // attaches functionality to a click event    
        var spikePtsForBinding, modelPtsForBinding;
        $('.spikes').click(function(){
            spikePtsForBinding = $.extend(true,{},spikes);
            let spikeIndex = $('.spikes').index(this);
            $(this).toggleClass('clicked')
            var svg = d3.select("svg");
            svg.selectAll("*").remove();
            modelPtsForBinding = spikes[spikeIndex].modelData;
            map.setView(spikePtsForBinding[spikeIndex].coordinates, 13)
            drawChart(spikePtsForBinding[spikeIndex].measurements, modelPtsForBinding)
            console.log(modelPtsForBinding)
        });
        
        // Changes styling if button is hovered
        $('.spikes').hover(function(){
            $(this).toggleClass('hover')
        });

        
        var svg = d3.select("svg"),
            margin = {top: 20, right: 20, bottom: 30, left: 50},
            width = +svg.attr("width") - margin.left - margin.right,
            height = +svg.attr("height") - margin.top - margin.bottom,
            g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        
        
        let spikeZero = $.extend(true,{},spikes[0].measurements);
        drawChart(spikeZero, modelPts.slice(0,4))
      });    
   });

  var readingG = L.icon({
        iconSize: [27, 27],
         iconAnchor: [13, 27], 
         popupAnchor:  [1, -24],
        iconUrl: 'good.png',
    });
    
    var readingB = L.icon({
        iconSize: [27, 27],
        iconAnchor: [13, 27],
        popupAnchor:  [1, -24],
        iconUrl: 'bad.png',
    });
    
/**
 * This function works by taking in a JSON array of spikes, determining which 
 * spikes occur within the same hour, and returning a list that only contains
 * one spike per hour. If an overlap occurs (ie there is more than one spike 
 * in an hour), the function will choose the maximum point in that hour period.
 */
function findValidSpikes(spikes){
    let result = []
    console.log(spikes)
    for(let i = 0; i < spikes.length; i++){ // starting at 1 so not to index at spike[-1], No increment as you only want to advance to the next spike in the while loop
        let encounteredTime = new Date(spikes[i].measurements[60].date)
        encounteredTime = encounteredTime.getTime()
        let hourList = [];
        console.log(spikes[i]);
        while(i < spikes.length && (Math.abs(encounteredTime - new Date(spikes[i].measurements[60].date).getTime()) < 60*60*1000) ){// while the new spike is still in the same hour
            console.log(spikes[i])
            console.log(encounteredTime - new Date(spikes[i].measurements[60].date).getTime())
            hourList.push(spikes[i]);
            i++;
        } 
        console.log(hourList);

        let max = hourList.reduce(function(prev, current) {
            return (prev.measurements[60].value > current.measurements[60].value) ? prev : current
        });
        
        result.push(max);
        i--; // subtract by one so that when the for loop increments, you don't skip past the newly encountered spike
    }
    return result
}
function onEachFeature(feature, layer) {
        var lat = feature.geometry.coordinates[0];
        var lon = feature.geometry.coordinates[1];
        var popupContent; 
        var mymarker;
        
        //adds an appropriate colored marker based on reading val
        if(feature.properties.PPM > .5) {
            mymarker = L.marker([lat, lon], {icon: readingB}).addTo(map);
            popupContent = feature.properties.Sensor
        } else {
            mymarker = L.marker([lat, lon], {icon: readingG}).addTo(map);
            popupContent = feature.properties.Sensor
        }
        
}

/**
 * Sets up the parameters for the ZScored algorithm
 *
 *
 * @return
 *   the input data containing a new attribute with signal data from the the ZScored Algorithm.
 */
function performSignalDetection(data){
    data.forEach(function(monitor){
        if(!monitor.values){
            return;
        }
        let SIG_LAG = 60;
        let SIG_THRESH = 5;
        let SIG_INF = .001;
        //monitor.signalDetection = smoothedZScore(monitor.values,SIG_LAG, SIG_THRESH,SIG_INF);
        monitor.signalDetection = smoothedZScore2(monitor.values,SIG_LAG, SIG_THRESH,SIG_INF);
    })//end data.forEach
    return data;
}//end function performSignalDetection

/**
 * The ZScore Signal Detection algorithm uses a moving window and the standard deviation
 * of that window to determine if a spike is uncharacteristic.
 *
 *
 * @return
 *   the input data containing a new attribute with signal data from the the ZScored Algorithm.
 */
function smoothedZScore2(data,lag,threshold,influence){
    let y = data;                           // Copy Variable name to 'y' since so much of this was written with 'y'
    let yVals = data.map(function(val){     // extract y values from the {date, value} object
        return val.value;
    });
    if(isEmpty(yVals)){
        return;
    }
    //create signals array
    var signals = [];
    var avgFilter = [];
    var stdFilter = [];

    for(var i = 0; i < y.length; i++){
        signals.push(0);
        avgFilter.push(0);
        stdFilter.push(0);
    }

    var filteredY = yVals.slice(0,lag);


    avgFilter[lag-1] = average(yVals.slice(0,lag));
    stdFilter[lag-1] = stanDeviate(yVals.slice(0,lag));


    for(var i = lag; i <= y.length-1; i++){  //might need to remove equals

        let date = y[i].date;     //read and save date for this datapoint

        if(Math.abs(yVals[i] - avgFilter[i-1]) > threshold * stdFilter[i-1]){
            //if the MAGNITUDE of the current (measurement-avg) value is above the thresh*std.Dev....

            if(yVals[i] > avgFilter[i-1]){
                //if this value is above average, mark positive signal
                signals[i] = [date,1];
            } else{
                //otherwise we are below average, mark negative signal
                signals[i] = [date,-1];
            }//end if-else y[i]


            filteredY[i] = influence * yVals[i] + (1-influence) * filteredY[i-1];

        } else {
            //if the MAGNITUDE does not exceed our threshold value, there is no signal, mark 0
            signals[i] = [date,0];
            filteredY[i] = yVals[i];
        } //end if-else Math.abs


        var start = i-lag;
        avgFilter[i] = average(filteredY.slice(start,i));
        stdFilter[i] = stanDeviate(filteredY.slice(start,i));

    }//end for i

    //remove the zero entries from 'signals
    let measurementPairs = signals.slice(lag);
    
    return { signals:measurementPairs, avgFilter:avgFilter, stdFilter:stdFilter};
}//end smoothedZScore2

/**
 * Averages the inputted array.
 *
 *
 * @return
 *   the average of the array
 */
function average(arr){
    return arr.reduce((a,b) => a + b, 0) / arr.length;
}

/**
 * Determines the standard deviation of the inputted array
 *
 *
 * @return
 *   the standard deviation of the array
 */
function stanDeviate(arr){
    var meanOfOrg = (arr.reduce(function(l,r){return l+r;}))/arr.length;
    var theSqrdSet = arr.map(function(el){ return Math.pow((el - meanOfOrg),2)});
    var theResult = Math.sqrt((theSqrdSet.reduce(function(l,r){return l+r;}))/theSqrdSet.length);
    return theResult;
}

/**
 * Determines if the object is empty
 *
 *
 * @return
 *   True or false depending on if the object is empty
 */
function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

/**
 * Finds the closest value in an array to an inputted number
 * 
 *
 * @return
 *   the index of the closest value in an array
 */
function closest(array,num){
    var i=0;
    var minDiff=1000;
    var ans;
    for(i in array){
         var m=Math.abs(num-array[i]);
         if(m<minDiff){ 
                minDiff=m; 
                ans=array[i]; 
            }
      }
    return ans;
}

/**
 * Finds the closest value in an array to an inputted time
 * 
 *
 * @return
 *   the index of the closest value in an array
 */
function closestIndx(array,num){
    var i=0;
    var minDiff= 9007199254740990;
    var minIndex;
    for(i in array){
         var m=Math.abs(num-array[i]);
         if(m<minDiff){ 
                minDiff=m; 
                minIndex = i; 
            }
      }
    return minIndex;
}

/**
 * Updates the line chart with the new data from a selected spike
 * 
 *
 * @return
 *   the index of the closest value in an array
 */
function drawChart(data, preModelData) {
        var sensorData = data;
        let spikePoint = 60;
        let day = sensorData[spikePoint].date;
        for(let i = 0; i < sensorData.length; i++){
            sensorData[i].value = Number(sensorData[i].value);
            sensorData[i].date = Date.parse(sensorData[i].date);
        }

        let modelData = [];
        for(let i = 0; i < preModelData.length; i++){
            modelData.push({
                date : Date.parse(preModelData[i].time), //- 3600000, // -1 hour to fix the time zone difference
                value : preModelData[i][0].value,
            })
        }
        
        var svgWidth = 800, svgHeight = 350;
        var margin = {top: 30, right: 30, bottom: 60, left: 60 };
        var width = svgWidth - margin.left - margin.right;
        var height = svgHeight - margin.top - margin.bottom;
        var svg = d3.select('svg')
            .attr("width", svgWidth)
            .attr("height", svgHeight)
            .attr("id", "visualization");
            
        var g = svg.append("g")
            .attr("transform", 
                  "translate(" + margin.left + "," + margin.top + ")"
               );
               
        var x = d3.scaleTime()
            .rangeRound([0, width]);
        
        var y = d3.scaleLinear()
            .rangeRound([height, 0]);
            
        let xRange = d3.extent(sensorData, function(d) { return d.date })
        // This code fixes the display to display both the model and the sensor data
        let yRange = d3.extent(sensorData, function(d) { return d.value });
        
        // if model data is less than smallest sensor value, change the left axis extent (else do nothing)
        yRange[0] > modelData[1].value ? (yRange[0] = modelData[1].value-1): yRange[0]; 
        
        // if model data is more than largest sensor value, change the left axis extent (else do nothing)
        yRange[1] < modelData[1].value ? (yRange[1] = modelData[1].value+1): yRange[1];

        var line = d3.line()
               .x(function(d) { return x(d.date)})
               .y(function(d) { return y(d.value)})
                .curve(d3.curveLinear);
               x.domain(xRange)
               y.domain(yRange);

        g.append("g")
           .attr("transform", "translate(0," + height + ")")
           .call(d3.axisBottom(x))
           .append("text")
           .attr("fill", "#000")
           .attr("x", width/2)
           .attr("y", margin.bottom/1.75)
           .text(day.slice(0,10));
           
        g.append("g")
           .call(d3.axisLeft(y))
           .append("text")
           .attr("fill", "#000")
           .attr("transform", "rotate(-90)")
           .attr("y", -margin.left/2)
           .attr("x", -height/2)
           .attr("text-anchor", "middle")
           .text("PPM 2.5");
           
        let sensorPath = g.append("path")
            .attr("d", line(sensorData))
              .attr("stroke", "steelblue")
              .attr("stroke-width", "2")
              .attr("fill", "none");
        
        var totalSensorLength = sensorPath.node().getTotalLength();
        //create clipPath 
        var clipPath = g.append("defs")
            .append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);
            
        sensorPath
          .attr("stroke-dasharray", totalSensorLength + " " + totalSensorLength)
          .attr("stroke-dashoffset", totalSensorLength)
          .transition()
            .duration(500)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);

        g.append("path")
            .datum(modelData)
            .attr("fill", "none")
            .attr("stroke", "gray")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 2)
            .transition()
            .attr("clip-path", "url(#clip)")
            .attr("d", line);
            
        g.append("path")
            .datum([sensorData[spikePoint]])
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 6)
            .transition()
            .attr("d", line);
        /*    
        g.append("path")
            .datum(sensorData)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 1.5)
            .attr("d", line);
        */
        var legend_keys = ["Model Data", "Sensor Data", "Spike Point"]

        var lineLegend = svg.selectAll(".lineLegend").data(legend_keys)
            .enter().append("g")
            .attr("class","lineLegend")
            .attr("transform", function (d,i) {
                    return "translate(" +(width-margin.right*1.2) + "," + (i*20+margin.top)+")";
                });
        
        lineLegend.append("text").text(function (d) {return d;})
            .attr("transform", "translate(15,9)"); //align texts with boxes
        
        lineLegend.append("rect")
            .attr("fill", function (d, i) {
                if(d === "Model Data"){
                    return "gray";
                } else if(d === "Sensor Data") {
                    return "steelblue"
                } else {
                    return "red"
                }
            })
            .attr("width", 10).attr("height", 10);

        svg.append("text")
            .attr("x", (margin.left + width/2))             
            .attr("y", margin.top/1.5)
            .attr("text-anchor", "middle")  
            .attr("font-size", "13px")  
            .attr("font-weight", "bold")
            .text("Spike at: " + day);

        /*    
        g.append("path")
            .datum(modelData)
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 4)
            .attr("d", line);
            
        
        g.append("path")
            .datum(modelData)
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 1.5)
            .attr("d", line);
            */
}
