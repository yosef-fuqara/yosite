import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useLenis } from "lenis/react";
import { useReducedMotion } from "framer-motion";
import { useI18n } from "../../i18n/I18nContext";
import { INERTIAL_SCROLL_TO } from "../../utils/inertialScroll";
import { playMenuSound } from "../../utils/menuSound";
import "../../styles/fullscreen-menu.css";

const ICON_DUR = 0.4;
const ICON_Y = 4;
const LINK_DUR = 0.26;
const LINK_STAGGER = 0.05;
const LINK_AT = 0.44;
const MOBILE_MQ = "(max-width: 767px)";

function isMobileMenu() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches;
}

function navItems(t) {
  return [
    { id: "home", label: t("nav.home"), href: "#" },
    { id: "work", label: t("nav.workShort"), href: "#selected-work" },
    { id: "process", label: t("nav.process"), href: "#services" },
    { id: "contact", label: t("nav.contact"), href: "#cta" },
  ];
}

function lineOriginLeft(slot) {
  const icon = slot?.querySelector(".yo-menu-trigger__icon");
  if (icon) return icon.getBoundingClientRect().left + 3;
  return (slot?.getBoundingClientRect().left ?? 24) + 13;
}

function mobileLineExtent(slot) {
  const start = lineOriginLeft(slot);
  const nav = slot?.closest(".yo-nav");
  const navPad = nav
    ? Number.parseFloat(getComputedStyle(nav).paddingInlineEnd) || 20
    : 20;
  const viewportRight =
    window.visualViewport != null
      ? window.visualViewport.offsetLeft + window.visualViewport.width
      : window.innerWidth;
  const safeRight = Math.max(navPad, 20);
  let maxRight = viewportRight - safeRight;
  const lang = document.querySelector(".yo-nav__end");
  if (lang) {
    const langLeft = lang.getBoundingClientRect().left;
    if (langLeft > start + 64) maxRight = Math.min(maxRight, langLeft - 12);
  }
  return Math.max(0, Math.round(maxRight - start));
}

function lineExtent(slot) {
  if (typeof window === "undefined") return 220;
  if (isMobileMenu()) return mobileLineExtent(slot);

  const logo = document.querySelector(".yo-nav__logo");
  const slotLeft = slot?.getBoundingClientRect().left ?? 24;
  const start = slotLeft + 8;
  let maxRight = window.innerWidth * 0.46;
  if (logo) {
    const logoLeft = logo.getBoundingClientRect().left;
    if (logoLeft > start) maxRight = Math.min(maxRight, logoLeft - 20);
  }
  return Math.round(gsap.utils.clamp(132, 268, maxRight - start));
}

function focusablesIn(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll("a[href]")).filter(
    (el) => !el.hasAttribute("disabled"),
  );
}

