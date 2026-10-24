/**
 * Nombre para mostrar
 * Convierte identificadores de inicio de sesión como 'sebastian.master' o 'ana_perez@x' en 'Sebastian' o 'Ana' para dirigirse al usuario.
 */
export const toDisplayName = (userName?: string | null): string | null => {
  const first = userName?.split('@')[0]?.split(/[._-]/)[0]?.trim();
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : (userName ?? null);
};
