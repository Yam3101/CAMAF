import { ipcMain, type IpcMainInvokeEvent } from 'electron';

export type Handler<TInput, TOutput> = (
  event: IpcMainInvokeEvent,
  input: TInput
) => TOutput | Promise<TOutput>;

export function safeHandle<TInput, TOutput>(channel: string, handler: Handler<TInput, TOutput>): void {
  ipcMain.handle(channel, async (event, input: TInput) => {
    try {
      return await handler(event, input);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado';
      return { error: message };
    }
  });
}

export function blankToNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
