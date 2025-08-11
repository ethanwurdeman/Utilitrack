declare module "@tmcw/togeojson" {
  import type { FeatureCollection } from "geojson";
  export function kml(doc: Document): FeatureCollection;
  export function gpx(doc: Document): FeatureCollection;
}
