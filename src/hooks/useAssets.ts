import { useCallback, useEffect, useState } from 'react';
import type { Asset, AssetFilters } from '../types';
import { isIpcError } from '../types';

export function useAssets(filters?: AssetFilters) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await window.camaf.assets.list(filters);
    if (isIpcError(response)) {
      setError(response.error);
    } else {
      setAssets(response);
      setError(null);
    }
    setLoading(false);
  }, [filters?.areaId, filters?.search, filters?.status, filters?.tipo]);

  useEffect(() => {
    void load();
  }, [load]);

  return { assets, loading, error, reload: load };
}
