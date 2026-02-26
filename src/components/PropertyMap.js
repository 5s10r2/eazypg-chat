// ─── Property Map Component (Leaflet) ───
import L from 'leaflet';
import { t } from '../i18n.js';

// Fix Leaflet default marker icons for bundlers — use circle markers instead
// (avoids image path issues with Vite bundling)

/**
 * Initialize any map placeholders found within a DOM element.
 * Call this after setting innerHTML on a bubble.
 */
export function initMapPlaceholders(containerEl) {
  const placeholders = containerEl.querySelectorAll('.map-placeholder');
  placeholders.forEach(ph => {
    try {
      const properties = JSON.parse(ph.dataset.properties || '[]');
      const mapCenter  = JSON.parse(ph.dataset.mapCenter || '{}');
      createPropertyMap(ph, properties, mapCenter);
    } catch (e) {
      console.warn('Failed to init map:', e);
    }
  });
}

/**
 * Create an interactive Leaflet map inside a container element.
 * @param {HTMLElement} containerEl - DOM element to render into
 * @param {Array} properties - [{name, rent, lat, lng}]
 * @param {Object} mapCenter - {lat, lng} for default center
 */
export function createPropertyMap(containerEl, properties, mapCenter) {
  // Filter to properties with valid coordinates
  const mappable = properties.filter(p =>
    p.lat && p.lng &&
    !isNaN(parseFloat(p.lat)) && !isNaN(parseFloat(p.lng))
  );
  if (!mappable.length) {
    containerEl.style.display = 'none';
    return null;
  }

  // Replace placeholder with wrapper
  containerEl.innerHTML = '';
  containerEl.style.display = '';
  containerEl.className = 'map-wrapper';

  // Toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'map-toggle-btn';
  toggleBtn.innerHTML = `🗺️ ${t('map_view')}`;
  toggleBtn.setAttribute('aria-expanded', 'false');
  containerEl.appendChild(toggleBtn);

  // Map container (hidden by default)
  const mapDiv = document.createElement('div');
  mapDiv.className = 'map-container';
  mapDiv.style.display = 'none';
  containerEl.appendChild(mapDiv);

  let mapInstance = null;

  toggleBtn.addEventListener('click', () => {
    const isOpen = mapDiv.style.display !== 'none';
    mapDiv.style.display = isOpen ? 'none' : 'block';
    toggleBtn.setAttribute('aria-expanded', String(!isOpen));
    toggleBtn.innerHTML = isOpen
      ? `🗺️ ${t('map_view')}`
      : `🗺️ ${t('map_hide')}`;

    if (!mapInstance) {
      // Initialize on first open
      const center = (mapCenter && mapCenter.lat && mapCenter.lng)
        ? [parseFloat(mapCenter.lat), parseFloat(mapCenter.lng)]
        : [parseFloat(mappable[0].lat), parseFloat(mappable[0].lng)];

      mapInstance = L.map(mapDiv, {
        scrollWheelZoom: false,
        attributionControl: true,
        zoomControl: true
      }).setView(center, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 18
      }).addTo(mapInstance);

      // Add circle markers for each property
      const bounds = L.latLngBounds();
      for (const p of mappable) {
        const lat = parseFloat(p.lat);
        const lng = parseFloat(p.lng);

        const marker = L.circleMarker([lat, lng], {
          radius: 9,
          fillColor: '#0070f3',
          color: '#ffffff',
          weight: 2.5,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(mapInstance);

        const rentHtml = p.rent ? `<div class="map-popup-rent">${p.rent}</div>` : '';
        const popupContent = `
          <div class="map-popup">
            <strong>${p.name || 'Property'}</strong>
            ${rentHtml}
            <button class="map-popup-btn" data-action="Tell me more about ${p.name || 'this property'}">
              ${t('btn_details')} →
            </button>
          </div>`;
        marker.bindPopup(popupContent, { maxWidth: 220, closeButton: false });
        bounds.extend([lat, lng]);
      }

      // Fit bounds with padding
      if (mappable.length > 1) {
        mapInstance.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
      }

      // Handle Details button clicks inside popups
      mapInstance.on('popupopen', (e) => {
        const popupEl = e.popup.getElement();
        if (popupEl) {
          popupEl.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
              if (btn.dataset.action) window.sendQuick(btn.dataset.action);
            });
          });
        }
      });

      // Fix tile rendering after toggle animation
      setTimeout(() => mapInstance.invalidateSize(), 150);
    } else {
      setTimeout(() => mapInstance.invalidateSize(), 150);
    }
  });

  return containerEl;
}
