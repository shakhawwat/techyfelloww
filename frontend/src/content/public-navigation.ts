// Only implemented public routes. Store resolves to the robotics ecommerce store at /store.
export type PublicNavLink = { label: string; href: string };
export type PublicNavGroup = PublicNavLink & { id: string; children: readonly PublicNavLink[]; activeRoots: readonly string[] };
export const publicNavGroups: readonly PublicNavGroup[] = [
  { id: 'solutions', label: 'Solutions', href: '/solutions', activeRoots: ['/solutions', '/institutional'], children: [
    { label: 'Robotics', href: '/solutions/robotics' }, { label: 'IoT & Embedded', href: '/solutions/iot-embedded' }, { label: 'AI & Computer Vision', href: '/solutions/ai-vision' }, { label: 'Automation', href: '/solutions/automation' }, { label: 'Prototyping', href: '/solutions/prototyping' }, { label: 'Institutional', href: '/institutional' },
  ] },
  { id: 'research', label: 'Research', href: '/research', activeRoots: ['/research', '/publications'], children: [{ label: 'Research Projects', href: '/research' }, { label: 'Publications', href: '/publications' }] },
  { id: 'academy', label: 'Academy', href: '/academy', activeRoots: ['/academy'], children: [{ label: 'Courses', href: '/academy/courses' }] },
  { id: 'consulting', label: 'Consulting', href: '/consulting', activeRoots: ['/consulting'], children: [{ label: 'Capstone', href: '/consulting/capstone' }, { label: 'Research Consulting', href: '/consulting/research' }, { label: 'Startup Consulting', href: '/consulting/startup' }] },
  { id: 'company', label: 'Company', href: '/about', activeRoots: ['/about', '/team', '/projects', '/contact'], children: [{ label: 'About', href: '/about' }, { label: 'Team', href: '/team' }, { label: 'Projects', href: '/projects' }, { label: 'Contact', href: '/contact' }] },
];
export function navPathMatches(pathname: string, href: string): boolean { return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'); }
export const publicNavStore: PublicNavLink = { label: 'Store', href: '/store' };

