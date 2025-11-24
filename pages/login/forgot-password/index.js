import { useState } from "react";
import Link from "next/link";
import PublicHeader from "components/PublicHeader";
import FormInput from "components/forms/FormInput";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";
import { texts } from "src/utils/texts";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({
    loading: false,
    error: "",
    success: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: "", success: "" });

    try {
      const response = await fetch("/api/v1/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          loading: false,
          error: "",
          success: data.message || "E-mail enviado com sucesso!",
        });
        setEmail(""); // Limpa o campo para evitar múltiplos envios acidentais
      } else {
        throw new Error(data.message || "Erro ao solicitar recuperação.");
      }
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message,
        success: "",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Recuperar Senha</h1>
            <p className="text-gray-600 text-sm">
              Digite seu e-mail cadastrado para receber um link de redefinição.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Alert type="error" show={!!status.error}>
              {status.error}
            </Alert>
            <Alert type="success" show={!!status.success}>
              {status.success}
            </Alert>

            {!status.success && (
              <>
                <FormInput
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status.loading}
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={status.loading}
                  size="small"
                >
                  {status.loading
                    ? "Enviando..."
                    : "Enviar Link de Recuperação"}
                </Button>
              </>
            )}
          </form>

          <div className="text-center text-sm">
            <Link href="/login" className="text-rakusai-purple hover:underline">
              Voltar para o Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
