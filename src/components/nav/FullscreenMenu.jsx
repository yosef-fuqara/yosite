import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useLenis } from "lenis/react";
import { useReducedMotion } from "framer-motion";
import { useI18n } from "../../i18n/I18nContext";
import { INERTIAL_SCROLL_TO } from "../../utils/inertialScroll";
import { contactScreenScrollY, servicesIntroScrollY } from "../../utils/pageGeometry";
import { playMenuSound } from "../../utils/menuSound";
import "../../styles/fullscreen-menu.css";

const STEM_LEN = 22;
const DOT_CLOSED_X = 11.5;
const DOT_CLOSED_Y = 9;
const LINE_DUR = 0.54;
const LINK_DUR = 0.26;
const LINK_STAGGER = 0.05;
const LINK_AT = 0.44;
const LOGO_GAP = 20;
const MIN_ROW_EXTENT = 132;

function measureRowNavWidth(list) {
  if (!list || typeof window === "undefined") return MIN_ROW_EXTENT;

  const saved = {
    position: list.style.position,
    flexDirection: list.style.flexDirection,
    width: list.style.width,
    visibility: list.style.visibility,
    pointerEvents: list.style.pointerEvents,
    top: list.style.top,
    left: list.style.left,
  };

  list.style.position = "absolute";
  list.style.flexDirection = "row";
  list.style.width = "max-content";
  list.style.visibility = "hidden";
  list.style.pointerEvents = "none";
  list.style.top = "0";
  list.style.left = "0";

  const width = list.scrollWidth;

  list.style.position = saved.position;
  list.style.flexDirection = saved.flexDirection;
  list.style.width = saved.width;
  list.style.visibility = saved.visibility;
  list.style.pointerEvents = saved.pointerEvents;
  list.style.top = saved.top;
  list.style.left = saved.left;

  return width;
}

/** Row when all links fit beside the logo; otherwise a left drawer. */
function getMenuLayout(slot, list) {
  if (typeof window === "undefined" || !slot) return "row";

  const required = measureRowNavWidth(list ?? slot.querySelector(".yo-fsmenu__list"));
  const slotLeft = slot.getBoundingClientRect().left;
  const start = slotLeft + 8;
  let maxRight = window.innerWidth * 0.46;

  const logo = document.querySelector(".yo-nav__logo");
  if (logo) {
    const logoLeft = logo.getBoundingClientRect().left;
    if (logoLeft > start) maxRight = Math.min(maxRight, logoLeft - LOGO_GAP);
  }

  const available = maxRight - start;
  if (available >= required && available >= MIN_ROW_EXTENT) return "row";
  return "drawer";
}

function navItems(t) {
  return [
    { id: "home", label: t("nav.home"), href: "#" },
    { id: "work", label: t("nav.workShort"), href: "#selected-work" },
    { id: "about", label: t("nav.about"), href: "#about" },
    { id: "services", label: t("nav.services"), href: "#services-intro" },
    { id: "contact", label: t("nav.contact"), href: "#contact-screen" },
  ];
}

function lineOriginLeft(slot) {
  const stem = slot?.querySelector(".yo-menu-trigger__stem");
  if (stem) return stem.getBoundingClientRect().left;
  const burger = slot?.querySelector(".yo-menu-trigger__burger");
  if (burger) return burger.getBoundingClientRect().left;
  const icon = slot?.querySelector(".yo-menu-trigger__icon");
  if (icon) return icon.getBoundingClientRect().left + 6.5;
  return (slot?.getBoundingClientRect().left ?? 24) + 13;
}

function applyDrawerAnchor(trigger, list) {
  if (!trigger || !list) return;
  const icon =
    trigger.querySelector(".yo-menu-trigger__burger") ||
    trigger.querySelector(".yo-menu-trigger__icon");
  const rect = (icon ?? trigger).getBoundingClientRect();
  list.style.setProperty("--yo-drawer-left", `${Math.round(rect.left)}px`);
  list.style.setProperty("--yo-drawer-top", `${Math.round(trigger.getBoundingClientRect().bottom + 6)}px`);
}

