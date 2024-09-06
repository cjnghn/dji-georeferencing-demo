import { Observation } from "../types";

export const calculateBounds = (observations: Observation[]) => {
  const lngs = observations
    .map((o) => o.longitude)
    .filter((lng): lng is number => typeof lng === "number" && !isNaN(lng));
  const lats = observations
    .map((o) => o.latitude)
    .filter((lat): lat is number => typeof lat === "number" && !isNaN(lat));
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
};

export const addFlightPath = (
  map: mapboxgl.Map,
  observations: Observation[]
) => {
  const pathGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: observations
        .filter(
          (o) =>
            typeof o.longitude === "number" && typeof o.latitude === "number"
        )
        .map((o) => [o.longitude, o.latitude]),
    },
    properties: {},
  };

  map.addSource("dronePath", {
    type: "geojson",
    data: pathGeoJSON,
  });

  map.addLayer({
    id: "droneOutline",
    type: "line",
    source: "dronePath",
    layout: {},
    paint: {
      "line-color": "#6706CE",
      "line-width": 3,
    },
  });
};

export const calculateInitialCoordinates = (observations: Observation[]) => {
  const bounds = calculateBounds(observations);
  const center: [number, number] = [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
  ];
  const offset = 0.0007;
  return [
    [center[0] + offset, center[1] - offset],
    [center[0] + offset, center[1] + offset],
    [center[0] - offset, center[1] + offset],
    [center[0] - offset, center[1] - offset],
  ];
};
