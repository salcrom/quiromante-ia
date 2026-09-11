export const READING_STATUSES = ["draft","capturing","validating","ready","analyzing","review_required","completed","completed_with_limitations","failed","cancelled","archived"] as const;
export type ReadingStatus = (typeof READING_STATUSES)[number];
export const HAND_SIDES = ["left","right","unknown"] as const;
export type HandSide = (typeof HAND_SIDES)[number];
