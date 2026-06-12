/** tripnara.poi_pitfall_cards@v1 — NARRATE RAG / enrichClientUiDisplay 启发式 */
export type PoiPitfallSeverity = 'info' | 'warn' | 'block' | (string & {});

export type PoiPitfallSource = 'rag' | 'heuristic' | 'narrate' | (string & {});

export interface PoiPitfallCard {
  card_id?: string;
  poi_id?: string;
  itinerary_item_id?: string;
  poi_name_zh?: string;
  day_date?: string;
  day_index?: number;
  headline_zh?: string;
  summary_zh?: string;
  pitfall_tips_zh?: string[];
  severity?: PoiPitfallSeverity;
  source?: PoiPitfallSource;
  [key: string]: unknown;
}

export interface PoiPitfallCardsPayload {
  schema?: 'tripnara.poi_pitfall_cards@v1';
  cards: PoiPitfallCard[];
  headline_zh?: string;
  [key: string]: unknown;
}
