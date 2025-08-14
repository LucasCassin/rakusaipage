import { texts } from "src/utils/texts.js";
import PageLayout from "components/layouts/PageLayout";
import LoginForm from "components/forms/LoginForm";

/**
 * Página de login da aplicação
 */
export default function Login() {
  return (
    <PageLayout title={texts.login.title} description="Faça login em sua conta">
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {texts.login.title}
        </h2>
      </div>

      <LoginForm />
    </PageLayout>
  );
}
