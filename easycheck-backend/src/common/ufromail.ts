export function buildUfromailEmail(
  fullName: string,
  existingEmails: Iterable<string>,
): string {
  const localPart = buildBaseLocalPart(fullName);
  const nextNumber = nextAvailableEmailNumber(localPart, existingEmails);
  return `${localPart}${nextNumber.toString().padStart(2, '0')}@ufromail.cl`;
}

function buildBaseLocalPart(fullName: string): string {
  const parts = normalizeName(fullName).split(' ').filter(Boolean);
  const firstName = parts[0] ?? 'usuario';
  const lastName = parts.length > 1 ? parts[parts.length - 1] : firstName;
  return `${firstName[0]}.${lastName}`;
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nextAvailableEmailNumber(
  localPart: string,
  existingEmails: Iterable<string>,
): number {
  let max = 0;
  const pattern = new RegExp(`^${escapeRegExp(localPart)}(\\d{2})@ufromail\\.cl$`);

  for (const email of existingEmails) {
    const match = pattern.exec(email);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }

  return max + 1;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
