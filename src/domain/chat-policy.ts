export const NEWS_ONLY_REFUSAL =
  "Solo puedo ayudarte con las noticias publicadas y sus fuentes. Puedes preguntar qué pasó, qué se sabe de un tema o qué reportes leer hoy.";

function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/\p{M}|\p{Cf}/gu, "")
    .toLowerCase();
}

// Early rejection is combined with constrained generation, exact supporting
// quotes, server-owned citations and independent output screening.
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
    /\b(?:escribe|escribeme|escribir|redacta|genera|generame|generar|crea|creame|crear|programa|programar|dame|pasame|quiero|haz|hazme|muestra|muestrame|ensename|implementacion|write|generate|create|implement|debug|implementa|depura|arregla|corrige|resuelve|resolver|ayudame)\b/;
  const unrelated =
    /\b(?:codigo|code|script|snippet|pseudocodigo|pseudocode|funcion|function|javascript|typescript|python|sql|html|css|bash|powershell|programacion|programming|algoritmo|algorithm|receta|recipe|poema|poem|ecuacion|equation|tarea|homework|chiste|joke)\b/;
  const reportingPrefix =
    /^(?:por favor\s+)?(?:dame|quiero|muestrame|recomiendame)\s+(?:las\s+|algunas\s+)?(?:noticias|reportes|titulares)\s+(?:sobre|de|del|acerca de)\s+/;
  const remainder = value.replace(reportingPrefix, "");
  const reportingOnly =
    reportingPrefix.test(value) &&
    !task.test(remainder) &&
    !/\b(?:luego|despues|ademas|como|paso a paso|con un|con una)\b/.test(
      remainder,
    );
  return (
    (task.test(value) && unrelated.test(value) && !reportingOnly) ||
    /\b(?:traduce|translate|roleplay)\b/.test(value) ||
    /\b(?:como|how to)\b[\s\S]{0,70}\b(?:programar|implementar|compilar|code|debug)\b/.test(
      value,
    ) ||
    hasCodeSyntax(value)
  );
}

function hasCodeSyntax(value: string): boolean {
  return /```|\b(?:const|let|var)\s+\w+\s*=|\b(?:function|def)\s+\w+\s*\(|\b(?:console\.log|print|eval|exec)\s*\(|\bselect\s+[\s\S]{0,100}\bfrom\b|\b(?:import\s+\w+\s+from|from\s+\w+\s+import)\b|(?:^|\n)\s*(?:curl|sudo|npm|pip|bash|powershell)\s+|=>\s*[{(]|<script\b/.test(
    value,
  );
}

export function isUnsafeChatAnswer(text: string): boolean {
  const value = normalize(text);
  return (
    hasUntrustedInstructions(text) ||
    hasCodeSyntax(value) ||
    /https?:\/\/|www\.|javascript:|data:|<\/?[a-z][^>]*>|!\[/.test(value) ||
    isDisallowedChatRequest(text)
  );
}
