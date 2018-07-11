  
  var modelData = [];
  // sets up the lats and lons for finding the closest model point
  var lats = [40.81048, 40.78696, 40.76345, 40.73993, 40.71642, 40.69291, 40.66939, 40.64588, 40.62236, 40.59885], 
      lons = [-111.713403, -111.7325994, -111.7517958, -111.7709922, -111.7901886, -111.809385, -111.8285814, -111.8477778, -111.8669742, -111.8861706, -111.905367, -111.9245634, -111.9437598, -111.9629562, -111.9821526, -112.001349],
      times = [],
      timesNumeric = [];
      
     //sets up the times to find closest time point on model
    let hour = 7;
    for(var day = 1; day < 14; day++){
        while(hour < 24){
          let date = new Date(2018, 02, day, hour, 0)
          timesNumeric.push(Date.parse(date + "MST"));
          times.push(date);
          if(day == 13 && hour == 7){
              break;
          }
          hour++;
        }
        hour = 0;
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
                
                for (var i = 0; i < monitor.signalDetection.signals.length ; i++) { //for each measurment in the monitor
                    if (monitor.signalDetection.signals[i][1] === 1) { //if the signal value is 1 (ie there is a peak)
                        spikes.push({
                            id: monitor.id,
                            coordinates: monitor.coordinates,
                            closestModel: [closestLat,closestLon],
                            measurements: monitor.values.slice(i+60,i+180),// offset by 120 as the lag offsets the dates/times
                            reading: monitor.signalDetection.signals[i],
                        });
                        
                        // and find the closest time corresponding to that
                        closestTimeIndex = closestIndx(timesNumeric, Date.parse(monitor.values[i+120].date)) // parses the date to a number and and finds the closest value
                        
                        let closestTimeIndexBefore = closestIndx(timesNumeric, Date.parse(monitor.values[i+120].date)-3600000) // parses the date to a number and and finds the closest value
                        let closestTimeIndexAfter = closestIndx(timesNumeric, Date.parse(monitor.values[i+120].date)+3600000) // parses the date to a number and and finds the closest value
                        
                        modelPts.push(stackedData.filter(function(point){
                            return point.lat == closestLat &&
                                  point.long == closestLon &&
                                  point.x == closestTimeIndexBefore;
                        }));
                        modelPts[modelPts.length-1].time =  times[closestTimeIndexBefore];
                        
                        //push that point onto the modelPts array
                        modelPts.push(stackedData.filter(function(point){
                            return point.lat == closestLat &&
                                   point.long == closestLon &&
                                   point.x == closestTimeIndex;
                        }));
                        modelPts[modelPts.length-1].time =  times[closestTimeIndex];

                        modelPts.push(stackedData.filter(function(point){
                            return point.lat == closestLat &&
                                  point.long == closestLon &&
                                  point.x == closestTimeIndexAfter;
                        }));
                        
                        modelPts[modelPts.length-1].time =  times[closestTimeIndexAfter];
                    }
                }
            })
        
        var spikeDivs = spikeSelectDiv.selectAll("div")
            .data(spikes)
            .enter()
            .append("button")
            .classed("btn",true)
            .classed("btn-primary",true)
            .classed("spikes",true)
            .text(function(d){
                return d.id + " " + d.measurements[60].date;
            })
            
        var spikePtsForBinding, modelPtsForBinding;
        $('.spikes').click(function(){
            spikePtsForBinding = $.extend(true,{},spikes);
            let spikeIndex = $('.spikes').index(this);
            var svg = d3.select("svg");
            svg.selectAll("*").remove();
            modelPtsForBinding = modelPts.slice(spikeIndex*3,spikeIndex*3+3)
    
            
            drawChart(spikePtsForBinding[spikeIndex].measurements, modelPtsForBinding)
        });
        
        $('.spikes').hover(function(){
            $(this).toggleClass('hover')
        });

        var svg = d3.select("svg"),
            margin = {top: 20, right: 20, bottom: 30, left: 50},
            width = +svg.attr("width") - margin.left - margin.right,
            height = +svg.attr("height") - margin.top - margin.bottom,
            g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        
        let spikeZero = $.extend(true,{},spikes[0].measurements);
        drawChart(spikeZero, modelPts.slice(0,3))
      });    
   });


function performSignalDetection(data){
    data.forEach(function(monitor){
        if(!monitor.values){
            return;
        }
        let SIG_LAG = 120;
        let SIG_THRESH = 10;
        let SIG_INF = 1;
        //monitor.signalDetection = smoothedZScore(monitor.values,SIG_LAG, SIG_THRESH,SIG_INF);
        monitor.signalDetection = smoothedZScore2(monitor.values,SIG_LAG, SIG_THRESH,SIG_INF);
    })//end data.forEach
    return data;
}//end function performSignalDetection

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

function average(arr){
    return arr.reduce((a,b) => a + b, 0) / arr.length;
}

function stanDeviate(theData){
    var meanOfOrg = (theData.reduce(function(l,r){return l+r;}))/theData.length;
    var theSqrdSet = theData.map(function(el){ return Math.pow((el - meanOfOrg),2)});
    var theResult = Math.sqrt((theSqrdSet.reduce(function(l,r){return l+r;}))/theSqrdSet.length);
    return theResult;
}

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

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

function drawChart(data, preModelData) {
        var sensorData = data;
        let day = sensorData[60].date;
        for(let i = 0; i < sensorData.length; i++){
            sensorData[i].value = Number(sensorData[i].value);
            sensorData[i].date = Date.parse(sensorData[i].date);
        }

        let modelData = [];
        for(let i = 0; i < preModelData.length; i++){
            modelData.push({
                date : Date.parse(preModelData[i].time) - 3600000, // -1 hour to fix the time zone difference
                value : preModelData[i][0].value,
            })
        }
        
        var svgWidth = 960, svgHeight = 500;
        var margin = { top: 20, right: 20, bottom: 50, left: 50 };
        var width = svgWidth - margin.left - margin.right;
        var height = svgHeight - margin.top - margin.bottom;
        var svg = d3.select('svg')
            .attr("width", svgWidth)
            .attr("height", svgHeight);
            
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
        yRange[0] > modelData[0].value ? (yRange[0] = modelData[0].value-1): yRange[0]; 
        // if model data is more than largest sensor value, change the left axis extent (else do nothing)
        yRange[1] < modelData[0].value ? (yRange[1] = modelData[0].value+1): yRange[1];

        var line = d3.line()
               .x(function(d) { return x(d.date)})
               .y(function(d) { return y(d.value)})
            //   .defined(function(d) { 
            //       return d.x < xRange[1] && dx > xRange[0] && d.y > yRange[0] && d.y< yRange[1]; 
            //     })
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
           
                  
        g.append("path")
            .datum(modelData)
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 2)
            .attr("d", line);
            
        g.append("path")
            .datum(sensorData)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 1.5)
            .attr("d", line);
            
        var legend_keys = ["Model", "Sensors"]

        var lineLegend = svg.selectAll(".lineLegend").data(legend_keys)
            .enter().append("g")
            .attr("class","lineLegend")
            .attr("transform", function (d,i) {
                    return "translate(" + width + "," + (i*20+margin.top)+")";
                });
        
        lineLegend.append("text").text(function (d) {return d;})
            .attr("transform", "translate(15,9)"); //align texts with boxes
        
        lineLegend.append("rect")
            .attr("fill", function (d, i) {
                if(d === "Model"){
                    return "red";
                } else {
                    return "steelblue"
                }
            })
            .attr("width", 10).attr("height", 10);
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
