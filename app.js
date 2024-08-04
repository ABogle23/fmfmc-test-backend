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

import { FMFMC_API_KEY } from './secrets.js';

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
}).addTo(map);


document.getElementById('routeForm').onsubmit = function (event) {
    event.preventDefault();
    fetchRoute();
};

document.addEventListener('DOMContentLoaded', function() {
    fetchVehicles();
    console.log('Page fully loaded and script running');
});

// fetch vehicles from backend
function fetchVehicles() {
    fetch('https://localhost:8080/api/vehicles/all', {
        method: 'GET',
        headers: {
            // 'Content-Type': 'application/json',
            'X-API-Key': FMFMC_API_KEY
        }})
        .then(response => response.json())
        .then(data => {
            const dataSizeBytes = new TextEncoder().encode(JSON.stringify(data)).length;
            const dataSizeKb = dataSizeBytes / 1024;
            console.log(`Response size: ${dataSizeKb.toFixed(2)} KB`);
            console.log("Results returned: " + data.length);

            data.sort((a, b) => {
                // sort by brand
                if (a.brand < b.brand) return -1;
                if (a.brand > b.brand) return 1;
                // sort by model
                if (a.model < b.model) return -1;
                if (a.model > b.model) return 1;
                return 0;
            });

            const vehicleDropdown = document.getElementById('selectedVehicle');
            data.forEach(vehicle => {
                const option = new Option(`${vehicle.brand} ${vehicle.model} (${vehicle.battery_capacity} kWh)`, vehicle.id);
                option.setAttribute('data-ev-range', vehicle.ev_range);
                option.setAttribute('data-battery-capacity', vehicle.battery_capacity);
                vehicleDropdown.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching vehicles:', error));
}

// add event listener to selectedVehicle dropdown to update evRange and batteryCapacity fields
document.getElementById('selectedVehicle').addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const evRange = Math.round(parseFloat(selectedOption.getAttribute('data-ev-range')));
    const batteryCapacity = selectedOption.getAttribute('data-battery-capacity');
    document.getElementById('evRange').value = evRange || '';
    document.getElementById('batteryCapacity').value = batteryCapacity || '';
});


// fetch and display route from backend
function fetchRoute() {
    const start_lat = document.getElementById('startLat').value;
    const start_long = document.getElementById('startLong').value;
    const end_lat = document.getElementById('endLat').value;
    const end_long = document.getElementById('endLong').value;
    const starting_battery = document.getElementById('startingBattery').value/100;
    const ev_range = document.getElementById('evRange').value*1000;
    const battery_capacity = document.getElementById('batteryCapacity').value;
    const min_charge_level = document.getElementById('minChargeLevel').value/100;
    const charge_level_after_each_stop = document.getElementById('chargeLevelAfterEachStop').value/100;
    const final_destination_charge_level = document.getElementById('finalDestinationChargeLevel').value/100;
    const depart_time = document.getElementById('departTime').value;
    const stopping_range = document.getElementById('stoppingRange').value;
    const break_duration = document.getElementById('breakDuration').value;
    const eating_options = Array.from(document.getElementById('foodPreferences').selectedOptions).map(option => option.value);
    const connection_types = Array.from(document.getElementById('connectionTypes').selectedOptions).map(option => option.value);
    const access_types = Array.from(document.getElementById('accessTypes').selectedOptions).map(option => option.value);
    const min_kw_charge_speed = document.getElementById('minKwChargeSpeed').value;
    const max_kw_charge_speed = document.getElementById('maxKwChargeSpeed').value;
    const min_no_charge_points = document.getElementById('minNoChargePoints').value;
    const min_price = document.getElementById('minPrice').value;
    const max_price = document.getElementById('maxPrice').value;
    const max_walking_distance = document.getElementById('maxWalkingDistance').value;
    const eating_option_search_deviation = document.getElementById('eatingOptionSearchDeviation').value;
    const include_alternative_eating_options = document.getElementById('includeAlternativeEatingOptions').checked;
    const electric_vehicle_id = document.getElementById('selectedVehicle').value;
    const stop_for_eating = document.getElementById('stopForEating').checked;


    document.getElementById('loadingOverlay').style.display = 'flex';
    document.getElementById('sidebar').classList.add('blurred');

    const requestBody = {
        start_lat,
        start_long,
        end_lat,
        end_long,
        starting_battery,
        ev_range,
        battery_capacity,
        min_charge_level,
        charge_level_after_each_stop,
        final_destination_charge_level,
        depart_time,
        stopping_range: stopping_range === "" ? null : stopping_range,
        break_duration,
        eating_options,
        connection_types,
        access_types,
        min_kw_charge_speed,
        max_kw_charge_speed,
        min_no_charge_points,
        min_price,
        max_price,
        max_walking_distance,
        eating_option_search_deviation: eating_option_search_deviation === "" ? null : eating_option_search_deviation,
        include_alternative_eating_options,
        electric_vehicle_id,
        stop_for_eating
    };

    console.log(requestBody);

    console.log(`Start Lat: ${start_lat}, Start Long: ${start_long}, End Lat: ${end_lat}, End Long: ${end_long}, Starting Battery: ${starting_battery}, EV Range: ${ev_range}, Min Charge Level: ${min_charge_level}, Connection Types: ${connection_types},Food Preferences: ${eating_options}, Depart Time: ${depart_time}, Meal Time: ${meal_time}, Break Duration: ${break_duration}`);


    // call to backend
    fetch('https://localhost:8080/api/find-route', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': FMFMC_API_KEY
        },
        // construct JSON route request object
        body: JSON.stringify(requestBody)
    }).then(response => response.json())
        .then(data => {
            const dataSizeBytes = new TextEncoder().encode(JSON.stringify(data)).length;
            const dataSizeKb = dataSizeBytes / 1024;
            console.log(`Response size: ${dataSizeKb.toFixed(2)} KB`);
            console.log(data);
            document.getElementById('loadingOverlay').style.display = 'none';
            document.getElementById('sidebar').classList.remove('blurred');
            displayRoute(data.data);
        }).catch(error => {
        console.error('Error:', error);
        document.getElementById('loadingOverlay').style.display = 'none';
        document.getElementById('sidebar').classList.remove('blurred');
        alert('An error occurred while fetching the route');
    });
}

