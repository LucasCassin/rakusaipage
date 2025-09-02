import React from "react";
import { EnvelopeIcon, MapPinIcon } from "@heroicons/react/24/solid";
import { FaInstagram, FaYoutube, FaWhatsapp } from "react-icons/fa6";

const formatPhoneNumber = (phone) => {
  if (!phone || phone.length !== 13) return phone;
  const countryCode = phone.substring(0, 2);
  const ddd = phone.substring(2, 4);
  const part1 = phone.substring(4, 9);
  const part2 = phone.substring(9, 13);
  return `+${countryCode} (${ddd}) ${part1}-${part2}`;
};

export default function ContatoSection({ pageData }) {
  const redesSociais = pageData?.redesSociais;

  if (!redesSociais) {
    return null;
  }

  const {
    instagram,
    youtube,
    whatsapp,
    email,
    localName,
    googleMapsLink,
    mapEmbedUrl,
    contactName,
  } = redesSociais;

  const whatsappLink = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        "Olá! Gostaria de entrar em contato com o Rakusai Taiko.",
      )}`
    : null;

  return (
    <section
      id="contato"
      className="py-20"
      style={{
        backgroundColor: "#f0f0f0",
      }}
    >
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-800 mb-4">
            Entre em Contato
          </h2>
          <span className="inline-block h-1 w-5/12 bg-gradient-to-r from-rakusai-yellow-dark via-rakusai-pink to-rakusai-purple rounded-full mb-16"></span>
        </div>

        <div className="bg-white rounded-xl shadow-2xl grid md:grid-cols-2 overflow-hidden">
          <div className="p-8 md:p-12 space-y-10">
            {/* Bloco de Contato Direto */}
            <div>
              <h3 className="text-3xl font-bold mb-6 text-gray-800">
                Fale Conosco
              </h3>
              <ul className="space-y-4">
                {whatsapp && (
                  <li>
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-lg text-gray-600 hover:text-rakusai-purple transition-colors group"
                    >
                      <FaWhatsapp className="w-7 h-7 mr-3 text-green-500" />
                      <span>{formatPhoneNumber(whatsapp)}</span>
                    </a>
                    {contactName && (
                      <p className="pl-10 text-sm text-gray-500">
                        Fale com {contactName}
                      </p>
                    )}
                  </li>
                )}
                {email && (
                  <li>
                    <a
                      href={`mailto:${email}`}
                      className="flex items-center text-lg text-gray-600 hover:text-rakusai-purple transition-colors"
                    >
                      <EnvelopeIcon className="w-7 h-7 mr-3 text-gray-400" />
                      {email}
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {/* Bloco de Endereço */}
            {localName && googleMapsLink && (
              <div>
                <h3 className="text-3xl font-bold mb-4 text-gray-800">
                  Endereço
                </h3>
                <a
                  href={googleMapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-gray-600 hover:text-rakusai-purple transition-colors"
                >
                  <div className="flex items-start">
                    <MapPinIcon className="w-7 h-7 mr-3 text-rakusai-pink flex-shrink-0 mt-1" />
                    <p className="text-lg">{localName}</p>
                  </div>
                </a>
              </div>
            )}

            {/* Bloco de Redes Sociais */}
            <div>
              <h3 className="text-3xl font-bold mb-6 text-gray-800">
                Siga-nos
              </h3>
              <div className="flex space-x-6">
                {instagram && (
                  <a
                    href={instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                  >
                    <FaInstagram
                      size={36}
                      className="text-[#E1306C] hover:text-rakusai-purple transition-colors"
                    />
                  </a>
                )}
                {youtube && (
                  <a
                    href={youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                  >
                    <FaYoutube
                      size={36}
                      className="text-red-600 hover:text-rakusai-purple transition-colors"
                    />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Coluna da Direita: Mapa ou Street View */}
          <div className="relative w-full h-80 md:h-full min-h-[400px]">
            <a
              href={googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 z-10"
              aria-label={`Abrir ${localName} no Google Maps`}
            ></a>
            {/* O 'src' agora usa a variável 'mapEmbedUrl', que será Street View se disponível */}
            <iframe
              src={mapEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Localização de ${localName}`}
              className="absolute top-0 left-0"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
}
