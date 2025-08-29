import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { texts } from "src/utils/texts.js";
import Image from "next/image";

export default function Header() {
  const router = useRouter();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOthersDropdownOpen, setIsOthersDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // --- NOVA LÓGICA VISUAL ---
  const [isScrolledSlightly, setIsScrolledSlightly] = useState(false);
  const [isScrolledPastHero, setIsScrolledPastHero] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const isHomePage = router.pathname === "/";
  // -------------------------

  // --- SUA LÓGICA DE PERMISSÃO ORIGINAL MANTIDA ---
  const hasFeatureSet = (featureSet) => {
    if (!user || !user.features) return false;
    return featureSet.every((feature) => user.features.includes(feature));
  };

  const hasPermission = (featureSets) => {
    if (!featureSets) return true;
    return featureSets.some((featureSet) => hasFeatureSet(featureSet));
  };

  const shouldShowNavItem = (navItem) => {
    if (!navItem.FEATURES) return true;
    return hasPermission(navItem.FEATURES);
  };

  const filteredOtherNavs =
    settings.header.OTHER_NAVS.filter(shouldShowNavItem);
  // ------------------------------------------------

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOthersDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- NOVO useEffect PARA CONTROLE VISUAL ---
  useEffect(() => {
    if (!router.isReady) return;
    const isHomePageCheck = router.pathname === "/";

    const handleScroll = () => {
      setIsScrolledSlightly(window.scrollY > 50);
      setIsScrolledPastHero(window.scrollY > window.innerHeight - 50);
    };

    if (!isHomePageCheck) {
      setIsScrolledSlightly(true);
      setIsScrolledPastHero(true);
      setActiveSection("");
    } else {
      handleScroll();
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [router.isReady, router.pathname]);
  // -------------------------------------------

  // --- NOVO useEffect PARA DESTAQUE DE SEÇÃO ---
  useEffect(() => {
    if (!isHomePage) return;
    const allNavLinks = settings.header.NAVS;
    const timer = setTimeout(() => {
      const sections = allNavLinks
        .map((link) =>
          link.href.startsWith("#") ? document.querySelector(link.href) : null,
        )
        .filter(Boolean);
      if (sections.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(entry.target.id);
            }
          });
        },
        { rootMargin: "-40% 0px -40% 0px" },
      );
      sections.forEach((section) => observer.observe(section));
      return () => sections.forEach((section) => observer.unobserve(section));
    }, 100);
    return () => clearTimeout(timer);
  }, [isHomePage]);
  // ------------------------------------------

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleOthersDropdown = () =>
    setIsOthersDropdownOpen(!isOthersDropdownOpen);

  // --- SUA LÓGICA DE NAVEGAÇÃO ORIGINAL MANTIDA ---
  const handleNavigation = (href, e) => {
    if (href.startsWith("#")) {
      if (e) e.preventDefault();
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    } else {
      if (e) e.preventDefault();
      router.push(href);
    }
    if (isMenuOpen) setIsMenuOpen(false);
    if (isOthersDropdownOpen) setIsOthersDropdownOpen(false);
  };
  // ---------------------------------------------

  const headerBgClass =
    !isHomePage || isScrolledSlightly || isMenuOpen
      ? "bg-gray-800 shadow-lg"
      : "bg-transparent";
  const logoVisibilityClass =
    !isHomePage || isScrolledPastHero || isMenuOpen
      ? "opacity-100"
      : "opacity-0 pointer-events-none";
  const navVisibilityClass =
    !isHomePage || isScrolledSlightly || isMenuOpen
      ? "opacity-100"
      : "opacity-0 pointer-events-none";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 text-white transition-all duration-500 ${headerBgClass}`}
    >
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link
              href="/"
              className={`transition-opacity duration-300 ${logoVisibilityClass}`}
            >
              <Image
                src="/images/logoBranco.svg"
                alt="Rakusai Taiko Logo"
                width={102.63}
                height={50}
              />
            </Link>
          </div>

          <div className="flex items-center">
            <div
              className={`hidden sm:flex items-center transition-opacity duration-300 ${navVisibilityClass}`}
            >
              <nav className="flex space-x-1">
                {settings.header.NAVS.filter(shouldShowNavItem).map((item) => {
                  const isActive = isHomePage
                    ? activeSection === item.href.substring(1)
                    : router.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={(e) => handleNavigation(item.href, e)}
                      className={`relative px-3 py-2 text-sm font-bold transition-colors duration-200 ${isActive ? "text-white" : "text-gray-300 hover:text-white"}`}
                    >
                      <span>{item.name}</span>
                      {isActive && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-rakusai-pink rounded-full"></span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {filteredOtherNavs.length > 0 && (
                <div className="relative ml-4" ref={dropdownRef}>
                  <button
                    onClick={toggleOthersDropdown}
                    className="relative px-3 py-2 text-sm font-bold transition-colors duration-200 flex items-center text-gray-300 hover:text-white"
                  >
                    <span>{texts.header.menu.others}</span>
                    <svg
                      className={`ml-1 h-5 w-5 transition-transform duration-200 ${isOthersDropdownOpen ? "transform rotate-180" : ""}`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {isOthersDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 py-1">
                      {filteredOtherNavs.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={(e) => handleNavigation(item.href, e)}
                          className={`block px-4 py-2 text-sm ${router.pathname === item.href ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-100"}`}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center sm:hidden">
              <button
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 focus:outline-none"
              >
                <span className="sr-only">Abrir menu</span>
                {isMenuOpen ? (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="block h-6 w-6"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16m-7 6h7"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="sm:hidden bg-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {settings.header.NAVS.filter(shouldShowNavItem).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavigation(item.href, e)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${isHomePage && activeSection === item.href.substring(1) ? "bg-rakusai-purple text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}
              >
                {item.name}
              </Link>
            ))}
            {filteredOtherNavs.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavigation(item.href, e)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${router.pathname === item.href ? "bg-rakusai-purple text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
