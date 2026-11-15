// Icon paths from Lucide. See assets/LUCIDE-LICENSE.txt.
import type { ReactNode } from 'react';
import Svg, { Circle, Line, Path, Rect, type SvgProps } from 'react-native-svg';

type IconProps = SvgProps & { size?: number; color?: string };

function icon(shapes: ReactNode) {
  return function Icon({ size = 24, color = "currentColor", strokeWidth = 2, ...props }: IconProps) {
    return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" accessible={false} {...props}>{shapes}</Svg>;
  };
}

export const ArrowRight = icon(<>
  <Path d="M5 12h14" />
  <Path d="m12 5 7 7-7 7" />
</>);

export const Bell = icon(<>
  <Path d="M10.268 21a2 2 0 0 0 3.464 0" />
  <Path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
</>);

export const CalendarDays = icon(<>
  <Path d="M8 2v3" />
  <Path d="M16 2v3" />
  <Rect x="3" y="3" width="18" height="18" rx="2" />
  <Path d="M3 9h18" />
  <Path d="M8 13h.01" />
  <Path d="M12 13h.01" />
  <Path d="M16 13h.01" />
  <Path d="M8 17h.01" />
  <Path d="M12 17h.01" />
  <Path d="M16 17h.01" />
</>);

export const Camera = icon(<>
  <Path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" />
  <Circle cx="12" cy="13" r="3" />
</>);

export const Check = icon(<>
  <Path d="M20 6 9 17l-5-5" />
</>);

export const ChevronDown = icon(<>
  <Path d="m6 9 6 6 6-6" />
</>);

export const ChevronRight = icon(<>
  <Path d="m9 18 6-6-6-6" />
</>);

export const CircleAlert = icon(<>
  <Circle cx="12" cy="12" r="10" />
  <Line x1="12" x2="12" y1="8" y2="12" />
  <Line x1="12" x2="12.01" y1="16" y2="16" />
</>);

export const CircleHelp = icon(<>
  <Circle cx="12" cy="12" r="10" />
  <Path d="M9 9.5a3 2.5 0 016 0c0 2-2 2-3 3.5" />
  <Path d="M12 17h.01" />
</>);

export const ClipboardList = icon(<>
  <Rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
  <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  <Path d="M12 11h4" />
  <Path d="M12 16h4" />
  <Path d="M8 11h.01" />
  <Path d="M8 16h.01" />
</>);

export const Clock3 = icon(<>
  <Circle cx="12" cy="12" r="10" />
  <Path d="M12 6v6h4" />
</>);

export const FileText = icon(<>
  <Path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
  <Path d="M14 2v5a1 1 0 0 0 1 1h5" />
  <Path d="M10 9H8" />
  <Path d="M16 13H8" />
  <Path d="M16 17H8" />
</>);

export const Footprints = icon(<>
  <Path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" />
  <Path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" />
  <Path d="M16 17h4" />
  <Path d="M4 13h4" />
</>);

export const HeartPulse = icon(<>
  <Path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
  <Path d="M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
</>);

export const Home = icon(<>
  <Path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
  <Path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
</>);

export const KeyRound = icon(<>
  <Path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z" />
  <Circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
</>);

export const Link2 = icon(<>
  <Path d="M9 17H7A5 5 0 0 1 7 7h2" />
  <Path d="M15 7h2a5 5 0 1 1 0 10h-2" />
  <Line x1="8" x2="16" y1="12" y2="12" />
</>);

export const MapPin = icon(<>
  <Path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
  <Circle cx="12" cy="10" r="3" />
</>);

export const NotebookPen = icon(<>
  <Path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4" />
  <Path d="M2 6h4" />
  <Path d="M2 10h4" />
  <Path d="M2 14h4" />
  <Path d="M2 18h4" />
  <Path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
</>);

export const PawPrint = icon(<>
  <Circle cx="11" cy="4" r="2" />
  <Circle cx="18" cy="8" r="2" />
  <Circle cx="20" cy="16" r="2" />
  <Path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
</>);

export const Pencil = icon(<>
  <Path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
  <Path d="m15 5 4 4" />
</>);

export const Phone = icon(<>
  <Path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
</>);

export const Pill = icon(<>
  <Path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
  <Path d="m8.5 8.5 7 7" />
</>);

export const Plus = icon(<>
  <Path d="M5 12h14" />
  <Path d="M12 5v14" />
</>);

export const Printer = icon(<>
  <Path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
  <Path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
  <Rect x="6" y="14" width="12" height="8" rx="1" />
</>);

export const Radio = icon(<>
  <Path d="M16.247 7.761a6 6 0 0 1 0 8.478" />
  <Path d="M19.075 4.933a10 10 0 0 1 0 14.134" />
  <Path d="M4.925 19.067a10 10 0 0 1 0-14.134" />
  <Path d="M7.753 16.239a6 6 0 0 1 0-8.478" />
  <Circle cx="12" cy="12" r="2" />
</>);

export const Scale = icon(<>
  <Path d="M12 3v18" />
  <Path d="m19 8 3 8a5 5 0 0 1-6 0zV7" />
  <Path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1" />
  <Path d="m5 8 3 8a5 5 0 0 1-6 0zV7" />
  <Path d="M7 21h10" />
</>);

export const Settings2 = icon(<>
  <Path d="M14 17H5" />
  <Path d="M19 7h-9" />
  <Circle cx="17" cy="17" r="3" />
  <Circle cx="7" cy="7" r="3" />
</>);

export const Share2 = icon(<>
  <Circle cx="18" cy="5" r="3" />
  <Circle cx="6" cy="12" r="3" />
  <Circle cx="18" cy="19" r="3" />
  <Line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
  <Line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
</>);

export const ShieldCheck = icon(<>
  <Path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  <Path d="m9 12 2 2 4-4" />
</>);

export const ShieldPlus = icon(<>
  <Path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  <Path d="M9 12h6" />
  <Path d="M12 9v6" />
</>);

export const Syringe = icon(<>
  <Path d="m18 2 4 4" />
  <Path d="m17 7 3-3" />
  <Path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
  <Path d="m9 11 4 4" />
  <Path d="m5 19-3 3" />
  <Path d="m14 4 6 6" />
</>);

export const Trash2 = icon(<>
  <Path d="M10 11v6" />
  <Path d="M14 11v6" />
  <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  <Path d="M3 6h18" />
  <Path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
</>);

export const Users = icon(<>
  <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
  <Path d="M16 3.128a4 4 0 0 1 0 7.744" />
  <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
  <Circle cx="9" cy="7" r="4" />
</>);

export const UsersRound = icon(<>
  <Path d="M18 21a8 8 0 0 0-16 0" />
  <Circle cx="10" cy="8" r="5" />
  <Path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />
</>);

export const Utensils = icon(<>
  <Path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
  <Path d="M7 2v20" />
  <Path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
</>);

export const X = icon(<>
  <Path d="M18 6 6 18" />
  <Path d="m6 6 12 12" />
</>);
