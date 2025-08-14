import { texts } from "src/utils/texts.js";

export default function StatusUpdatedAt({ data }) {
  const updatedAt = new Date(data.updated_at).toLocaleString("pt-BR");

  return (
    <div className="text-gray-600 text-sm mb-6">
      {texts.status.lastCheck} <span className="font-medium">{updatedAt}</span>
    </div>
  );
}
