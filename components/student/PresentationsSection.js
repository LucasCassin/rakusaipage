import React, { useMemo } from "react";
import { usePresentationsDashboard } from "src/hooks/usePresentationsDashboard";
import PresentationListItem from "components/presentation/PresentationListItem";

export default function PresentationsSection({ user }) {
  const { presentations, isLoading } = usePresentationsDashboard();

  const canRead = user?.features?.includes("read:presentation");

  const displayList = useMemo(() => {
    if (!presentations || !canRead) return [];

    const now = new Date();
    const future = [];
    const noDate = [];

    presentations.forEach((p) => {
      if (!p.date) {
        noDate.push(p);
      } else if (new Date(p.date) >= now) {
        future.push(p);
      }
    });

    future.sort((a, b) => new Date(a.date) - new Date(b.date));

    return [...future, ...noDate];
  }, [presentations, canRead]);

  if (!canRead || displayList.length === 0) return null;

  if (isLoading) {
    return (
      <div className="mb-8 bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4 px-1">
        Próximas Apresentações
      </h2>
      <div className="bg-white rounded-lg shadow-md border border-gray-200 divide-y divide-gray-200">
        {displayList.map((pres, index) => (
          <PresentationListItem
            key={pres.id}
            presentation={pres}
            isFirst={index === 0}
            isLast={index === displayList.length - 1}
            permissions={{
              canUpdate: false,
              canDelete: false,
            }}
          />
        ))}
      </div>
    </section>
  );
}
