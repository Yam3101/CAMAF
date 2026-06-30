import { contextBridge, ipcRenderer } from 'electron';
import type {
  Asset,
  AssetFilters,
  AssetInput,
  Area,
  Movimiento,
  MovimientoFilters,
  MovimientoInput,
  Unidad
} from '../src/types';

const api = {
  assets: {
    list: (filters?: AssetFilters): Promise<Asset[] | { error: string }> =>
      ipcRenderer.invoke('assets:list', { filters }),
    get: (id: string): Promise<Asset | null | { error: string }> => ipcRenderer.invoke('assets:get', { id }),
    create: (input: AssetInput): Promise<Asset | { error: string }> => ipcRenderer.invoke('assets:create', input),
    update: (id: string, data: Partial<AssetInput>): Promise<Asset | { error: string }> =>
      ipcRenderer.invoke('assets:update', { id, data }),
    delete: (id: string): Promise<{ success: boolean } | { error: string }> =>
      ipcRenderer.invoke('assets:delete', { id }),
    assignedNames: (): Promise<string[] | { error: string }> => ipcRenderer.invoke('assets:assignedNames'),
    resguardo: (id: string): Promise<{ pdfPath: string } | { error: string }> =>
      ipcRenderer.invoke('assets:resguardo', { id })
  },
  movimientos: {
    list: (filters?: MovimientoFilters): Promise<Movimiento[] | { error: string }> =>
      ipcRenderer.invoke('movimientos:list', filters),
    create: (input: MovimientoInput): Promise<Movimiento | { error: string }> =>
      ipcRenderer.invoke('movimientos:create', input)
  },
  areas: {
    list: (unidad?: Unidad): Promise<Area[] | { error: string }> => ipcRenderer.invoke('areas:list', { unidad }),
    ensure: (nombre: string, unidad?: Unidad): Promise<Area | { error: string }> =>
      ipcRenderer.invoke('areas:ensure', { nombre, unidad }),
    getAreasUnicas: (unidad?: Unidad): Promise<string[] | { error: string }> =>
      ipcRenderer.invoke('db:getAreasUnicas', { unidad })
  }
};

contextBridge.exposeInMainWorld('camaf', api);

export type CamafApi = typeof api;
