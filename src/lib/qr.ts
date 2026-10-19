import qrcode from "qrcode-generator";

export type Ecc = "L" | "M" | "Q" | "H";

type QrFactory = {
  (typeNumber: number, errorCorrectionLevel: string): {
    addData(data: string, mode?: string): void;
    make(): void;
    getModuleCount(): number;
    isDark(row: number, col: number): boolean;
  };
  stringToBytesFuncs: Record<string, (s: string) => number[]>;
  stringToBytes: (s: string) => number[];
};

const lib = qrcode as unknown as QrFactory;

/**
 * qrcode-generator по умолчанию кодирует байты как Latin-1.
 * Переключаем на UTF-8, иначе кириллица в тексте и Wi-Fi ломается.
 */
if (lib.stringToBytesFuncs && lib.stringToBytesFuncs["UTF-8"]) {
  lib.stringToBytes = lib.stringToBytesFuncs["UTF-8"];
}

export type EncodeResult =
  | { ok: true; matrix: boolean[][]; version: number }
  | { ok: false; error: string };

export function encodeMatrix(text: string, ecc: Ecc): EncodeResult {
  if (!text) return { ok: false, error: "Пустое содержимое" };

  for (let typeNumber = 0; typeNumber <= 40; typeNumber++) {
    try {
      const qr = lib(typeNumber, ecc);
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount();
      const matrix: boolean[][] = [];
      for (let r = 0; r < n; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < n; c++) row.push(qr.isDark(r, c));
        matrix.push(row);
      }
      return { ok: true, matrix, version: (n - 17) / 4 };
    } catch (e) {
      // при typeNumber === 0 библиотека сама подбирает версию;
      // исключение означает, что данные не влезают даже в 40-ю версию
      if (typeNumber === 0) continue;
      return { ok: false, error: "Не удалось закодировать данные" };
    }
  }
  return { ok: false, error: "Слишком много данных для QR-кода — сократите текст" };
}

/** Приблизительная оценка: сколько модулей займёт код при данной коррекции. */
export function estimateModules(matrix: boolean[][]): number {
  return matrix.length;
}
