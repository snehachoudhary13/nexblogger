const http = require('http');
const PORT = process.env.PORT || 3000;

function req(path, method='GET', body=null) {
  return new Promise((res,rej) => {
    const r = http.request({hostname:'localhost',port:PORT,path,method,headers:{'Content-Type':'application/json'}}, rs => {
      let d=''; rs.on('data',c=>d+=c); rs.on('end',()=>res({status:rs.statusCode,body:JSON.parse(d||'{}')}));
    });
    r.on('error',rej); if(body)r.write(JSON.stringify(body)); r.end();
  });
}

async function run() {
  console.log('Running NexBlogger smoke tests…');
  const app = require('./server');
  const server = app.listen(PORT);
  await new Promise(r=>setTimeout(r,500));
  let pass=0,fail=0;
  const test = async (name,fn) => {
    try{await fn();console.log(`  ✓ ${name}`);pass++;}
    catch(e){console.log(`  ✗ ${name} — ${e.message}`);fail++;}
  };

  await test('health check', async()=>{
    const r=await req('/api/health');
    if(r.status!==200||r.body.status!=='ok') throw new Error('health failed');
  });

  let token;
  const email=`t${Date.now()}@t.com`;
  await test('register', async()=>{
    const r=await req('/api/auth/register','POST',{name:'Test',email,password:'pass123'});
    if(r.status!==201||!r.body.token) throw new Error(`got ${r.status}`);
    token=r.body.token;
  });

  await test('login', async()=>{
    const r=await req('/api/auth/login','POST',{email,password:'pass123'});
    if(r.status!==200||!r.body.token) throw new Error(`got ${r.status}`);
  });

  await test('workspaces list', async()=>{
    const r=await req('/api/workspaces');
    if(r.status!==200||!Array.isArray(r.body)) throw new Error('not array');
  });

  await test('duplicate email rejected', async()=>{
    const r=await req('/api/auth/register','POST',{name:'X',email,password:'pass123'});
    if(r.status!==409) throw new Error(`expected 409, got ${r.status}`);
  });

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail>0?1:0);
}
run().catch(e=>{console.error(e);process.exit(1);});
