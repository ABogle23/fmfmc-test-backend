// https://leafletjs.com/examples/quick-start/
// var map = L.map('map').setView([50.7260, -3.5275], 13);
var map = L.map('map', {
    center: [55.3781, -3.4360], // center of the map (approximate center of UK)
    zoom: 6, // initial zoom level
    minZoom: 5,
    maxZoom: 16
});

map.removeControl(map.zoomControl);

L.control.zoom({
    position: 'bottomright' // Change this to the desired position
}).addTo(map);

import {FMFMC_API_KEY} from './keys.js';

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
}).addTo(map);

// handles form submission including mapbox geocoding
document.getElementById('routeForm').onsubmit = function (event) {
    event.preventDefault();
    console.log(event);

    // if start and end locations are populated but not set by selecting autocomplete option, perform geocoding anyway
    if (firstSuggestionStart) {
        const [long, lat] = firstSuggestionStart.center;
        console.log(firstSuggestionStart.place_name)
        selectPlace(firstSuggestionStart.place_name, [long, lat], 'startLocation');
    }
    if (firstSuggestionEnd) {
        const [long, lat] = firstSuggestionEnd.center;
        console.log(firstSuggestionEnd.place_name)
        selectPlace(firstSuggestionEnd.place_name, [long, lat], 'endLocation');
    }

    fetchRoute();
};

// call fetchVehicles() when the page loads
document.addEventListener('DOMContentLoaded', function () {
    fetchVehicles();
    console.log('Page fully loaded and script running');
});

// fetch vehicles from backend
function fetchVehicles() {
    fetch('http://localhost:8080/api/vehicles/all', {
        method: 'GET',
        headers: {
            // 'Content-Type': 'application/json',
            'X-API-Key': FMFMC_API_KEY
        }
    })
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

            // populate vehicle dropdown
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
document.getElementById('selectedVehicle').addEventListener('change', function () {
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
    const starting_battery = document.getElementById('startingBattery').value / 100;
    const ev_range = document.getElementById('evRange').value * 1000;
    const battery_capacity = document.getElementById('batteryCapacity').value;
    const min_charge_level = document.getElementById('minChargeLevel').value / 100;
    const charge_level_after_each_stop = document.getElementById('chargeLevelAfterEachStop').value / 100;
    const final_destination_charge_level = document.getElementById('finalDestinationChargeLevel').value / 100;
    const depart_time = document.getElementById('departTime').value;
    const stopping_range = document.getElementById('stoppingRange').value;
    const break_duration = document.getElementById('breakDuration').value;
    const eating_options = Array.from(document.getElementById('foodPreferences').selectedOptions).map(option => option.value);
    const connection_types = Array.from(document.getElementById('connectionTypes').selectedOptions).map(option => option.value);
    const access_types = Array.from(document.getElementById('accessTypes').selectedOptions).map(option => option.value);
    const min_kw_charge_speed = document.getElementById('minKwChargeSpeed').value;
    // const max_kw_charge_speed = document.getElementById('maxKwChargeSpeed').value;
    const min_no_charge_points = document.getElementById('minNoChargePoints').value;
    const min_price = document.getElementById('minPrice').value;
    const max_price = document.getElementById('maxPrice').value;
    const max_walking_distance = document.getElementById('maxWalkingDistance').value;
    const eating_option_search_deviation = document.getElementById('eatingOptionSearchDeviation').value;
    const include_alternative_eating_options = document.getElementById('includeAlternativeEatingOptions').checked;
    const electric_vehicle_id = document.getElementById('selectedVehicle').value;
    const stop_for_eating = document.getElementById('stopForEating').checked;

    // after submit blur screen and show spinner until response
    document.getElementById('loadingOverlay').style.display = 'flex';

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
        // max_kw_charge_speed,
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

    // console.log(`Start Lat: ${start_lat}, Start Long: ${start_long}, End Lat: ${end_lat}, End Long: ${end_long}, Starting Battery: ${starting_battery}, EV Range: ${ev_range}, Min Charge Level: ${min_charge_level}, Connection Types: ${connection_types},Food Preferences: ${eating_options}, Depart Time: ${depart_time}, Break Duration: ${break_duration}`);

    // call to backend
    fetch('http://localhost:8080/api/find-journey', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': FMFMC_API_KEY
        },
        // construct JSON route request object
        body: JSON.stringify(requestBody)
    }).then(response => response.json())
        .then(data => {

            // display journey finding error msg details if any
            if (!data.hasOwnProperty('success')) {
                console.log(data);
                const errorMessage = `${data.message}`;
                const errorDetails = `${data.details.join(', ')}`;
                document.getElementById('loadingOverlay').style.display = 'none';
                displayError(errorMessage, errorDetails);
                return;
            }

            // display fallback msgs if any
            if (data.hasOwnProperty('fallback_used') && data.fallback_used) {
                displayFallbackInfo('Fallback strategies applied', data.fallback_details);
            }

            const dataSizeBytes = new TextEncoder().encode(JSON.stringify(data)).length;
            const dataSizeKb = dataSizeBytes / 1024;
            console.log(`Response size: ${dataSizeKb.toFixed(2)} KB`);
            console.log(data);
            document.getElementById('loadingOverlay').style.display = 'none';
            // document.getElementById('sidebar').classList.remove('blurred');
            displayRoute(data.data);
        }).catch(error => {
        console.error('Error:', error);
        document.getElementById('loadingOverlay').style.display = 'none';
        // document.getElementById('sidebar').classList.remove('blurred');
        alert('An error occurred while fetching the route');
        // displayError(error, 'An error occurred while fetching the route');
    });
}


