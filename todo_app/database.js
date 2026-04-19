/**
 * Real-time restaurant database for Ann Arbor via Overpass API (OpenStreetMap)
 * Falls back to cached/static data if the API is unreachable.
 */

var RESTAURANTS = [];
var RESTAURANTS_LOADED = false;
var RESTAURANTS_CALLBACKS = [];

function onRestaurantsReady(cb) {
  if (RESTAURANTS_LOADED) { cb(RESTAURANTS); return; }
  RESTAURANTS_CALLBACKS.push(cb);
}

function _notifyReady() {
  RESTAURANTS_LOADED = true;
  RESTAURANTS_CALLBACKS.forEach(function (cb) { cb(RESTAURANTS); });
  RESTAURANTS_CALLBACKS = [];
}

// Ann Arbor bounding box (roughly)
var AA_SOUTH = 42.22;
var AA_NORTH = 42.32;
var AA_WEST = -83.80;
var AA_EAST = -83.68;

// Reference point: defaults to UM campus center, updated by geolocation
var REF_LAT = 42.2780;
var REF_LON = -83.7382;
var USER_LOCATION_SOURCE = "default"; // "default" | "gps" | "error"
var LOCATION_CALLBACKS = [];

function onLocationReady(cb) {
  if (USER_LOCATION_SOURCE !== "default") { cb({ lat: REF_LAT, lon: REF_LON, source: USER_LOCATION_SOURCE }); return; }
  LOCATION_CALLBACKS.push(cb);
}

function _notifyLocation() {
  var info = { lat: REF_LAT, lon: REF_LON, source: USER_LOCATION_SOURCE };
  LOCATION_CALLBACKS.forEach(function (cb) { cb(info); });
  LOCATION_CALLBACKS = [];
}

function _recalcDistances() {
  RESTAURANTS.forEach(function (r) {
    if (r.lat && r.lon) {
      var dist = _haversine(REF_LAT, REF_LON, r.lat, r.lon);
      r.distance = dist.toFixed(1) + " mi";
      r.distance_num = dist;
      r.delivery_time = _estimateDeliveryTime(dist);
      // Update fast delivery tag based on new distance
      var fastIdx = r.tags.indexOf("fast delivery");
      if (dist < 1.0 && fastIdx === -1) r.tags.push("fast delivery");
      if (dist >= 1.5 && fastIdx >= 0) r.tags.splice(fastIdx, 1);
    }
  });
  RESTAURANTS.sort(function (a, b) { return (a.distance_num || 99) - (b.distance_num || 99); });
}