function lineExtent(slot, list) {
  if (typeof window === "undefined") return 220;
  if (getMenuLayout(slot, list) === "drawer") return STEM_LEN;

  const logo = document.querySelector(".yo-nav__logo");
  const slotLeft = slot?.getBoundingClientRect().left ?? 24;
  const start = slotLeft + 8;
  let maxRight = window.innerWidth * 0.46;
  if (logo) {
    const logoLeft = logo.getBoundingClientRect().left;
    if (logoLeft > start) maxRight = Math.min(maxRight, logoLeft - LOGO_GAP);
  }
  return Math.round(gsap.utils.clamp(MIN_ROW_EXTENT, 268, maxRight - start));
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
  const originRef = useRef(null);
  const stemRef = useRef(null);
  const dotRef = useRef(null);
  const backdropRef = useRef(null);
  const listRef = useRef(null);
  const itemsRef = useRef([]);
  const tlRef = useRef(null);
  const openRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState("row");
  const [returnKey, setReturnKey] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 768px)").matches
      ? "home"
      : "menu",
  );

  const items = navItems(t);

  const applyExtent = useCallback(() => {
    const slot = slotRef.current;
    const list = listRef.current;
    if (slot) {
      const originLeft = lineOriginLeft(slot);
      const inset = originLeft - slot.getBoundingClientRect().left;
      slot.style.setProperty("--yo-menu-line-origin", `${Math.round(inset)}px`);
      const layout = getMenuLayout(slot, list);
      slot.dataset.yoMenuLayout = layout;
      setLayoutMode(layout);
      if (layout === "drawer") applyDrawerAnchor(triggerRef.current, list);
    }
    const extent = lineExtent(slot, list);
    slot?.style.setProperty("--yo-menu-extent", `${extent}px`);
    return extent;
  }, []);

  const setClosedVisual = useCallback(() => {
    const list = listRef.current;
    const layout = getMenuLayout(slotRef.current, list);
    const links = itemsRef.current.filter(Boolean);
    const backdrop = backdropRef.current;

    if (layout !== "drawer") {
      const origin = originRef.current;
      const stem = stemRef.current;
      const dot = dotRef.current;
      if (origin && stem && dot) {
        gsap.set(origin, { rotation: 0, transformOrigin: "0px 0px" });
        gsap.set(stem, {
          clearProps: "height",
          scaleY: 1,
          transformOrigin: "50% 100%",
          force3D: false,
        });
        gsap.set(dot, { opacity: 1, x: DOT_CLOSED_X, y: DOT_CLOSED_Y, force3D: false });
      }
    }

    if (backdrop) gsap.set(backdrop, { opacity: 0, pointerEvents: "none" });
    if (list) gsap.set(list, { x: layout === "drawer" ? -36 : 0, force3D: false });
    if (links.length) {
      gsap.set(links, {
        opacity: 0,
        x: layout === "drawer" ? -12 : 0,
        y: layout === "drawer" ? 0 : 8,
        force3D: false,
      });
    }
  }, []);

  const buildTimeline = useCallback(
    ({ restore } = {}) => {
      tlRef.current?.kill();
      const origin = originRef.current;
      const stem = stemRef.current;
      const dot = dotRef.current;
      const links = itemsRef.current.filter(Boolean);
      const listEl = listRef.current;

      const extent = applyExtent();
      const layout = getMenuLayout(slotRef.current, listEl);
      const scale = extent / STEM_LEN;
      const dotOpenX = extent - 1.5;
      const instant = Boolean(reducedMotion);
      const backdrop = backdropRef.current;

      if (layout === "row" && (!origin || !stem || !dot)) return;
      if (layout === "drawer" && !listEl) return;

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
          slotRef.current?.removeAttribute("data-yo-menu-open");
        },
      });

      slotRef.current?.setAttribute("data-yo-menu-open", "true");

      if (layout === "drawer") {
        applyDrawerAnchor(triggerRef.current, listEl);

        if (backdrop) {
          gsap.set(backdrop, { opacity: 0, pointerEvents: "none" });
          tl.to(
            backdrop,
            {
              opacity: 1,
              duration: instant ? 0 : 0.42,
              ease: "power2.out",
              onStart: () => {
                backdrop.style.pointerEvents = "auto";
              },
            },
            0,
          );
        }

        gsap.set(listEl, { x: -36, force3D: false });
        tl.to(
          listEl,
          {
            x: 0,
            duration: instant ? 0 : 0.5,
            ease: "power3.out",
            force3D: false,
          },
          0,
        );
      } else {
        tl.to(
          origin,
          {
            rotation: 90,
            duration: instant ? 0 : LINE_DUR,
            ease: "power3.inOut",
            transformOrigin: "0px 0px",
          },
          0,
        );
        tl.to(
          stem,
          {
            scaleY: scale,
            duration: instant ? 0 : LINE_DUR,
            ease: "power3.inOut",
            transformOrigin: "50% 100%",
            force3D: false,
          },
          0,
        );
        tl.to(
          dot,
          {
            x: dotOpenX,
            y: DOT_CLOSED_Y,
            duration: instant ? 0 : LINE_DUR,
            ease: "power3.inOut",
            force3D: false,
          },
          0,
        );
      }

      if (links.length) {
        tl.set(listRef.current, { pointerEvents: "none" }, 0);
        tl.to(
          links,
          {
            opacity: 1,
            x: 0,
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
    if (!tl || (tl.progress() === 0 && !tl.isActive() && !openRef.current)) return;
    if (tl.reversed() && tl.isActive()) return;
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
  }, [applyExtent, buildTimeline, setClosedVisual, items.length, layoutMode]);

  useEffect(() => {
    const sync = () => {
      const layout = getMenuLayout(slotRef.current, listRef.current);
      setReturnKey(layout === "row" ? "home" : "menu");
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
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
      const layout = getMenuLayout(slot, listRef.current);
      if (layout !== "drawer" && slot && !slot.contains(event.target)) {
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

  useEffect(() => {
    const onHeaderScrollDown = () => {
      const tl = tlRef.current;
      const transitioningOpen = tl?.isActive() && !tl.reversed();
      if (!openRef.current && !transitioningOpen && !(tl && tl.progress() > 0)) return;

      const active = document.activeElement;
      if (active && slotRef.current?.contains(active)) active.blur();
      closeMenu({ restoreFocus: false });
    };

    window.addEventListener("yo:header-scroll-down", onHeaderScrollDown);
    return () => window.removeEventListener("yo:header-scroll-down", onHeaderScrollDown);
  }, [closeMenu]);

  const onNavigate = (event, href) => {
    event.preventDefault();
    playMenuSound("close");
    closeMenu({ restoreFocus: false });
    const delay = reducedMotion ? 0 : 420;
    window.setTimeout(() => {
      if (!href || href === "#" || href === "#hero" || href === "#top") {
        if (lenis) lenis.scrollTo(0, INERTIAL_SCROLL_TO);
        else window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (href === "#contact-form" || href === "#contact" || href === "#contact-screen") {
        const top = contactScreenScrollY();
        if (lenis) lenis.scrollTo(top, INERTIAL_SCROLL_TO);
        else window.scrollTo({ top, behavior: "smooth" });
        return;
      }
      const servicesIntro = href === "#services-intro" || href === "#services" || href === "#services-heading";
      if (servicesIntro) {
        const top = servicesIntroScrollY();
        if (lenis) lenis.scrollTo(top, INERTIAL_SCROLL_TO);
        else window.scrollTo({ top, behavior: "smooth" });
        return;
      }
      const target = document.getElementById(href.slice(1));
      if (target) {
        if (lenis) lenis.scrollTo(target, INERTIAL_SCROLL_TO);
        else target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, delay);
  };

  const drawerChrome =
    typeof document !== "undefined"
      ? createPortal(
          <button
            ref={backdropRef}
            type="button"
            className="yo-menu-drawer__backdrop"
            aria-label={t("nav.closeAria")}
            tabIndex={-1}
            onClick={() => {
              playMenuSound("close");
              closeMenu();
            }}
          />,
          document.body,
        )
      : null;

  return (
    <div ref={slotRef} data-yo-nav-links className="yo-menu-slot">
      <button
        ref={triggerRef}
        type="button"
        className="yo-menu-trigger"
        data-open={open ? "true" : "false"}
        data-yo-menu-variant={layoutMode === "drawer" ? "drawer" : "row"}
        aria-expanded={open}
        aria-controls={listId}
        aria-label={open ? t("nav.closeAria") : t("nav.openAria")}
        data-yo-dot-return={returnKey}
        data-yo-menu-trigger=""
        onClick={toggleMenu}
      >
        <span className="yo-menu-trigger__icon yo-menu-trigger__icon--row" aria-hidden="true">
          <span ref={originRef} className="yo-menu-trigger__origin">
            <span
              ref={stemRef}
              className="yo-menu-trigger__stem"
              data-yo-burger-line=""
            />
          </span>
          <span
            ref={dotRef}
            className="yo-menu-trigger__dot"
            data-yo-burger-line=""
          />
        </span>
        <span className="yo-nav-burger yo-menu-trigger__burger" aria-hidden="true">
          <span className="yo-nav-burger__line" data-yo-burger-line="" />
          <span className="yo-nav-burger__line" data-yo-burger-line="" />
          <span className="yo-nav-burger__line" data-yo-burger-line="" />
        </span>
      </button>

      {(() => {
        const list = (
          <ul
            ref={listRef}
            id={listId}
            className="yo-fsmenu__list"
            data-yo-fsmenu=""
            data-yo-menu-layout={layoutMode}
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
        );

        if (layoutMode === "drawer" && typeof document !== "undefined") {
          return createPortal(list, document.body);
        }
        return list;
      })()}
      {drawerChrome}
    </div>
  );
}
