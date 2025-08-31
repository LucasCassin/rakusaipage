import React from "react";
import Image from "next/image";
import Button from "../ui/Button";

export default function AulasSection({ pageData, horarios }) {
  const aulasContent = pageData?.homeAulas;
  const whatsappNumber = pageData?.redesSociais?.whatsapp;

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

        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div className="space-y-8 text-left">
            <div
              className="text-gray-700 leading-relaxed prose prose-p:text-justify lg:prose-lg prose-h1:font-sans prose-h2:font-sans"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          </div>

          <div className="md:sticky md:top-24">
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl border border-gray-200 space-y-6">
              {featuredImage && (
                <div className="relative w-full h-64 rounded-md overflow-hidden">
                  <Image
                    src={featuredImage.url}
                    alt={featuredImage.description || "Aula de Taiko"}
                    fill
                    style={{ objectFit: "cover" }}
                  />
                </div>
              )}
              <div>
                <h3 className="text-3xl font-bold text-gray-800 mb-4 text-center md:text-left">
                  Nossos Horários
                </h3>
                <div className="overflow-x-auto">
                  {/* MUDANÇA 1: Adicionada a classe 'table-fixed' */}
                  <table className="w-full">
                    <thead className="border-b-2 border-gray-300">
                      <tr>
                        {/* MUDANÇA 2: Adicionadas classes de largura (w-...) */}
                        <th className="py-3 pr-2 text-left">Dia</th>
                        <th className="py-3 px-2 text-center">Horário</th>
                        <th className="py-3 pl-2 text-right">Turma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diasDeAula.flatMap((dia) =>
                        dia.fields.horarios
                          .sort(
                            (a, b) =>
                              parseInt(a.split(";")[0]) -
                              parseInt(b.split(";")[0]),
                          )
                          .map((horarioStr, horarioIndex) => {
                            const [, horario, turma] = horarioStr
                              .split(";")
                              .map((s) => s.trim());
                            return (
                              <tr
                                key={`${dia.sys.id}-${horarioIndex}`}
                                className="border-b border-gray-200 last:border-b-0"
                              >
                                <td className="py-4 pr-2 font-medium text-gray-800">
                                  {horarioIndex === 0
                                    ? dia.fields.diaDaSemana
                                    : ""}
                                </td>
                                {/* O alinhamento manual com div e span está mantido */}
                                <td className="py-4 px-2">
                                  <div className="flex justify-between items-center text-gray-600 tracking-wider">
                                    <span className="w-15 text-left">
                                      {horario.split("-")[0].trim()}
                                    </span>
                                    <span>-</span>
                                    <span className="w-15 text-right">
                                      {horario.split("-")[1].trim()}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-4 pl-2 text-gray-600 text-right">
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
          </div>
        </div>

        <div className="mt-12">
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            <Button variant="primary" className="w-full text-center">
              Quero fazer uma aula experimental!
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