// event listener for closing error msg
document.addEventListener('DOMContentLoaded', function () {
    const errorContainer = document.getElementById('error-container');
    const closeBtn = errorContainer.querySelector('.close-btn');

    // function showError(message) {
    //     document.getElementById('error-message').textContent = message;
    //     errorContainer.style.display = 'block';
    // }

    closeBtn.addEventListener('click', function () {
        errorContainer.style.display = 'none';
    });

});

function displayError(message, details) {
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const errorDetails = document.getElementById('error-details');

    errorMessage.textContent = message;

    errorDetails.innerHTML = '';
    const detailsSplit = details.split(',');
    const detailsList = document.createElement('ul');
    detailsSplit.forEach(msg => {
        const listItem = document.createElement('li');
        listItem.textContent = msg.trim();
        detailsList.appendChild(listItem);
    });

    errorDetails.appendChild(detailsList);
    errorContainer.style.display = 'block';

}


function displayFallbackInfo(message, details) {
    const infoContainer = document.getElementById('info-container');
    const infoMessage = document.getElementById('info-message');
    const infoDetails = document.getElementById('info-details');

    infoMessage.innerHTML = '';
    infoDetails.innerHTML = '';

    const detailsSplit = details.split(': ').slice(1).join(': ').split(',');
    const detailsList = document.createElement('ul');
    detailsSplit.forEach(msg => {
        const listItem = document.createElement('li');
        listItem.textContent = msg.trim();
        detailsList.appendChild(listItem);
    });

    infoMessage.textContent = message;
    infoDetails.appendChild(detailsList);

    infoContainer.style.display = 'block';
}

// event listener for closing fallback msg
document.querySelector('#info-container .close-btn').addEventListener('click', function () {
    document.getElementById('info-container').style.display = 'none';
});


// populates journey data onto results panel and map
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

    // overall search area for chargers
    if (data.charger_polygon) {
        var polygonPoints = decodePolyline(data.charger_polygon);
        var polygon = L.polygon(polygonPoints, {
            color: 'green',
            fillOpacity: 0.2,
            weight: 2 // border thickness
        }).addTo(map);
    }

    // overall eating option search area
    if (data.eating_option_polygon) {
        var foursquarePolygonPoints = decodePolyline(data.eating_option_polygon);
        var foursquarePolygon = L.polygon(foursquarePolygonPoints, {
            color: 'orange',
            fillOpacity: 0.3,
            weight: 1 // border thickness
        }).addTo(map);
    }

    // radial search circles for eating options
    if (data.eating_search_circles) {
        data.eating_search_circles.forEach(encodedCircle => {
            var searchCirclePoints = decodePolyline(encodedCircle);
            var searchCircle = L.polygon(searchCirclePoints, {
                color: 'blue',
                fillOpacity: 0.1,
                weight: 1 // border thickness
            }).addTo(map);
        });
    }

    // add markers for chargers
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

    // add markers for food establishments, the first i.e. optimal fe uses firstFoodIcon style
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

    // display journey details
    displayResults(data);

    // switch to results panel
    showResultsPanel()
}


