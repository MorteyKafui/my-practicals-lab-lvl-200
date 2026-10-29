"use client";

import {
  BookOpenTextIcon,
  FlaskIcon,
  GearSixIcon,
  HouseIcon,
  WrenchIcon,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { ProductMark } from "./product-mark";
import { SmallScreenAdvice } from "./small-screen-advice";

interface NavItem {
  href: string;
  key: "home" | "experiments" | "apparatus" | "reference" | "settings";
  icon: Icon;
}

const NAV: NavItem[] = [
  { href: "/", key: "home", icon: HouseIcon },
  { href: "/experiments", key: "experiments", icon: FlaskIcon },
  { href: "/apparatus", key: "apparatus", icon: WrenchIcon },
  { href: "/reference", key: "reference", icon: BookOpenTextIcon },
];
const SETTINGS: NavItem = { href: "/settings", key: "settings", icon: GearSixIcon };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The framed-sheet shell: one tinted L (icon rail + 48px top bar, no rule between them)
 * around a white working sheet inset 8px from the window's right and bottom edges.
 * On phones the frame folds away: the sheet becomes the screen and the rail becomes a bottom bar.
 */
export function AppFrame({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <div className="flex min-h-dvh flex-col bg-frame">
      <header className="no-print sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 bg-frame px-4 md:pl-0">
        <Link
          href="/"
          className="flex h-12 items-center gap-2.5 md:w-14 md:justify-center"
          aria-label={t("app.name")}
        >
          <ProductMark className="size-7" />
          <span className="font-heading text-[17px] font-bold tracking-tight md:hidden">
            {t("app.name")}
          </span>
        </Link>
        <div className="hidden items-baseline gap-3 md:flex">
          <span className="font-heading text-[17px] font-bold tracking-tight">{t("app.name")}</span>
          <span className="text-ds-body-xs text-text-muted">{t("app.tagline")}</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-ds-body-xs text-text-muted">
          <span className="size-1.5 bg-data" aria-hidden />
          <span>Saved on this device</span>
        </div>
      </header>

      <SmallScreenAdvice />

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Main"
          className="no-print sticky top-12 hidden h-[calc(100dvh-3rem)] w-14 shrink-0 flex-col items-center gap-1 pt-2 pb-3 md:flex"
        >
          {NAV.map((item) => (
            <RailLink key={item.key} item={item} active={isActive(pathname, item.href)} label={t(`nav.${item.key}`)} />
          ))}
          <div className="mt-auto">
            <RailLink item={SETTINGS} active={isActive(pathname, SETTINGS.href)} label={t("nav.settings")} />
          </div>
        </nav>

        <main
          id="main"
          className="mb-16 flex min-w-0 flex-1 flex-col border-sheet-edge bg-sheet md:mr-2 md:mb-2 md:border"
        >
          <div className="flex-1">{children}</div>
          {footer}
        </main>
      </div>

      <nav
        aria-label="Main"
        className="no-print fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-sheet-edge bg-frame md:hidden"
      >
        {[...NAV, SETTINGS].map((item) => {
          const active = isActive(pathname, item.href);
          const ItemIcon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px]",
                active ? "text-text-primary" : "text-text-muted",
              )}
            >
              <ItemIcon className="size-5" weight={active ? "fill" : "regular"} />
              {t(`nav.${item.key}`)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function RailLink({ item, active, label }: { item: NavItem; active: boolean; label: string }) {
  const ItemIcon = item.icon;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={item.href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex size-10 items-center justify-center text-text-muted transition-colors hover:text-text-primary",
              active && "bg-sidebar-accent text-text-primary",
            )}
          />
        }
      >
        <ItemIcon className="size-[18px]" weight={active ? "fill" : "regular"} />
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
