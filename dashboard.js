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
    
  // initialize the map
  var map = L.map('map').setView([40.7, -111.9], 13);

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
   });
 
function onEachFeature(feature, layer) {
        var lat = feature.geometry.coordinates[0];
        var lon = feature.geometry.coordinates[1];
        var popupContent; 
        var mymarker;
        console.log(mymarker)
        if(feature.properties.PPM > .5) {
            mymarker = L.marker([lat, lon], {icon: readingB}).addTo(map);
            popupContent = feature.properties.Sensor
                    console.log(mymarker)
        } else {
            mymarker = L.marker([lat, lon], {icon: readingG}).addTo(map);
            popupContent = feature.properties.Sensor
        }
        //marker.bindPopup(popupContent);
}
  
