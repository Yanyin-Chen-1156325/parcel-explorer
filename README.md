# NZ Parcel Explorer

An interactive web application for exploring New Zealand land parcel data, built on top of LINZ (Land Information New Zealand) open geospatial datasets.

## Features

- **Interactive map** powered by LINZ's official topographic basemap
- **Click to query**: click anywhere on the map to view parcel information including Parcel ID, title/appellation, and area
- **Address and place name search**: search by street address and fly to the location with a marker
- **Search history**: every parcel query is saved to a database for future reference
- **Responsive layout**: map and sidebar panel side by side

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React, TypeScript, Tailwind CSS |
| Map rendering | MapLibre GL JS |
| Basemap | LINZ Basemaps (topographic-v2) |
| Parcel data | LINZ Data Service — NZ Primary Parcels (layer-50772) |
| Address search | LINZ Data Service — NZ Addresses (layer-105689) |
| Place name search | LINZ Data Service — NZ Place Names (layer-1681) |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel |

## Data Sources

All geospatial data is sourced from [Toitū Te Whenua Land Information New Zealand](https://data.linz.govt.nz/) and is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).