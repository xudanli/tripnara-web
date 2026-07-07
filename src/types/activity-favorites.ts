export interface ActivityFavoriteItem {
  id?: string;
  itineraryItemId?: string | null;
  placeId?: number | null;
  favoritedAt?: string;
}

export interface ActivityFavoritesResponse {
  tripId: string;
  userId?: string;
  items?: ActivityFavoriteItem[];
  itineraryItemIds: string[];
  placeIds: number[];
}

export interface ToggleActivityFavoriteRequest {
  /** ACTIVITY 行程项（与 placeId 二选一） */
  itineraryItemId?: string;
  /** POI */
  placeId?: number;
  /** true 收藏，false 取消 */
  favorited: boolean;
}
