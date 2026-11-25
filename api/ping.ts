/** Диагностика: минимальная функция без импортов. */
export default function ping(_req: unknown, res: { end: (body: string) => void }): void {
  res.end("pong");
}
