# Cómo trabajar en equipo en CHULLA VIDA

Guía rápida para que todo el grupo pueda abrir el proyecto, hacer cambios sin pisarse y ver el resultado.

## 1. Abrir el proyecto

### Opción A · Codespaces (sin instalar nada)

1. Pide al dueño del repositorio que te invite como colaborador y acepta la invitación que llega a tu correo.
2. En el repositorio pulsa **Code → Codespaces → Create codespace on main**, o el botón «Open in GitHub Codespaces» del README.
3. La primera vez tarda unos minutos: se instalan las dependencias y la app arranca sola en el puerto 5173. Si no se abre una pestaña con la web, ve a la pestaña **Ports** y abre el puerto 5173.
4. Al terminar, cierra la pestaña. El codespace se detiene solo después de 30 minutos sin uso.

La cuenta gratuita de GitHub incluye unas 60 horas de Codespaces al mes. Borra los que ya no uses en <https://github.com/codespaces>.

### Opción B · En tu computadora

Necesitas [Git](https://git-scm.com/) y [Node.js](https://nodejs.org/) 22 o superior (recomendado 24).

```sh
git clone https://github.com/Leonel19-git/chulla-vida.git
cd chulla-vida
npm install
npm run dev
```

## 2. Una rama por tarea

**Nadie trabaja directamente en `main`.** `main` es la versión que funciona; cada cambio entra por un Pull Request revisado.

1. Trae lo último de `main`:

   ```sh
   git switch main
   git pull
   ```

2. Crea tu rama con tu nombre y la tarea:

   ```sh
   git switch -c ana/filtro-precios
   ```

3. Trabaja y guarda tus cambios con un mensaje claro:

   ```sh
   git add .
   git commit -m "Agrega filtro por precio"
   ```

4. Sube tu rama:

   ```sh
   git push -u origin ana/filtro-precios
   ```

5. En GitHub aparece **Compare & pull request**. Ábrelo, explica qué cambiaste y pide revisión a un compañero.
6. Quien revisa mira la pestaña **Files changed**, comenta o aprueba. Con la aprobación, pulsa **Merge pull request**.
7. Pulsa **Delete branch** y vuelve al paso 1 para la siguiente tarea.

En VS Code o Codespaces puedes hacer lo mismo con botones: el nombre de la rama está abajo a la izquierda (clic → *Create new branch*) y el panel **Source Control** (`Ctrl+Shift+G`) tiene *Commit* y *Publish Branch*.

### Si GitHub dice que hay conflictos

Pasa cuando dos personas cambiaron las mismas líneas. En tu rama:

```sh
git pull origin main
```

VS Code marca cada conflicto con las opciones *Accept Current*, *Accept Incoming* o *Accept Both*. Elige, guarda, haz commit y vuelve a subir. Si no está claro qué conservar, pregunta a quien hizo el otro cambio.

## 3. Antes de abrir un Pull Request

Comprueba que todo siga funcionando:

```sh
npm run build
npm run lint
node scripts/verify-domain.mjs
node scripts/verify-membership.mjs
node scripts/verify-wallet.mjs
node scripts/verify-i18n.mjs
node scripts/verify-catalog.mjs
node scripts/verify-payment-i18n.mjs
```

Si cambiaste textos de la interfaz, revisa también los demás idiomas (`src/i18n/README.md`).

## 4. Organizar las tareas

- **Issues:** una por tarea o error (**Issues → New issue**). Asígnate la issue antes de empezar para que nadie haga lo mismo.
- **Tablero:** en **Projects → New project → Board** quedan las columnas *Todo*, *In Progress* y *Done* para ver quién hace qué.
- En la descripción del Pull Request escribe `Closes #12` (con el número de la issue) y se cerrará sola al unirlo.

## 5. Programar juntos en vivo

Con VS Code instalado, la extensión **Live Share** permite que varias personas editen el mismo código a la vez: una persona pulsa *Live Share* en la barra inferior y comparte el enlace.

## 6. Cuidados

- Nunca subas `.env.local`, contraseñas ni tokens. Ya están excluidos en `.gitignore`.
- No subas `node_modules` ni `dist`; se generan con `npm install` y `npm run build`.
- Si agregas imágenes, anota la fuente y la licencia en `public/images/CREDITS.md`.
- GitHub rechaza archivos de más de 100 MB. Videos o presentaciones pesadas, mejor en una carpeta compartida.

## Para quien administra el repositorio

- **Invitar al equipo:** Settings → Collaborators → Add people, con el usuario de GitHub de cada compañero.
- **Proteger `main`:** Settings → Branches → Add branch ruleset, marcando *Require a pull request before merging*, para que nadie suba directo sin revisión.
- **Vista previa automática:** si conectas este repositorio al proyecto `chulla-vida` en Vercel (Settings → Git), cada cambio en `main` se publica solo y cada Pull Request recibe su propio enlace de vista previa.
