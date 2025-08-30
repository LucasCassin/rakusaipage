import React from "react";
import {
  SparklesIcon,
  BuildingOffice2Icon,
  HeartIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import Button from "../ui/Button";

// Objeto que mapeia o nome do ícone (do Contentful) para o componente React
const iconMap = {
  Sparkles: <SparklesIcon className="w-6 h-6" />,
  BuildingOffice2: <BuildingOffice2Icon className="w-6 h-6" />,
  Heart: <HeartIcon className="w-6 h-6" />,
  AcademicCap: <AcademicCapIcon className="w-6 h-6" />,
};

const EventTypeItem = ({ icon, title, description }) => (
  <div className="flex items-start text-left">
    <div className="flex-shrink-0">
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-rakusai-purple text-white">
        {icon}
      </div>
    </div>
    <div className="ml-4">
      <h4 className="text-lg font-bold text-gray-800">{title}</h4>
      <p className="mt-1 text-gray-600">{description}</p>
    </div>
  </div>
);

// A seção agora recebe 'tiposEvento' como uma nova prop
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
      style={{ backgroundColor: "#f7f7f7" }} // Usando o cinza da seção Sobre para alternar
    >
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-800 mb-4">
            Leve o Rakusai Taiko para seu Evento
          </h2>
          <span className="inline-block h-1 w-5/12 bg-gradient-to-r from-rakusai-yellow-dark via-rakusai-pink to-rakusai-purple rounded-full mb-16"></span>
        </div>

        {/* MUDANÇA: Usando um grid de 5 colunas para melhor proporção */}
        <div className="grid md:grid-cols-5 gap-12 lg:gap-16 items-start">
          {/* Coluna da Esquerda (agora ocupa 3/5 do espaço) */}
          <div className="md:col-span-3 space-y-12">
            <div
              className="text-gray-700 leading-relaxed prose lg:prose-lg prose-h1:font-sans prose-h2:font-sans prose-p:text-justify"
              dangerouslySetInnerHTML={{ __html: description }}
            />
            <div className="space-y-6 pt-4 text-left">
              {tiposEvento &&
                tiposEvento.map((item) => (
                  <EventTypeItem
                    key={item.order}
                    icon={iconMap[item.iconName]}
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
