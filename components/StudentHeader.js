import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Image from "next/image";
import { useAuth } from "src/contexts/AuthContext.js";
import { useView } from "src/contexts/ViewContext.js";
import { settings } from "config/settings.js";
import * as HeroIcons from "@heroicons/react/24/outline";
import { texts } from "src/utils/texts.js";

export default function StudentHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const { switchToPublic } = useView();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOthersDropdownOpen, setIsOthersDropdownOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const profileMenuRef = useRef(null);

  // --- LÓGICA DE PERMISSÃO E FILTRAGEM (DO SEU CÓDIGO ORIGINAL) ---
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

  const mainStudentNavs =
    settings.header.STUDENT_NAVS.filter(shouldShowNavItem);
  const filteredOtherNavs =
    settings.header.OTHER_NAVS.filter(shouldShowNavItem);
  const filteredProfileNavs = settings.header.PROFILE_NAVS.map((group) =>
    group.filter(shouldShowNavItem),
  ).filter((group) => group.length > 0);

  // --- LÓGICA DE CONTROLE DE MENUS (DO SEU CÓDIGO ORIGINAL) ---
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOthersDropdownOpen(false);
      }
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleOthersDropdown = () =>
    setIsOthersDropdownOpen(!isOthersDropdownOpen);
  const toggleProfileMenu = () => setIsProfileMenuOpen(!isProfileMenuOpen);

  const getIcon = (iconName) => {
    if (!iconName) return null;
    return HeroIcons[iconName] || null;
  };

  const handleNavigation = (href, e) => {
    if (e) e.preventDefault();
    router.push(href);
    // Fecha todos os menus ao navegar
    setIsMenuOpen(false);
    setIsOthersDropdownOpen(false);
    setIsProfileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 text-white bg-gray-800 shadow-lg">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link href="/" onClick={switchToPublic}>
              <Image
                src="/images/logoBranco.svg"
                alt="Rakusai Taiko Logo"
                width={102.63}
                height={50}
              />
            </Link>
          </div>

          <div className="flex items-center">
            {/* Navegação Principal do Desktop */}
            <nav className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-1">
              {mainStudentNavs.map((item) => {
                const isActive = router.pathname === item.href;
                return (
                  <Link
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
                  </Link>
                );
              })}

              {/* Dropdown "Outros" */}
              {filteredOtherNavs.length > 0 && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={toggleOthersDropdown}
                    className="relative px-3 py-2 text-sm font-medium transition-colors duration-200 flex items-center text-gray-300 hover:text-white"
                  >
                    <span>{texts.header.menu.others}</span>
                    <svg
                      className={`ml-1 h-5 w-5 transition-transform duration-200 ${isOthersDropdownOpen ? "transform rotate-180" : ""}`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
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

              {/* Botão para voltar à Área Pública */}
              {/* <Link
                href="/"
                onClick={switchToPublic}
                className="ml-4 px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/30 rounded-full transition-colors"
              >
                Área Pública
              </Link> */}
            </nav>

            {/* Menu de Perfil e Botão Mobile */}
            <div className="flex items-center ml-4">
              {user && (
                <div className="relative hidden sm:block" ref={profileMenuRef}>
                  <button
                    onClick={toggleProfileMenu}
                    className="flex items-center space-x-2 text-gray-300 hover:text-white focus:outline-none"
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </button>
                  {isProfileMenuOpen && (
                    <>
                      <div
                        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out ${isProfileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                        onClick={() => setIsProfileMenuOpen(false)}
                      />
                      <div
                        className={`fixed inset-y-0 right-0 w-80 bg-gray-800 shadow-xl z-50 transform transition-all duration-300 ease-in-out rounded-l-lg ${isProfileMenuOpen ? "translate-x-0" : "translate-x-full"}`}
                      >
                        <div className="h-full flex flex-col">
                          <div className="px-4 py-4 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {user.username.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-white">
                                    {user.username}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {texts.header.menu.viewProfile}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => setIsProfileMenuOpen(false)}
                                className="text-gray-400 hover:text-white"
                              >
                                <svg
                                  className="h-6 w-6"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto py-2">
                            {filteredProfileNavs.map((group, groupIndex) => (
                              <div key={groupIndex}>
                                {group.map((item) => {
                                  const Icon = getIcon(item.icon);
                                  return (
                                    <Link
                                      key={item.href}
                                      href={item.href}
                                      onClick={(e) => {
                                        if (item?.ap) {
                                          switchToPublic(e);
                                        } else {
                                          handleNavigation(item.href, e);
                                        }
                                      }}
                                      className={`block mx-2 px-4 py-2.5 text-sm rounded-md flex items-center space-x-3 ${router.pathname === item.href && !item?.ap ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}
                                    >
                                      {Icon && (
                                        <Icon className="h-4 w-4 flex-shrink-0" />
                                      )}
                                      <span>{item.name}</span>
                                    </Link>
                                  );
                                })}
                                {groupIndex <
                                  filteredProfileNavs.length - 1 && (
                                  <div className="mx-2 my-2 border-t border-gray-700" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
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
      </div>

      {isMenuOpen && (
        <div className="sm:hidden bg-gray-800 border-t border-gray-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {mainStudentNavs.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavigation(item.href, e)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${router.pathname === item.href ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}
              >
                {item.name}
              </Link>
            ))}
            {/* Adicionando menus "Outros" e "Perfil" ao mobile dropdown */}
            {filteredOtherNavs.length > 0 && (
              <div className="border-t border-gray-700 my-2" />
            )}
            {filteredOtherNavs.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavigation(item.href, e)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${router.pathname === item.href ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}
              >
                {item.name}
              </Link>
            ))}
            {/* <div className="border-t border-gray-700 my-2" />
            <Link
              href="/"
              onClick={switchToPublic}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Área Pública
            </Link> */}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-700">
            {user ? (
              <div className="px-4 space-y-3">
                {filteredProfileNavs.flat().map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => {
                      if (item?.ap) {
                        switchToPublic(e);
                      } else {
                        handleNavigation(item.href, e);
                      }
                    }}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${router.pathname === item.href && !item?.ap ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"}`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-4 space-y-3 pb-3">
                <Link
                  href={settings.header.LOGIN_REDIRECT}
                  onClick={(e) => {
                    toggleMenu();
                    handleNavigation(settings.header.LOGIN_REDIRECT, e);
                  }}
                  className="block w-full text-center px-4 py-2 text-base font-medium text-gray-300 bg-gray-700 rounded-full hover:bg-gray-600 hover:text-white"
                >
                  {texts.header.button.login}
                </Link>
                <Link
                  href={settings.header.CREATE_USER_REDIRECT}
                  onClick={(e) => {
                    toggleMenu();
                    handleNavigation(settings.header.CREATE_USER_REDIRECT, e);
                  }}
                  className="block w-full text-center px-4 py-2 text-base font-medium text-white bg-green-600 rounded-full hover:bg-green-700"
                >
                  {texts.header.button.register}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
