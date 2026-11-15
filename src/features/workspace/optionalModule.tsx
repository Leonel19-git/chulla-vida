import { lazy, type ComponentType } from 'react';

type Loaders = Record<string, () => Promise<unknown>>;

/**
 * Carga perezosa de un componente que otro frente puede no haber entregado todavía.
 * `loaders` sale de `import.meta.glob('<ruta literal>')`: si el archivo no existe, el objeto llega vacío,
 * el build no falla y se muestra `Fallback`. Si existe pero falla al cargar o no exporta `name`, también.
 */
/**
 * Busca la exportación `name` en los módulos de `loaders` (de `import.meta.glob`). Devuelve `undefined`
 * si ningún archivo existe, si fallan al cargar o si ninguno la exporta: quien llama usa su respaldo.
 */
export async function optionalExport<T>(loaders: Loaders, name: string): Promise<T | undefined> {
  for (const load of Object.values(loaders)) {
    try {
      const module = await load() as Record<string, unknown>;
      if (module[name] !== undefined) return module[name] as T;
    } catch { /* módulo con error de carga: probamos el siguiente */ }
  }
  return undefined;
}

export function optionalLazy<P extends object>(loaders: Loaders, name: string, Fallback: ComponentType<P>) {
  return lazy(async (): Promise<{ default: ComponentType<P> }> => {
    const load = Object.values(loaders)[0];
    if (!load) return { default: Fallback };
    try {
      const module = await load() as Record<string, unknown>;
      const component = module[name] ?? module.default;
      if (typeof component === 'function' || (typeof component === 'object' && component !== null)) return { default: component as ComponentType<P> };
    } catch { /* módulo con error de carga: se usa el respaldo para no tumbar la página */ }
    return { default: Fallback };
  });
}
