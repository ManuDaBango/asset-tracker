export type LifecycleStatus = "Active" | "Missing" | "Disposed" | "Unverified";

export type Asset = {
  recordId: string;
  assetId: string;
  category: string;
  brand: string;
  model: string;
  site: string;
  lifecycleStatus: LifecycleStatus;
  condition: Condition;
  barcode?: string;
  serial?: string;
  department?: string;
  miscSpec?: string;
  };

// below was added for second base: Asset Reports  
export const CHANNELS = ["Web", "Telegram", "Email"] as const;
export const ROLES = ["Employee", "Auditor", "Client"] as const;

export type Channel = (typeof CHANNELS)[number];
export type ReporterRole = (typeof ROLES)[number];

export const DEPARTMENTS = ["Operations", "Finance", "Workshop", "IT", "Marketing"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const REPORTED_STATUSES = ["Active", "Missing", "Disposed"] as const;
export type ReportedStatus = (typeof REPORTED_STATUSES)[number];

export const CONDITIONS = ["New", "Good", "Fair", "Needs R&M", "Damaged", "End of life"] as const;
export type Condition = (typeof CONDITIONS)[number];

export type ReportInput = {
  channel: Channel;
  reporterName: string;
  reporterRole: ReporterRole;
  site: string;
  description: string;
  barcode?: string;
  assetId?: string;
  status?: ReportedStatus;
  quantity?: number;
  category?: string;
  brand?: string;
  model?: string;
  miscSpec?: string;
  department?: Department;
  condition?: Condition;
};

// below was added for the review screen
export type ReviewItem = {
  recordId: string;
  receivedAt?: string;
  channel: string;
  reporterName: string;
  reporterRole: string;
  site: string;
  description: string;
  barcode?: string;
  assetId?: string;
  category?: string;
  brand?: string;
  model?: string;
  miscSpec?: string;
  quantity?: number;
  reportedStatus?: string;
  condition?: string;
  department?: string;
  matchResult: string;
  reviewReason?: string;
  photoUrl?: string;
  matchedAssetRecordId?: string;
  matchedAsset?: Asset;
};

// below was added for third table: Events  
export type EventType = "Sighting verified" | "Found (was Missing)" | "Sent to review" | "Report rejected";

export type NewEvent = {
  type: EventType;
  reportRecordId: string;
  assetRecordId?: string;
  actor: string;
  note: string;
};

// below was added for 4th table in section 8: Telegram 
export type BotUser = {
  name: string;
  telegramId: string;
  role: ReporterRole;
  receivesAlerts: boolean;
};

// below was added after photo was used
export type PhotoMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
export type Photo = { mediaType: PhotoMediaType; base64: string };

export type Confidence = "High" | "Medium" | "Low";

export type LabelFields = {
  assetId?: string;
  barcode?: string;
  serial?: string;
  brand?: string;
  model?: string;
  category?: string;
  confidence: Confidence;
  notes: string;
};