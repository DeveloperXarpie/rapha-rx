export interface AssetDefinition {
  assetId: string;
  token?: string;
  imageSrc?: string;
}

const ASSET_REGISTRY = new Map<string, AssetDefinition>();

export function registerAsset(def: AssetDefinition): string {
  const existing = ASSET_REGISTRY.get(def.assetId);
  if (!existing) {
    ASSET_REGISTRY.set(def.assetId, def);
    return def.assetId;
  }

  if ((def.token && existing.token && def.token !== existing.token) ||
      (def.imageSrc && existing.imageSrc && def.imageSrc !== existing.imageSrc)) {
    // Keep first definition as source of truth and warn on collisions.
    console.warn(`Asset collision for "${def.assetId}". Keeping first definition.`, {
      existing,
      incoming: def,
    });
  }

  return def.assetId;
}

export function resolveAsset(assetId: string): AssetDefinition | undefined {
  return ASSET_REGISTRY.get(assetId);
}

export const GAME_PANEL_DEFAULTS: Record<string, string> = {
  'focus-filter': 'bg-card-bg',
  'shopping-list-recall': 'bg-card-bg',
};

export function resolvePanelClass(gameId: string, panelColorClass?: string): string {
  return panelColorClass ?? GAME_PANEL_DEFAULTS[gameId] ?? 'bg-card-bg';
}

