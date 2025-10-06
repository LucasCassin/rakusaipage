import React from "react";
import Link from "next/link";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { MusicalNoteIcon, FireIcon } from "@heroicons/react/24/solid";

// Sub-componente para os cards de categoria, para manter o código limpo
const CategoryCard = ({ href, title, description, icon, colorClasses }) => (
  <Link href={href} className="block group">
    <div
      className={`p-6 rounded-xl shadow-lg text-white transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-1 ${colorClasses}`}
    >
      <div className="flex items-center">
        <div className="p-3 bg-white/20 rounded-full">{icon}</div>
        <h3 className="ml-4 text-2xl font-bold">{title}</h3>
      </div>
      <p className="mt-4 text-white/90">{description}</p>
    </div>
  </Link>
);

export default function VideoAulasSection() {
  const { user } = useAuth();

  if (!user?.features) {
    return null; // Não mostra nada se o usuário não estiver carregado
  }

  // Verifica se o usuário tem PELO MENOS UMA das features necessárias para ver cada card
  const canSeeTaiko = settings.videoAulas.FEATURES_TAIKO.some((feature) =>
    user.features.includes(feature),
  );

  const canSeeFue = settings.videoAulas.FEATURES_FUE.some((feature) =>
    user.features.includes(feature),
  );

  // Se o usuário não tiver acesso a nenhuma das seções, não renderiza nada
  if (!canSeeTaiko && !canSeeFue) {
    return null;
  }

  return (
    <div id="video-aulas">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Vídeo Aulas</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card de Taiko (só renderiza se o usuário tiver permissão) */}
        {canSeeTaiko && (
          <CategoryCard
            href="/videoaulas-taiko"
            title="Taiko"
            description="Acesse as aulas de taiko."
            icon={<FireIcon className="h-8 w-8 text-white" />}
            colorClasses="bg-gradient-to-br from-rakusai-yellow-dark to-rakusai-pink"
          />
        )}

        {/* Card de Fue (só renderiza se o usuário tiver permissão) */}
        {canSeeFue && (
          <CategoryCard
            href="/videoaulas-fue"
            title="Fue"
            description="Acesse as aulas de fue."
            icon={<MusicalNoteIcon className="h-8 w-8 text-white" />}
            colorClasses="bg-gradient-to-br from-rakusai-purple to-rakusai-pink"
          />
        )}
      </div>
    </div>
  );
}
