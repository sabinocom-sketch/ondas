import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './sampled.css';
import './guitar.css';
import './bass.css';
import './bass-details.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<App/>);
if(import.meta.env?.PROD&&'serviceWorker' in navigator)window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(console.warn)});
