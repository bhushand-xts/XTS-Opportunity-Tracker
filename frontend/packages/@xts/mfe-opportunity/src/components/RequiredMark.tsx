/** The red asterisk after a field's label, for every mandatory field across
 * this MFE's forms — one place so the mark and its spacing stay consistent. */
export function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}
