'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { supabase } from '@/lib/supabase'

interface ParcelInfo {
  parcel_id: string
  address: string
  area_sqm: number
  raw_data: unknown
}

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const searchMarker = useRef<maplibregl.Marker | null>(null)
  const [parcelInfo, setParcelInfo] = useState<ParcelInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `${process.env.NEXT_PUBLIC_LINZ_STYLE_URL}?api=${process.env.NEXT_PUBLIC_LINZ_BASEMAP_KEY}`,
      center: [174.7633, -36.8485],
      zoom: 14,
    })

    map.current.addControl(new maplibregl.NavigationControl())
    map.current.getCanvas().style.cursor = 'crosshair'

    map.current.on('mousedown', () => {
      map.current!.getCanvas().style.cursor = 'grabbing'
    })
    map.current.on('mouseup', () => {
      map.current!.getCanvas().style.cursor = 'crosshair'
    })

    map.current.on('click', async (e) => {
      const { lng, lat } = e.lngLat
      searchMarker.current?.remove()
      searchMarker.current = null
      setLoading(true)
      setError(null)
      setParcelInfo(null)

      try {
        const apiKey = process.env.NEXT_PUBLIC_LINZ_API_KEY
        const url = `${process.env.NEXT_PUBLIC_LINZ_QUERY_URL}?key=${apiKey}&layer=50772&x=${lng}&y=${lat}&max_results=1&radius=50&geometry=true&with_field_names=true`

        const res = await fetch(url)
        const text = await res.text()
        const data = JSON.parse(text)

        const feature = data.vectorQuery?.layers?.['50772']?.features?.[0]
        if (!feature) {
          setError('No parcel found at this location.')
          setLoading(false)
          return
        }

        const props = feature.properties
        const info: ParcelInfo = {
          parcel_id: props.id ?? 'N/A',
          address: props.appellation ?? 'N/A',
          area_sqm: props.calc_area ?? 0,
          raw_data: props,
        }

        setParcelInfo(info)

        await supabase.from('parcel_searches').insert({
          lng,
          lat,
          parcel_id: info.parcel_id,
          address: info.address,
          area_sqm: info.area_sqm,
          raw_data: info.raw_data,
        })
      } catch (err) {
        setError('Failed to fetch parcel data.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim() || !map.current) return
    setSearching(true)
    setError(null)
    setParcelInfo(null)

    try {
      const apiKey = process.env.NEXT_PUBLIC_LINZ_API_KEY
      const encoded = encodeURIComponent(searchQuery)
      const url = `${process.env.NEXT_PUBLIC_LINZ_ADDRESS_URL};key=${apiKey}/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=layer-105689&cql_filter=full_address+ILIKE+%27%25${encoded}%25%27&count=1&outputFormat=application/json`

      const res = await fetch(url)
      const data = await res.json()

      let feature = data.features?.[0]

      if (!feature) {
        const placeUrl = `${process.env.NEXT_PUBLIC_LINZ_ADDRESS_URL};key=${apiKey}/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=layer-1681&cql_filter=name+ILIKE+%27%25${encoded}%25%27&count=1&outputFormat=application/json`
        const placeRes = await fetch(placeUrl)
        const placeData = await placeRes.json()
        feature = placeData.features?.[0]
      }

      if (!feature) {
        setError('Address not found. Try a more specific address.')
        return
      }

      const coords = feature.geometry.coordinates
      map.current.flyTo({
        center: [coords[0], coords[1]],
        zoom: 17,
        duration: 1500,
      })

      searchMarker.current?.remove()
      searchMarker.current = new maplibregl.Marker()
        .setLngLat([coords[0], coords[1]])
        .addTo(map.current)
      searchMarker.current.getElement().addEventListener('click', () => {
        searchMarker.current?.remove()
        searchMarker.current = null
      })
    } catch (err) {
      setError('Failed to search address.')
      console.error(err)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <div ref={mapContainer} className="flex-1 min-h-[50vh] md:min-h-0" />

      <div className="w-full md:w-80 bg-white shadow-lg p-4 md:p-6 overflow-y-auto flex flex-col gap-4 max-h-[50vh] md:max-h-none">
        <h1 className="text-xl font-bold text-gray-800">NZ Parcel Explorer</h1>

        {/* Search */}
        <div className="flex gap-2 md:flex-col">
          <input
            type="text"
            placeholder="Search address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg px-3 py-2 disabled:opacity-50 whitespace-nowrap"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        <p className="text-sm text-gray-500">Or tap anywhere on the map to view parcel information.</p>

        {loading && <div className="text-blue-500 text-sm">Loading parcel data...</div>}
        {error && <div className="text-red-500 text-sm">{error}</div>}

        {parcelInfo && (
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 rounded-lg p-4 flex flex-col gap-2">
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Parcel ID</span>
                <p className="text-sm font-medium text-gray-800">{parcelInfo.parcel_id}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Title / Appellation</span>
                <p className="text-sm font-medium text-gray-800">{parcelInfo.address}</p>
              </div>
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">Area</span>
                <p className="text-sm font-medium text-gray-800">
                  {parcelInfo.area_sqm ? `${parcelInfo.area_sqm.toLocaleString()} m²` : 'N/A'}
                </p>
              </div>
            </div>
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">Raw data</summary>
              <pre className="mt-2 bg-gray-50 rounded p-2 overflow-x-auto text-xs">
                {JSON.stringify(parcelInfo.raw_data, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}