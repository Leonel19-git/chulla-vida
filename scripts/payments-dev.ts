import { loadEnv,type Plugin } from 'vite';
import type { IncomingMessage,ServerResponse } from 'node:http';
import type { VercelRequest,VercelResponse } from '@vercel/node';

const routes = new Set(['config','prepare','return','status','reconcile','refund-request']);
const serverKeys = ['PAYMENTS_ENABLED','PAYMENTS_ENVIRONMENT','PAYMENTS_APP_URL','PAYPHONE_TOKEN','PAYPHONE_STORE_ID',
  'PAYPHONE_SANDBOX_CONFIRMED','PAYMENTS_LIVE_ENABLED','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'] as const;

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve,reject) => {
    let size=0; const chunks:Buffer[]=[];
    const cleanup=() => { clearTimeout(timer);req.off('data',onData);req.off('end',onEnd);req.off('error',onError); };
    const fail=(message:string) => { cleanup();req.resume();reject(new Error(message)); };
    const onData=(value:Buffer|string) => {
      const chunk=Buffer.isBuffer(value)?value:Buffer.from(value);size+=chunk.length;
      if(size>4096) {fail('body_too_large');return;}
      chunks.push(chunk);
    };
    const onEnd=() => {
      cleanup();
      try {resolve(chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{});} catch {reject(new Error('invalid_json'));}
    };
    const onError=() => fail('invalid_body');
    const timer=setTimeout(() => fail('body_timeout'),10000);
    req.on('data',onData);req.on('end',onEnd);req.on('error',onError);
  });
}

function responseAdapter(res:ServerResponse):VercelResponse {
  const adapted=Object.assign(res,{
    status(code:number) {res.statusCode=code;return adapted;},
    json(value:unknown) {res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));return adapted;},
    send(value:unknown) {res.end(typeof value==='string'?value:JSON.stringify(value));return adapted;},
    redirect(statusOrUrl:number|string,url?:string) {res.statusCode=typeof statusOrUrl==='number'?statusOrUrl:307;res.setHeader('Location',url||String(statusOrUrl));res.end();return adapted;},
  });
  return adapted as unknown as VercelResponse;
}

/** Development only. Production uses Vercel Functions; secrets never become Vite defines. */
export function paymentsDev():Plugin {
  return {
    name:'chulla-payments-dev',apply:'serve',
    configureServer(server) {
      const env=loadEnv(server.config.mode,server.config.envDir,'');
      for(const key of serverKeys) if(env[key]!==undefined) process.env[key]=env[key];
      server.middlewares.use(async(req,res,next) => {
        const url=new URL(req.url||'/', 'http://localhost');
        const match=/^\/api\/payments\/([a-z-]+)\/?$/.exec(url.pathname);
        if(!match || !routes.has(match[1])) return next();
        const adapted=responseAdapter(res);
        adapted.setHeader('Cache-Control','no-store');
        try {
          const query:Record<string,string|string[]>={};
          for(const key of new Set(url.searchParams.keys())) {
            const values=url.searchParams.getAll(key);query[key]=values.length===1?values[0]:values;
          }
          let body:unknown;
          if(req.method==='POST') {
            if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json')) {
              req.resume();adapted.status(415).json({error:'Usa un cuerpo JSON.'});return;
            }
            if(Number(req.headers['content-length']||0)>4096) {req.resume();adapted.status(413).json({error:'La solicitud es demasiado grande.'});return;}
            body=await readJson(req);
          }
          const request=Object.assign(req,{query,body}) as VercelRequest;
          const module=await server.ssrLoadModule(`/api/payments/${match[1]}.ts`);
          await module.default(request,adapted);
        } catch(error) {
          if(!res.headersSent) {
            const kind=error instanceof Error?error.message:'';
            adapted.status(kind==='body_too_large'?413:['invalid_json','invalid_body','body_timeout'].includes(kind)?400:503)
              .json({error:'No pudimos procesar la solicitud de pagos. Revisa los datos e inténtalo de nuevo.'});
          } else if(!res.writableEnded) res.end();
        }
      });
    },
  };
}
