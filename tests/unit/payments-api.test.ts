import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import type { VercelRequest,VercelResponse } from '@vercel/node';
import { amountInCents,checkedCheckoutUrl,checkProviderConfirmation } from '../../src/domain/payments';
import { paymentConfig } from '../../src/domain/payments/server';
import configHandler from '../../api/payments/config';
import prepareHandler from '../../api/payments/prepare';
import returnHandler from '../../api/payments/return';
import statusHandler from '../../api/payments/status';
import reconcileHandler from '../../api/payments/reconcile';

const mocks = vi.hoisted(() => ({ getUser:vi.fn(),rpc:vi.fn(),from:vi.fn(),filters:[] as unknown[][] }));
vi.mock('@supabase/supabase-js',() => ({ createClient:() => ({auth:{getUser:mocks.getUser},rpc:mocks.rpc,from:mocks.from}) }));
const reference = '11111111-1111-4111-8111-111111111111';
const booking = '22222222-2222-4222-8222-222222222222';
const key = '33333333-3333-4333-8333-333333333333';
const owner = '44444444-4444-4444-8444-444444444444';
const url = 'https://pay.payphonetodoesposible.com/Anonymous/Index?paymentId=prepared';
const checkout = {reference,booking_id:booking,payer_id:owner,environment:'sandbox',amount_cents:1234,currency:'USD',state:'prepared',claimed:true,
  prepare_components:{amountWithoutTax:1234,amountWithTax:0,tax:0,service:0,tip:0},provider_transaction_id:null,requires_review:false,checkout_url:url,expires_at:new Date(Date.now()+600000).toISOString()};
const provider = {transactionId:42,clientTransactionId:reference,amount:1234,currency:'USD',statusCode:3,lastDigits:'XX17',cardBrand:'Visa'};
function response() {
  const res = {statusCode:200,payload:undefined as unknown,headers:{} as Record<string,unknown>,
    setHeader(name:string,value:unknown) {this.headers[name]=value;return this;},
    status(code:number) {this.statusCode=code;return this;},json(value:unknown) {this.payload=value;return this;},end() {return this;}};
  return res;
}
function request(method:string,body?:unknown,query:Record<string,string> = {},auth = true) {
  return {method,body,query,headers:auth?{authorization:'Bearer user-token'}:{}} as unknown as VercelRequest;
}
function table(data:unknown) {
  const chain = {select:vi.fn().mockReturnThis(),update:vi.fn().mockReturnThis(),
    eq:vi.fn((...args:unknown[]) => {mocks.filters.push(args);return chain;}),neq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data,error:null}),
    then:(resolve:(value:unknown)=>unknown) => Promise.resolve({data:null,error:null}).then(resolve)};
  return chain;
}
function setupEnv() {
  for(const [name,value] of Object.entries({PAYMENTS_ENABLED:'true',PAYMENTS_ENVIRONMENT:'sandbox',PAYMENTS_APP_URL:'https://chulla.example',PAYPHONE_TOKEN:'private-provider-token',
    PAYPHONE_STORE_ID:'store',PAYPHONE_SANDBOX_CONFIRMED:'true',PAYMENTS_LIVE_ENABLED:'false',SUPABASE_URL:'https://db.example',SUPABASE_SERVICE_ROLE_KEY:'private-service-key'})) vi.stubEnv(name,value);
}
beforeEach(() => {
  vi.clearAllMocks();mocks.filters.length=0;setupEnv();
  mocks.getUser.mockResolvedValue({data:{user:{id:owner,email_confirmed_at:'2026-01-01'}},error:null});
  mocks.rpc.mockImplementation(async(name:string) => ({data:name==='claim_payphone_checkout'?checkout:{},error:null}));
  mocks.from.mockImplementation((name:string) => table(name==='bookings'?{status:'paid'}:checkout));
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({paymentId:'prepared',payWithCard:url}),{status:200})));
});
afterEach(() => {vi.unstubAllEnvs();vi.unstubAllGlobals();});

