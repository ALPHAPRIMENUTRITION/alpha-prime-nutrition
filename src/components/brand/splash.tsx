import { SPLASH_ALPHA, SPLASH_LINES, SPLASH_NUTRITION, SPLASH_SYMBOL, SPLASH_TAGLINE } from "./splash-layers";
import { SplashController } from "./splash-controller";

/**
 * Pantalla de bienvenida animada al abrir la app instalada.
 * Se muestra solo en la app (no en el navegador) y una vez por sesión.
 * Un script en <head> decide antes de pintar, así no hay parpadeo.
 */
export const SPLASH_BOOT = `try{var s=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true||location.search.indexOf('splash=1')>-1;if(s&&!sessionStorage.getItem('ap-splash')){document.documentElement.classList.add('ap-splash')}}catch(e){}`;

const layer = (html: string, cls: string) => <div className={`ap-layer ${cls}`} dangerouslySetInnerHTML={{ __html: html }} />;

export function BrandSplash() {
  return (
    <>
      <div id="ap-splash" aria-hidden="true">
        <div className="ap-glow" />
        <div className="ap-logo">
          {layer(SPLASH_SYMBOL, "ap-symbol")}
          {layer(SPLASH_ALPHA, "ap-alpha")}
          {layer(SPLASH_LINES, "ap-lines")}
          {layer(SPLASH_NUTRITION, "ap-nutrition")}
          {layer(SPLASH_TAGLINE, "ap-tagline")}
        </div>
        <div className="ap-bar">
          <span />
        </div>
      </div>
      <SplashController />
    </>
  );
}
