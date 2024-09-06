import { useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";

export const useMap = (containerRef: React.RefObject<HTMLDivElement>) => {
	const [map, setMap] = useState<mapboxgl.Map | null>(null);

	useEffect(() => {
		if (containerRef.current && !map) {
			const newMap = new mapboxgl.Map({
				container: containerRef.current,
				style: "mapbox://styles/mapbox/streets-v11",
				zoom: 1,
			});
			setMap(newMap);
		}
	}, [containerRef, map]);

	return map;
};
