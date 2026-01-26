import React, { memo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Country code to region mapping
const countryToRegion = {
  // Europe
  DEU: 'europe', FRA: 'europe', GBR: 'europe', ITA: 'europe', ESP: 'europe',
  NLD: 'europe', BEL: 'europe', POL: 'europe', SWE: 'europe', NOR: 'europe',
  DNK: 'europe', FIN: 'europe', AUT: 'europe', CHE: 'europe', PRT: 'europe',
  IRL: 'europe', GRC: 'europe', CZE: 'europe', HUN: 'europe', ROU: 'europe',
  UKR: 'europe', SVK: 'europe', BGR: 'europe', HRV: 'europe', SRB: 'europe',
  SVN: 'europe', LTU: 'europe', LVA: 'europe', EST: 'europe',
  // Americas
  USA: 'americas', CAN: 'americas', MEX: 'americas', BRA: 'americas',
  ARG: 'americas', COL: 'americas', CHL: 'americas', PER: 'americas',
  VEN: 'americas', ECU: 'americas', BOL: 'americas', PRY: 'americas',
  URY: 'americas', CRI: 'americas', PAN: 'americas', CUB: 'americas',
  DOM: 'americas', PRI: 'americas', JAM: 'americas', TTO: 'americas',
  // Asia
  JPN: 'asia', KOR: 'asia', CHN: 'asia', IND: 'asia', THA: 'asia',
  VNM: 'asia', IDN: 'asia', PHL: 'asia', MYS: 'asia', SGP: 'asia',
  TWN: 'asia', HKG: 'asia', PAK: 'asia', BGD: 'asia', LKA: 'asia',
  NPL: 'asia', MMR: 'asia', KHM: 'asia', LAO: 'asia',
  // Russia
  RUS: 'russia',
  // Africa
  ZAF: 'africa', EGY: 'africa', NGA: 'africa', KEN: 'africa', GHA: 'africa',
  TZA: 'africa', MAR: 'africa', DZA: 'africa', TUN: 'africa', ETH: 'africa',
  // Oceania
  AUS: 'oceania', NZL: 'oceania', FJI: 'oceania', PNG: 'oceania'
};

const regionColors = {
  europe: { default: '#00F0FF', hover: '#00F0FF' },
  americas: { default: '#FFD700', hover: '#FFD700' },
  asia: { default: '#BD00FF', hover: '#BD00FF' },
  russia: { default: '#FF6464', hover: '#FF6464' },
  africa: { default: '#64FF64', hover: '#64FF64' },
  oceania: { default: '#FFB464', hover: '#FFB464' },
  default: { default: '#333333', hover: '#00F0FF' }
};

const WorldMap = memo(({ onCountryClick, onRegionClick }) => {
  const handleClick = (geo) => {
    const countryCode = geo.properties.ISO_A3;
    const region = countryToRegion[countryCode];
    
    if (region && onRegionClick) {
      onRegionClick(region, geo.properties.name);
    } else if (onCountryClick) {
      onCountryClick(countryCode, geo.properties.name);
    }
  };

  return (
    <div data-testid="world-map" className="w-full h-full relative">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 120,
          center: [20, 30]
        }}
        className="w-full h-full"
        style={{ backgroundColor: 'transparent' }}
      >
        <ZoomableGroup zoom={1} minZoom={1} maxZoom={4}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryCode = geo.properties.ISO_A3;
                const region = countryToRegion[countryCode];
                const colors = region ? regionColors[region] : regionColors.default;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => handleClick(geo)}
                    style={{
                      default: {
                        fill: region ? `${colors.default}30` : '#1a1a1a',
                        stroke: region ? `${colors.default}60` : '#333',
                        strokeWidth: 0.5,
                        outline: 'none',
                        cursor: 'pointer'
                      },
                      hover: {
                        fill: `${colors.hover}60`,
                        stroke: colors.hover,
                        strokeWidth: 1,
                        outline: 'none',
                        cursor: 'pointer',
                        filter: `drop-shadow(0 0 8px ${colors.hover}50)`
                      },
                      pressed: {
                        fill: `${colors.hover}80`,
                        stroke: colors.hover,
                        strokeWidth: 1,
                        outline: 'none'
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 glass rounded-lg p-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#00F0FF]" />
            <span className="text-muted-foreground">Europe</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FFD700]" />
            <span className="text-muted-foreground">Americas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#BD00FF]" />
            <span className="text-muted-foreground">Asia</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF6464]" />
            <span className="text-muted-foreground">Russia</span>
          </div>
        </div>
      </div>
    </div>
  );
});

WorldMap.displayName = 'WorldMap';

export default WorldMap;
