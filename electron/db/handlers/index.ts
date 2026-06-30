import { registerAreaHandlers } from './areas-beta';
import { registerAssetHandlers } from './assets-beta';
import { registerMovimientoHandlers } from './movimientos-beta';
import { registerResguardoHandlers } from './resguardos';

export function registerIpcHandlers(): void {
  registerAreaHandlers();
  registerAssetHandlers();
  registerMovimientoHandlers();
  registerResguardoHandlers();
}
