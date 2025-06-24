let map;
let markers = [];
let infoWindow;
let userLocation = null;
let startLocation = null;
let closestEvent = null;
let returnPath = null;
let redLinePath = null;
let userScore = 0;
const visitedEvents = new Set();

const defaultIcon = "./assets/gogetway-logo.jpg";


// Event locations (name, short desc, lat, long)
const events = [
  { id: 1, title: "Marina Bay Sands", description: "Futuristic resort with sky pool.", position: { lat: 1.282302, lng: 103.858528 }, icon: defaultIcon },
  { id: 2, title: "Shiretoko Peninsula", description: "Japan's last vestiges of true wilderness.", position: { lat: 44.1997, lng: 145.2397 }, icon: defaultIcon },
  { id: 3, title: "Taj Mahal", description: "Iconic marble mausoleum in Agra.", position: { lat: 27.173891, lng: 78.042068 }, icon: defaultIcon },
  { id: 4, title: "Colosseum", description: "Ancient Roman gladiator arena.", position: { lat: 41.890251, lng: 12.492373 }, icon: defaultIcon },
  { id: 5, title: "Statue of Liberty", description: "Symbol of freedom in NYC.", position: { lat: 40.6892, lng: -74.0445 }, icon: defaultIcon },
];


// Styling for the default marker
function createDefaultMarkerContentWithImage(title, imgUrl) {
  const div = document.createElement("div");
  div.title = title;
  div.style.width = "40px";
  div.style.height = "40px";
  div.style.border = "2px solid white";
  div.style.boxShadow = "0 0 4px rgba(0,0,0,0.5)";
  div.style.cursor = "pointer";
  div.style.backgroundColor = "#fff";

  const img = document.createElement("img");
  img.src = imgUrl;
  img.alt = title;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.display = "block";
  img.style.borderRadius = "6px";

  div.appendChild(img);
  return div;
}

// Styling for a visited marker
function createVisitedMarkerContentWithImage(title, imgUrl) {
  const div = createDefaultMarkerContentWithImage(title, imgUrl);
  div.style.border = "2px solid green";
  div.style.boxShadow = "0 0 6px rgba(0,128,0,0.8)";
  return div;
}

// Updates points display and redeem based on the user’s score
function updateScoreDisplay() {
  const scoreEl = document.getElementById("score");
  const redeemLink = document.getElementById("redeem-link");
  const tooltip = document.querySelector(".tooltip-text");

  if (scoreEl) scoreEl.textContent = `Points Collected: ${userScore}`;

  if (userScore === events.length * 50) {
    redeemLink.classList.remove("disabled");
    redeemLink.removeAttribute("aria-disabled");
    redeemLink.style.pointerEvents = "auto";

    if (tooltip) tooltip.style.display = "none";

    redeemLink.replaceWith(redeemLink.cloneNode(true));
    const newRedeemLink = document.getElementById("redeem-link");
    newRedeemLink.addEventListener("click", () => {
      alert("🎉 Congratulations! You've completed all missions, you can now redeem your reward! Head to XXXX to exchange your reward.");
    });
  } else {
    redeemLink.classList.add("disabled");
    redeemLink.setAttribute("aria-disabled", "true");
    redeemLink.style.pointerEvents = "none";

    if (tooltip) tooltip.style.display = "block";

    redeemLink.replaceWith(redeemLink.cloneNode(true));
    const newRedeemLink = document.getElementById("redeem-link");
    newRedeemLink.addEventListener("click", (e) => {
      e.preventDefault();
    });
  }
}

// Display info window with event details and image
function showFallbackInfoWindow(event, marker) {
  const content = `
    <div style="max-width: 220px;">
      <strong>${event.title}</strong><br/>
      ${event.description}
      <img src="${event.icon}" style="width:100%; margin-top: 6px; border-radius: 4px;" />
    </div>`;
  infoWindow.setContent(content);
  infoWindow.open(map, marker);
  map.panTo(event.position);
  map.setZoom(14);
}

