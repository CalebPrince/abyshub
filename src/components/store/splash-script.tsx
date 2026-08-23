/**
 * Runs before first paint so a returning tab never sees a frame of the splash.
 *
 * Deliberately *not* a client component: React must never re-render this, or a
 * re-run mid-animation would read the flag it just wrote and cut the splash
 * short. Rendered as the first child of <body> so the attribute lands on <html>
 * before the overlay below it is parsed.
 *
 * The `data-splash` attribute it writes is read by the CSS in globals.css and
 * cleared by <SplashScreen /> once the animation is done.
 */
const script = `(function(){var r=document.documentElement;try{if(sessionStorage.getItem("abyshub.splash.v1")==="1"){r.dataset.splash="seen";return}sessionStorage.setItem("abyshub.splash.v1","1")}catch(e){}r.dataset.splash="running"})()`;

export function SplashScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
