import Papa from "papaparse";
import { Observation } from "../types";

export const readCSVFile = (file: File): Promise<Observation[]> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e: ProgressEvent<FileReader>) => {
			const text = e.target?.result;
			if (typeof text === "string") {
				const results = Papa.parse<Observation>(text, {
					header: true,
					transformHeader: (h: string) => h.trim(),
					dynamicTyping: true,
				});
				resolve(results.data);
			} else {
				reject(new Error("Failed to read file"));
			}
		};
		reader.onerror = () => reject(new Error("File read error"));
		reader.readAsText(file);
	});
};

export const filterVideoObservations = (
	observations: Observation[],
): Observation[] => {
	return observations.filter((o) => o.isVideo === 1);
};
