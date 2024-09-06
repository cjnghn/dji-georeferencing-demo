import React, { useState, useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import * as turf from "@turf/turf";
import { useMapboxMap } from "./hooks/useMapboxMap";
import { FileUpload } from "./components/FileUpload";
import {
  filterVideoObservations,
  parseObservationsFromCSV,
} from "./utils/fileUtils";
import { Observation } from "./types";
import {
  calculateInitialVideoCoordinates,
  calculateFlightPathBounds,
  addDroneFlightPath,
} from "./utils/mapUtils";
import { mapboxConfig } from "./config/mapbox";

// Importing the CSS module
import styles from "./DroneVideoOverlayApp.module.css";

mapboxgl.accessToken = mapboxConfig.mapboxAccessToken;

const DroneVideoOverlayApp: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapboxMap = useMapboxMap(mapContainerRef);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const videoSourceRef = useRef<mapboxgl.VideoSource | null>(null);

  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
  const [uploadedFlightLogFile, setUploadedFlightLogFile] =
    useState<File | null>(null);
  const [flightObservations, setFlightObservations] = useState<Observation[]>(
    []
  );
  const [processError, setProcessError] = useState<string | null>(null);

  const addVideoOverlayToMap = useCallback(
    (map: mapboxgl.Map, videoFile: File, observations: Observation[]) => {
      if (!map || !videoFile || observations.length === 0) return;

      const videoURL = URL.createObjectURL(videoFile);
      const fieldOfView = (59 * Math.PI) / 180;
      const tanFOV = Math.tan(fieldOfView);

      if (map.getSource("video")) {
        (map.getSource("video") as mapboxgl.VideoSource).setCoordinates(
          calculateInitialVideoCoordinates(observations)
        );
      } else {
        map.addSource("video", {
          type: "video",
          urls: [videoURL],
          coordinates: calculateInitialVideoCoordinates(observations),
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

      const animateVideoOverlay = () => {
        requestAnimationFrame(animateVideoOverlay);

        const video = videoSource.getVideo();
        if (!video || !video.videoWidth) return;

        const { videoWidth, videoHeight, currentTime } = video;

        const frameIndex = Math.floor(currentTime * 10);
        const currentObservation =
          observations[frameIndex % observations.length];

        const videoCenter = turf.point([
          currentObservation.longitude,
          currentObservation.latitude,
        ]);
        const droneAltitude = currentObservation["ascent(feet)"] * 0.3048;

        const halfDiagonalDistance = (droneAltitude * tanFOV) / 2;
        const bearingAngle =
          (currentObservation["compass_heading(degrees)"] - 90) % 360;
        const aspectRatioOffset =
          (Math.atan(videoHeight / videoWidth) * 180) / Math.PI;

        const turfOptions = { units: "meters" as turf.Units };

        const topLeftCoord = turf.rhumbDestination(
          videoCenter,
          halfDiagonalDistance,
          ((bearingAngle - aspectRatioOffset + 180) % 360) - 180,
          turfOptions
        ).geometry.coordinates;
        const topRightCoord = turf.rhumbDestination(
          videoCenter,
          halfDiagonalDistance,
          ((bearingAngle + aspectRatioOffset + 180) % 360) - 180,
          turfOptions
        ).geometry.coordinates;
        const bottomRightCoord = turf.rhumbDestination(
          videoCenter,
          halfDiagonalDistance,
          ((bearingAngle - aspectRatioOffset) % 360) - 180,
          turfOptions
        ).geometry.coordinates;
        const bottomLeftCoord = turf.rhumbDestination(
          videoCenter,
          halfDiagonalDistance,
          ((bearingAngle + aspectRatioOffset) % 360) - 180,
          turfOptions
        ).geometry.coordinates;

        videoSource.setCoordinates([
          [topRightCoord[0], topRightCoord[1]],
          [bottomRightCoord[0], bottomRightCoord[1]],
          [bottomLeftCoord[0], bottomLeftCoord[1]],
          [topLeftCoord[0], topLeftCoord[1]],
        ]);
      };

      animateVideoOverlay();
    },
    []
  );

  useEffect(() => {
    if (mapboxMap && uploadedVideoFile && flightObservations.length > 0) {
      addVideoOverlayToMap(mapboxMap, uploadedVideoFile, flightObservations);
    }
  }, [mapboxMap, uploadedVideoFile, flightObservations, addVideoOverlayToMap]);

  const handleProcessData = useCallback(async () => {
    if (!uploadedVideoFile || !uploadedFlightLogFile || !mapboxMap) {
      setProcessError("Please upload both video and flight log files.");
      return;
    }

    try {
      const observations = await parseObservationsFromCSV(
        uploadedFlightLogFile
      );
      const videoObservations = filterVideoObservations(observations);

      if (videoObservations.length === 0) {
        throw new Error("No video observations found in flight log");
      }

      setFlightObservations(videoObservations);
      setProcessError(null);

      const bounds = calculateFlightPathBounds(videoObservations);
      mapboxMap.fitBounds(bounds, { padding: 50 });

      addDroneFlightPath(mapboxMap, videoObservations);
    } catch (err) {
      setProcessError(
        err instanceof Error
          ? err.message
          : "An error occurred while processing data."
      );
    }
  }, [uploadedVideoFile, uploadedFlightLogFile, mapboxMap]);

  return (
    <div className={styles.container}>
      <div className={styles.fileUploadContainer}>
        <FileUpload
          id="videoFile"
          label="Upload Video File:"
          accept="video/*"
          onChange={setUploadedVideoFile}
        />
        <FileUpload
          id="flightLogFile"
          label="Upload Flight Log File:"
          accept=".csv"
          onChange={setUploadedFlightLogFile}
        />
      </div>
      <button className={styles.button} onClick={handleProcessData}>
        Process Data
      </button>
      {processError && (
        <div className={styles.errorMessage}>{processError}</div>
      )}
      <div ref={mapContainerRef} className={styles.mapContainer} />
      <video ref={hiddenVideoRef} style={{ display: "none" }} />
    </div>
  );
};

export default DroneVideoOverlayApp;
