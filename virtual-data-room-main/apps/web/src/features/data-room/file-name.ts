export interface SplitFileName {
  base: string;
  ext: string;
}

// Extension stays fixed on rename: split off everything from the last dot
// so the form only ever edits the base name. Leading dots (".pdf") and
// trailing dots have no extension to protect.
export function splitFileName(name: string): SplitFileName {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === name.length - 1) {
    return { base: name, ext: "" };
  }
  return { base: name.slice(0, dotIndex), ext: name.slice(dotIndex) };
}