export default function FullscreenMenu() {
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const lenis = useLenis();
  const listId = useId();

  const slotRef = useRef(null);
  const triggerRef = useRef(null);
  const topBarRef = useRef(null);
  const bottomBarRef = useRef(null);
  const listRef = useRef(null);
  const itemsRef = useRef([]);
  const tlRef = useRef(null);
  const openRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [returnKey, setReturnKey] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 768px)").matches
      ? "home"
      : "menu",
  );

  const items = navItems(t);

  const applyExtent = useCallback(() => {
    const slot = slotRef.current;
    if (slot) {
      const originLeft = lineOriginLeft(slot);
      const inset = originLeft - slot.getBoundingClientRect().left;
      slot.style.setProperty("--yo-menu-line-origin", `${Math.round(inset)}px`);
      slot.dataset.yoMenuLayout = isMobileMenu() ? "stack" : "row";
    }
    const extent = lineExtent(slot);
    slot?.style.setProperty("--yo-menu-extent", `${extent}px`);
    return extent;
  }, []);

  const setClosedVisual = useCallback(() => {
    const top = topBarRef.current;
    const bottom = bottomBarRef.current;
    const links = itemsRef.current.filter(Boolean);
    if (!top || !bottom) return;

    gsap.set(top, {
      y: -ICON_Y,
      rotation: 0,
      transformOrigin: "50% 50%",
      force3D: false,
    });
    gsap.set(bottom, {
      y: ICON_Y,
      rotation: 0,
      transformOrigin: "50% 50%",
      force3D: false,
    });
    if (links.length) gsap.set(links, { opacity: 0, y: 8, force3D: false });
  }, []);

  const buildTimeline = useCallback(
    ({ restore } = {}) => {
      tlRef.current?.kill();
      const top = topBarRef.current;
      const bottom = bottomBarRef.current;
      const links = itemsRef.current.filter(Boolean);
      if (!top || !bottom) return;

      applyExtent();
      const instant = Boolean(reducedMotion);

      setClosedVisual();

      const tl = gsap.timeline({
        paused: true,
        defaults: { overwrite: "auto" },
        onComplete: () => {
          openRef.current = true;
          setOpen(true);
        },
        onReverseComplete: () => {
          openRef.current = false;
          setOpen(false);
          setClosedVisual();
        },
      });

      const iconTween = {
        duration: instant ? 0 : ICON_DUR,
        ease: "power3.inOut",
        transformOrigin: "50% 50%",
        force3D: false,
      };
      tl.to(top, { y: 0, rotation: 45, ...iconTween }, 0);
      tl.to(bottom, { y: 0, rotation: -45, ...iconTween }, 0);

      if (links.length) {
        tl.set(listRef.current, { pointerEvents: "none" }, 0);
        tl.to(
          links,
          {
            opacity: 1,
            y: 0,
            duration: instant ? 0 : LINK_DUR,
            stagger: instant ? 0 : LINK_STAGGER,
            ease: "power3.out",
            force3D: false,
          },
          instant ? 0 : LINK_AT,
        );
        tl.set(listRef.current, { pointerEvents: "auto" }, instant ? 0 : LINK_AT);
      }

      tlRef.current = tl;
      if (restore) tl.progress(1);
    },
    [applyExtent, reducedMotion, setClosedVisual],
  );

  const closeMenu = useCallback(({ restoreFocus = true } = {}) => {
    const tl = tlRef.current;
    if (!tl || tl.progress() === 0) return;
    openRef.current = false;
    setOpen(false);
    tl.reverse();
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const openMenu = useCallback(() => {
    const tl = tlRef.current;
    if (tl && (tl.progress() > 0 || tl.isActive()) && !tl.reversed()) return;
    applyExtent();
    buildTimeline();
    openRef.current = true;
    setOpen(true);
    tlRef.current?.play(0);
  }, [applyExtent, buildTimeline]);

  const toggleMenu = useCallback(() => {
    const tl = tlRef.current;
    if (tl?.isActive()) {
      if (!tl.reversed()) {
        playMenuSound("close");
        openRef.current = false;
        setOpen(false);
        tl.reverse();
      } else {
        playMenuSound("open");
        openRef.current = true;
        setOpen(true);
        tl.play();
      }
      return;
    }

    if (openRef.current || (tl && tl.progress() > 0)) {
      playMenuSound("close");
      closeMenu();
      return;
    }

    playMenuSound("open");
    openMenu();
  }, [closeMenu, openMenu]);

  useLayoutEffect(() => {
    applyExtent();
    setClosedVisual();
    buildTimeline();
    return () => {
      tlRef.current?.kill();
      tlRef.current = null;
    };
  }, [applyExtent, buildTimeline, setClosedVisual, items.length]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const sync = () => setReturnKey(desktop.matches ? "home" : "menu");
    sync();
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const onResize = () => {
      applyExtent();
      buildTimeline({ restore: openRef.current });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [applyExtent, buildTimeline]);

  useEffect(() => {
    if (!open) return undefined;

    const logo = document.querySelector(".yo-sticky-chrome a[href='#']");
    const onLogo = () => {
      playMenuSound("close");
      closeMenu({ restoreFocus: false });
    };
    logo?.addEventListener("click", onLogo);

    const onPointer = (event) => {
      const slot = slotRef.current;
      if (slot && !slot.contains(event.target)) {
        playMenuSound("close");
        closeMenu({ restoreFocus: false });
      }
    };

    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        playMenuSound("close");
        closeMenu();
        return;
      }

      if (event.key !== "Tab") return;
      const nodes = [triggerRef.current, ...focusablesIn(listRef.current)].filter(
        Boolean,
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      logo?.removeEventListener("click", onLogo);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [closeMenu, open]);

  const onNavigate = (event, href) => {
    event.preventDefault();
    playMenuSound("close");
    closeMenu({ restoreFocus: false });
    const delay = reducedMotion ? 0 : 420;
    window.setTimeout(() => {
      if (!href || href === "#" || href === "#hero" || href === "#top") {
        lenis?.scrollTo(0, INERTIAL_SCROLL_TO);
        return;
      }
      const target = document.getElementById(href.slice(1));
      if (target) lenis?.scrollTo(target, INERTIAL_SCROLL_TO);
    }, delay);
  };

  return (
    <div ref={slotRef} data-yo-nav-links className="yo-menu-slot">
      <button
        ref={triggerRef}
        type="button"
        className="yo-menu-trigger"
        data-open={open ? "true" : "false"}
        aria-expanded={open}
        aria-controls={listId}
        aria-label={open ? t("nav.closeAria") : t("nav.openAria")}
        data-yo-dot-return={returnKey}
        data-yo-menu-trigger=""
        onClick={toggleMenu}
      >
        <span className="yo-menu-trigger__icon" aria-hidden="true">
          <span
            ref={topBarRef}
            className="yo-menu-trigger__bar yo-menu-trigger__bar--top"
            data-yo-burger-line=""
          />
          <span
            ref={bottomBarRef}
            className="yo-menu-trigger__bar yo-menu-trigger__bar--bottom"
            data-yo-burger-line=""
          />
        </span>
      </button>

      <ul
        ref={listRef}
        id={listId}
        className="yo-fsmenu__list"
        data-yo-fsmenu=""
        aria-hidden={open ? "false" : "true"}
      >
        {items.map((item, index) => (
          <li key={item.id} className="yo-fsmenu__item">
            <a
              ref={(node) => {
                itemsRef.current[index] = node;
              }}
              href={item.href}
              className="yo-fsmenu__link"
              tabIndex={open ? 0 : -1}
              onClick={(event) => onNavigate(event, item.href)}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
