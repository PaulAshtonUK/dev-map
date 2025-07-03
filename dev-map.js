// Existing constants
const lpaWithUnavailableConservation = [
  'Cheshire West and Chester',
  'West Lancashire',
  'Cheshire East',
  'Liverpool',
  'Northumberland',
  'Leeds',
  'Wakefield',
  'Bassetlaw',
  'South Kesteven',
  'Melton',
  'Stratford-on-Avon',
  'Malvern Hills',
  'Hart',
  'Isle of Wight',
  'Wokingham',
  'Sevenoaks',
  'Maidstone',
  'Tunbridge Wells',
  'Ashford',
  'Thanet'
];

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
L.control.locate({
  position: 'bottomleft',
  setView: 'once',
  flyTo: true,
  strings: { title: 'Show my location' }
}).addTo(map);

const layersControl = L.control.layers(null, null, { collapsed: false, position: 'topright' }).addTo(map);

let greenBeltLayer, lpaLayer, aonbLayer, sssiLayer, nationalParksLayer, conservationAreaLayer, projectsLayer;
let whsLayer, whsBufferLayer, nutrientNeutralityLayer;

function loadGeo(url, style, label) {
  fetch(url).then(r => r.json()).then(d => {
    const layer = L.geoJSON(d, { style }).addTo(map);
    layersControl.addOverlay(layer, label);
    if (label === 'Green Belt') greenBeltLayer = layer;
    if (label === 'Local Planning Authority') lpaLayer = layer;
    if (label === 'AONB') aonbLayer = layer;
    if (label === 'SSSI') sssiLayer = layer;
    if (label === 'National Parks') nationalParksLayer = layer;
    if (label === 'Conservation Area') conservationAreaLayer = layer;
    if (label === 'World Heritage Site') whsLayer = layer; 
    if (label === 'World Heritage Buffer Zone') whsBufferLayer = layer; 
    if (label === 'Nutrient Neutrality') nutrientNeutralityLayer = layer;
  });
}

// Load layers
loadGeo('https://raw.githubusercontent.com/PaulAshtonUK/map-data/a9631f9750b4189ad0bd182ef2c303ee7ecbc489/green-belt-gpt.geojson', { color: 'green', weight: 0, fillOpacity: 0.25 }, 'Green Belt');
loadGeo('https://raw.githubusercontent.com/PaulAshtonUK/LPA/main/local-planning-authority-s.json', { color: 'grey', weight: 0.2, fillOpacity: 0 }, 'Local Planning Authority');
loadGeo('https://raw.githubusercontent.com/PaulAshtonUK/map-data/main/area-of-outstanding-natural-beauty.geojson', { color: 'lime', weight: 1, fillOpacity: 0 }, 'AONB');
loadGeo('https://raw.githubusercontent.com/PaulAshtonUK/map-data/ca4dfdb69c7273b3e7423281ff84f64eecb98d54/site-of-special-scientific-interest.geojson', { color: 'olive', weight: 0.5, fillOpacity: 0 }, 'SSSI');
loadGeo('https://raw.githubusercontent.com/PaulAshtonUK/map-data/ca4dfdb69c7273b3e7423281ff84f64eecb98d54/national-park.geojson', { color: 'green', weight: 2, fillOpacity: 0 }, 'National Parks');
loadGeo('https://raw.githubusercontent.com/PaulAshtonUK/map-data/ca4dfdb69c7273b3e7423281ff84f64eecb98d54/conservation-area.geojson', { color: '#ff69b4', weight: 1, fillOpacity: 0.15 }, 'Conservation Area');
loadGeo('https://raw.githubusercontent.com/PaulAshtonUK/map-data/refs/heads/main/world-heritage-site-buffer-zone.geojson', { color: '#800080', weight: 1.5, dashArray: '5, 5', fillOpacity: 0.1 }, 'World Heritage Buffer Zone');
loadGeo('https://raw.githubusercontent.com/PaulAshtonUK/map-data/751769a6eb370939b095c46a995ccf1964939100/world-heritage-site.geojson', { color: '#800080', weight: 0.5, fillOpacity: 0.2 }, 'World Heritage Site');
loadGeo('https://raw.githubusercontent.com/PaulAshtonUK/map-data/300416ecfe5bcf4188ad8a352381053f733c1040/Nutrient_Neutrality_Catchments_England_2994195965045808016.geojson', { color: '#001f3f', weight: 0.5, fillOpacity: 0.3, fillColor: '#001f3f' }, 'Nutrient Neutrality');

// Load projects
fetch('https://raw.githubusercontent.com/PaulAshtonUK/map-data/main/projects.json')
  .then(r => r.json())
  .then(ps => {
    projectsLayer = L.layerGroup();
    ps.forEach(p => {
      if (p.latitude && p.longitude) {
        const m = L.circleMarker([p.latitude, p.longitude], {
          radius: 2.5, stroke: false, color: '#000',
          fill: true, fillColor: '#000', fillOpacity: 0.5
        });
        const c = `<div style="font-size:15px;"><strong>${p.name || 'Unnamed'}</strong><br>${p.description || ''}<br>${p.link ? `<a href="${p.link}" target="_blank">More info</a>` : ''}</div>`;
        m.bindPopup(c).bindTooltip(p.name || 'Unnamed', { direction: 'top', offset: [0, -5], opacity: 0.9 });
        projectsLayer.addLayer(m);
      }
    });
    projectsLayer.addTo(map);
    layersControl.addOverlay(projectsLayer, 'Projects');
  });

