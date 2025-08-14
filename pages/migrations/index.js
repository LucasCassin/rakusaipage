import { texts } from "src/utils/texts.js";
import PageLayout from "components/layouts/PageLayout";
import MigrationsContent from "components/forms/MigrationsContent";

export default function Migrations() {
  return (
    <PageLayout
      title={texts.migrations.title}
      description="Gerencie as migrações do sistema"
    >
      <MigrationsContent />
    </PageLayout>
  );
}
