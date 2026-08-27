import type {
  BranchInfo,
  BusinessSettings,
  CatalogPayload,
  Category,
  ModifierGroup,
  NamedDiscount,
  Product,
  StockLevel,
} from "@/domain/types";
import { pesos } from "@/lib/money";

/** The one owner account the mock knows. Documented in pos/README.md. */
export const SEED_OWNER = {
  email: "maria@kapediaria.ph",
  password: "sentry-demo",
  refundPin: "123456",
  name: "Maria Reyes",
} as const;

export const SEED_BRANCHES: BranchInfo[] = [
  { id: "branch-mkt", name: "Marikit", code: "MKT", address: "123 Gen. Ordoñez Ave, Marikina" },
  { id: "branch-byn", name: "Bayanihan", code: "BYN", address: "88 Bayanihan St, Pasig" },
];

const RECEIPT_HEADER = "TIN 123-456-789-000";
const RECEIPT_FOOTER = "Salamat po! Ingat!";

export const SEED_BUSINESSES: BusinessSettings[] = [
  {
    id: "biz-kape",
    name: "Kape Diaria",
    type: "mixed",
    currency: "PHP",
    taxRate: 0.12,
    serviceChargeRate: 0.05,
    allowMiscItems: true,
    isDemo: false,
    dayStartTime: "04:00",
    receiptHeader: RECEIPT_HEADER,
    receiptFooter: RECEIPT_FOOTER,
  },
  {
    id: "biz-kape-demo",
    name: "Kape Diaria (Demo)",
    type: "mixed",
    currency: "PHP",
    taxRate: 0.12,
    serviceChargeRate: 0.05,
    allowMiscItems: true,
    isDemo: true,
    dayStartTime: "04:00",
    receiptHeader: RECEIPT_HEADER,
    receiptFooter: RECEIPT_FOOTER,
  },
];

const CATEGORIES: Category[] = [
  { id: "cat-coffee", name: "Coffee", sortOrder: 1 },
  { id: "cat-bakery", name: "Bakery", sortOrder: 2 },
  { id: "cat-grocery", name: "Grocery", sortOrder: 3 },
  { id: "cat-meals", name: "Meals", sortOrder: 4 },
];

const MODIFIER_GROUPS: ModifierGroup[] = [
  {
    id: "mg-milk",
    name: "Milk",
    minSelect: 0,
    maxSelect: 1,
    modifiers: [
      { id: "mod-oat", name: "Oat milk", priceDeltaC: pesos(25) },
      { id: "mod-fresh", name: "Fresh milk", priceDeltaC: 0 },
    ],
  },
  {
    id: "mg-addons",
    name: "Add-ons",
    minSelect: 0,
    maxSelect: 3,
    modifiers: [
      { id: "mod-shot", name: "Extra shot", priceDeltaC: pesos(30) },
      { id: "mod-vanilla", name: "Vanilla", priceDeltaC: pesos(15) },
      { id: "mod-lessice", name: "Less ice", priceDeltaC: 0 },
    ],
  },
];

const DISCOUNTS: NamedDiscount[] = [
  { id: "disc-merienda", name: "Merienda 10%", kind: "percent", value: 10, appliesTo: "both", active: true },
  { id: "disc-20off", name: "₱20 off", kind: "fixed", value: pesos(20), appliesTo: "order", active: true },
  { id: "disc-barkada", name: "Barkada 5%", kind: "percent", value: 5, appliesTo: "order", active: true },
];

/** Drink prices come off the counter menu, so the coffee line is untracked. */
function drink(
  id: string,
  name: string,
  sku: string,
  priceC: number,
  extra: Partial<Product> = {}
): Product {
  return {
    id,
    categoryId: "cat-coffee",
    name,
    sku,
    barcode: null,
    priceC,
    soldBy: "unit",
    lowStockThreshold: null,
    trackStock: false,
    active: true,
    variants: [],
    modifierGroupIds: [],
    ...extra,
  };
}

function tracked(
  id: string,
  categoryId: string,
  name: string,
  sku: string,
  priceC: number,
  lowStockThreshold: number,
  extra: Partial<Product> = {}
): Product {
  return {
    id,
    categoryId,
    name,
    sku,
    barcode: null,
    priceC,
    soldBy: "unit",
    lowStockThreshold,
    trackStock: true,
    active: true,
    variants: [],
    modifierGroupIds: [],
    ...extra,
  };
}

const PRODUCTS: Product[] = [
  drink("prod-espresso", "Espresso", "CF-101", pesos(85)),
  drink("prod-latte", "Iced Latte", "CF-102", pesos(120), {
    variants: [
      { id: "var-latte-s", name: "Small", sku: null, barcode: null, priceC: pesos(120) },
      { id: "var-latte-m", name: "Medium", sku: null, barcode: null, priceC: pesos(130) },
      { id: "var-latte-l", name: "Large", sku: null, barcode: null, priceC: pesos(145) },
    ],
    modifierGroupIds: ["mg-milk", "mg-addons"],
  }),
  drink("prod-cappuccino", "Cappuccino", "CF-103", pesos(120)),
  drink("prod-spanish", "Spanish Latte", "CF-104", pesos(140)),
  tracked("prod-pandesal", "cat-bakery", "Pan de sal", "BK-101", pesos(12), 10),
  tracked("prod-ensaymada", "cat-bakery", "Ensaymada", "BK-102", pesos(55), 6),
  tracked("prod-cheeseroll", "cat-bakery", "Cheese roll", "BK-103", pesos(40), 4),
  tracked("prod-ubeloaf", "cat-bakery", "Ube loaf", "BK-104", pesos(120), 3),
  tracked("prod-coke", "cat-grocery", "Coke 1.5L", "GR-201", pesos(98), 12, { barcode: "4800888000015" }),
  tracked("prod-rice", "cat-grocery", "Jasmine rice", "GR-202", pesos(95), 5, { soldBy: "weight" }),
  tracked("prod-luckyme", "cat-meals", "Lucky Me pancit", "GR-203", pesos(15), 20, { barcode: "4807770270019" }),
  tracked("prod-kopiko", "cat-grocery", "Kopiko 3-in-1", "GR-204", pesos(9), 24, { barcode: "4800361413480" }),
];

const STOCK: StockLevel[] = [
  { productId: "prod-pandesal", variantId: null, qty: 8 },   // ≤ threshold 10 → LOW
  { productId: "prod-ensaymada", variantId: null, qty: 14 },
  { productId: "prod-cheeseroll", variantId: null, qty: 9 },
  { productId: "prod-ubeloaf", variantId: null, qty: 0 },    // → OUT OF STOCK
  { productId: "prod-coke", variantId: null, qty: 46 },
  { productId: "prod-rice", variantId: null, qty: 23.45 },
  { productId: "prod-luckyme", variantId: null, qty: 62 },
  { productId: "prod-kopiko", variantId: null, qty: 120 },
];

/** Deep copy so callers can mutate stock/products without poisoning the module constants. */
export function makeSeedCatalog(): Omit<CatalogPayload, "terminal" | "loadedAt"> {
  return structuredClone({
    business: SEED_BUSINESSES[0]!,
    branch: SEED_BRANCHES[0]!,
    categories: CATEGORIES,
    products: PRODUCTS,
    modifierGroups: MODIFIER_GROUPS,
    discounts: DISCOUNTS,
    stock: STOCK,
  });
}
