import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Verificação de variáveis de ambiente essenciais
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
] as const;

const missingVars = requiredEnvVars.filter(
  (key) => !import.meta.env[key]
);

if (missingVars.length > 0) {
  console.error(
    `⚠️ Variáveis de ambiente não configuradas: ${missingVars.join(', ')}. ` +
    'Copie o arquivo .env.example para .env e preencha os valores.'
  );
}

// Bloquear menu de contexto (segurar) em links e botões
document.addEventListener('contextmenu', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('a, button, [role="button"], img, [onclick]')) {
    e.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
