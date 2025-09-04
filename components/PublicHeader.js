import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "src/contexts/AuthContext.js";
import { useView } from "src/contexts/ViewContext.js";
import { settings } from "config/settings.js";
import { texts } from "src/utils/texts.js";
import Image from "next/image";

export default function Header() {
  const router = useRouter();
  const { user } = useAuth();

  const { switchToStudent } = useView();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOthersDropdownOpen, setIsOthersDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Estados para controle visual
  const [headerOpacity, setHeaderOpacity] = useState(0);
  const [logoOpacity, setLogoOpacity] = useState(0);
  const [activeSection, setActiveSection] = useState("home");

  const isHomePage = router.pathname === "/";

  // Lógica de permissão original
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

  const mainNavs = settings.header.PUBLIC_NAVS.filter(shouldShowNavItem);
  const filteredOtherNavs =
    settings.header.OTHER_NAVS.filter(shouldShowNavItem);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOthersDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const isHomePageCheck = router.pathname === "/";

    const handleVisualScroll = () => {
      if (!isHomePageCheck) return;
      const scrollY = window.scrollY;
      const headerFadeRange = 300;
      setHeaderOpacity(Math.min(scrollY / headerFadeRange, 1));
      const logoFadeStart = 200;
      const logoFadeRange = 200;
      const scrollAfterHeader = scrollY - logoFadeStart;
      setLogoOpacity(
        Math.max(0, Math.min(scrollAfterHeader / logoFadeRange, 1)),
      );
    };

    if (!isHomePageCheck) {
      setHeaderOpacity(1);
      setLogoOpacity(1);
    } else {
      handleVisualScroll();
      window.addEventListener("scroll", handleVisualScroll);
      return () => window.removeEventListener("scroll", handleVisualScroll);
    }
  }, [router.isReady, router.pathname]);

  // --- LÓGICA DE DESTAQUE DE SEÇÃO CORRIGIDA E FINAL ---
  useEffect(() => {
    if (!isHomePage) return;

    const sections = settings.header.PUBLIC_NAVS.map((link) => {
      if (link.href.includes("/#")) {
        const id = link.href.split("/#")[1];
        return document.querySelector(`#${id}`);
      }
      return null;
    }).filter(Boolean);
    if (sections.length === 0) return;

    const handleActiveSectionScroll = () => {
      let currentSectionId = "home";
      const headerOffset = 350; // Um espaço de folga para o header

      sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        if (window.scrollY >= sectionTop - headerOffset) {
          currentSectionId = section.id;
        }
      });

      setActiveSection(currentSectionId);
    };

    handleActiveSectionScroll(); // Define o estado inicial
    window.addEventListener("scroll", handleActiveSectionScroll);
    return () =>
      window.removeEventListener("scroll", handleActiveSectionScroll);
  }, [isHomePage]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleOthersDropdown = () =>
    setIsOthersDropdownOpen(!isOthersDropdownOpen);

  const handleNavigation = (href, e) => {
    if (e) e.preventDefault();
    if (href.includes("/#")) {
      const id = href.split("/#")[1];
      const section = document.querySelector(`#${id}`);
      if (section) {
        // Rola um pouco acima da seção para compensar o header fixo
        const headerOffset = 80;
        const elementPosition = section.getBoundingClientRect().top;
        const offsetPosition =
          elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    } else {
      router.push(href);
    }
    if (isMenuOpen) setIsMenuOpen(false);
    if (isOthersDropdownOpen) setIsOthersDropdownOpen(false);
  };

  const studentAreaButton = (
    <Link
      href={user ? "/" : "/login"}
      onClick={() => {
        if (user) switchToStudent();
        if (isMenuOpen) setIsMenuOpen(false);
      }}
      className="block w-full text-left pl-5 pr-4 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
    >
      Área do Aluno
    </Link>
  );

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 text-white bg-gray-800 shadow-lg transition-opacity duration-200 ${
        headerOpacity > 0 || isMenuOpen || !isHomePage
          ? "pointer-events-auto"
          : "pointer-events-none"
      }`}
      style={{ opacity: isMenuOpen ? 1 : headerOpacity }}
    >
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link
              href="/"
              onClick={(e) => handleNavigation("/", e)}
              className="transition-opacity duration-300 cursor-pointer"
              style={{
                opacity: isMenuOpen ? 1 : logoOpacity,
                pointerEvents:
                  logoOpacity > 0.1 || isMenuOpen ? "auto" : "none",
              }}
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
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-1">
              {mainNavs.map((item) => {
                const id = item.href.includes("/#")
                  ? item.href.split("/#")[1]
                  : null;
                const isActive = isHomePage
                  ? activeSection === id
                  : router.pathname === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleNavigation(item.href, e)}
                    className={`relative px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                      isActive ? "text-white" : "text-gray-300 hover:text-white"
                    }`}
                  >
                    <span>{item.name}</span>
                    {isActive && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-rakusai-pink rounded-full"></span>
                    )}
                  </a>
                );
              })}

              {filteredOtherNavs.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={toggleOthersDropdown}
                    className="relative px-3 py-2 text-sm font-medium transition-colors duration-200 flex items-center text-gray-300 hover:text-white"
                  >
                    <span>{texts.header.menu.others}</span>
                    <svg
                      className={`ml-1 h-5 w-5 transition-transform duration-200 ${
                        isOthersDropdownOpen ? "transform rotate-180" : ""
                      }`}
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
                          className={`block px-4 py-2 text-sm ${
                            router.pathname === item.href
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="relative px-3 py-2">
                <Link
                  href={user ? "/" : "/login"}
                  onClick={user ? switchToStudent : undefined}
                  className="px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  Área do Aluno
                </Link>
              </div>
            </nav>

            <div className="flex items-center sm:hidden">
              <button
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <span className="sr-only">{texts.header.mobile.menu}</span>
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
                      d="M4 6h16M4 12h16M4 18h16"
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
            {mainNavs.map((item) => {
              const id = item.href.includes("/#")
                ? item.href.split("/#")[1]
                : null;
              const isActive = isHomePage && activeSection === id;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavigation(item.href, e)}
                  // MUDANÇA: Novas classes para posicionamento relativo e paddings
                  className={`relative block pl-5 pr-4 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive
                      ? "text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4/5 w-1 bg-rakusai-pink rounded-full"></div>
                  )}
                  {item.name}
                </Link>
              );
            })}

            {filteredOtherNavs.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavigation(item.href, e)}
                className={`relative block pl-5 pr-4 py-2 rounded-md text-base font-medium ${
                  router.pathname === item.href
                    ? "text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {router.pathname === item.href && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4/5 w-1 bg-rakusai-pink rounded-full"></div>
                )}
                {item.name}
              </Link>
            ))}
            <div className="border-t border-gray-700 my-2"></div>
            {studentAreaButton}
          </div>
        </div>
      )}
    </header>
  );
}
