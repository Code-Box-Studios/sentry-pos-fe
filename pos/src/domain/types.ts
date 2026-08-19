export type BusinessType = "retail" | "fnb" | "mixed";
export type OrderType = "dine_in" | "takeout" | "none";
export type PaymentMethod = "cash" | "card" | "gcash" | "maya" | "other";
export type SoldBy = "unit" | "weight";
export type AdjustReason = "damage" | "expiry" | "theft_loss" | "count_correction" | "other";

export interface BusinessSettings {
  id: string;
  name: string;
  type: BusinessType;
  currency: "PHP";
  taxRate: number;            // 0.12
  serviceChargeRate: number;  // 0.05; 0 disables
  allowMiscItems: boolean;
  isDemo: boolean;
  dayStartTime: string;       // "HH:mm", e.g. "04:00"
  receiptHeader: string;      // freeform, holds TIN + address lines
  receiptFooter: string;
}

export interface BranchInfo { id: string; name: string; code: string; address: string }

export interface Category { id: string; name: string; sortOrder: number }

export interface ProductVariant { id: string; name: string; sku: string | null; barcode: string | null; priceC: number }

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  priceC: number;             // base price; variant price wins when variant chosen
  soldBy: SoldBy;
  lowStockThreshold: number | null;
  trackStock: boolean;
  active: boolean;
  variants: ProductVariant[];         // empty = no variants
  modifierGroupIds: string[];         // empty = no modifier sheet
}

export interface Modifier { id: string; name: string; priceDeltaC: number }

export interface ModifierGroup { id: string; name: string; minSelect: number; maxSelect: number; modifiers: Modifier[] }

export interface NamedDiscount {
  id: string;
  name: string;
  kind: "percent" | "fixed";
  value: number;              // percent 0–100, or centavos when fixed
  appliesTo: "line" | "order" | "both";
  active: boolean;
}

export interface StockLevel { productId: string; variantId: string | null; qty: number }

export interface CatalogPayload {
  business: BusinessSettings;
  branch: BranchInfo;
  terminal: { name: string; code: string };
  categories: Category[];
  products: Product[];
  modifierGroups: ModifierGroup[];
  discounts: NamedDiscount[];
  stock: StockLevel[];
  loadedAt: string;
}
