import { Home, MapPin, UserRound, WalletCards, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/leads", label: "Leads", icon: MapPin },
  { href: "/wallet", label: "Wallet", icon: WalletCards },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
