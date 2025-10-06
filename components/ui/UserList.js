import React from "react";
import Link from "next/link";
import { useUserNivel } from "src/hooks/useUserNivel";
import NivelTag from "./NivelTag";
import Button from "./Button";
import { ArrowRightIcon } from "@heroicons/react/24/solid"; // NOVO: Ícone para o botão

function UserCard({ user }) {
  const { taiko, fue } = useUserNivel(user.features);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 transition hover:shadow-lg">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{user.username}</h3>
          {/* MUDANÇA: Exibindo o ID do usuário */}
          <p className="text-[0.7rem] font-thin text-gray-600">{user.id}</p>
        </div>
        <Link href={`/profile?username=${user.username}`} passHref>
          {/* MUDANÇA: Botão agora é responsivo com ícone */}
          <Button variant="secondary" size="small" className="!px-3 sm:!px-6">
            <ArrowRightIcon className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Ver Mais</span>
          </Button>
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {taiko && <NivelTag nivel={taiko} />}
        {fue && <NivelTag nivel={fue} />}
      </div>

      <div className="mt-4 border-t pt-3 text-xs text-gray-500 space-y-1">
        <p>Criado em: {formatDate(user.created_at)}</p>
        <p>Atualizado em: {formatDate(user.updated_at)}</p>
      </div>
    </div>
  );
}

export default function UserList({ users }) {
  if (users.length === 0) {
    return (
      <div className="text-center mt-8 bg-white p-8 rounded-lg shadow-md border border-gray-200">
        <p className="text-gray-600">
          Nenhum usuário encontrado com os critérios selecionados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-8">
      {users.map((user) => (
        <UserCard key={user.username} user={user} />
      ))}
    </div>
  );
}
