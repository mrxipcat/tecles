export function resolveSlotLabel(labels, language) {
  return labels?.[language] || labels?.ca || undefined;
}