// show all content for food establishment/charger markers w/ indentation
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
// code taken from https://github.com/mapbox/polyline/blob/master/src/polyline.js
function decodePolyline(str) {
    const precision = 5;

    var index = 0,
        lat = 0,
        lng = 0,
        coordinates = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, Number.isInteger(precision) ? precision : 5);

    // Coordinates have variable length when encoded, so just keep
    // track of whether we've hit the end of the string. In each
    // loop iteration, a single coordinate is decoded.
    while (index < str.length) {

        // Reset shift, result, and byte
        byte = null;
        shift = 1;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result += (byte & 0x1f) * shift;
            shift *= 32;
        } while (byte >= 0x20);

        latitude_change = (result & 1) ? ((-result - 1) / 2) : (result / 2);

        shift = 1;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result += (byte & 0x1f) * shift;
            shift *= 32;
        } while (byte >= 0x20);

        longitude_change = (result & 1) ? ((-result - 1) / 2) : (result / 2);

        lat += latitude_change;
        lng += longitude_change;

        coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates.map(coords => [coords[0], coords[1]]);

}


function displayResults(data) {

    const latLongRegex = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;

    // populate journey summary
    var startLoc = document.getElementById('startLocation').value;
    startLoc = latLongRegex.test(startLoc) ? startLoc : startLoc.split(',')[0];
    var endLoc = document.getElementById('endLocation').value;
    endLoc = latLongRegex.test(endLoc) ? endLoc : endLoc.split(',')[0];
    const totalDistance = formatMetersToKm(data.distance);
    const totalTime = formatSecondsToTime(data.time);
    const stopsCount = `${(data.segment_details.stop_durations.length)} stops`;
    populateSummary(startLoc, endLoc, totalDistance, totalTime, stopsCount)

    // populate start and end containers
    const startBattery = `${((data.segment_details.departing_charges[0] * 100).toFixed(1))}%`;
    const initialDepartTime = data.segment_details.depart_times[0];
    console.log(initialDepartTime)
    populateStart(startLoc, startBattery, initialDepartTime)

    const endBattery = `${((data.segment_details.arrival_charges[data.segment_details.arrival_charges.length - 1] * 100).toFixed(1))}%`;
    const endSegmentDistance = formatMetersToKm(data.segment_details.segment_distances[data.segment_details.segment_distances.length - 1]);
    const finalArrivalTime = data.segment_details.arrival_times[data.segment_details.arrival_times.length - 1];
    populateEnd(endLoc, endBattery, endSegmentDistance, finalArrivalTime)

    // populate stops
    const resultsContainer = document.querySelector('.route-segments');
    resultsContainer.innerHTML = ''; // clear previous results

    data.segment_details.segment_durations.forEach((duration, index) => {

        // check for stops
        if (index === data.segment_details.segment_durations.length - 1) {
            return;
        }

        var time = data.segment_details.arrival_times[index];
        var distance = data.segment_details.segment_distances[index];
        var chargeAtArrival = (data.segment_details.arrival_charges[index] * 100).toFixed(1);
        var chargeAtDeparture = (data.segment_details.departing_charges[index + 1] * 100).toFixed(1);
        var chargePower = data.segment_details.charge_speeds_kw[index];
        var stopDuration = data.segment_details.stop_durations[index];
        var cumDistance = (arr, index) => arr.slice(0, index + 1).reduce((acc, val) => acc + val, 0);

        var departTime = data.segment_details.depart_times[index + 1];
        var arrivalTime = data.segment_details.arrival_times[index];

        const segmentElement = document.createElement('div');
        const charger = data.chargers[index];

        segmentElement.className = 'segment';
        segmentElement.innerHTML = `
            <h6><i class="fas fa-map-marker-alt"></i> Stop ${index + 1}<span class="time">${formatTime(arrivalTime)}</span></h6>
            <p style="padding-bottom: 5px;"><i class="fa fa-plug"></i><b>${charger.title}</b></p>            
            <p><i class="fas fa-hourglass-half"></i> Duration: ${formatSecondsToTime(duration)}</p>
            <p><i class="fas fa-road"></i> Distance: ${formatMetersToKm(distance)}</p>
            <p><i class="fa fa-battery-three-quarters"></i> Charging: ${chargeAtArrival}% \u2192 ${chargeAtDeparture}% (${formatSecondsToTime(stopDuration)}, <i class="fa fa-bolt"></i>${chargePower} kW)</p>
        `;

        // check if food establishment is adjacent to charger, if so add it
        if ((data.food_establishments.length > 0) && (data.chargers[index].id === data.food_establishments[0].adjacent_charger_id)) {
            console.log('food establishment found');

            const foodEstablishment = data.food_establishments[0];
            const categories = foodEstablishment.categories.map(category => category.name).join(', ');
            const price = convertPriceToSymbols(foodEstablishment.price);
            const website = foodEstablishment.website ? `<a href="${foodEstablishment.website}" target="_blank">${foodEstablishment.website}</a>` : '';
            const foodElement = document.createElement('div');
            foodElement.className = 'food-segment';
            foodElement.innerHTML = `
                <h6><i class="fas fa-utensils"></i> ${foodEstablishment.name}</h6>
                <p><i class="fas fa-tag"></i> Price: ${price}</p>
                <p><i class="fas fa-star"></i> Rating: ${(foodEstablishment.rating * 10).toFixed(1)}/10</p>
                <p><i class="fas fa-list"></i> Category: ${categories}</p>
                <p><i class="fas fa-map-marker-alt"></i> Address: ${foodEstablishment.address.formated_address}</p>
                <p><i class="fas fa-link"></i> Website: ${website}</p>
            `;
            segmentElement.appendChild(foodElement);
        }
        resultsContainer.appendChild(segmentElement);
    });


}

