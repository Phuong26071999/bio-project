import React, { useEffect, useState } from "react";
import logo from "../../images/hp-logo.svg";
import "../styles/header.scss";

const SECTIONS = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "contact", label: "Contact" },
];

const MOBILE_QUERY = "(max-width: 768px)";

/** The last section whose top has passed the upper third of the viewport. */
function getCurrentSection(): string {
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  if (atBottom) return SECTIONS[SECTIONS.length - 1].id;
  const line = window.innerHeight / 3;
  let current = SECTIONS[0].id;
  for (const { id } of SECTIONS) {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= line) current = id;
  }
  return current;
}

const Header = () => {
  const [active, setActive] = useState<string>("home");
  const [sticky, setSticky] = useState<boolean>(false);
  const [openMenu, setOpenMenu] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => window.matchMedia(MOBILE_QUERY).matches);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setSticky(window.scrollY > 100);
        setActive(getCurrentSection());
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const onChange = () => {
      setIsMobile(query.matches);
      if (!query.matches) setOpenMenu(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const handleNavClick = (id: string) => {
    setActive(id);
    setOpenMenu(false);
  };

  return (
    <div className={`coverHeader${sticky ? " sticky" : ""}`}>
      <a href="#home" className="logo" aria-label="Back to top">
        <img src={logo} alt="HP logo" className="logo-img" />
        {/* <span className="logo-text">Hoang Phuong</span> */}
      </a>

      <button
        type="button"
        id="menu-icon"
        onClick={() => setOpenMenu((value) => !value)}
        aria-label={openMenu ? "Close menu" : "Open menu"}
        aria-expanded={openMenu}
        aria-controls="site-nav"
      >
        <i className={`bx ${openMenu ? "bx-x" : "bx-menu"}`} aria-hidden="true"></i>
      </button>

      {(!isMobile || openMenu) && (
        <nav className="navbar" id="site-nav">
          {SECTIONS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={() => handleNavClick(id)}
              className={active === id ? "active" : ""}
              aria-current={active === id ? "location" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
};

export default Header;
