declare module 'react-simple-maps' {
  import { ComponentType, SVGProps, MouseEventHandler } from 'react'

  export interface ComposableMapProps extends SVGProps<SVGSVGElement> {
    width?: number
    height?: number
    projection?: string
    projectionConfig?: Record<string, unknown>
    style?: React.CSSProperties
    onClick?: MouseEventHandler<SVGSVGElement>
  }

  export interface GeographiesProps {
    geography: string | object
    children: (ctx: { geographies: Geography[] }) => React.ReactNode
  }

  export interface Geography {
    rsmKey: string
    [key: string]: unknown
  }

  export interface GeographyProps {
    geography: Geography
    style?: {
      default?: React.CSSProperties
      hover?: React.CSSProperties
      pressed?: React.CSSProperties
    }
    [key: string]: unknown
  }

  export const ComposableMap: ComponentType<ComposableMapProps>
  export const Geographies: ComponentType<GeographiesProps>
  export const Geography: ComponentType<GeographyProps>
  export const Marker: ComponentType<{ coordinates: [number, number]; [key: string]: unknown }>
  export const ZoomableGroup: ComponentType<{ [key: string]: unknown }>
}
