import React from "react";
import { BookOpenIcon, MusicalNoteIcon } from "@heroicons/react/24/outline";
import Button from "../ui/Button";

export default function SobreSection({ pageData, onOpenModal }) {
  const sobreContent = pageData?.homeSobre;
  const historiaTaikoContent = pageData?.homeHistoriaTaiko;
  const instrumentosContent = pageData?.homeInstrumentos;

  if (!sobreContent) {
    return null;
  }

  return (
    <section
      id="sobre"
      className="py-20"
      style={{
        backgroundColor: "#f0f0f0",
      }}
    >
      <div className="container mx-auto px-6 text-center max-w-5xl">
        <h2 className="text-5xl font-bold text-gray-800 mb-4">
          Nossa Batida, Nossa História
        </h2>

        <span className="inline-block h-1 w-5/12 bg-gradient-to-r from-rakusai-yellow-dark via-rakusai-pink to-rakusai-purple rounded-full mb-8"></span>

        <div
          className="text-gray-700 leading-relaxed prose lg:prose-lg mx-auto prose-h1:font-sans prose-h2:font-sans prose-p:text-justify"
          dangerouslySetInnerHTML={{ __html: sobreContent.description }}
        />

        <div className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-6">
          <Button
            variant="secondary"
            onClick={() =>
              onOpenModal(
                "A História do Taiko",
                historiaTaikoContent.description,
              )
            }
            className="w-full sm:w-auto"
          >
            <BookOpenIcon className="w-6 h-6 mr-3" />A História do Taiko
          </Button>

          <Button
            variant="secondary"
            onClick={() =>
              onOpenModal(
                "Nossos Instrumentos",
                instrumentosContent.description,
              )
            }
            className="w-full sm:w-auto"
          >
            <MusicalNoteIcon className="w-6 h-6 mr-3" />
            Nossos Instrumentos
          </Button>
        </div>
      </div>
    </section>
  );
}
