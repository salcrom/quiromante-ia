export type Point = { x: number; y: number };
export type PolylineGeometry = { type: "polyline"; points: Point[] };
export type PalmLineCode = "LV" | "LC" | "LCO" | "LD" | "LS" | "LM";
export type DetectionStatus = "confirmed" | "probable" | "candidate" | "ambiguous" | "rejected" | "not_evaluable";
