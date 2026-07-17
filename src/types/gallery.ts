export type GalleryCategory =
  | "All"
  | "Royal Themes"
  | "Mandap & Decor"
  | "Bridal & Groom"
  | "Destination"
  | "Rituals";

export interface GalleryItem {
  id: string;
  title: string;
  category: GalleryCategory;
  imageUrl: string;
  thumbnailUrl: string;
  displayOrder: number;
  tags?: string[];
  createdAt: number;
}