let searchMarker;

function displayPopup(lat, lon, label) {
  const pt = turf.point([lon, lat]);
  let inGreen = false, lpaName = 'Unknown', aonbName = 'No', sssiName = 'None';
  let inNP = false, npName = '', inCA = false, caName = 'None';
  let whsStatus = 'No';
  let nnStatus = 'No';  

  function test(layer, setter) {
    layer && layer.eachLayer(l => {
      const feat = l.toGeoJSON();
      if (turf.booleanPointInPolygon(pt, feat)) {
       // For layers with a name property:
      if (feat.properties?.name) {
        setter(feat.properties.name);
      } else {
        // For layers without a name, just call setter with true
        setter(true);
      }
      }
    });
  }

  test(greenBeltLayer, () => inGreen = true);
  test(lpaLayer, n => lpaName = n);
  test(aonbLayer, n => aonbName = n);
  test(sssiLayer, n => sssiName = n);
  test(nationalParksLayer, n => { inNP = true; npName = n; });
  test(conservationAreaLayer, n => { inCA = true; caName = n; });
  test(whsLayer, name => whsStatus = `Yes: ${name}`);
  if (whsStatus === 'No') test(whsBufferLayer, name => whsStatus = `In WHS Buffer: ${name}`);
  if (nutrientNeutralityLayer) {
    nutrientNeutralityLayer.eachLayer(l => {
      const feat = l.toGeoJSON();
      if (turf.booleanPointInPolygon(pt, feat)) {
        nnStatus = 'Yes';
      }
    });
  }

  const strippedLPA = lpaName.replace(/\s*LPA$/i, '');
  const conservationDisplay = lpaWithUnavailableConservation.includes(strippedLPA)
    ? 'Unavailable'
    : (inCA ? caName : 'No');

  map.flyTo([lat, lon], 16, { animate: true, duration: 2 });
  if (searchMarker) map.removeLayer(searchMarker);

  const template = addressString => `
    <div style="font-size:15px;line-height:1.6;">
      <table style="border-collapse: collapse; width: 100%; table-layout: auto;">
          <tr><td style="text-align: right;"><span title="Approximate / Closest Address" style="cursor: help; color: #A9A9A9; font-weight: normal; margin-left: 4px;">&#128712;</span> Address:</td><td><strong>${addressString || 'Unavailable'}</strong></td></tr>
          <tr><td style="text-align: right;">Coords:</td><td><strong>${label}</strong></td></tr>
          <tr><td style="text-align: right;"><span title="Local Planning Authority" style="cursor: help; color: #A9A9A9; font-weight: normal; margin-left: 4px;">&#128712;</span> LPA:</td><td><strong>${strippedLPA}</strong></td></tr>
          <tr><td style="text-align: right;">Green Belt:</td><td><strong>${inGreen ? 'Yes' : 'No'}</strong></td></tr>
          <tr><td style="text-align: right;"><span title="Area of Natural Beauty" style="cursor: help; color: #A9A9A9; font-weight: normal; margin-left: 4px;">&#128712;</span> AONB:</td><td><strong>${aonbName}</strong></td></tr>
          <tr><td style="text-align: right;"><span title="Site of Special Scientific Interest" style="cursor: help; color: #A9A9A9; font-weight: normal; margin-left: 4px;">&#128712;</span> SSSI:</td><td><strong>${sssiName === 'None' ? 'No' : sssiName}</strong></td></tr>
          <tr><td style="text-align: right;">National Park:</td><td><strong>${inNP ? npName : 'No'}</strong></td></tr>
          <tr><td style="text-align: right;"><span title="Currently, Conservation Area boundaries are not available for some Local Planning Authorities." style="cursor: help; color: #A9A9A9; font-weight: normal; margin-left: 4px;">&#128712;</span> Conservation:</td><td><strong>${conservationDisplay}</strong></td></tr>
          <tr><td style="text-align: right;"><span title="World Heritage Site or Buffer Zone" style="cursor: help; color: #A9A9A9; font-weight: normal; margin-left: 4px;">&#128712;</span> WHS:</td><td><strong>${whsStatus}</strong></td></tr>
          <tr><td style="text-align: right;"><span title="Nutrient Neutrality Catchment Area" style="cursor: help; color: #A9A9A9; font-weight: normal; margin-left: 4px;">&#128712;</span> NN:</td><td><strong>${nnStatus}</strong></td></tr>
        <tr>
          <td></td>
          <td style="text-align: left; padding-top: 8px; font-weight: bold;">
            <a href="mailto:enquiries@paulashtonarchitects.com?subject=${encodeURIComponent(addressString || label)}"
               style="text-decoration: underline; color: black;">
              Contact us for help with your site
            </a>
          </td>
        </tr>
      </table>
    </div>`;

  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`)
    .then(r => r.json())
    .then(d => {
      const a = d.address;
      const addr = [a.road || '', a.suburb || a.village || a.town || a.city || '', a.postcode || ''].filter(Boolean).join(', ');
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

document.getElementById('toggleSubmission').checked = true;

// Hide layers on load
const layersControlContainer = layersControl.getContainer();
layersControlContainer.style.display = 'none';

document.addEventListener('keydown', function (e) {
  if (e.key === 'l' || e.key === 'L') {
    const isVisible = layersControlContainer.style.display !== 'none';
    layersControlContainer.style.display = isVisible ? 'none' : 'block';
  }
});
