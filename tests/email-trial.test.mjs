import assert from 'node:assert/strict';
import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {cleanupEmailAuth,createLogin,consumeLogin,sessionStatus,privateId,normalizeEmail,hashToken,takeLimit} from '../lib/email-trial.js';
function database(){
 const sql=new DatabaseSync(':memory:'); sql.exec('PRAGMA foreign_keys=ON');
 sql.exec(readFileSync(new URL('../drizzle/0004_email_trial.sql',import.meta.url),'utf8'));
 const db={prepare(query){return {bind(...params){return {first:async()=>sql.prepare(query).get(...params)??null,run:async()=>sql.prepare(query).run(...params)}}}},async batch(statements){sql.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 return {sql,db};
}
test('trial begins on confirmation, expires at exactly 72 hours and cannot restart after cookie deletion or another device',async()=>{
 const {db,sql}=database(),start=1000000;
 const id=await privateId('test-secret','email',normalizeEmail('  Driver@Example.COM '));
 const first=await createLogin(db,id,start);
 assert.equal(sql.prepare('SELECT trial_started_at FROM beta_accounts').get().trial_started_at,null);
 const session=await consumeLogin(db,first,start+300);
 const deadline=start+300+259200;
 assert.equal((await sessionStatus(db,session,deadline-1)).remainingSeconds,1);
 assert.equal((await sessionStatus(db,session,deadline)).status,'expired');
 assert.equal((await sessionStatus(db,null,deadline)).status,'not_started');
 const newLink=await createLogin(db,id,deadline+20);
 const newSession=await consumeLogin(db,newLink,deadline+30);
 const status=await sessionStatus(db,newSession,deadline+30);
 assert.equal(status.status,'expired');assert.equal(status.expiresAt,deadline);
 sql.close();
});
test('login links are random, stored only as hashes, single use and expire after 15 minutes',async()=>{
 const {db,sql}=database(); const token=await createLogin(db,'id',1000);
 assert.equal(token.length,64);assert.equal(sql.prepare('SELECT token_hash FROM beta_login_tokens').get().token_hash,await hashToken(token));
 assert.ok(await consumeLogin(db,token,1001));assert.equal(await consumeLogin(db,token,1001),null);
 const expired=await createLogin(db,'id',2000);assert.equal(await consumeLogin(db,expired,2900),null);
 assert.equal(await consumeLogin(db,'invalid',2100),null);sql.close();
});
test('parallel confirmations and later links preserve the first trial start',async()=>{
 const {db,sql}=database();const a=await createLogin(db,'id',1000),b=await createLogin(db,'id',1000);
 const sessions=await Promise.all([consumeLogin(db,a,1100),consumeLogin(db,a,1100)]);
 assert.equal(sessions.filter(Boolean).length,1);
 await consumeLogin(db,b,1200);assert.equal(sql.prepare('SELECT trial_started_at FROM beta_accounts').get().trial_started_at,1100);sql.close();
});
test('rate limits persist in database and reset only after the window',async()=>{
 const {db,sql}=database();assert.equal(await takeLimit(db,'key',1,60,1000),true);assert.equal(await takeLimit(db,'key',1,60,1059),false);assert.equal(await takeLimit(db,'key',1,60,1060),true);sql.close();
});
test('cleanup removes expired tokens and sessions without renewing an activated account',async()=>{
 const {db,sql}=database();const token=await createLogin(db,'id',1000);const session=await consumeLogin(db,token,1001);
 await cleanupEmailAuth(db,1001+30*86400);assert.equal((await sessionStatus(db,session,1001+30*86400)).status,'not_started');
 assert.equal(sql.prepare('SELECT trial_started_at FROM beta_accounts').get().trial_started_at,1001);sql.close();
});
test('email normalization rejects header injection and account identifiers are keyed and stable',async()=>{
 assert.equal(normalizeEmail('x@example.com\r\nBcc: other@example.com'),null);
 assert.equal(normalizeEmail('not-an-email'),null);
 assert.equal(await privateId('secret','email','a@example.com'),await privateId('secret','email','a@example.com'));
 assert.notEqual(await privateId('secret','email','a@example.com'),await privateId('other','email','a@example.com'));
});