// helper formatting functions
function formatMetersToKm(meters) {
    const kilometers = meters / 1000;
    return `${kilometers.toFixed(2)} km`;
}

function formatSecondsToTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours === 0) {
        return `${minutes} min`;
    }
    return `${hours} hrs ${minutes} min`;
}

function formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
}

function convertPriceToSymbols(price) {
    if (price === null) {
        return '';
    }
    if (price >= 1 && price <= 4) {
        return '£'.repeat(price);
    }
    return '';
}

function populateSummary(startLocation, endLocation, distance, time, stops) {
    document.querySelector('.summary-header [data-summary="location"]').innerHTML = `${endLocation}`;
    document.querySelector('.summary-header [data-summary="route"]').innerHTML = `${startLocation} to ${endLocation}`;
    document.querySelector('.summary-header [data-summary="details"]').innerHTML = `<i class="fas fa-road"></i> ${distance}, <i class="fas fa-hourglass-half"></i> ${time}, <i class="fa fa-plug"></i> ${stops}`;
}

function populateStart(startLocation, battery, initialDepartTime) {
    const resultsContainer = document.querySelector('.start-header');
    resultsContainer.innerHTML = '';
    resultsContainer.innerHTML = `
            <h6><i class="fas fa-map-marker-alt"></i> Start<span class="time">${formatTime(initialDepartTime)}</span></h6>
            <p>${startLocation}</p>
            <p><i class="fas fa-battery-half"></i> ${battery}</p>
        `;
}

function populateEnd(endLocation, battery, distance, finalArrivalTime) {
    const resultsContainer = document.querySelector('.end-header');
    resultsContainer.innerHTML = '';
    resultsContainer.innerHTML = `
            <h6><i class="fas fa-map-marker-alt"></i> Finish<span class="time">${formatTime(finalArrivalTime)}</span></h6>
            <p>${endLocation}</p>
            <p><i class="fas fa-road"></i> ${distance}</p>
            <p><i class="fas fa-battery-half"></i> ${battery}</p>
        `;
}

// custom icon for location button
var locationIcon = L.divIcon({
    className: 'custom-div-icon',
    html: "<div style='background-color:blue; border: 2px solid white; border-radius: 50%; width: 15px; height: 15px; box-shadow: 0 0 10px rgba(0, 123, 255, 0.5);'></div>",
    iconSize: [10, 10],
    iconAnchor: [10, 10],
});

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

