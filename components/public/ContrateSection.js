import React from "react";
import Button from "components/ui/Button";
import * as OutlineIcons from "@heroicons/react/24/outline";

// O componente EventTypeItem agora é mais inteligente
const EventTypeItem = ({ iconName, title, description }) => {
  // Procura dinamicamente pelo ícone dentro do objeto OutlineIcons
  const IconComponent = OutlineIcons[iconName];

  return (
    <div className="flex items-start text-left">
      <div className="flex-shrink-0">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-rakusai-purple text-white">
          {/* Se o ícone for encontrado, ele é renderizado. Senão, não mostra nada. */}
          {IconComponent && <IconComponent className="w-6 h-6" />}
        </div>
      </div>
      <div className="ml-4">
        <h4 className="text-lg font-bold text-gray-800">{title}</h4>
        <p className="mt-1 text-gray-600">{description}</p>
      </div>
    </div>
  );
};

export default function ContrateSection({ pageData, tiposEvento }) {
  const content = pageData?.homeContrate;
  const whatsappNumber = pageData?.redesSociais?.whatsapp;

  if (!content) return null;

  const { description, telefoneWpp } = content;
  const finalWppNumber = telefoneWpp || whatsappNumber;

  const mensagemWpp =
    "Olá! Gostaria de solicitar um orçamento para uma apresentação do Rakusai Taiko no meu evento.";
  const whatsappLink = `https://wa.me/${finalWppNumber}?text=${encodeURIComponent(mensagemWpp)}`;

  return (
    <section
      id="contrate"
      className="py-20"
      style={{ backgroundColor: "#f7f7f7" }}
    >
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-800 mb-4">
            Leve o Rakusai Taiko para seu Evento
          </h2>
          <span className="inline-block h-1 w-5/12 bg-gradient-to-r from-rakusai-yellow-dark via-rakusai-pink to-rakusai-purple rounded-full mb-16"></span>
        </div>

        <div className="grid md:grid-cols-5 gap-12 lg:gap-16 items-start">
          <div className="md:col-span-3 space-y-12">
            <div
              className="text-gray-700 leading-relaxed prose lg:prose-lg text-justify prose-p:text-justify"
              dangerouslySetInnerHTML={{ __html: description }}
            />
            <div className="space-y-6 pt-4 text-left">
              {tiposEvento &&
                tiposEvento.map((item) => (
                  // MUDANÇA 2: Passamos o 'iconName' (texto do Contentful) em vez do componente do ícone
                  <EventTypeItem
                    key={item.order}
                    iconName={item.iconName}
                    title={item.title}
                    description={item.description}
                  />
                ))}
            </div>
          </div>

          {/* Coluna da Direita (agora ocupa 2/5 do espaço e continua sticky) */}
          <div className="sticky top-24 md:col-span-2">
            <div className="bg-white p-8 md:p-10 rounded-lg shadow-2xl text-center border">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Vamos Conversar?
              </h3>
              <p className="text-gray-600 mb-8 text-lg">
                Clique no botão abaixo para nos chamar no WhatsApp e solicitar
                um orçamento sem compromisso.
              </p>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <Button variant="primary" className="w-full">
                  Solicitar Orçamento
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