function requestUserLocation() {
  if (!navigator.geolocation) {
    USER_LOCATION_SOURCE = "error";
    _notifyLocation();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    function (pos) {
      REF_LAT = pos.coords.latitude;
      REF_LON = pos.coords.longitude;
      USER_LOCATION_SOURCE = "gps";
      // Recalculate all distances from the user's real position
      if (RESTAURANTS.length > 0) _recalcDistances();
      _notifyLocation();
    },
    function (err) {
      console.warn("Geolocation denied or unavailable:", err.message);
      USER_LOCATION_SOURCE = "error";
      _notifyLocation();
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

// Start requesting location immediately
requestUserLocation();

function _haversine(lat1, lon1, lat2, lon2) {
  var R = 3958.8; // miles
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function _normalizeCuisine(tags) {
  var cuisine = (tags.cuisine || "").toLowerCase();
  var name = (tags.name || "").toLowerCase();
  var amenity = (tags.amenity || "");

  // Map common cuisines
  var map = {
    "chinese": "Chinese", "japanese": "Japanese", "sushi": "Japanese",
    "korean": "Korean", "thai": "Thai", "vietnamese": "Vietnamese",
    "indian": "Indian", "mexican": "Mexican", "italian": "Italian",
    "pizza": "Pizza", "burger": "Burgers", "american": "American",
    "mediterranean": "Mediterranean", "greek": "Greek", "middle_eastern": "Middle Eastern",
    "french": "French", "ethiopian": "Ethiopian", "african": "African",
    "seafood": "Seafood", "barbecue": "BBQ", "bbq": "BBQ",
    "sandwich": "Sandwiches", "coffee": "Cafe", "cafe": "Cafe",
    "bakery": "Bakery", "ice_cream": "Desserts", "tea": "Bubble Tea",
    "bubble_tea": "Bubble Tea", "ramen": "Ramen", "noodle": "Noodles",
    "chicken": "Chicken", "wings": "Wings", "vegan": "Vegan",
    "vegetarian": "Vegetarian", "breakfast": "Breakfast", "brunch": "Brunch",
    "deli": "Deli", "salad": "Salad"
  };

  // Check cuisine tag first
  for (var key in map) {
    if (cuisine.indexOf(key) >= 0) return map[key];
  }
  // Check name as fallback
  for (var key2 in map) {
    if (name.indexOf(key2) >= 0) return map[key2];
  }

  if (amenity === "cafe") return "Cafe";
  if (amenity === "fast_food") return "Fast Food";
  if (cuisine) return cuisine.charAt(0).toUpperCase() + cuisine.slice(1).split(";")[0];

  return "Restaurant";
}

function _estimateDeliveryTime(distMiles) {
  // Base 10 min + 5 min per mile, rounded to 5
  var mins = Math.round((10 + distMiles * 5) / 5) * 5;
  return Math.max(15, Math.min(60, mins)) + " min";
}

function _generateTags(tags, dist) {
  var result = [];
  var amenity = tags.amenity || "";
  var name = (tags.name || "").toLowerCase();

  // "fast delivery" for places under 1 mile or fast food
  if (dist < 1.0 || amenity === "fast_food") result.push("fast delivery");

  // "popular" heuristic: has website, phone, or opening_hours (= well-maintained listing)
  var detail = 0;
  if (tags.website || tags["contact:website"]) detail++;
  if (tags.phone || tags["contact:phone"]) detail++;
  if (tags.opening_hours) detail++;
  if (tags["addr:street"]) detail++;
  if (detail >= 2) result.push("popular");

  return result;
}

var OVERPASS_QUERY = [
  '[out:json][timeout:25];',
  '(',
  '  node["amenity"="restaurant"](' + AA_SOUTH + ',' + AA_WEST + ',' + AA_NORTH + ',' + AA_EAST + ');',
  '  node["amenity"="cafe"](' + AA_SOUTH + ',' + AA_WEST + ',' + AA_NORTH + ',' + AA_EAST + ');',
  '  node["amenity"="fast_food"](' + AA_SOUTH + ',' + AA_WEST + ',' + AA_NORTH + ',' + AA_EAST + ');',
  '  way["amenity"="restaurant"](' + AA_SOUTH + ',' + AA_WEST + ',' + AA_NORTH + ',' + AA_EAST + ');',
  '  way["amenity"="cafe"](' + AA_SOUTH + ',' + AA_WEST + ',' + AA_NORTH + ',' + AA_EAST + ');',
  '  way["amenity"="fast_food"](' + AA_SOUTH + ',' + AA_WEST + ',' + AA_NORTH + ',' + AA_EAST + ');',
  ');',
  'out center;'
].join('\n');

var CACHE_KEY = "foodvision.restaurants.cache";
var CACHE_TTL = 1000 * 60 * 60; // 1 hour

function _parseOverpassResults(elements) {
  var seen = {};
  var results = [];
  var id = 0;

  elements.forEach(function (el) {
    if (!el.tags || !el.tags.name) return;
    var name = el.tags.name.trim();
    if (seen[name.toLowerCase()]) return; // deduplicate
    seen[name.toLowerCase()] = true;

    var lat = el.lat || (el.center && el.center.lat) || 0;
    var lon = el.lon || (el.center && el.center.lon) || 0;
    if (!lat || !lon) return;

    var dist = _haversine(REF_LAT, REF_LON, lat, lon);
    id++;

    results.push({
      id: id,
      name: name,
      category: _normalizeCuisine(el.tags),
      rating: null, // OSM doesn't have ratings
      distance: dist.toFixed(1) + " mi",
      distance_num: dist,
      delivery_time: _estimateDeliveryTime(dist),
      tags: _generateTags(el.tags, dist),
      location: "Ann Arbor",
      lat: lat,
      lon: lon,
      address: _buildAddress(el.tags),
      phone: el.tags.phone || el.tags["contact:phone"] || null,
      website: el.tags.website || el.tags["contact:website"] || null,
      opening_hours: el.tags.opening_hours || null,
      osm_cuisine: el.tags.cuisine || null
    });
  });

  // Sort by distance
  results.sort(function (a, b) { return a.distance_num - b.distance_num; });
  return results;
}

function _buildAddress(tags) {
  var parts = [];
  if (tags["addr:housenumber"]) parts.push(tags["addr:housenumber"]);
  if (tags["addr:street"]) parts.push(tags["addr:street"]);
  if (parts.length) return parts.join(" ");
  return null;
}

function _tryCache() {
  try {
    var raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    var cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp < CACHE_TTL && cached.data && cached.data.length > 0) {
      return cached.data;
    }
  } catch (e) { }
  return null;
}

function _saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: data }));
  } catch (e) { }
}