// green icon for first i.e. optimal food establishment
var firstFoodIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// orange icon for subsequent food establishments
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
        document.getElementById('startLocation').value = e.latlng.lat.toFixed(6) + ',' + e.latlng.lng.toFixed(6);
        settingStart = false; // next click will set the end point

        // create/move startMarker
        if (!startMarker) {
            startMarker = L.marker(e.latlng, {icon: startIcon}).addTo(map).bindPopup('Start Location');
        } else {
            startMarker.setLatLng(e.latlng);
        }
    } else {
        // set the end point
        document.getElementById('endLat').value = e.latlng.lat.toFixed(6);
        document.getElementById('endLong').value = e.latlng.lng.toFixed(6);
        document.getElementById('endLocation').value = e.latlng.lat.toFixed(6) + ',' + e.latlng.lng.toFixed(6);
        settingStart = true; // now that start and end are set: reset settingStart to true for neck click

        // Create/move endMarker
        if (!endMarker) {
            endMarker = L.marker(e.latlng, {icon: endIcon}).addTo(map).bindPopup('End Location');
        } else {
            endMarker.setLatLng(e.latlng);
        }
    }
});


// resetting coordinates on the map/form only
function resetPoints() {
    settingStart = true; // reset to setting the start point
    document.getElementById('startLat').value = '';
    document.getElementById('startLong').value = '';
    document.getElementById('startLocation').value = '';
    document.getElementById('endLat').value = '';
    document.getElementById('endLong').value = '';
    document.getElementById('endLocation').value = '';

    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);
    startMarker = null;
    endMarker = null;
}

// reset all form fields
function resetForm() {
    settingStart = true; // reset to setting the start point
    resetPoints()

    document.getElementById('endLocation').value = '';
    document.getElementById('foodPreferences').value = '';
    document.getElementById('routeForm').reset();

    var departTimeInput = document.getElementById('departTime');
    if (departTimeInput) {
        var now = new Date();
        var hours = String(now.getHours()).padStart(2, '0');
        var minutes = String(now.getMinutes()).padStart(2, '0');
        departTimeInput.value = `${hours}:${minutes}`;
    }

    $('#foodPreferences').val(null).trigger('change');
    $('#connectionTypes').val(null).trigger('change');
    $('#accessTypes').val(null).trigger('change');

}

// event listener for resetButton btn that calls the resetForm() function when clicked
document.getElementById('resetButton').addEventListener('click', resetForm);


// event listener for locateButton btn that gets the user's location and sets the map view to that location
document.getElementById('locateButton').addEventListener('click', function () {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // centres map on user location
            map.setView([lat, lng], 18);

            // add a marker at the user location
            L.marker([lat, lng], {icon: locationIcon}).addTo(map);
        }, function (error) {
            console.error('Error getting location:', error);
            alert('Unable to retrieve your location');
        });
    } else {
        alert('Geolocation is not supported by this browser.');
    }
});

// event listener for toggleButton btn that hides/shows the sidebar
document.getElementById('toggleButton').addEventListener('click', function () {
    var panel = document.getElementById('floatingPanel');
    var button = document.getElementById('toggleButton');
    var icon = this.querySelector('i');
    if (panel.style.left === '20px' || panel.style.left === '') {
        panel.style.left = '-285px'; // hides the panel
        button.style.left = '0px'; // moves button
        icon.className = 'fas fa-angle-double-right'; // flip icon
// button.textContent = '▶';
    } else {
        panel.style.left = '20px'; // moves panel back to original position
        button.style.left = '305px'; // moves button back to original position
        icon.className = 'fas fa-angle-double-left'; // flip icon
// button.textContent = '◀'; // Change icon to left arrow
    }
});


// Mapbox geocoding api

import {MAPBOX_API_KEY} from './keys.js';

mapboxgl.accessToken = MAPBOX_API_KEY;

// updates start/end location input fields with place name and lat/long hidden fields with coordinates
window.selectPlace = function (place, coordinates, inputId) {
    console.log(place, " + ", inputId);
    var input = document.getElementById(inputId);
    input.value = place;
    document.getElementById(inputId.replace('Location', 'Suggestions')).style.display = 'none';

    // map coordinates to lat and long fields
    if (inputId === 'startLocation') {
        document.getElementById('startLat').value = coordinates[1]; // lat
        document.getElementById('startLong').value = coordinates[0]; // long
    } else if (inputId === 'endLocation') {
        document.getElementById('endLat').value = coordinates[1]; // lat
        document.getElementById('endLong').value = coordinates[0]; // long
    }
}

