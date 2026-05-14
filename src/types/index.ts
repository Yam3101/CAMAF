export type Role = 'admin' | 'supervisor' | 'usuario';
export type UserStatus = 'activo' | 'inactivo';
export type AssetType =
  | 'computadora'
  | 'all-in-one'
  | 'laptop'
  | 'monitor'
  | 'impresora'
  | 'tablet'
  | 'ups'
  | 'accesorio'
  | 'otro';
export type AssetStatus = 'activo' | 'asignado' | 'mantenimiento' | 'baja';
export type MovimientoTipo = 'asignacion' | 'reasignacion' | 'baja' | 'mantenimiento' | 'devolucion';

export type Area = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: number;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  email: string;
  nombre: string;
  rol: Role;
  status: UserStatus;
  areaId: string | null;
  areaNombre?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Asset = {
  id: string;
  internalId: string | null;
  inventoryNumber: string | null;
  nombre: string;
  tipo: AssetType;
  marca: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  status: AssetStatus;
  areaId: string | null;
  areaNombre?: string | null;
  responsableId: string | null;
  responsableNombre?: string | null;
  fechaAdquisicion: string | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Movimiento = {
  id: string;
  assetId: string;
  assetNombre?: string | null;
  assetInternalId?: string | null;
  usuarioId: string;
  usuarioNombre?: string | null;
  tipo: MovimientoTipo;
  descripcion: string | null;
  fecha: string;
  createdAt: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AssetInput = {
  internalId?: string | null;
  inventoryNumber?: string | null;
  nombre: string;
  tipo: AssetType;
  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  status?: AssetStatus;
  areaId?: string | null;
  responsableId?: string | null;
  fechaAdquisicion?: string | null;
  notas?: string | null;
};

export type UserInput = {
  email: string;
  password?: string;
  nombre: string;
  rol: Role;
  status?: UserStatus;
  areaId?: string | null;
};

export type MovimientoInput = {
  assetId: string;
  usuarioId: string;
  tipo: MovimientoTipo;
  descripcion?: string | null;
  fecha?: string | null;
};

export type AssetFilters = {
  search?: string;
  tipo?: AssetType | '';
  areaId?: string;
  status?: AssetStatus | '';
};

export type MovimientoFilters = {
  assetId?: string;
  tipo?: MovimientoTipo | '';
  fecha?: string;
};

export type IpcError = {
  error: string;
};

export function isIpcError(value: unknown): value is IpcError {
  return Boolean(value && typeof value === 'object' && 'error' in value);
}
