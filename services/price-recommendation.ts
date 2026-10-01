export interface PriceRecommendationInput {
  produce: string;
  location: string;
  quantityKg: number;
  askingPricePerKg: number;
  referenceMarketPrice: number;
  demandQuantityKg: number;
}

export interface PriceRecommendation {
  recommendedPrice: number;
  minimumPrice: number;
  maximumPrice: number;
  explanation: string;
  confidence: "Demo estimate";
}

export async function recommendPrice(input: PriceRecommendationInput): Promise<PriceRecommendation> {
  const { askingPricePerKg, referenceMarketPrice, demandQuantityKg, quantityKg } = input;
  const demandRatio = demandQuantityKg / Math.max(quantityKg, 1);
  const demandAdjustment = demandRatio >= 0.5 ? 2 : demandRatio >= 0.2 ? 1 : 0;
  const recommendedPrice = Math.round(Math.min(referenceMarketPrice - 1, askingPricePerKg + demandAdjustment));
  const minimumPrice = Math.max(1, Math.round(askingPricePerKg * 0.92));
  const maximumPrice = Math.max(recommendedPrice + 2, Math.round(referenceMarketPrice * 1.04));
  const explanation = demandRatio >= 0.5
    ? `Nearby buyer demand for ${input.produce.toLowerCase()} is strong, and your asking price is below the ${input.location} market reference.`
    : askingPricePerKg < referenceMarketPrice
      ? `Your asking price is below the ${input.location} reference; a modest adjustment could improve your return.`
      : `Demand is steady around ${input.location}; this range balances your asking price with the local reference.`;

  return { recommendedPrice, minimumPrice, maximumPrice, explanation, confidence: "Demo estimate" };
}