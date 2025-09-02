import React, { useState, useEffect } from "react";
import Image from "next/image";
import Button from "../ui/Button";

export default function AulasSection({ pageData, horarios }) {
  const aulasContent = pageData?.homeAulas;
  const whatsappNumber = pageData?.redesSociais?.whatsapp;
  const contactName = pageData?.redesSociais?.contactName;

  const useIsDesktop = () => {
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
      const mediaQuery = window.matchMedia("(min-width: 768px)"); // O breakpoint 'md' do Tailwind

      const handleResize = () => {
        setIsDesktop(mediaQuery.matches);
      };

      // Define o estado inicial
      handleResize();

      // Adiciona o listener para mudanças de tamanho da tela
      window.addEventListener("resize", handleResize);

      // Limpa o listener ao desmontar o componente
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    return isDesktop;
  };

  if (!aulasContent) {
    return null;
  }

  const { description, featuredImage } = aulasContent;
  const diasDeAula = horarios || [];

  const mensagemWpp =
    "Olá! Tenho interesse em fazer uma aula experimental de Taiko.";
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    mensagemWpp,
  )}`;

  const descriptionFinal = (
    <div className="space-y-8 text-left">
      <div
        className="text-gray-700 leading-relaxed prose prose-p:text-justify lg:prose-lg prose-h1:font-sans prose-h2:font-sans"
        dangerouslySetInnerHTML={{ __html: description }}
      />
    </div>
  );

  const tableFinal = (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl border border-gray-200 space-y-6">
      {featuredImage && (
        <div className="relative w-full h-64 rounded-md overflow-hidden">
          <Image
            src={featuredImage.url}
            alt={featuredImage.description || "Aula de Taiko"}
            fill
            style={{ objectFit: "cover" }}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      )}
      <div>
        <h3 className="text-3xl font-bold text-gray-800 mb-4 text-center md:text-left">
          Nossos Horários
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b-2 border-gray-300">
              <tr>
                <th className="py-3 pr-2 text-left text-lg max-[380px]:text-[14px] ">
                  Dia
                </th>
                <th className="py-3 px-2 text-center text-lg max-[380px]:text-[14px] ">
                  Horário
                </th>
                <th className="py-3 pl-2 text-right text-lg max-[380px]:text-[14px] ">
                  Turma
                </th>
              </tr>
            </thead>
            <tbody>
              {diasDeAula.flatMap((dia) =>
                dia.fields.horarios
                  .sort(
                    (a, b) =>
                      parseInt(a.split(";")[0]) - parseInt(b.split(";")[0]),
                  )
                  .map((horarioStr, horarioIndex) => {
                    const [, horario, turma] = horarioStr
                      .split(";")
                      .map((s) => s.trim());
                    const [horaInicio, horaFim] = horario
                      .split("-")
                      .map((h) => h.trim());
                    return (
                      <tr
                        key={`${dia.sys.id}-${horarioIndex}`}
                        className="border-b border-gray-200 last:border-b-0"
                      >
                        <td className="py-4 pr-2 font-semibold text-gray-800  max-[380px]:text-[12px]">
                          {horarioIndex === 0 ? dia.fields.diaDaSemana : ""}
                        </td>
                        <td className="py-4 px-2 tabular-nums text-center tracking-wider text-gray-600  max-[380px]:text-[12px]">
                          {/* No desktop (sm:), os horários ficam lado a lado */}
                          <div className="hidden min-[980px]:flex justify-between items-center">
                            <span className="w-18 text-left">{horaInicio}</span>
                            <span>-</span>
                            <span className="w-18 text-right">{horaFim}</span>
                          </div>
                          {/* No mobile, os horários ficam empilhados */}
                          <div className="min-[980px]:hidden flex flex-col items-center">
                            <span>{horaInicio}</span>
                            <span>-</span>
                            <span>{horaFim}</span>
                          </div>
                        </td>
                        <td className="py-4 pl-2 text-gray-600 text-right  max-[380px]:text-[12px]">
                          {turma}
                        </td>
                      </tr>
                    );
                  }),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const isDesktop = useIsDesktop();

  return (
    <section
      id="aulas"
      className="py-20"
      style={{ backgroundColor: "#f7f7f7" }}
    >
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-800 mb-4">
            Junte-se ao Ritmo
          </h2>
          <span className="inline-block h-1 w-5/12 bg-gradient-to-r from-rakusai-yellow-dark via-rakusai-pink to-rakusai-purple rounded-full mb-16"></span>
        </div>

        {isDesktop ? (
          // Layout para Desktop (com grid e sticky)
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-start">
            {descriptionFinal}
            <div className="sticky top-24">{tableFinal}</div>
          </div>
        ) : (
          // Layout para Mobile (empilhado)
          <div className="space-y-12">
            {descriptionFinal}
            {tableFinal}
          </div>
        )}

        <div className="mt-12 text-center">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full"
          >
            <Button variant="primary" className="w-full">
              Quero fazer uma aula experimental!
            </Button>
          </a>
          {/* MUDANÇA: Adicionado o subtexto com o nome do contato */}
          {contactName && (
            <p className="mt-1 text-sm text-gray-500">Fale com {contactName}</p>
          )}
        </div>
      </div>
    </section>
  );
}