// get user's current location and set it as the start/end location
window.getCurrentLocation = function (inputId) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            // const place = `Current Location (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
            const place = `Your Location`;
            selectPlace(place, [lng, lat], inputId);
        }, function (error) {
            console.error('Error getting location:', error);
            alert('Unable to retrieve your location');
        });
    } else {
        alert('Geolocation is not supported by this browser.');
    }
}

// used if user enters address but doesn't select a suggestion
let firstSuggestionStart = null;
let firstSuggestionEnd = null;

// autocomplete and geocoding using mapbox api
function autocompleteLocation(inputId, suggestionsId) {
    var input = document.getElementById(inputId);
    var suggestions = document.getElementById(suggestionsId);

    input.addEventListener('input', throttle(function () {

        // selecting 'Your Location' calls getCurrentLocation() function
        const currentLocationSuggestion = `<div onclick="getCurrentLocation('${inputId}')">Your Location</div>`;

        // prevent calls to mapbox if lat/long coordinates are manually entered
        const value = input.value.trim();
        const latLongRegex = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;
        const partialLatLongRegex = /^-?\d+(\.\d+)?$/;

        if (latLongRegex.test(value) || partialLatLongRegex.test(value)) {
            const [lat, long] = value.split(',').map(Number);
            console.log([lat, long])
            console.log([long, lat])

            selectPlace(value, [long, lat], inputId);
            // suggestions.style.display = 'none';
            suggestions.innerHTML = currentLocationSuggestion;
            suggestions.style.display = 'block';
            return;
        }

        // min chars before making a request to mapbox
        if (input.value.length < 5) {
            // suggestions.style.display = 'none';
            suggestions.innerHTML = currentLocationSuggestion;
            suggestions.style.display = 'block';
            return;
        }

        // call to mapbox api
        var url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input.value)}.json?access_token=${mapboxgl.accessToken}&autocomplete=true&limit=4&country=GB`;
        console.log(url)
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log(data);
                // const currentLocationSuggestion = `<div onclick="getCurrentLocation('${inputId}')">Your Location</div>`;
                if (data.features.length) {
                    // extract place name from mapbox response
                    const place = data.features.map(feature => feature.place_name).join(', ');
                    console.log(place);

                    // sets start/end suggestion to first mapbox suggestion if user doesn't select an autocomplete suggestion
                    if (inputId === 'startLocation') {
                        firstSuggestionStart = data.features[0];
                        console.log(firstSuggestionStart);
                    } else if (inputId === 'endLocation') {
                        firstSuggestionEnd = data.features[0];
                    }

                    // populate search suggestions
                    suggestions.innerHTML = currentLocationSuggestion + data.features.map(feature => `<div onclick="selectPlace('${feature.place_name}', [${feature.center[0]}, ${feature.center[1]}], '${inputId}')">${feature.place_name}</div>`).join('');
                    suggestions.style.display = 'block';
                } else {

                    // if no results found populate with your location suggestion and 'No results found'
                    suggestions.innerHTML = currentLocationSuggestion + '<div>No results found</div>';
                    suggestions.style.display = 'block';
                }
            })
            .catch(err => {
                console.error(err);
                suggestions.innerHTML = '<div>Error loading results</div>';
                suggestions.style.display = 'block';
            });
    }, 1000)); // throttle mapbox requests

    // hide suggestions when input field loses focus with enough time to process suggestion
    input.addEventListener('blur', function () {
        setTimeout(() => {
            suggestions.style.display = 'none';
        }, 200);
    });
}

// typing in start/end location input fields triggers autocomplete and geocoding
document.addEventListener('DOMContentLoaded', function () {
    autocompleteLocation('startLocation', 'startSuggestions');
    autocompleteLocation('endLocation', 'endSuggestions');
});

// throttles requests to mapbox api
function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function () {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function () {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}


// switches sidebar between form and results content
function showResultsPanel() {
    document.getElementById('panel-content').classList.add('content-hidden');
    document.getElementById('panel-content').classList.remove('content-active');
    document.getElementById('results-content').classList.add('content-active');
    document.getElementById('results-content').classList.remove('content-hidden');
}

document.getElementById('backToForm').addEventListener('click', function () {
    document.getElementById('panel-content').classList.remove('content-hidden');
    document.getElementById('panel-content').classList.add('content-active');
    document.getElementById('results-content').classList.remove('content-active');
    document.getElementById('results-content').classList.add('content-hidden');
});