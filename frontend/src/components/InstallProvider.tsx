import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const InstallContext = createContext({
  installed: false,
  available: false,
  pending: false,
  message: "",
  install: async () => {},
});

export function InstallProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [installed, setInstalled] = useState(() =>
    Boolean(
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone,
    ),
  );
  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setEvent(event as InstallEvent);
    };
    const complete = () => {
      setInstalled(true);
      setEvent(null);
      setMessage("Perspectiva ya está instalada.");
    };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", complete);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);
  async function install() {
    if (!event || pending) return;
    setPending(true);
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      setMessage(
        outcome === "accepted"
          ? "Solicitud aceptada. El navegador completará la instalación."
          : "Puedes instalarla más tarde desde el menú del navegador.",
      );
    } catch {
      setMessage(
        "No se pudo abrir la instalación. Sigue los pasos de tu navegador que aparecen abajo.",
      );
    } finally {
      setEvent(null);
      setPending(false);
    }
  }
  return (
    <InstallContext.Provider
      value={{
        installed,
        available: Boolean(event),
        pending,
        message,
        install,
      }}
    >
      {children}
    </InstallContext.Provider>
  );
}
export const useInstall = () => useContext(InstallContext);
