export const SUBSCRIPTION_TIERS = {
  starter: {
    name: "Starter",
    price: 49,
    price_id: "price_1TH7TiHKTyEQ7IFjyynov47f",
    product_id: "prod_UFcjEMipGQXh1I",
    features: [
      "Product & inventory management",
      "Public storefront with booking",
      "Event scheduling & calendar",
      "Stripe payment processing",
      "Basic team management",
      "AI assistant",
      "Knowledge base & SOPs",
    ],
  },
  pro: {
    name: "Pro",
    price: 79,
    price_id: "price_1TH7U7HKTyEQ7IFjc6v3Yizb",
    product_id: "prod_UFcjWcbguEPaT6",
    features: [
      "Everything in Starter, plus:",
      "Full CRM with pipeline",
      "Quote builder & contracts",
      "Delivery route planning",
      "Compliance dashboard",
      "Employee certifications",
      "Weather safety monitoring",
      "Advanced analytics",
    ],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

export function getTierByProductId(productId: string | null): SubscriptionTier | null {
  if (!productId) return null;
  for (const [key, tier] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (tier.product_id === productId) return key as SubscriptionTier;
  }
  return null;
}
