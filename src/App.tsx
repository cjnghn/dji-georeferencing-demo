import React, { useState, useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import * as turf from "@turf/turf";
import { useMap } from "./hooks/useMap";
import { FileUpload } from "./components/FileUpload";
import { filterVideoObservations, readCSVFile } from "./utils/fileUtils";
import { Observation } from "./types";
import {
  calculateInitialCoordinates,
  calculateBounds,
  addFlightPath,
} from "./utils/mapUtils";
import { mapboxConfig } from "./config/mapbox";

mapboxgl.accessToken = mapboxConfig.mapboxAccessToken;

const DroneVideoOverlayApp: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useMap(mapContainer);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSourceRef = useRef<mapboxgl.VideoSource | null>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [flightLogFile, setFlightLogFile] = useState<File | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addVideoOverlay = useCallback(
    (map: mapboxgl.Map, videoFile: File, observations: Observation[]) => {
      if (!map || !videoFile || observations.length === 0) return;

      const videoURL = URL.createObjectURL(videoFile);
      const fov = (59 * Math.PI) / 180;
      const fovAtan = Math.tan(fov);

      if (map.getSource("video")) {
        (map.getSource("video") as mapboxgl.VideoSource).setCoordinates(
          calculateInitialCoordinates(observations)
        );
      } else {
        map.addSource("video", {
          type: "video",
          urls: [videoURL],
          coordinates: calculateInitialCoordinates(observations),
        });

        map.addLayer({
          id: "video",
          type: "raster",
          source: "video",
          paint: {
            "raster-opacity": 1,
            "raster-fade-duration": 0,
          },
        });
      }

      const videoSource = map.getSource("video") as mapboxgl.VideoSource;
      videoSourceRef.current = videoSource;

      const video = videoSource.getVideo();
      if (video) {
        video.loop = true;
        video.playbackRate = 4.0;
      }

      const animateVideo = () => {
        requestAnimationFrame(animateVideo);

        const video = videoSource.getVideo();
        if (!video || !video.videoWidth) return;

        const { videoWidth, videoHeight, currentTime } = video;

        const frame = Math.floor(currentTime * 10);
        const observation = observations[frame % observations.length];

        const center = turf.point([
          observation.longitude,
          observation.latitude,
        ]);
        const altitude = observation["ascent(feet)"] * 0.3048;

        const diagonalDistance = altitude * fovAtan;
        const distance = diagonalDistance / 2;

        // bearing이 뭔가요?
        // bearing은 비디오가 바라보는 방향을 나타내는 각도입니다. 비디오가 북쪽을 바라보고 있으면 0도이고, 동쪽을 바라보고 있으면 90도입니다.
        const bearing = (observation["compass_heading(degrees)"] - 90) % 360;

        // offset이 뭔가요?
        // offset은 비디오의 너비와 높이를 사용하여 비디오의 각 모서리까지의 거리를 계산하는 데 사용됩니다.
        const offset = (Math.atan(videoHeight / videoWidth) * 180) / Math.PI;

        const options = { units: "meters" as turf.Units };
        const topLeft = turf.rhumbDestination(
          center,
          distance,
          ((bearing - offset + 180) % 360) - 180, // bearing - offset + 180
          options
        ).geometry.coordinates;
        const topRight = turf.rhumbDestination(
          center,
          distance,
          ((bearing + offset + 180) % 360) - 180, // bearing + offset + 180
          options
        ).geometry.coordinates;
        const bottomRight = turf.rhumbDestination(
          center,
          distance,
          ((bearing - offset) % 360) - 180, // bearing - offset
          options
        ).geometry.coordinates;
        const bottomLeft = turf.rhumbDestination(
          center,
          distance,
          ((bearing + offset) % 360) - 180, // bearing + offset
          options
        ).geometry.coordinates;

        // 타입에러를 방지하기 위해 직접 [0], [1]로 접근
        videoSource.setCoordinates([
          [topRight[0], topRight[1]],
          [bottomRight[0], bottomRight[1]],
          [bottomLeft[0], bottomLeft[1]],
          [topLeft[0], topLeft[1]],
        ]);
      };

      animateVideo();
    },
    []
  );

  useEffect(() => {
    if (map && videoFile && observations.length > 0) {
      addVideoOverlay(map, videoFile, observations);
    }
  }, [map, videoFile, observations, addVideoOverlay]);

  const processData = useCallback(async () => {
    if (!videoFile || !flightLogFile || !map) {
      setError("Please upload both video and flight log files.");
      return;
    }

    try {
      const obs = await readCSVFile(flightLogFile);
      const videoObs = filterVideoObservations(obs);

      if (videoObs.length === 0) {
        throw new Error("No video observations found in flight log");
      }

      setObservations(videoObs);
      setError(null);

      const bounds = calculateBounds(videoObs);
      map.fitBounds(bounds, { padding: 50 });

      addFlightPath(map, videoObs);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while processing data."
      );
    }
  }, [videoFile, flightLogFile, map]);

  return (
    <div>
      <FileUpload
        id="videoFile"
        label="Upload Video File:"
        accept="video/*"
        onChange={setVideoFile}
      />
      <FileUpload
        id="flightLogFile"
        label="Upload Flight Log File:"
        accept=".csv"
        onChange={setFlightLogFile}
      />
      <button onClick={processData}>Process Data</button>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <div ref={mapContainer} style={{ width: "100%", height: "600px" }} />
      <video ref={videoRef} style={{ display: "none" }} />
    </div>
  );
};

export default DroneVideoOverlayApp;