describe('payment parsing and disabled configuration',() => {
  it('converts decimal amounts exactly and rejects invalid precision or zero',() => {
    expect(amountInCents('12.34')).toBe(1234);expect(amountInCents(0.01)).toBe(1);
    for(const value of ['1.001',-1,0,Infinity,'1e2']) expect(() => amountInCents(value)).toThrow();
  });
  it('rejects credential URLs, lookalike domains and unapproved checkout paths',() => {
    expect(checkedCheckoutUrl(url)).toBe(url);
    for(const value of ['https://pay.payphonetodoesposible.com.evil.test/Anonymous/Index?paymentId=a','http://pay.payphonetodoesposible.com/Anonymous/Index?paymentId=a',
      'https://user@pay.payphonetodoesposible.com/Anonymous/Index?paymentId=a','https://pay.payphonetodoesposible.com/evil?paymentId=a']) expect(() => checkedCheckoutUrl(value)).toThrow();
  });
  it('requires explicit flags and never returns credentials from config',() => {
    expect(paymentConfig({}).enabled).toBe(false);expect(paymentConfig({...process.env,PAYMENTS_ENVIRONMENT:'live'}).enabled).toBe(false);
    const res=response();configHandler(request('GET'),res as unknown as VercelResponse);
    expect(res.payload).toMatchObject({enabled:true,provider:'payphone',environment:'sandbox'});
    expect(JSON.stringify(res.payload)).not.toContain('private');expect(res.headers['Cache-Control']).toBe('no-store');
  });
  it('does not interpret return parameters as a provider confirmation',() => {
    expect(() => checkProviderConfirmation({id:42,clientTransactionId:reference},{transactionId:42,reference,cents:1234})).toThrow();
    expect(() => checkProviderConfirmation({...provider,amount:1},{transactionId:42,reference,cents:1234})).toThrow();
    expect(checkProviderConfirmation(provider,{transactionId:42,reference,cents:1234})).toMatchObject({outcome:'captured',cardLast4:null});
  });
});