// Initialise the Google Map, places event markers, sets up event list with quizzes, user location, and paths
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 20.0, lng: 0.0 },
    zoom: 2.5,
    mapId: "DEMO_MAP_ID",
  });

  infoWindow = new google.maps.InfoWindow();

  // Reset infoWindowShown flag on close to allow refresh on next click
  google.maps.event.addListener(infoWindow, "closeclick", () => {
    markers.forEach((m) => m.infoWindowShown = false);
  });

  const placesService = new google.maps.places.PlacesService(map);

  const eventListDiv = document.getElementById("event-list");
  eventListDiv.innerHTML = "";

  const correctAnswers = {
    "Marina Bay Sands": "Singapore",
    "Shiretoko Peninsula": "Japan",
    "Taj Mahal": "India",
    "Colosseum": "Italy",
    "Statue of Liberty": "USA",
  };

  events.forEach((event) => {
    const marker = new google.maps.marker.AdvancedMarkerElement({
      position: event.position,
      map,
      title: event.title,
      content: createDefaultMarkerContentWithImage(event.title, event.icon),
    });

    marker.infoWindowShown = false;

    marker.content.addEventListener("click", () => {
      if (marker.infoWindowShown) {
        infoWindow.open(map, marker);
        return;
      }

      const request = {
        location: event.position,
        radius: '50', 
        keyword: event.title,
      };

      placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
          const placeId = results[0].place_id;
          placesService.getDetails({ placeId: placeId, fields: ['photos', 'name'] }, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
              let photoUrl = event.icon; 
              if (place.photos && place.photos.length > 0) {
                photoUrl = place.photos[0].getUrl({ maxWidth: 250 });
              }
              const content = `
                <div style="max-width: 220px;">
                  <strong>${event.title}</strong><br/>
                  ${event.description}
                  <img src="${photoUrl}" alt="${event.title}" style="width:100%; margin-top: 6px; border-radius: 4px;" />
                </div>`;
              infoWindow.setContent(content);
              infoWindow.open(map, marker);
              map.panTo(event.position);
              map.setZoom(14);
              marker.infoWindowShown = true;
            } else {
              showFallbackInfoWindow(event, marker);
              marker.infoWindowShown = true;
            }
          });
        } else {
          showFallbackInfoWindow(event, marker);
          marker.infoWindowShown = true;
        }
      });
    });

    markers.push(marker);

    const div = document.createElement("div");
    div.className = "event-item";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.gap = "12px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.title = "Mark as visited";

    checkbox.addEventListener("change", () => {
      if (visitedEvents.has(event.title)) {
        checkbox.checked = true;
        return;
      }
      if (checkbox.checked) {
        const userAnswer = prompt(
          `Quiz for "${event.title}":\nWhat country is this landmark located in?`
        );
        if (
          userAnswer &&
          userAnswer.trim().toLowerCase() ===
            correctAnswers[event.title].toLowerCase()
        ) {
          userScore += 50;
          updateScoreDisplay();
          visitedEvents.add(event.title);
          checkbox.checked = true;
          checkbox.disabled = true;

          marker.title = `${event.title} (Visited)`;

          marker.content.animate(
            [
              { transform: "scale(1)" },
              { transform: "scale(1.4)" },
              { transform: "scale(1)" },
            ],
            { duration: 600 }
          );

          marker.content = createVisitedMarkerContentWithImage(
            marker.title,
            event.icon
          );
          marker.content.addEventListener("click", () => {
            map.panTo(event.position);
            map.setZoom(14);
          });

          div.style.backgroundColor = "#d4edda";

          closestEvent = findNextUnvisitedEventInOrder();
          drawRedLineToClosestEvent();
        } else {
          alert("Incorrect answer. Please try again!");
          checkbox.checked = false;
        }
      }
    });

    const titleSpan = document.createElement("span");
    titleSpan.textContent = event.title;
    titleSpan.style.flexGrow = "1";
    titleSpan.style.fontSize = "15px";
    titleSpan.style.color = "#0077cc";
    titleSpan.style.cursor = "pointer";
    titleSpan.style.userSelect = "none";
    titleSpan.style.textDecoration = "none";
    titleSpan.style.fontWeight = "bold";

    titleSpan.addEventListener("click", () => {
      map.panTo(event.position);
      map.setZoom(14);
    });

    div.appendChild(checkbox);
    div.appendChild(titleSpan);
    eventListDiv.appendChild(div);
  });

  // Draw dashed lines connecting all events
  const pathCoords = events.map((e) => e.position);
  const dashedPath = new google.maps.Polyline({
    path: pathCoords,
    geodesic: true,
    strokeColor: "#888",
    strokeOpacity: 0.6,
    strokeWeight: 2,
    icons: [
      {
        icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 2 },
        offset: "0",
        repeat: "8px",
      },
    ],
  });
  dashedPath.setMap(map);

  // FIT MAP TO SHOW ALL EVENT MARKERS ON LOAD
  const bounds = new google.maps.LatLngBounds();
  events.forEach((event) => {
    bounds.extend(event.position);
  });
  map.fitBounds(bounds);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        startLocation = { ...userLocation };

        const userMarker = new google.maps.marker.AdvancedMarkerElement({
          position: userLocation,
          map,
          title: "You are here",
          content: (() => {
            const div = document.createElement("div");
            div.title = "You are here";
            div.style.width = "15px";
            div.style.height = "15px";
            div.style.borderRadius = "50%";
            div.style.backgroundColor = "#4285F4";
            div.style.border = "2px solid white";
            div.style.boxShadow = "0 0 6px rgba(66,133,244,0.8)";
            return div;
          })(),
        });

        closestEvent = findNextUnvisitedEventInOrder();
        drawRedLineToClosestEvent();

        document.getElementById("start-btn").classList.remove("hidden");
        document.getElementById("my-location-btn").classList.remove("hidden");
        document.getElementById("return-toggle-container").classList.remove("hidden");

        setupReturnToggle();

        document.getElementById("start-btn").onclick = () => startNavigationToClosestEvent();
        document.getElementById("my-location-btn").onclick = () => {
          map.panTo(userLocation);
          map.setZoom(16);
        };
      },
      (error) => console.warn("Geolocation error:", error.message)
    );
  } else {
    console.warn("Geolocation not supported");
  }

  updateScoreDisplay();
}

