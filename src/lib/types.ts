export type Category = {
  slug: string;
  name: string;
  description: string;
  /** Tailwind gradient classes used for the category tile. */
  gradient: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  /** Manufacturer, e.g. "Tupperware". Shown on cards and used as a filter. */
  brand: string;
  /**
   * Maker and range as the partner writes it, marks and all, e.g.
   * "Tupperware® Modular Mates®". Display only: brand is what filtering
   * groups by, and a few hundred ranges would group nothing.
   */
  productLine?: string;
  tagline: string;
  description: string;
  /** Price in minor units (cents) to avoid floating point drift. */
  price: number;
  /** Original price in cents, when the item is discounted. */
  compareAtPrice?: number;
  category: string;
  image: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  /** Physical units remaining. Database products always provide this value. */
  stockQuantity?: number;
  featured?: boolean;
  highlights: string[];
  /** Available colours, sizes or other supplier-listed options. */
  variants?: string[];
};

export type CartItem = {
  productId: string;
  quantity: number;
};
