// === MAP INITIALISATION ===
const map = L.map('map', {
  attributionControl: false,
  fullscreenControl: true,
  fullscreenControlOptions: { position: 'bottomleft' },
  zoomSnap: 0.1,
  zoomDelta: 0.25,
  zoomControl: false
}).setView([53.4808, -2.2426], 9);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

L.control.zoom({ position: 'bottomleft' }).addTo(map);

// === LOCATE CONTROL ===
L.control.locate({
  position: 'bottomleft',
  setView: 'once',
  flyTo: true,
  strings: { title: 'Show my location' }
}).addTo(map);

// === UI ELEMENTS ===
document.body.insertAdjacentHTML('beforeend', `
  <div class="search-box">
    <input id="postcode" type="text" placeholder="Enter address & postcode" aria-label="Enter address & postcode">
    <button onclick="searchPostcode()" aria-label="Search postcode">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
           stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    </button>
    <input type="checkbox" id="toggleSubmission" style="display: none;">
  </div>

  <div class="logo-container">
    <a href="https://www.paulashtonarchitects.com" target="_blank" rel="noopener noreferrer">
      <img src="https://images.squarespace-cdn.com/content/55a50e7fe4b04da0e766ef8b/5544d80b-3eae-4156-ad5c-a3e124ccfed2/PAA+Logo+04+-+128.png"
           alt="PAA Logo">
    </a>
  </div>

  <div class="attribution">
    Map data © Crown copyright and database right 2025. Licensed under OGL v3.
  </div>
`);

// === POSTCODE SEARCH ===
let searchMarker;

function displayPopup(lat, lon, label) {
  const template = addressString => `
    <div style="font-size:15px;line-height:1.6;">
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="text-align:right;">Coords:</td><td><strong>${label}</strong></td></tr>
        <tr><td style="text-align:right;">Address:</td><td><strong>${addressString || 'Unavailable'}</strong></td></tr>
      </table>
    </div>`;

  map.flyTo([lat, lon], 16, { animate: true, duration: 2 });

  if (searchMarker) map.removeLayer(searchMarker);

  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`)
    .then(r => r.json())
    .then(d => {
      const a = d.address;
      const addr = [a.road || '', a.suburb || a.village || a.town || a.city || '', a.postcode || '']
        .filter(Boolean).join(', ');
      searchMarker = L.marker([lat, lon]).addTo(map).bindPopup(template(addr)).openPopup();
    })
    .catch(() => {
      searchMarker = L.marker([lat, lon]).addTo(map).bindPopup(template()).openPopup();
    });
}

function searchPostcode() {
  const q = document.getElementById('postcode').value.trim();
  if (!q) return alert('Please enter a postcode or address.');
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=gb&limit=1`)
    .then(r => r.json())
    .then(data => {
      if (!data.length) return alert('Postcode not found.');
      displayPopup(+data[0].lat, +data[0].lon, q);
    });
}

map.on('click', e => {
  displayPopup(e.latlng.lat, e.latlng.lng, `Lat: ${e.latlng.lat.toFixed(5)}, Lon: ${e.latlng.lng.toFixed(5)}`);
});
