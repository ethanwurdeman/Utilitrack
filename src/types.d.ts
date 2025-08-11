declare module 'togeojson' {
  import { FeatureCollection } from 'geojson';
  export function kml(doc: Document): FeatureCollection;
}

declare module 'jszip';
