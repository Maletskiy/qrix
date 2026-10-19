/**
 * Маска телефона.
 *
 * Правила:
 *  • принимаются только цифры и ведущий «+»;
 *  • российский номер приводится к виду +7 999 888 77 66 —
 *    с ведущей 8, с 7 или без кода страны;
 *  • если код страны не российский, он не переписывается: +1 и +375 остаются собой,
 *    а остаток группируется по три цифры;
 *  • явно введённый «+» уважается — поле больше не подставляет семёрку.
 */

/** Коды стран, отсортированы от длинных к коротким, чтобы совпадение было точным. */
const COUNTRY_CODES = [
  "998", "996", "995", "994", "993", "992", "977", "976", "975", "974", "973", "972", "971",
  "421", "420", "389", "387", "386", "385", "383", "382", "381", "380", "378", "377", "376",
  "375", "374", "373", "372", "371", "370", "359", "358", "357", "356", "355", "354", "353",
  "352", "351", "263", "260", "256", "255", "254", "251", "234", "222", "221", "220", "218",
  "216", "213", "212", "98", "95", "94", "93", "92", "91", "90", "86", "85", "84", "82", "81",
  "66", "65", "64", "63", "62", "61", "60", "58", "57", "56", "55", "54", "53", "52", "51",
  "49", "48", "47", "46", "45", "44", "43", "42", "41", "40", "39", "36", "34", "33", "32",
  "31", "30", "27", "20", "1", "7",
];

function findCountryCode(digits: string): string | undefined {
  return COUNTRY_CODES.find((code) => digits.startsWith(code));
}

/** Группировка по три цифры; одиночный хвост приклеиваем к предыдущей группе. */
function groupTriplets(value: string): string {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += 3) chunks.push(value.slice(i, i + 3));
  if (chunks.length > 1 && chunks[chunks.length - 1].length === 1) {
    chunks[chunks.length - 2] += chunks.pop() as string;
  }
  return chunks.join(" ");
}

function formatRu(digits: string): string {
  const d = digits.slice(0, 11);
  const rest = d.slice(1);
  const groups = [rest.slice(0, 3), rest.slice(3, 6), rest.slice(6, 8), rest.slice(8, 10)].filter(
    Boolean
  );
  return "+7" + (groups.length ? " " + groups.join(" ") : "");
}

export function formatPhone(input: string): string {
  const raw = input.trim();
  const explicitPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");

  if (!digits) return explicitPlus ? "+" : "";

  let d = digits;

  if (!explicitPlus) {
    // 8 в начале — это тот же российский номер
    if (d.startsWith("8")) d = "7" + d.slice(1);
    // короткий номер без кода страны тоже считаем российским
    if (!d.startsWith("7") && d.length <= 10) d = "7" + d;
  }

  if (d.startsWith("7")) return formatRu(d);

  const code = findCountryCode(d);
  if (code) {
    const rest = d.slice(code.length, 15);
    return "+" + code + (rest ? " " + groupTriplets(rest) : "");
  }

  return "+" + groupTriplets(d.slice(0, 15));
}

/** Для QR-кода оставляем только значащие символы номера. */
export function phoneToPayload(input: string): string {
  return input.replace(/[^\d+]/g, "");
}
