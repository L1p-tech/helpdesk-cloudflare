function normalize(value: string): string {
  return value
    .toLocaleLowerCase("de")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\[[^\]]+\]/g, " platzhalter ")
    .replace(/[^a-z0-9äöüß]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function trigrams(value: string): Set<string> {
  const normalized = `  ${normalize(value)}  `;
  const result = new Set<string>();

  for (let index = 0; index <= normalized.length - 3; index += 1) {
    result.add(normalized.slice(index, index + 3));
  }

  return result;
}

function diceCoefficient(left: string, right: string): number {
  const leftSet = trigrams(left);
  const rightSet = trigrams(right);
  if (leftSet.size === 0 && rightSet.size === 0) return 1;

  let intersection = 0;
  for (const value of leftSet) {
    if (rightSet.has(value)) intersection += 1;
  }

  return (2 * intersection) / (leftSet.size + rightSet.size);
}

export function duplicateScore(
  title: string,
  body: string,
  candidateTitle: string,
  candidateBody: string,
): number {
  const titleScore = diceCoefficient(title, candidateTitle);
  const bodyScore = diceCoefficient(body, candidateBody);
  return Math.round((titleScore * 0.6 + bodyScore * 0.4) * 1000) / 1000;
}