function displayRoute(data) {
    // clear existing map layers
    map.eachLayer(function (layer) {
        if (!!layer.toGeoJSON) {
            map.removeLayer(layer);
        }
    });

    // // add route polyline
    // L.polyline(decodePolyline(data.route_polyline), {color: 'blue'}).addTo(map);

    // decode polyline and add to map
    var polylinePoints = decodePolyline(data.final_route_polyline);
    var polyline = L.polyline(polylinePoints, {color: 'blue'}).addTo(map);
    map.fitBounds(polyline.getBounds());

    // polyline prior to route optimisaton for food stops
    var originalRoutePoints = decodePolyline(data.original_route_polyline);
    var originalRoute = L.polyline(originalRoutePoints, {
        color: 'red',
        weight: 4,
        dashArray: '10, 10',
        opacity: 0.7
    }).addTo(map);

    if (data.charger_polygon) {
        var polygonPoints = decodePolyline(data.charger_polygon);
        var polygon = L.polygon(polygonPoints, {
            color: 'green', // Outline color of the polygon
            fillOpacity: 0.2, // Set low fill opacity to not obscure map details
            weight: 2 // Border thickness
        }).addTo(map);
    }


    if (data.eating_option_polygon) {
        var foursquarePolygonPoints = decodePolyline(data.eating_option_polygon);
        var foursquarePolygon = L.polygon(foursquarePolygonPoints, {
            color: 'orange', // A different color, e.g., orange
            fillOpacity: 0.3, // Less transparent
            weight: 1 // Border thickness
        }).addTo(map);
    }

    if (data.eating_search_circles) {
        data.eating_search_circles.forEach(encodedCircle => {
            var searchCirclePoints = decodePolyline(encodedCircle);
            var searchCircle = L.polygon(searchCirclePoints, {
                color: 'blue', // A different color, e.g., orange
                fillOpacity: 0.1, // Less transparent
                weight: 1 // Border thickness
            }).addTo(map);
        });
    }

    // add markers for chargers from backend response
    data.chargers.forEach(charger => {
        if (charger.geocodes) {
            const content = getAllMarkerContent(charger);
            L.marker([charger.geocodes.latitude, charger.geocodes.longitude])
                .bindPopup(content)
                .addTo(map);
            // L.marker([charger.geocodes.latitude, charger.geocodes.longitude])
            //     .bindPopup(`Charger ID: ${charger.id}`)
            //     .addTo(map);
        }
    });

    // add markers for food establishments from backend response
    // data.food_establishments.forEach(establishment => {
    //     if (establishment.geocodes) {
    //         const content = getAllMarkerContent(establishment);
    //         L.marker([establishment.geocodes.latitude, establishment.geocodes.longitude], {icon: foodIcon})
    //             .bindPopup(content)
    //             .addTo(map);
    //         // L.marker([establishment.geocodes.latitude, establishment.geocodes.longitude], {icon: foodIcon})
    //         //     .bindPopup(`Food Establishment: ${establishment.name}`)
    //         //     .addTo(map);
    //     }
    // });
    let isFirstMarker = true;
    data.food_establishments.forEach(establishment => {
        if (establishment.geocodes) {
            const content = getAllMarkerContent(establishment);
            L.marker([establishment.geocodes.latitude, establishment.geocodes.longitude],
                {icon: isFirstMarker ? firstFoodIcon : subsequentFoodIcon})
                .bindPopup(content)
                .addTo(map);
            isFirstMarker = false;
        }
    });

    // add start and end location pins
    L.marker([data.context.start_lat, data.context.start_long], {icon: startIcon}).bindPopup('Start Location').addTo(map);
    L.marker([data.context.end_lat, data.context.end_long], {icon: endIcon}).bindPopup('End Location').addTo(map);

    // adjust map view once route is returned
    map.fitBounds([
        [data.context.start_lat, data.context.start_long],
        [data.context.end_lat, data.context.end_long]
    ]);
}


// show all content for eatingOption/charger markers
function getAllMarkerContent(dataObject, level = 0) {
    let content = '<div class="popup-content" style="margin-left: ' + (level * 10) + 'px;">';
    for (const [key, value] of Object.entries(dataObject)) {
        if (typeof value === 'object' && value !== null) {
            content += `<div><strong>${key}:</strong></div>`;
            if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    content += `<div>${index + 1}: ${typeof item === 'object' ? getAllMarkerContent(item, level + 1) : item}</div>`;
                });
            } else {
                content += getAllMarkerContent(value, level + 1);
            }
        } else {
            content += `<div><strong>${key}:</strong> ${value}</div>`;
        }
    }
    content += '</div>';
    return content;
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


// function decodeEatingOptionPolygon(encodedString) {
//     // Split the string by '~' to get each coordinate pair
//     const pairs = encodedString.split('~');
//     // Map over each pair, split by ',', and convert each to a float
//     const points = pairs.map(pair => {
//         const [lat, lng] = pair.split(',').map(Number);
//         return [lat, lng];
//     });
//     return points;
// }


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

// custom icon for first i.e. optimal food establishment
var firstFoodIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// custom icon for subsequent food establishments
var subsequentFoodIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
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


