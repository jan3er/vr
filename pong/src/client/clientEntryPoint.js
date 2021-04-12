import querystring from 'query-string';
import Game from '../common/Game';
import MyClientEngine from './MyClientEngine';
import { Lib, Renderer, ClientEngine } from 'lance-gg';
//const qsOptions = querystring.parse(location.search);

// default options, overwritten by query-string options
// is sent to both game engine and client engine
const options = {
    traceLevel: Lib.Trace.TRACE_DEBUG,
    delayInputCount: 3,
    scheduler: 'render-schedule',
    syncOptions: {
        sync: 'extrapolate',
        remoteObjBending: 1.0,
        localObjBending: 0.0,
        bendingIncrements: 6
    }
};
//let options = Object.assign(defaults, qsOptions);

// create a client engine and a game engine
const gameEngine = new Game(options);
const clientEngine = new MyClientEngine(gameEngine, options);

document.addEventListener('DOMContentLoaded', function(e) { clientEngine.start(); });
