import { contextBridge, ipcRenderer } from 'electron';
import type {
  Asset,
  AssetFilters,
  AssetInput,
  Area,
  LoginInput,
  Movimiento,
  MovimientoFilters,
  MovimientoInput,
  User,
  UserInput
} from '../src/types';

const api = {
  auth: {
    login: (input: LoginInput): Promise<{ user: User; token: string } | { error: string }> =>
      ipcRenderer.invoke('auth:login', input),
    logout: (): Promise<{ success: boolean } | { error: string }> => ipcRenderer.invoke('auth:logout'),
    me: (): Promise<{ user: User } | null | { error: string }> => ipcRenderer.invoke('auth:me')
  },
  assets: {
    list: (filters?: AssetFilters): Promise<Asset[] | { error: string }> =>
      ipcRenderer.invoke('assets:list', { filters }),
    get: (id: string): Promise<Asset | null | { error: string }> => ipcRenderer.invoke('assets:get', { id }),
    create: (input: AssetInput): Promise<Asset | { error: string }> => ipcRenderer.invoke('assets:create', input),
    update: (id: string, data: Partial<AssetInput>): Promise<Asset | { error: string }> =>
      ipcRenderer.invoke('assets:update', { id, data }),
    delete: (id: string): Promise<{ success: boolean } | { error: string }> =>
      ipcRenderer.invoke('assets:delete', { id }),
    resguardo: (id: string): Promise<{ pdfPath: string } | { error: string }> =>
      ipcRenderer.invoke('assets:resguardo', { id })
  },
  users: {
    list: (): Promise<User[] | { error: string }> => ipcRenderer.invoke('users:list'),
    create: (input: UserInput): Promise<User | { error: string }> => ipcRenderer.invoke('users:create', input),
    ensureBasic: (input: { nombre: string; areaId?: string | null }): Promise<User | { error: string }> =>
      ipcRenderer.invoke('users:ensureBasic', input),
    update: (id: string, data: Partial<UserInput>): Promise<User | { error: string }> =>
      ipcRenderer.invoke('users:update', { id, data }),
    delete: (id: string): Promise<{ success: boolean } | { error: string }> =>
      ipcRenderer.invoke('users:delete', { id })
  },
  movimientos: {
    list: (filters?: MovimientoFilters): Promise<Movimiento[] | { error: string }> =>
      ipcRenderer.invoke('movimientos:list', filters),
    create: (input: MovimientoInput): Promise<Movimiento | { error: string }> =>
      ipcRenderer.invoke('movimientos:create', input)
  },
  areas: {
    list: (): Promise<Area[] | { error: string }> => ipcRenderer.invoke('areas:list'),
    ensure: (nombre: string): Promise<Area | { error: string }> =>
      ipcRenderer.invoke('areas:ensure', { nombre }),
    getAreasUnicas: (): Promise<string[] | { error: string }> => ipcRenderer.invoke('db:getAreasUnicas')
  }
};

contextBridge.exposeInMainWorld('camaf', api);

export type CamafApi = typeof api;
