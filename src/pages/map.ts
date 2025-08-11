import L from 'leaflet';
import { length } from '@turf/turf';
import JSZip from 'jszip';
import { kml } from 'togeojson';
import type { UserRole } from '../auth';
import { el } from '../ui/components';

export default function mapPage(role: UserRole | null): HTMLElement {
  const inputProps: Record<string, string> = {
    type: 'file',
    id: 'file-input',
    accept: '.kml,.kmz'
  };
  if (!(role === 'admin' || role === 'editor')) {
    inputProps.disabled = '';
  }
  const container = el('div', {}, [
    el('h2', {}, ['Map']),
    el('input', inputProps),
    el('div', { id: 'map' })
  ]);

  const mapEl = container.querySelector('#map') as HTMLElement;
  const fileInput = container.querySelector('#file-input') as HTMLInputElement;
  const map = L.map(mapEl).setView([0, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  fileInput.addEventListener('change', async () => {
    if (!fileInput.files?.length) return;
    try {
      await importKml(fileInput.files[0], map);
    } catch (e) {
      console.error(e);
      alert('Failed to import file');
    } finally {
      fileInput.value = '';
    }
  });

  return container;
}

async function importKml(file: File, map: L.Map) {
  const text = await readKml(file);
  const dom = new DOMParser().parseFromString(text, 'text/xml');
  const geo = kml(dom);
  const layer = L.geoJSON(geo).addTo(map);
  const total = geo.features
    .filter((f) => f.geometry?.type === 'LineString')
    .reduce((sum, f) => sum + length(f as any), 0);
  console.log(`Loaded ${geo.features.length} features, length ${total} km`);
  map.fitBounds(layer.getBounds());
}

async function readKml(file: File): Promise<string> {
  if (file.name.toLowerCase().endsWith('.kmz')) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const kmlName = Object.keys(zip.files).find((n) => n.endsWith('.kml'));
    if (!kmlName) throw new Error('No KML found in KMZ');
    return zip.files[kmlName].async('text');
  }
  return file.text();
}
