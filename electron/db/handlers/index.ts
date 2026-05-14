import { registerAreaHandlers } from './areas';
import { registerAssetHandlers } from './assets';
import { registerAuthHandlers } from './auth';
import { registerMovimientoHandlers } from './movimientos';
import { registerResguardoHandlers } from './resguardos';
import { registerUserHandlers } from './users';

export function registerIpcHandlers(): void {
  registerAuthHandlers();
  registerAreaHandlers();
  registerAssetHandlers();
  registerUserHandlers();
  registerMovimientoHandlers();
  registerResguardoHandlers();
}
