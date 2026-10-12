export const NEWS_ONLY_REFUSAL =
  "Solo puedo ayudarte con las noticias publicadas y sus fuentes. Puedes preguntar qué pasó, qué se sabe de un tema o qué reportes leer hoy.";

function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/\p{M}|\p{Cf}/gu, "")
    .toLowerCase();
}

// This is an early rejection layer. The security boundary is the bounded,
// server-rendered response: model-generated prose is never returned to readers.
export function hasUntrustedInstructions(text: string): boolean {
  const value = normalize(text);
  return /```|<\/?(?:system|assistant|user|developer)\b|\[inst\]|\b(?:ignore|ignora|ignorar|olvida|forget|disregard|override)\b[\s\S]{0,100}\b(?:instrucciones|instructions|previous|anteriores|reglas|rules)\b|\b(?:system prompt|prompt del sistema|api key|clave privada|clave secreta|secret key|jailbreak|developer mode|modo desarrollador)\b|\b(?:actua como|act as|pretend to be)\b|\b(?:decode|decodifica|ejecuta|execute)\b[\s\S]{0,60}\b(?:base64|rot13|script|codigo|code)\b/.test(
    value,
  );
}

export function isDisallowedChatRequest(text: string): boolean {
  if (hasUntrustedInstructions(text)) return true;
  const value = normalize(text);
  const task =
    /\b(?:escribe|escribir|genera|generar|crea|crear|programa|programar|dame|quiero|write|generate|create|implement|debug|implementa|depura|arregla|corrige|resuelve|resolver|ayudame)\b/;
  const unrelated =
    /\b(?:codigo|code|script|funcion|function|javascript|typescript|python|sql|html|css|bash|receta|recipe|poema|poem|ecuacion|equation|tarea|homework)\b/;
  return (
    (task.test(value) && unrelated.test(value)) ||
    /\b(?:traduce|translate|roleplay)\b/.test(value)
  );
}
