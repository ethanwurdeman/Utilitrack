  // Cache segmentFields and statusConfig for color logic
  let cachedSegmentFields: any[] = [];
  let cachedStatusConfig: any = null;
import L from 'leaflet';
import length from '@turf/length';
import JSZip from 'jszip';
import { kml } from '@tmcw/togeojson';
import type { UserRole } from '../auth';
import { el } from '../ui/components';
import { db } from '../firebase';
import { collection, addDoc, getDoc, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
// import type { Project } from '../types'; // Removed: types.d.ts is not a module

export default function mapPage(role: UserRole | null): HTMLElement {
  // Hide navigation bar if present
  const navBar = document.getElementById('nav');
  if (navBar) (navBar as HTMLElement).style.display = 'none';
  // Build inputProps and container first
  const inputProps: Record<string, string> = {
    type: 'file',
    id: 'file-input',
    accept: '.kml,.kmz',
  };
  if (!(role === 'admin' || role === 'editor')) {
    inputProps.disabled = '';
  }
    // Hide scroll bar on body
    document.body.style.overflow = 'hidden';
    const container = el(
      'div',
      {
        style:
          'position: fixed; inset: 0; width: 100vw; height: 100vh; overflow: hidden; z-index: 0;',
      },
      [
        el('div', {
          id: 'map',
          style:
            'width: 100vw; height: 100vh; position: absolute; top: 0; left: 0; z-index: 1; overflow: hidden;',
        }),
        el(
          'div',
          {
            id: 'sidebar',
            style:
              'width: 340px; min-width: 0; background: rgba(248,248,248,0.97); padding: 1rem; border-radius: 8px 0 0 8px; box-shadow: 2px 0 8px #0002; height: 100vh; position: absolute; top: 0; left: 0; z-index: 10; transition: width 0.3s, min-width 0.3s, padding 0.3s;',
          },
          [
            el(
              'div',
              {
                id: 'sidebar-slider',
                style:
                  'position: absolute; top: 0; right: -16px; width: 16px; height: 100vh; background: #e0e0e0; border-radius: 0 8px 8px 0; box-shadow: 2px 0 8px #0002; cursor: ew-resize; display: flex; align-items: center; justify-content: center; z-index: 1001;',
              },
              [
                el('span', { style: 'font-size: 24px; user-select: none;' }, [
                  '⮜',
                ]),
              ],
            ),
            el('div', { id: 'sidebar-content', style: 'height: calc(100vh - 32px); overflow-y: auto;' }, [
              el(
                'div',
                { style: 'display: flex; gap: 0.5em; margin-bottom: 1em; align-items: center;' },
                [
                  el(
                    'button',
                    {
                      id: 'back-btn',
                      style:
                        'padding: 0.5em 1em; border-radius: 4px; border: 1px solid #ccc; background: #eee; cursor: pointer;',
                    },
                    ['← Back'],
                  ),
                  el(
                    'button',
                    {
                      id: 'signout-btn',
                      style:
                        'padding: 0.5em 1em; border-radius: 4px; border: 1px solid #ccc; background: #eee; cursor: pointer;',
                    },
                    ['Sign Out'],
                  ),
                  el(
                    'button',
                    {
                      id: 'upload-map-btn',
                      style:
                        'padding: 0.5em 1em; border-radius: 4px; border: 1px solid #1976d2; background: #1976d2; color: #fff; cursor: pointer; margin-left: 0.5em;',
                    },
                    ['Upload Map'],
                  ),
                ],
              ),
              el('ul', {
                id: 'segment-list',
                style: 'list-style: none; padding: 0; margin-bottom: 1.5em;',
              }),
            ]),
          ],
        ),
      ]
    );

  // Attach container to DOM if not already
  const app = document.getElementById('app');
  if (app && !app.contains(container)) {
    app.innerHTML = '';
    app.appendChild(container);
  }

  // Get references to sidebar elements after container is attached
  const mapEl = container.querySelector('#map') as HTMLElement;
  const segmentList = container.querySelector('#segment-list') as HTMLUListElement;
  function metersToFeet(m: number) {
    return m * 3.28084;
  }
  // Track all segment layers and the selected one
  let segmentLayers: L.Layer[] = [];
  let selectedSegmentLayer: L.Layer | null = null;

  function addSegmentToSidebar(segment: { name: string; length: number; geojson: any; description?: string; uploadedAt?: number; fileName?: string; status?: string }) {
    // Helper to trigger segment selection logic (highlight, zoom, color update)
    async function selectSegment() {
      // Remove highlight from all cards
      Array.from(segmentList.children).forEach((el) => {
        (el as HTMLElement).style.border = '2px solid transparent';
      });
      // Highlight selected card
      li.style.border = '3px solid #1976d2';
      li.style.background = '#fff';
      // Use cachedStatusConfig for color logic
      segmentLayers.forEach((l, idx) => {
        const segLi = segmentList.children[idx] as HTMLElement;
        let segData: any = null;
        if (segLi && (segLi as any)._segmentData) {
          segData = (segLi as any)._segmentData;
        }
        let color = '#888'; // fallback to gray
        if (cachedStatusConfig && cachedStatusConfig.type === 'dropdown' && Array.isArray(cachedStatusConfig.options) && segData) {
          const segVal = segData['status'];
          const opt = cachedStatusConfig.options.find((o: any) => o.label === segVal);
          if (opt && opt.color) {
            color = opt.color;
          }
        }
        if (typeof (l as any).setStyle === 'function') {
          (l as any).setStyle({ color, weight: 5, opacity: 0.9 });
        }
      });
      // Selected layer gets highlight color
      // Double the thickness of the selected layer, keep its formatted color
      if (typeof (layer as any).setStyle === 'function') {
        // Always recalculate color from cached config/status
        const segData = (li as any)._segmentData;
        let color = '#888';
        if (cachedStatusConfig && cachedStatusConfig.type === 'dropdown' && Array.isArray(cachedStatusConfig.options) && segData) {
          const segVal = segData['status'];
          const opt = cachedStatusConfig.options.find((o: any) => o.label === segVal);
          if (opt && opt.color) color = opt.color;
        }
        (layer as any).setStyle({ color, weight: 10, opacity: 1 });
      }
      // Fit map to segment
      if (layer && map) {
        try {
          map.fitBounds(layer.getBounds(), { animate: true, padding: [40, 40] });
          selectedSegmentLayer = layer;
        } catch {}
      }
      // Scroll sidebar to segment card safely
      if (li && li.parentElement && li.offsetParent) {
        li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    const li = document.createElement('li');
    li.style.marginBottom = '1em';
    li.style.listStyle = 'none';
    li.style.padding = '1em';
    li.style.borderRadius = '12px';
    li.style.boxShadow = '0 2px 8px #1976d233';
    li.style.display = 'flex';
    li.style.flexDirection = 'column';
    li.style.gap = '0.5em';
    li.style.border = '2px solid transparent';
    li.style.cursor = 'pointer';
    let formatColor = '#fff';
    let polyColor = '';
    let geojsonObj = segment.geojson;
    if (typeof geojsonObj === 'string') {
      try { geojsonObj = JSON.parse(geojsonObj); } catch {}
    }
    // Set polyline color from cached status config
    let color = '#888';
    if (cachedStatusConfig && cachedStatusConfig.type === 'dropdown' && Array.isArray(cachedStatusConfig.options)) {
      const segVal = segment.status;
      const opt = cachedStatusConfig.options.find((o: any) => o.label === segVal);
      if (opt && opt.color) {
        color = opt.color;
      }
    }
    const layer = L.geoJSON(geojsonObj, {
      style: { color, weight: 5, opacity: 0.9 },
    });
    layer.addTo(map);
    segmentLayers.push(layer);
    // Fetch segmentFields config to determine formatField and color AFTER layer is created
    (async () => {
      const { db } = await import('../firebase');
      const { getDocs, collection } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'segmentFields'));
      const segmentFields = snap.docs.map(doc => doc.data());
      const formatField = segmentFields.find((f: any) => f.formatField);
      if (formatField && formatField.type === 'dropdown' && Array.isArray(formatField.options)) {
        const segVal = (segment as any)[formatField.label];
        const opt = formatField.options.find((o: any) => o.label === segVal);
        if (opt) {
          formatColor = opt.color;
          polyColor = opt.color;
          // Update polyline color to match config
          if (typeof (layer as any).setStyle === 'function') {
            (layer as any).setStyle({ color: polyColor, weight: 5, opacity: 0.9 });
          }
        }
      }
      li.style.background = formatColor;
    })();
    // Add click event to map segment layer
    layer.on('click', function () {
      selectSegment();
    });
    // Restore segment card click handler
    li.addEventListener('click', () => {
      selectSegment();
    });
    // Ensure segment has a valid status
    (async () => {
      const { db } = await import('../firebase');
      const { getDocs, collection } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'segmentFields'));
      const statusConfig = snap.docs.map(doc => doc.data()).find((f: any) => (f.label ?? '').toLowerCase() === 'status');
      if (statusConfig && Array.isArray(statusConfig.options) && statusConfig.options.length) {
        if (!segment.status || !statusConfig.options.some((o: any) => o.label === segment.status)) {
          segment.status = statusConfig.options[0].label;
        }
      }
      (li as any)._segmentData = segment;
    })();
    li.innerHTML = `
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <span style="font-weight: bold; font-size: 1.1em;">${segment.name ?? 'Unnamed'}</span>
    <button class="delete-segment-btn" title="Delete Segment" style="background: #e53935; color: #fff; border: none; border-radius: 4px; padding: 0.2em 0.7em; font-weight: bold; cursor: pointer;">✕</button>
  </div>
  <div style="color: #1976d2; font-size: 1em; font-weight: bold;">${segment.length !== undefined ? metersToFeet(segment.length).toFixed(2) + ' ft' : ''}</div>
  <div id="status-row"></div>
  ${segment.description ? `<div style='color: #555;'>${segment.description}</div>` : ''}
  ${segment.fileName ? `<div style='font-size: 0.9em; color: #888;'>File: ${segment.fileName}</div>` : ''}
  ${segment.uploadedAt ? `<div style='font-size: 0.85em; color: #aaa;'>Uploaded: ${new Date(segment.uploadedAt).toLocaleString()}</div>` : ''}
    `;
    // Add delete handler
    const deleteBtn = li.querySelector('.delete-segment-btn') as HTMLButtonElement;
    if (deleteBtn) {
      deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm('Delete this segment? This cannot be undone.')) {
          const segId = (segment as any).id;
          const projId = (segment as any).projectId;
          if (segId && projId) {
            try {
              const { db } = await import('../firebase');
              const { doc, deleteDoc } = await import('firebase/firestore');
              await deleteDoc(doc(db, 'projects', projId, 'segments', segId));
              // Remove from sidebar
              li.remove();
              // Remove from map
              if (layer && map) {
                map.removeLayer(layer);
              }
              // Remove from segmentLayers array
              const idx = segmentLayers.indexOf(layer);
              if (idx !== -1) segmentLayers.splice(idx, 1);
            } catch (err) {
              alert('Failed to delete segment. See console for details.');
              console.error('Error deleting segment:', err);
            }
          } else {
            alert('Segment is missing id or projectId. Cannot delete.');
          }
        }
      };
    }
    // Render status dropdown in card using config options and colors, always reading latest from Firestore
    (async () => {
      const { db } = await import('../firebase');
      const { getDocs, collection, updateDoc, doc, getDoc } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'segmentFields'));
      const segmentFields = snap.docs.map(doc => doc.data());
      console.log('segmentFields from Firestore:', segmentFields);
      const statusConfig = segmentFields.find((f: any) => (f.label ?? '').toLowerCase() === 'status');
      console.log('statusConfig:', statusConfig);
      const statusRow = li.querySelector('#status-row');
      const segId = (segment as any).id;
      const projId = (segment as any).projectId;
      let latestStatus = segment.status ?? '';
      if (segId && projId) {
        const segDoc = await getDoc(doc(db, 'projects', projId, 'segments', segId));
        if (segDoc.exists()) {
          latestStatus = segDoc.data().status ?? '';
        }
      }
      if (statusRow) {
        const label = document.createElement('strong');
        label.textContent = 'Status:';
        label.style.marginRight = '0.5em';
        statusRow.appendChild(label);
        const select = document.createElement('select');
        select.style.padding = '0.2em 0.5em';
        select.style.borderRadius = '4px';
        select.style.border = '1px solid #ccc';
        let options: { label: string; color?: string }[] = [];
        if (cachedStatusConfig && Array.isArray(cachedStatusConfig.options) && cachedStatusConfig.options.length) {
          options = cachedStatusConfig.options;
        }
        if (options.length === 0) {
          options = [{ label: 'No status options', color: '#ccc' }];
          select.disabled = true;
        } else {
          select.disabled = false;
        }
        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.label;
          option.textContent = opt.label;
          if (segment.status === opt.label) option.selected = true;
          select.appendChild(option);
        });
        select.value = segment.status;
        // Format dropdown and value color
        const setColor = () => {
          const selected = options.find(o => o.label === select.value);
          select.style.background = selected?.color ?? '#fff';
          select.style.color = selected?.color ? '#fff' : '#333';
          // Update polyline color to match config
          if (selected?.color && typeof (layer as any).setStyle === 'function') {
            (layer as any).setStyle({ color: selected.color, weight: 5, opacity: 0.9 });
          }
        };
        setColor();
        select.onchange = async () => {
          if (!select.disabled && segId && projId) {
            await updateDoc(doc(db, 'projects', projId, 'segments', segId), { status: select.value });
            // Update _segmentData and segment object for color logic
            (li as any)._segmentData.status = select.value;
            segment.status = select.value;
            setColor();
          }
        };
        select.addEventListener('change', setColor);
        statusRow.appendChild(select);
      }
    })();
    // After li.innerHTML, add extra fields based on showOnCard config
    (async () => {
      const { db } = await import('../firebase');
      const { getDocs, collection } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'segmentFields'));
      const segmentFields = snap.docs.map(doc => doc.data());
      Object.keys(segment).forEach(key => {
        const fieldConfig = segmentFields.find((f: any) => f.label === key);
        if (fieldConfig && fieldConfig.showOnCard && !['name','length','geojson','description','fileName','uploadedAt'].includes(key)) {
          const extraDiv = document.createElement('div');
          extraDiv.style.fontSize = '0.95em';
          extraDiv.style.color = '#333';
          extraDiv.style.marginTop = '0.2em';
          if (key === 'status') {
            // Inline status edit dropdown
            const statusLabel = document.createElement('strong');
            statusLabel.textContent = 'Status:';
            const statusSelect = document.createElement('select');
            statusSelect.style.marginLeft = '0.5em';
            statusSelect.style.padding = '0.2em 0.5em';
            statusSelect.style.borderRadius = '4px';
            statusSelect.style.border = '1px solid #ccc';
            // Use config options if available
            if (Array.isArray(fieldConfig.options) && fieldConfig.options.length) {
              fieldConfig.options.forEach((opt: any) => {
                const option = document.createElement('option');
                option.value = opt.label;
                option.textContent = opt.label;
                if ((segment as any)[key] === opt.label) option.selected = true;
                statusSelect.appendChild(option);
              });
            } else {
              ['Active','Inactive','Pending','Complete'].forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                if ((segment as any)[key] === opt) option.selected = true;
                statusSelect.appendChild(option);
              });
            }
            statusSelect.onchange = async (e) => {
              const { db } = await import('../firebase');
              const { updateDoc, doc } = await import('firebase/firestore');
              const segId = (segment as any).id;
              const projId = (segment as any).projectId;
              if (segId && projId) {
                await updateDoc(doc(db, 'projects', projId, 'segments', segId), { status: statusSelect.value });
                extraDiv.innerHTML = `<strong>Status:</strong> ${statusSelect.value}`;
              }
            };
            extraDiv.appendChild(statusLabel);
            extraDiv.appendChild(statusSelect);
          } else {
            extraDiv.innerHTML = `<strong>${key}:</strong> ${(segment as any)[key]}`;
          }
          li.appendChild(extraDiv);
        }
      });
    })();
    // Add segment details button
    const detailsBtn = document.createElement('button');
    detailsBtn.textContent = 'Open Segment Details';
    detailsBtn.style.marginTop = '0.5em';
    detailsBtn.style.padding = '0.4em 1em';
    detailsBtn.style.borderRadius = '6px';
    detailsBtn.style.background = '#1976d2';
    detailsBtn.style.color = '#fff';
    detailsBtn.style.border = 'none';
    detailsBtn.style.fontWeight = 'bold';
    detailsBtn.style.cursor = 'pointer';
    detailsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Show segment details (modal)
      (async () => {
        const { db } = await import('../firebase');
        const { getDocs, collection, updateDoc, doc, getDoc } = await import('firebase/firestore');
        const snap = await getDocs(collection(db, 'segmentFields'));
        const segmentFields = snap.docs.map(doc => doc.data());
        let details = `<strong>${segment.name ?? 'Unnamed'}</strong><br>`;
        details += `Length: ${segment.length !== undefined ? metersToFeet(segment.length).toFixed(2) + ' ft' : ''}<br>`;
        details += `<span style='color: #e91e63; font-weight: bold;'>Status: </span>`;
        details += `<select id='details-status-select' style='margin-left:0.5em; padding:0.2em 0.5em; border-radius:4px; border:1px solid #ccc;'></select><br>`;
        if (segment.description) details += `Description: ${segment.description}<br>`;
        if (segment.fileName) details += `File: ${segment.fileName}<br>`;
        if (segment.uploadedAt) details += `Uploaded: ${new Date(segment.uploadedAt).toLocaleString()}<br>`;
        // Only show fields with showInDetails=true in config
        Object.keys(segment).forEach(key => {
          if (!['name','length','geojson','description','fileName','uploadedAt'].includes(key)) {
            const fieldConfig = segmentFields.find((f: any) => (f.label ?? '').toLowerCase() === key.toLowerCase());
            if (fieldConfig && fieldConfig.showInDetails) {
              details += `${key}: ${(segment as any)[key]}<br>`;
            }
          }
        });
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.3)';
        modal.style.zIndex = '9999';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        const content = document.createElement('div');
        content.style.background = '#fff';
        content.style.padding = '2em';
        content.style.borderRadius = '12px';
        content.style.boxShadow = '0 2px 12px #0003';
        content.innerHTML = `<div style='font-size:1.2em; margin-bottom:1em;'>Segment Details</div>${details}`;
        // Render status dropdown in details using config options and colors, always reading latest from Firestore
        const statusConfig = segmentFields.find((f: any) => (f.label ?? '').toLowerCase() === 'status');
        const segId = (segment as any).id;
        const projId = (segment as any).projectId;
        let latestStatus = segment.status ?? '';
        if (segId && projId) {
          const segDoc = await getDoc(doc(db, 'projects', projId, 'segments', segId));
          if (segDoc.exists()) {
            latestStatus = segDoc.data().status ?? '';
          }
        }
        let options: { label: string; color?: string }[] = [];
        if (statusConfig && Array.isArray(statusConfig.options) && statusConfig.options.length) {
          options = statusConfig.options;
        }
        const select = content.querySelector('#details-status-select') as HTMLSelectElement;
        if (select) {
          if (options.length === 0) {
            options = [{ label: 'No status options', color: '#ccc' }];
            select.disabled = true;
          } else {
            select.disabled = false;
          }
          options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.label;
            option.textContent = opt.label;
            if (latestStatus === opt.label) option.selected = true;
            select.appendChild(option);
          });
          select.value = latestStatus;
          // Format dropdown and value color
          const setColor = () => {
            const selected = options.find(o => o.label === select.value);
            select.style.background = selected?.color ?? '#fff';
            select.style.color = selected?.color ? '#fff' : '#333';
            // Update polyline color to match config
            if (selected?.color && typeof (layer as any).setStyle === 'function') {
              (layer as any).setStyle({ color: selected.color, weight: 5, opacity: 0.9 });
            }
          };
          setColor();
          select.onchange = async () => {
            if (!select.disabled && segId && projId) {
              await updateDoc(doc(db, 'projects', projId, 'segments', segId), { status: select.value });
              setColor();
            }
          };
          select.addEventListener('change', setColor);
        }
        // Edit button
        const editBtn = document.createElement('button');
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete Segment';
        deleteBtn.style.marginRight = '1em';
        deleteBtn.style.padding = '0.4em 1em';
        deleteBtn.style.borderRadius = '6px';
        deleteBtn.style.background = '#e53935';
        deleteBtn.style.color = '#fff';
        deleteBtn.style.border = 'none';
        deleteBtn.style.fontWeight = 'bold';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.onclick = async () => {
          if (confirm('Are you sure you want to delete this segment? This cannot be undone.')) {
            const segId = (segment as any).id;
            const projId = (segment as any).projectId;
            if (segId && projId) {
              try {
                const { db } = await import('../firebase');
                const { doc, deleteDoc } = await import('firebase/firestore');
                await deleteDoc(doc(db, 'projects', projId, 'segments', segId));
                // Remove modal and reload segments
                modal.remove();
                if (typeof loadSegments === 'function') {
                  const segmentList = document.getElementById('segment-list');
                  if (segmentList) segmentList.innerHTML = '';
                  await loadSegments(projId);
                }
              } catch (err) {
                alert('Failed to delete segment. See console for details.');
                console.error('Error deleting segment:', err);
              }
            } else {
              alert('Segment is missing id or projectId. Cannot delete.');
            }
          }
        };
        editBtn.textContent = 'Edit Segment';
        editBtn.style.marginRight = '1em';
        editBtn.style.padding = '0.4em 1em';
        editBtn.style.borderRadius = '6px';
        editBtn.style.background = '#ffd600';
        editBtn.style.color = '#333';
        editBtn.style.border = 'none';
        editBtn.style.fontWeight = 'bold';
        editBtn.style.cursor = 'pointer';
        editBtn.onclick = () => {
          // Show edit form
          content.innerHTML = `<div style='font-size:1.2em; margin-bottom:1em;'>Edit Segment</div>`;
          import('../firebase').then(async ({ db }) => {
            const { getDocs, collection, updateDoc, doc } = await import('firebase/firestore');
            const snap = await getDocs(collection(db, 'segmentFields'));
            const segmentFields = snap.docs.map(doc => doc.data());
            const form = document.createElement('form');
            form.style.display = 'flex';
            form.style.flexDirection = 'column';
            form.style.gap = '1em';
            Object.keys(segment).forEach(key => {
              if (key === 'geojson') return;
              const fieldConfig = segmentFields.find((f: any) => f.label === key);
              const label = document.createElement('label');
              label.textContent = key.charAt(0).toUpperCase() + key.slice(1);
              let input: HTMLElement;
              const segAny = segment as any;
              if (fieldConfig && fieldConfig.type === 'dropdown' && Array.isArray(fieldConfig.options)) {
                input = document.createElement('select');
                fieldConfig.options.forEach((opt: any) => {
                  const option = document.createElement('option');
                  option.value = opt.label;
                  option.textContent = opt.label;
                  if (segAny[key] === opt.label) option.selected = true;
                  (input as HTMLSelectElement).appendChild(option);
                });
              } else if (fieldConfig && fieldConfig.type === 'date') {
                input = document.createElement('input');
                (input as HTMLInputElement).type = 'date';
                (input as HTMLInputElement).value = segAny[key] || '';
              } else if (fieldConfig && fieldConfig.type === 'number') {
                input = document.createElement('input');
                (input as HTMLInputElement).type = 'number';
                (input as HTMLInputElement).value = segAny[key]?.toString() || '';
                (input as HTMLInputElement).step = 'any';
              } else {
                input = document.createElement('input');
                (input as HTMLInputElement).type = 'text';
                (input as HTMLInputElement).value = segAny[key] || '';
              }
              input.setAttribute('name', key);
              input.style.width = '100%';
              input.style.padding = '0.5em';
              input.style.borderRadius = '4px';
              input.style.border = '1px solid #ccc';
              label.appendChild(input);
              form.appendChild(label);
            });
            // Save button replaces close button
            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save';
            saveBtn.style.marginTop = '1em';
            saveBtn.style.padding = '0.4em 1em';
            saveBtn.style.borderRadius = '6px';
            saveBtn.style.background = '#4caf50';
            saveBtn.style.color = '#fff';
            saveBtn.style.border = 'none';
            saveBtn.style.fontWeight = 'bold';
            saveBtn.style.cursor = 'pointer';
            form.appendChild(saveBtn);
            // Back button to return to details view
            const backBtn = document.createElement('button');
            backBtn.textContent = 'Back';
            backBtn.style.marginTop = '1em';
            backBtn.style.marginLeft = '1em';
            backBtn.style.padding = '0.4em 1em';
            backBtn.style.borderRadius = '6px';
            backBtn.style.background = '#ffd600';
            backBtn.style.color = '#333';
            backBtn.style.border = 'none';
            backBtn.style.fontWeight = 'bold';
            backBtn.style.cursor = 'pointer';
            backBtn.onclick = async () => {
              // Re-render details view
              modal.remove();
              detailsBtn.click();
            };
            form.appendChild(backBtn);
            // Attach form before adding event listener
            content.appendChild(form);
            form.addEventListener('submit', async (ev) => {
              ev.preventDefault();
              try {
                // Collect updated values
                const formData = new FormData(form);
                const updates: any = {};
                for (const [key, value] of formData.entries()) {
                  updates[key] = value;
                }
                // Find projectId and segmentId
                const segId = (segment as any).id;
                const projId = (segment as any).projectId;
                if (segId && projId) {
                  await updateDoc(doc(db, 'projects', projId, 'segments', segId), updates);
                  // Reload segments for the current project
                  if (typeof loadSegments === 'function') {
                    // Clear sidebar and reload
                    const segmentList = document.getElementById('segment-list');
                    if (segmentList) segmentList.innerHTML = '';
                    await loadSegments(projId);
                  }
                } else {
                  alert('Segment is missing id or projectId. Cannot save.');
                }
                modal.remove();
              } catch (err) {
                console.error('Error updating segment:', err);
                alert('Failed to update segment. See console for details.');
              }
            });
          });
        };
        content.appendChild(editBtn);
  content.appendChild(deleteBtn);
        modal.appendChild(content);
        document.body.appendChild(modal);
      })();
    });
    li.appendChild(detailsBtn);
    segmentList.appendChild(li);
  }

  // Basemap layers
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' });
  const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© ESRI Satellite' });
  const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: '© OpenTopoMap' });

  // Initialize map centered on US with OSM as default
  const map = L.map(mapEl, {
    center: [37.8, -96],
    zoom: 4,
    layers: [osm],
  });

  // Layer control
  const baseMaps = {
    'OpenStreetMap': osm,
    'ESRI Satellite': satellite,
    'OpenTopoMap': topo,
  };
  L.control.layers(baseMaps).addTo(map);

  // Hide header for map page
  const header = document.getElementById('app-header');
  if (header) header.style.display = 'none';

  // Hide Leaflet Draw toolbar text labels for a cleaner UI
  const style = document.createElement('style');
  style.textContent = `
    .leaflet-draw-toolbar a span,
    .leaflet-draw-toolbar .leaflet-draw-toolbar-label {
      display: none !important;
    }
  `;
  document.head.appendChild(style);

  // Zoom controls
  const zoomInBtn = container.querySelector('#zoom-in') as HTMLButtonElement;
  const zoomOutBtn = container.querySelector('#zoom-out') as HTMLButtonElement;
  const zoomSlider = container.querySelector('#zoom-slider') as HTMLInputElement;

  zoomInBtn?.addEventListener('click', () => {
    map.setZoom(map.getZoom() + 1);
    if (zoomSlider) zoomSlider.value = String(map.getZoom());
  });
  zoomOutBtn?.addEventListener('click', () => {
    map.setZoom(map.getZoom() - 1);
    if (zoomSlider) zoomSlider.value = String(map.getZoom());
  });
  zoomSlider?.addEventListener('input', () => {
    map.setZoom(Number(zoomSlider.value));
  });

  const fileInput = container.querySelector('#sidebar input[type="file"]') as HTMLInputElement;
  const sidebar = container.querySelector('#sidebar') as HTMLElement;
  const sidebarSlider = container.querySelector('#sidebar-slider') as HTMLElement;
  const sidebarContent = container.querySelector('#sidebar-content') as HTMLElement;
  const backBtn = container.querySelector('#back-btn') as HTMLButtonElement;
  const signoutBtn = container.querySelector('#signout-btn') as HTMLButtonElement;
  // Back button navigates to dashboard
  backBtn?.addEventListener('click', () => {
    location.hash = 'dashboard';
  });

  // Sign out button logs out and returns to login page
  signoutBtn?.addEventListener('click', async () => {
    if (typeof import('../auth').then === 'function') {
      const { logout } = await import('../auth');
      await logout();
    }
    location.hash = '';
  });

  // Dynamic sidebar resizing with slider
  let isResizing = false;
  let startX = 0;
  let startWidth = 340;
  const minSidebarWidth = 16;
  const maxSidebarWidth = 500;

  sidebarSlider?.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    document.body.style.cursor = 'ew-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    let newWidth = Math.max(
      minSidebarWidth,
      Math.min(maxSidebarWidth, startWidth + (e.clientX - startX)),
    );
    sidebar.style.width = newWidth + 'px';
    if (newWidth <= minSidebarWidth + 2) {
      sidebarContent.style.display = 'none';
      sidebarSlider.querySelector('span')!.textContent = '⮞';
    } else {
      sidebarContent.style.display = '';
      sidebarSlider.querySelector('span')!.textContent = '⮜';
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
    }
  });

  if (map) map.invalidateSize();

  // Add Leaflet Draw controls for admin/editor
  let drawnItems: L.FeatureGroup = new L.FeatureGroup();
  map.addLayer(drawnItems);
  if (role === 'admin' || role === 'editor') {
    // @ts-ignore
    import('leaflet-draw').then(() => {
      // @ts-ignore
      const drawControl = new L.Control.Draw({
        position: 'topright',
        edit: { featureGroup: drawnItems },
        draw: {
          polyline: {},
          polygon: false,
          marker: false,
          circle: false,
          rectangle: false,
        },
      });
      map.addControl(drawControl);
      map.on(L.Draw.Event.CREATED, function (e: any) {
        const layer = e.layer;
        drawnItems.addLayer(layer);
        // Prompt for segment name
        const name = prompt('Segment name?') || 'Unnamed';
  const len = length(layer.toGeoJSON() as any) * 1000; // meters
  const segment = { name, length: len, geojson: JSON.stringify(layer.toGeoJSON()) };
        addSegmentToSidebar(segment);
        if (projectId) {
          saveSegmentToProject(projectId, segment);
        }
      });
    });
  }

  // Remove old upload input and header
  // Add file input for upload, hidden
  const uploadInput = document.createElement('input');
  Object.assign(uploadInput, inputProps);
  uploadInput.style.display = 'none';
  container.appendChild(uploadInput);

  // Add event to upload button to trigger file input
  const uploadBtn = container.querySelector('#upload-map-btn') as HTMLButtonElement;
  if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
      uploadInput.click();
    });
  }

  uploadInput.addEventListener('change', async () => {
    if (!uploadInput.files?.length) return;
    // Prompt for map info
    const mapName = prompt('Map name?') || 'Unnamed Map';
    const mapDesc = prompt('Map description?') || '';
    try {
      const features = await importKml(uploadInput.files[0], map);
      // List segments in sidebar and save each to Firestore with map info
      features
        .filter((f) => f.geometry?.type === 'LineString')
        .forEach(async (f) => {
          // Log coordinates for debugging
          if (f.geometry && f.geometry.type === 'LineString' && 'coordinates' in f.geometry) {
            console.log('Imported segment coordinates:', (f.geometry as { coordinates: any }).coordinates);
          }
          const segment = {
            name: f.properties?.name || mapName,
            description: mapDesc,
            length: length(f as any) * 1000, // meters
            geojson: JSON.stringify(f),
            uploadedAt: Date.now(),
            fileName: uploadInput.files?.[0]?.name || '',
          };
          addSegmentToSidebar(segment);
          if (projectId) {
            await saveSegmentToProject(projectId, segment);
          }
        });
    } catch (e) {
      console.error(e);
      alert('Failed to import file');
    } finally {
      uploadInput.value = '';
    }
  });

  // Helper to get projectId from hash
  function getProjectIdFromHash(): string | null {
    const match = location.hash.match(/project=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  // Load segments for project
  async function loadSegments(projectId: string) {
    const segRef = collection(db, 'projects', projectId, 'segments');
    const snap = await getDocs(segRef);
  // Get and cache segmentFields and statusConfig
  const { getDocs: getDocs2, collection: collection2, updateDoc, doc: doc2 } = await import('firebase/firestore');
  const statusSnap = await getDocs2(collection2(db, 'segmentFields'));
  cachedSegmentFields = statusSnap.docs.map(d => d.data());
  cachedStatusConfig = cachedSegmentFields.find((f: any) => (f.label ?? '').toLowerCase() === 'status');
  const firstStatus = cachedStatusConfig && Array.isArray(cachedStatusConfig.options) && cachedStatusConfig.options.length ? cachedStatusConfig.options[0].label : '';
    let allBounds: L.LatLngBounds | null = null;
    for (const docSnap of snap.docs) {
      const seg = docSnap.data() as { name: string; length: number; geojson: any };
      if (seg.name && seg.length && seg.geojson) {
        const segWithIds = { ...seg, geojson: seg.geojson } as any;
        segWithIds.id = docSnap.id;
        segWithIds.projectId = projectId;
        // If status is missing or blank, set to firstStatus
        if (!('status' in segWithIds) || !segWithIds.status) {
          segWithIds.status = firstStatus;
          // Update Firestore if needed
          if (firstStatus) {
            await updateDoc(doc2(db, 'projects', projectId, 'segments', docSnap.id), { status: firstStatus });
          }
        }
        // Add segment to sidebar and get its bounds
        addSegmentToSidebar(segWithIds);
        let geojsonObj = segWithIds.geojson;
        if (typeof geojsonObj === 'string') {
          try { geojsonObj = JSON.parse(geojsonObj); } catch {}
        }
        const layer = L.geoJSON(geojsonObj);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          if (!allBounds) {
            allBounds = bounds;
          } else {
            allBounds.extend(bounds);
          }
        }
      }
    }
    // Fit map to all segments after loading
    if (allBounds && map) {
      map.fitBounds(allBounds, { animate: true, padding: [40, 40] });
    }
  }

  // Save segment to project as a document in subcollection
  async function saveSegmentToProject(projectId: string, segment: { name: string; length: number; geojson: any }) {
    const segRef = collection(db, 'projects', projectId, 'segments');
    // Serialize geojson as string
    const segmentToSave = { ...segment, geojson: typeof segment.geojson === 'string' ? segment.geojson : JSON.stringify(segment.geojson) };
    await addDoc(segRef, segmentToSave);
  }

  // On map page load, check for projectId and load segments
  const projectId = getProjectIdFromHash();
  if (projectId) {
    loadSegments(projectId);
  }

  return container ?? document.createElement('div');
}

async function importKml(file: File, map: L.Map) {
  const text = await readKml(file);
  const dom = new DOMParser().parseFromString(text, 'text/xml');
  const geo = kml(dom);
  const layer = L.geoJSON(geo).addTo(map);
  const total = geo.features
    .filter((f) => f.geometry?.type === 'LineString')
    .reduce((sum, f) => sum + length(f as any), 0);
  map.fitBounds(layer.getBounds());
  return geo.features;
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