// Static fallback (original data)
var STATIC_RESTAURANTS = [
  { id: 1, name: "Zingerman's Delicatessen", category: "Deli", rating: 4.7, distance: "0.8 mi", delivery_time: "20 min", tags: ["popular"], location: "Ann Arbor", address: "422 Detroit St" },
  { id: 2, name: "Frita Batidos", category: "Cuban", rating: 4.6, distance: "0.3 mi", delivery_time: "15 min", tags: ["popular", "fast delivery"], location: "Ann Arbor", address: "117 W Washington St" },
  { id: 3, name: "Tomukun Noodle Bar", category: "Korean", rating: 4.5, distance: "0.2 mi", delivery_time: "15 min", tags: ["popular", "fast delivery"], location: "Ann Arbor", address: "505 E Liberty St" },
  { id: 4, name: "Hola Seoul", category: "Korean", rating: 4.5, distance: "0.4 mi", delivery_time: "20 min", tags: ["popular", "fast delivery"], location: "Ann Arbor", address: "715 N University Ave" },
  { id: 5, name: "Slurping Turtle", category: "Japanese", rating: 4.4, distance: "0.3 mi", delivery_time: "15 min", tags: ["popular", "fast delivery"], location: "Ann Arbor", address: "608 Church St" },
  { id: 6, name: "Madras Masala", category: "Indian", rating: 4.3, distance: "0.5 mi", delivery_time: "20 min", tags: ["popular"], location: "Ann Arbor", address: "340 S State St" },
  { id: 7, name: "No Thai!", category: "Thai", rating: 4.5, distance: "0.6 mi", delivery_time: "20 min", tags: ["popular"], location: "Ann Arbor", address: "226 N Fourth Ave" },
  { id: 8, name: "Jerusalem Garden", category: "Middle Eastern", rating: 4.4, distance: "0.2 mi", delivery_time: "15 min", tags: ["popular", "fast delivery"], location: "Ann Arbor", address: "314 E Liberty St" },
  { id: 9, name: "Totoro", category: "Japanese", rating: 4.3, distance: "0.7 mi", delivery_time: "25 min", tags: ["popular"], location: "Ann Arbor", address: "318 S State St" },
  { id: 10, name: "Panda Express", category: "Chinese", rating: 3.9, distance: "0.5 mi", delivery_time: "15 min", tags: ["fast delivery"], location: "Ann Arbor", address: "603 E Liberty St" },
  { id: 11, name: "Pizza House", category: "Pizza", rating: 4.2, distance: "0.4 mi", delivery_time: "25 min", tags: ["popular"], location: "Ann Arbor", address: "618 Church St" },
  { id: 12, name: "Chipotle", category: "Mexican", rating: 4.0, distance: "0.3 mi", delivery_time: "15 min", tags: ["fast delivery"], location: "Ann Arbor", address: "322 S State St" },
  { id: 13, name: "Sava's", category: "American", rating: 4.5, distance: "0.2 mi", delivery_time: "20 min", tags: ["popular"], location: "Ann Arbor", address: "216 S State St" },
  { id: 14, name: "Mani Osteria", category: "Italian", rating: 4.6, distance: "0.5 mi", delivery_time: "25 min", tags: ["popular"], location: "Ann Arbor", address: "341 E Liberty St" },
  { id: 15, name: "Taste of India", category: "Indian", rating: 4.2, distance: "1.1 mi", delivery_time: "30 min", tags: [], location: "Ann Arbor", address: "2745 Plymouth Rd" }
];

(function fetchRestaurants() {
  // Try cache first
  var cached = _tryCache();
  if (cached) {
    RESTAURANTS = cached;
    _notifyReady();
    // Still refresh in background
    _fetchFromOverpass(true);
    return;
  }

  _fetchFromOverpass(false);
})();

function _fetchFromOverpass(isBackground) {
  var url = "https://overpass-api.de/api/interpreter";

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(OVERPASS_QUERY)
  })
    .then(function (res) {
      if (!res.ok) throw new Error("Overpass HTTP " + res.status);
      return res.json();
    })
    .then(function (json) {
      var parsed = _parseOverpassResults(json.elements || []);
      if (parsed.length > 0) {
        _saveCache(parsed);
        RESTAURANTS = parsed;
        if (!isBackground) {
          _notifyReady();
        } else {
          // Notify again so UI can refresh with latest data
          RESTAURANTS_LOADED = true;
          RESTAURANTS_CALLBACKS.forEach(function (cb) { cb(RESTAURANTS); });
        }
      } else if (!isBackground) {
        // No results from API, use static
        RESTAURANTS = STATIC_RESTAURANTS;
        _notifyReady();
      }
    })
    .catch(function (err) {
      console.warn("Overpass API unavailable, using fallback:", err.message);
      if (!isBackground && !RESTAURANTS_LOADED) {
        RESTAURANTS = STATIC_RESTAURANTS;
        _notifyReady();
      }
    });
}
