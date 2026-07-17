import React from "react";

export type PhaseStatus = "Completed" | "Up Next" | "Locked";

export interface RoadmapPhase {
  phase: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: PhaseStatus;
  href?: string;
}

export interface CMSConfig {
  version: string;
  environment: string;
  cacheExpirationMs: number;
  maxUploadSizeMB: number;
  allowedImageTypes: string[];
}
