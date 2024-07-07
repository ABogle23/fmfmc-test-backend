// https://leafletjs.com/examples/quick-start/

// var map = L.map('map').setView([50.7260, -3.5275], 13);
var map = L.map('map', {
    center: [55.3781, -3.4360], // center of the map (approximate center of UK)
    zoom: 6, // initial zoom level
    maxBounds: [ // restricts the map view to the UK
        [49.0, -10.5], // SE corner of the bounds
        [61.0, 2.0]  // NE corner of the bounds
    ],
    minZoom: 5,
    maxZoom: 16
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
}).addTo(map);

document.getElementById('routeForm').onsubmit = function (event) {
    event.preventDefault();
    fetchRoute();
};

// function to call backend to fetch route
function fetchRoute() {
    const startLat = document.getElementById('startLat').value;
    const startLong = document.getElementById('startLong').value;
    const endLat = document.getElementById('endLat').value;
    const endLong = document.getElementById('endLong').value;
    const startingBattery = document.getElementById('startingBattery').value;
    const evRange = document.getElementById('evRange').value;
    const minChargeLevel = document.getElementById('minChargeLevel').value;
    const departTime = document.getElementById('departTime').value;
    const mealTime = document.getElementById('mealTime').value;
    const breakDuration = document.getElementById('breakDuration').value;
    const eatingOptions = Array.from(document.getElementById('foodPreferences').selectedOptions).map(option => option.value);
    const connectionTypes = Array.from(document.getElementById('connectionTypes').selectedOptions).map(option => option.value);
    const minKwChargeSpeed = document.getElementById('minKwChargeSpeed').value;
    const maxKwChargeSpeed = document.getElementById('maxKwChargeSpeed').value;
    const minNoChargePoints = document.getElementById('minNoChargePoints').value;
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;

    const requestBody = {
        startLat,
        startLong,
        endLat,
        endLong,
        startingBattery,
        evRange,
        minChargeLevel,
        departTime,
        mealTime,
        breakDuration,
        eatingOptions,
        connectionTypes,
        minKwChargeSpeed,
        maxKwChargeSpeed,
        minNoChargePoints,
        minPrice,
        maxPrice
    };

    console.log(requestBody);

    console.log(`Start Lat: ${startLat}, Start Long: ${startLong}, End Lat: ${endLat}, End Long: ${endLong}, Starting Battery: ${startingBattery}, EV Range: ${evRange}, Min Charge Level: ${minChargeLevel}, Connection Types: ${connectionTypes},Food Preferences: ${eatingOptions}, Depart Time: ${departTime}, Meal Time: ${mealTime}, Break Duration: ${breakDuration}`);

    // call to backend
    fetch('http://localhost:8080/route/find-route', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        // construct JSON route request object
        body: JSON.stringify(requestBody)
    }).then(response => response.json())
        .then(data => {
            console.log(data);
            displayRoute(data);
        }).catch(error => console.error('Error:', error));
}

function displayRoute(data) {
    // Clear existing map layers
    map.eachLayer(function (layer) {
        if (!!layer.toGeoJSON) {
            map.removeLayer(layer);
        }
    });

    // // add route polyline
    // L.polyline(decodePolyline(data.route_polyline), {color: 'blue'}).addTo(map);

    // decode polyline and add to map
    var polylinePoints = decodePolyline(data.route_polyline);
    var polyline = L.polyline(polylinePoints, {color: 'blue'}).addTo(map);
    map.fitBounds(polyline.getBounds());


    if (data.tmp_polygon) {
        var polygonPoints = decodePolyline(data.tmp_polygon);
        var polygon = L.polygon(polygonPoints, {
            color: 'green', // Outline color of the polygon
            fillOpacity: 0.2, // Set low fill opacity to not obscure map details
            weight: 2 // Border thickness
        }).addTo(map);
    }


    // add markers for chargers from backend response
    data.chargers.forEach(charger => {
        if (charger.geocodes) {
            L.marker([charger.geocodes.latitude, charger.geocodes.longitude])
                .bindPopup(`Charger ID: ${charger.id}`)
                .addTo(map);
        }
    });

    // add markers for food establishments from backend response
    data.food_establishments.forEach(establishment => {
        if (establishment.geocodes) {
            L.marker([establishment.geocodes.latitude, establishment.geocodes.longitude], {icon: foodIcon})
                .bindPopup(`Food Establishment: ${establishment.name}`)
                .addTo(map);
        }
    });

    // add start and end location pins
    L.marker([data.context.startLat, data.context.startLong], {icon: startIcon}).bindPopup('Start Location').addTo(map);
    L.marker([data.context.endLat, data.context.endLong], {icon: endIcon}).bindPopup('End Location').addTo(map);

    // adjust map view once route is returned
    map.fitBounds([
        [data.context.startLat, data.context.startLong],
        [data.context.endLat, data.context.endLong]
    ]);
}

// function to decode polyline returned from backend
function decodePolyline(encoded) {
    var points = [];
    var index = 0, len = encoded.length;
    var lat = 0, lng = 0;
    while (index < len) {
        var b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        points.push([lat / 1E5, lng / 1E5]);
    }
    return points;
}

// custom icon for polyline start icon
var startIcon = L.divIcon({
    className: 'custom-div-icon',
    html: "<div style='background-color:white; border: 2px solid black; border-radius: 50%; width: 10px; height: 10px;'></div>",
    iconSize: [10, 10],
    iconAnchor: [10, 10]
});

// custom icon for polyline end icon
var endIcon = L.divIcon({
    className: 'custom-div-icon',
    html: "<div style='background-color:red; border: 2px solid white; border-radius: 50%; width: 12px; height: 12px;'></div>",
    iconSize: [10, 10],
    iconAnchor: [10, 10]
});

// custom icon for food establishments
var foodIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});


// bool to check if start point is being set
var settingStart = true;

// start and end of route markers
var startMarker, endMarker;

// event listener for map click
map.on('click', function (e) {
    // check if both start and end markers are set
    if (startMarker && endMarker) {
        // if so reset markers and input fields
        resetPoints();
    }

    // set or reset the start point
    if (settingStart || (!startMarker && !endMarker)) {
        document.getElementById('startLat').value = e.latlng.lat.toFixed(6);
        document.getElementById('startLong').value = e.latlng.lng.toFixed(6);
        settingStart = false; // Next click will set the end point

        if (!startMarker) {
            startMarker = L.marker(e.latlng, {icon: startIcon}).addTo(map).bindPopup('Start Location');
        } else {
            startMarker.setLatLng(e.latlng);
        }
    } else {
        // set the end point
        document.getElementById('endLat').value = e.latlng.lat.toFixed(6);
        document.getElementById('endLong').value = e.latlng.lng.toFixed(6);
        settingStart = true; // Reset to start point for the next set of clicks

        if (!endMarker) {
            endMarker = L.marker(e.latlng, {icon: endIcon}).addTo(map).bindPopup('End Location');
        } else {
            endMarker.setLatLng(e.latlng);
        }
    }
});


// function to reset start and end points inc settingStart bool
function resetPoints() {
    settingStart = true; // reset to setting the start point
    document.getElementById('startLat').value = '';
    document.getElementById('startLong').value = '';
    document.getElementById('endLat').value = '';
    document.getElementById('endLong').value = '';

    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);
    startMarker = null;
    endMarker = null;
}

// event listener for 'resetButton' elem that calls the resetPoints() function when clicked
document.getElementById('resetButton').addEventListener('click', resetPoints);


