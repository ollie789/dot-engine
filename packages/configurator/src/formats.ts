export interface OutputFormat {
  name: string;
  label: string;
  aspect: number;    // width / height
  icon: string;      // emoji or text shorthand
}

export const OUTPUT_FORMATS: OutputFormat[] = [
  { name: 'responsive', label: 'Responsive', aspect: 0, icon: '↔' },
  { name: 'logo-square', label: 'Logo 1:1', aspect: 1, icon: '□' },
  { name: 'logo-wide', label: 'Logo 2:1', aspect: 2, icon: '▭' },
  { name: 'banner', label: 'Banner 4:1', aspect: 4, icon: '━' },
  { name: 'hero', label: 'Hero 16:9', aspect: 16 / 9, icon: '▬' },
  { name: 'social', label: 'Social 1.91:1', aspect: 1.91, icon: '🖼' },
  { name: 'story', label: 'Story 9:16', aspect: 9 / 16, icon: '▯' },
  { name: 'poster', label: 'Poster 2:3', aspect: 2 / 3, icon: '▮' },
];
