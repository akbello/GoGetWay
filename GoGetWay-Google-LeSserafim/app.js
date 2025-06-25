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
const eventIcon = "./assets/popup-logo.jpg";

const events = [
  { id: 1, title: "Westfield World Trade Center", description: "Voice of the Future Experience - Step into a Google-powered sound booth to remix LE SSERAFIM vocals with AI-generated beats.", position: { lat: 40.712742, lng: -74.013382 }, icon: eventIcon },
  { id: 2, title: "Union Square", description: "Search Your Style - Try on LE SSERAFIM-inspired AR outfits and generate Google Lens fashion boards in real time.", position: { lat: 40.7359, lng: -73.9911 }, icon: eventIcon },
  { id: 3, title: "Dumbo Archway Plaza", description: "Graffiti with the Girls - A live digital mural wall lets fans draw alongside motion-reactive LE SSERAFIM avatars.", position: { lat: 40.703056, lng: -73.988056 }, icon: eventIcon },
  { id: 4, title: "Barclays Center Plaza", description: "FEARLESS Flashmob Stage - Surprise LE SSERAFIM hologram dance battle where fans can join the routine and appear on screen with the group.", position: { lat: 40.682732, lng: -73.975876 }, icon: eventIcon },
  { id: 5, title: "Flushing Meadows - Corona Park", description: "Mind Maze - A tech-meets-K-pop escape maze powered by Google Assistant and themed around LE SSERAFIM music videos.", position: { lat: 40.768452, lng: -73.832764 }, icon: eventIcon }
];

// --- Helper Functions ---

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

function createVisitedMarkerContentWithImage(title, imgUrl) {
  const div = createDefaultMarkerContentWithImage(title, imgUrl);
  div.style.border = "2px solid green";
  div.style.boxShadow = "0 0 6px rgba(0,128,0,0.8)";
  return div;
}

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
      alert("🎉 Congratulations! You've completed all missions, you can now redeem your reward! Head to the nearest booth to exchange your reward.");
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

function findClosestUnvisitedEvent() {
  if (!userLocation) return null;

  let closest = null;
  let shortestDistance = Infinity;

  events.forEach(event => {
    if (!visitedEvents.has(event.title)) {
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(userLocation),
        new google.maps.LatLng(event.position)
      );
      if (distance < shortestDistance) {
        shortestDistance = distance;
        closest = event;
      }
    }
  });

  return closest;
}

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

function startNavigationToClosestEvent() {
  if (!userLocation || !closestEvent) return;
  const origin = `${userLocation.lat},${userLocation.lng}`;
  const destination = `${closestEvent.position.lat},${closestEvent.position.lng}`;
  const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  window.open(url, "_blank");
}

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

// --- Core Map Logic ---

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 20.0, lng: 0.0 },
    zoom: 2.5,
    mapId: "DEMO_MAP_ID",
  });

  infoWindow = new google.maps.InfoWindow();
  const placesService = new google.maps.places.PlacesService(map);
  const eventListDiv = document.getElementById("event-list");
  eventListDiv.innerHTML = "";

  const correctAnswers = {
    "Westfield World Trade Center": "LS123",
    "Union Square": "GG123",
    "Dumbo Archway Plaza": "AG123",
    "Barclays Center Plaza": "GA123",
    "Flushing Meadows - Corona Park": "CX123",
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

      const request = { location: event.position, radius: '50', keyword: event.title };
      placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
          const placeId = results[0].place_id;
          placesService.getDetails({ placeId: placeId, fields: ['photos', 'name'] }, (place, status) => {
            let photoUrl = event.icon;
            if (status === google.maps.places.PlacesServiceStatus.OK && place.photos?.length > 0) {
              photoUrl = place.photos[0].getUrl({ maxWidth: 250 });
            }
            const content = `<div style="max-width: 220px;">
              <strong>${event.title}</strong><br/>${event.description}
              <img src="${photoUrl}" style="width:100%; margin-top: 6px; border-radius: 4px;" />
            </div>`;
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
            map.panTo(event.position);
            map.setZoom(14);
            marker.infoWindowShown = true;
          });
        } else {
          const fallback = `<div style="max-width: 220px;">
            <strong>${event.title}</strong><br/>${event.description}
            <img src="${event.icon}" style="width:100%; margin-top: 6px; border-radius: 4px;" />
          </div>`;
          infoWindow.setContent(fallback);
          infoWindow.open(map, marker);
          map.panTo(event.position);
          map.setZoom(14);
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
        const userAnswer = prompt(`Obtained code in "${event.title}"?\nEnter the code:`);
        if (userAnswer?.trim().toLowerCase() === correctAnswers[event.title].toLowerCase()) {
          userScore += 50;
          updateScoreDisplay();
          visitedEvents.add(event.title);
          checkbox.checked = true;
          checkbox.disabled = true;

          marker.title = `${event.title} (Visited)`;
          marker.content.animate([{ transform: "scale(1)" }, { transform: "scale(1.4)" }, { transform: "scale(1)" }], { duration: 600 });
          marker.content = createVisitedMarkerContentWithImage(marker.title, event.icon);
          marker.content.addEventListener("click", () => {
            map.panTo(event.position);
            map.setZoom(14);
          });
          div.style.backgroundColor = "#d4edda";

          closestEvent = findClosestUnvisitedEvent();
          drawRedLineToClosestEvent();
        } else {
          alert("Invalid code. Please try again!");
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

  // Draw dashed path between all event locations
  const pathCoords = events.map((e) => e.position);
  const dashedPath = new google.maps.Polyline({
    path: pathCoords,
    geodesic: true,
    strokeColor: "#888",
    strokeOpacity: 0.6,
    strokeWeight: 2,
    icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 2 }, offset: "0", repeat: "8px" }],
  });
  dashedPath.setMap(map);

  const bounds = new google.maps.LatLngBounds();
  events.forEach((event) => bounds.extend(event.position));
  map.fitBounds(bounds);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
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

      closestEvent = findClosestUnvisitedEvent();
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
    });
  }

  updateScoreDisplay();
}

window.initMap = initMap;