// Returns the next event in the list that the user has not yet visited
function findNextUnvisitedEventInOrder() {
  for (let i = 0; i < events.length; i++) {
    if (!visitedEvents.has(events[i].title)) {
      return events[i];
    }
  }
  return null;
}

// Draws red line from the user’s current location to the closest unvisited event
function drawRedLineToClosestEvent() {
  if (redLinePath) redLinePath.setMap(null);
  if (!userLocation || !closestEvent) return;

  redLinePath = new google.maps.Polyline({
    path: [userLocation, closestEvent.position],
    geodesic: true,
    strokeColor: "#FF0000",
    strokeOpacity: 1.0,
    strokeWeight: 3,
    map: map,
  });
}

// Opens Google Maps directions in a new tab from the user’s location to the closest unvisited event
function startNavigationToClosestEvent() {
  if (!userLocation || !closestEvent) return;
  const origin = `${userLocation.lat},${userLocation.lng}`;
  const destination = `${closestEvent.position.lat},${closestEvent.position.lng}`;
  const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  window.open(url, "_blank");
}

// Toggle control to show or hide a dotted line from the last event back to the user's start point
function setupReturnToggle() {
  const toggle = document.getElementById("return-toggle");
  toggle.addEventListener("change", () => {
    if (toggle.checked) {
      const lastEvent = events[events.length - 1];

      if (returnPath) returnPath.setMap(null);
      returnPath = new google.maps.Polyline({
        path: [lastEvent.position, startLocation],
        geodesic: true,
        strokeColor: "#000",
        strokeOpacity: 1.0,
        strokeWeight: 2,
        icons: [
          {
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillOpacity: 0.4,
              strokeOpacity: 0.6,
              scale: 2,
            },
            offset: "0",
            repeat: "15px",
          },
        ],
        map: map,
      });
    } else {
      if (returnPath) returnPath.setMap(null);
    }
  });
}

window.initMap = initMap;