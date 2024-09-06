export interface Observation {
	isVideo: number;
	latitude: number;
	longitude: number;
	"ascent(feet)": number;
	"compass_heading(degrees)": number;
	[key: string]: string | number;
}
