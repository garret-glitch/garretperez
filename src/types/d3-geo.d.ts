declare module 'd3-geo' {
  interface GeoProjection {
    (point: [number, number]): [number, number] | null
    scale(s: number): this
    translate(t: [number, number]): this
    invert(point: [number, number]): [number, number] | null
  }
  export function geoAlbersUsa(): GeoProjection
  export function geoEqualEarth(): GeoProjection
}
