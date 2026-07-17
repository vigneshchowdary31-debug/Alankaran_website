import type { UserRole } from "@/types";
import { ROLE_PERMISSIONS, PERMISSIONS, type PermissionKey } from "@/constants/permissions";

/**
 * Permission check functions for Alankaran CMS.
 * Prepared for future multi-role system (ADMIN, EDITOR, VIEWER).
 * In Phase 1 & 1.5, default role is ADMIN, where all functions return true.
 */
export function hasPermission(permission: PermissionKey, role: UserRole = "ADMIN"): boolean {
  const allowedPermissions = ROLE_PERMISSIONS[role] || [];
  return allowedPermissions.includes(permission);
}

export function canUploadImages(role: UserRole = "ADMIN"): boolean {
  return hasPermission(PERMISSIONS.CAN_UPLOAD_IMAGES, role);
}

export function canDeleteImages(role: UserRole = "ADMIN"): boolean {
  return hasPermission(PERMISSIONS.CAN_DELETE_IMAGES, role);
}

export function canManageGallery(role: UserRole = "ADMIN"): boolean {
  return hasPermission(PERMISSIONS.CAN_MANAGE_GALLERY, role);
}

export function canAccessSettings(role: UserRole = "ADMIN"): boolean {
  return hasPermission(PERMISSIONS.CAN_ACCESS_SETTINGS, role);
}
