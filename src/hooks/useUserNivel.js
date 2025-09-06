import { useMemo } from "react";
import { settings } from "config/settings.js";

// Este hook recebe a lista de features de um usuário
export function useUserNivel(features) {
  const userNiveis = useMemo(() => {
    const niveis = {
      taiko: null,
      fue: null,
    };

    if (!features || features.length === 0) {
      return niveis;
    }

    // Função para encontrar o maior nível para uma modalidade (taiko ou fue)
    const findHighestNivel = (modalidade) => {
      let highestNivel = null;

      settings.nivel[modalidade].forEach((nivelConfig) => {
        if (features.includes(nivelConfig.feature)) {
          if (!highestNivel || nivelConfig.ord > highestNivel.ord) {
            highestNivel = nivelConfig;
          }
        }
      });
      if (highestNivel === null) return null;
      if (highestNivel.ord === 999) return null;
      return highestNivel;
    };

    niveis.taiko = findHighestNivel("taiko");
    niveis.fue = findHighestNivel("fue");

    return niveis;
  }, [features]);

  return userNiveis;
}