describe('hosted PayPhone API',() => {
  it('rejects unauthenticated checkout and client supplied amounts without contacting PayPhone',async () => {
    const invalid=response();await prepareHandler(request('POST',{bookingId:booking,idempotencyKey:key,amount:1}),invalid as unknown as VercelResponse);
    expect(invalid.statusCode).toBe(400);
    mocks.getUser.mockResolvedValue({data:{user:null},error:null});
    const unauth=response();await prepareHandler(request('POST',{bookingId:booking,idempotencyKey:key},{},false),unauth as unknown as VercelResponse);
    expect(unauth.statusCode).toBe(401);expect(fetch).not.toHaveBeenCalled();expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('uses canonical server cents, persists before exposing checkout and keeps tokens private',async () => {
    const res=response();await prepareHandler(request('POST',{bookingId:booking,idempotencyKey:key}),res as unknown as VercelResponse);
    expect(res.statusCode).toBe(200);expect(res.payload).toEqual({checkoutUrl:url,clientTransactionId:reference,environment:'sandbox'});
    const [endpoint,options] = vi.mocked(fetch).mock.calls[0];
    expect(endpoint).toBe('https://pay.payphonetodoesposible.com/api/button/Prepare');
    expect(JSON.parse(String(options?.body))).toMatchObject({amount:1234,currency:'USD',clientTransactionId:reference,responseUrl:'https://chulla.example/api/payments/return'});
    expect(mocks.rpc).toHaveBeenCalledWith('finish_payphone_prepare',{p_reference:reference,p_checkout_url:url,p_provider_prepare_id:'prepared'});
    expect(JSON.stringify(res.payload)).not.toContain('private');
  });
  it('returns the persisted URL on an idempotent retry without creating a provider payment',async () => {
    mocks.rpc.mockResolvedValue({data:{...checkout,claimed:false},error:null});
    const res=response();await prepareHandler(request('POST',{bookingId:booking,idempotencyKey:key}),res as unknown as VercelResponse);
    expect(res.statusCode).toBe(200);expect(fetch).not.toHaveBeenCalled();
  });
  it('returns the original reference for an uncertain or expired attempt without another Prepare',async () => {
    for(const prior of [{...checkout,state:'uncertain',checkout_url:null},{...checkout,expires_at:'2020-01-01T00:00:00Z'}]) {
      mocks.rpc.mockResolvedValue({data:{...prior,claimed:false},error:null});
      const res=response();await prepareHandler(request('POST',{bookingId:booking,idempotencyKey:key}),res as unknown as VercelResponse);
      expect(res.statusCode).toBe(409);expect(res.payload).toMatchObject({reference});
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not expose attacker redirect URLs and retains uncertain attempts',async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({paymentId:'prepared',payWithCard:'https://evil.example/'})));
    const res=response();await prepareHandler(request('POST',{bookingId:booking,idempotencyKey:key}),res as unknown as VercelResponse);
    expect(res.statusCode).toBe(503);expect(JSON.stringify(res.payload)).not.toContain('evil');
    expect(mocks.from).toHaveBeenCalledWith('payment_checkouts');
  });
  it('verifies callback immediately without login, then redirects without provider PII',async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({...provider,email:'secret@example.test',bin:'123456'})));
    const res=response();await returnHandler(request('GET',undefined,{id:'42',clientTransactionId:reference},false),res as unknown as VercelResponse);
    expect(res.statusCode).toBe(303);expect(res.headers.Location).toBe(`/?payment=${reference}`);expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith('record_payphone_confirmation',expect.objectContaining({p_reference:reference,p_transaction_id:42,p_amount_cents:1234,p_outcome:'captured',p_card_last4:null}));
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain('secret@example');
  });
  it('never records a fabricated or mismatched confirmation',async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({...provider,clientTransactionId:key})));
    const res=response();await returnHandler(request('GET',undefined,{id:'42',clientTransactionId:reference},false),res as unknown as VercelResponse);
    expect(res.statusCode).toBe(303);expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('finishes an existing callback even after new payments have been switched off',async () => {
    vi.stubEnv('PAYMENTS_ENABLED','false');vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(provider)));
    const res=response();await returnHandler(request('GET',undefined,{id:'42',clientTransactionId:reference},false),res as unknown as VercelResponse);
    expect(mocks.rpc).toHaveBeenCalledWith('record_payphone_confirmation',expect.any(Object));
  });
  it('scopes status to the authenticated owner and provides no stored checkout URL',async () => {
    const res=response();await statusHandler(request('GET',undefined,{reference}),res as unknown as VercelResponse);
    expect(res.statusCode).toBe(200);expect(mocks.filters).toContainEqual(['payer_id',owner]);
    expect(res.payload).toMatchObject({reference,status:'pending',amount:12.34,bookingId:booking,requiresReview:false});
    expect(JSON.stringify(res.payload)).not.toContain('checkout_url');
    mocks.from.mockImplementation(() => table(null));
    const missing=response();await statusHandler(request('GET',undefined,{reference}),missing as unknown as VercelResponse);
    expect(missing.statusCode).toBe(404);
  });
  it('reconciles only the owner’s existing attempt and still verifies the candidate',async () => {
    mocks.from.mockImplementation((name:string) => table(name==='bookings'?{status:'paid'}:{...checkout,return_candidate_id:42}));
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(provider)));
    const res=response();await reconcileHandler(request('POST',{reference}),res as unknown as VercelResponse);
    expect(res.statusCode).toBe(200);expect(mocks.filters).toContainEqual(['payer_id',owner]);
    expect(mocks.rpc).toHaveBeenCalledWith('record_payphone_confirmation',expect.objectContaining({p_reference:reference,p_transaction_id:42}));
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('V2/Confirm');
  });
});
