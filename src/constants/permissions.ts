import type { UserRole } from "@/types";
export type { UserRole };

/**
 * Role hierarchy and permission definitions for Alankaran CMS.
 * Prepared for future multi-role system (ADMIN, EDITOR, VIEWER).
 */
export const ROLES: Record<UserRole, UserRole> = {
  ADMIN: "ADMIN",
  EDITOR: "EDITOR",
  VIEWER: "VIEWER",
} as const;

export const PERMISSIONS = {
  CAN_UPLOAD_IMAGES: "CAN_UPLOAD_IMAGES",
  CAN_DELETE_IMAGES: "CAN_DELETE_IMAGES",
  CAN_MANAGE_GALLERY: "CAN_MANAGE_GALLERY",
  CAN_ACCESS_SETTINGS: "CAN_ACCESS_SETTINGS",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

/**
 * Role-to-permission matrix mapping.
 * In Phase 1 & 1.5, only ADMIN role exists and has all permissions.
 */
export const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  ADMIN: [
    PERMISSIONS.CAN_UPLOAD_IMAGES,
    PERMISSIONS.CAN_DELETE_IMAGES,
    PERMISSIONS.CAN_MANAGE_GALLERY,
    PERMISSIONS.CAN_ACCESS_SETTINGS,
  ],
  EDITOR: [
    PERMISSIONS.CAN_UPLOAD_IMAGES,
    PERMISSIONS.CAN_MANAGE_GALLERY,
  ],
  VIEWER: [],
};
